import { apiBase } from "@/lib/env";
import { proxyToBackend } from "@/lib/server/backend-proxy";

/**
 * Same-origin proxy to inkthread-backend (spec 02 § 2). The browser reads `/api/backend/<path>`;
 * this signs a fresh platform token and forwards to the backend, streaming the answer back (the
 * job's event stream included). Reads only: uploads take `/api/upload-token` (spec 02 § 3).
 */

// node:crypto signs the token.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A job's event stream runs for minutes; the client's reconnect with `?after=` covers a cut.
export const maxDuration = 300;

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: Context): Promise<Response> {
  const { path } = await params;
  return proxyToBackend(request, path, apiBase());
}
