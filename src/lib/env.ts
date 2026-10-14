/** Public configuration, validated when first read. */
import { z } from "zod";
import { ConfigError } from "./api/errors";

const Url = z.string().url();

export function apiBase(): string {
  const parsed = Url.safeParse(process.env.NEXT_PUBLIC_API_URL);
  if (!parsed.success) throw new ConfigError("NEXT_PUBLIC_API_URL must be a valid URL");
  return parsed.data.replace(/\/+$/, "");
}

export function siteBase(): string {
  const parsed = Url.safeParse(process.env.NEXT_PUBLIC_SITE_URL);
  return parsed.success ? parsed.data.replace(/\/+$/, "") : "http://localhost:3000";
}
