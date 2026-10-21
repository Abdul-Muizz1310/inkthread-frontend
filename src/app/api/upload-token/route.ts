import { apiBase } from "@/lib/env";
import { loadSigningKey, mintPlatformToken, SIGNING_KEY_ENV } from "@/lib/server/platform-token";
import { tokenClaims } from "@/lib/server/token-claims";

/**
 * A one-minute platform token for a direct browser-to-backend upload (spec 02 § 3). Vercel Functions
 * take request bodies up to 4.5 MB and inkthread accepts 15 MB, so the PDF cannot pass the proxy.
 * No CORS headers are sent, so another site's script cannot read the token.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

export async function POST(): Promise<Response> {
  const signingKey = loadSigningKey(process.env[SIGNING_KEY_ENV]);
  if (!signingKey.ok) {
    console.error(`[api/upload-token] ${SIGNING_KEY_ENV} is ${signingKey.reason}`);
    return Response.json({ error: "proxy not configured" }, { status: 503, headers: NO_STORE });
  }
  const now = Date.now();
  return Response.json(
    {
      token: mintPlatformToken(signingKey.key, now),
      url: `${apiBase()}/documents`,
      expires_at: tokenClaims(now, "").exp,
    },
    { headers: NO_STORE },
  );
}
