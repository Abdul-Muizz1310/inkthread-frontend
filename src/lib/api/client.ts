/**
 * The typed API client. Every call builds its URL from env, applies a timeout, parses JSON and
 * validates it with Zod, and maps every failure into the error union in ./errors.
 */
import type { z } from "zod";
import { ErrorEnvelope } from "@/lib/contract/api";
import { apiBase } from "@/lib/env";
import { HttpError, NetworkError, ParseError, TimeoutError } from "./errors";

const DEFAULT_TIMEOUT_MS = 30_000;

export function apiUrl(path: string): string {
  return new URL(path, apiBase()).toString();
}

export async function toHttpError(response: Response): Promise<HttpError> {
  const text = await response.text().catch(() => "");
  try {
    const env = ErrorEnvelope.parse(JSON.parse(text));
    return new HttpError(response.status, text, env.error, env.message);
  } catch {
    return new HttpError(response.status, text);
  }
}

export async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...rest,
      signal,
      headers: { Accept: "application/json", ...rest.headers },
    });
  } catch (err) {
    if (signal.aborted) throw new TimeoutError(`request to ${path} timed out after ${timeoutMs}ms`);
    throw new NetworkError(`network error fetching ${path}: ${(err as Error).message}`);
  }
  if (!response.ok) throw await toHttpError(response);
  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    throw new ParseError(`response was not JSON: ${(err as Error).message}`, "$");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const path0 = parsed.error.issues[0]?.path.join(".") ?? "$";
    throw new ParseError(`response did not match the schema at ${path0}`, path0);
  }
  return parsed.data;
}

export function getJson<T>(path: string, schema: z.ZodType<T>, opts: { timeoutMs?: number } = {}) {
  return requestJson(path, schema, { method: "GET", ...opts });
}

export function isColdStartError(err: unknown): boolean {
  if (err instanceof NetworkError) return true;
  if (err instanceof HttpError) return err.status >= 500;
  return false;
}

/** Render's free tier sleeps; a network error or 5xx gets one retry after a short wait. */
export async function withColdStartRetry<T>(op: () => Promise<T>, waitMs = 1500): Promise<T> {
  try {
    return await op();
  } catch (err) {
    if (!isColdStartError(err)) throw err;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return op();
  }
}
