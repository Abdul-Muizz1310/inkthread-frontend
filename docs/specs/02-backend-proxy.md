# 02 · The signed backend proxy (platform contract v2)

inkthread-backend, on contract v2 (its spec 12), answers every route but `/health`, `/version`,
`/metrics` and its docs only with an Ed25519 platform token for `aud: "inkthread"`. This frontend
holds its own key (DR-0030): its server mints a 60-second token per upstream call, and the browser
reaches the backend only through same-origin routes that sign and forward.

| piece | file |
|---|---|
| token claims, base64url, key parsing (pure) | `src/lib/server/token-claims.ts` |
| key loading and signing (`node:crypto`) | `src/lib/server/platform-token.ts` |
| path allowlist and header allowlists (pure) | `src/lib/server/proxy-rules.ts` |
| the proxy (imperative shell) | `src/lib/server/backend-proxy.ts` |
| route handlers | `src/app/api/backend/[...path]/route.ts`, `src/app/api/upload-token/route.ts` |
| where browser code points | `src/lib/api/client.ts` (`apiUrl` → `/api/backend/...`) |

Every module under `src/lib/server/` starts with `import "server-only"`, which Next turns into a build
error if a client component pulls it in.

## 1. The token

- **Key.** `INKTHREAD_FRONTEND_SIGNING_KEY_PRIVATE`: Ed25519, PKCS#8 DER, base64, server-only
  (never `NEXT_PUBLIC_*`). The backend holds the public half as
  `INKTHREAD_FRONTEND_SIGNING_KEY_PUBLIC` (SPKI DER, base64). A byte-order mark and edge whitespace
  are stripped; unset or blank is *missing*; anything that is not strict base64 of an Ed25519 PKCS#8
  key is *malformed*. The key is read per request, never at import.
- **Header.** `{"alg":"EdDSA","typ":"JWT","kid":"inkthread-frontend-2026-10"}`.
- **Claims.** `{"iss":"inkthread-frontend","aud":"inkthread","sub":"inkthread-frontend",
  "role":"frontend","service":"inkthread","iat":<now>,"exp":<now+60>,"jti":<uuid v4>}`, `iat` in
  whole seconds; a fresh token, with a fresh `jti`, for every upstream call.

## 2. `/api/backend/[...path]`: reads

`GET` only (and the automatic `OPTIONS`). `runtime = "nodejs"`, `dynamic = "force-dynamic"`,
`maxDuration = 300` (a job's event stream; the client reconnects with `?after=`).

**Path allowlist**, on the decoded segments; anything else is `400 {"error":"invalid path"}` with no
upstream call:

| path | query |
|---|---|
| `samples` | — |
| `documents/<uuid>` | — |
| `documents/<uuid>/graph`, `graph.jsonld`, `graph.graphml`, `graph.cypher`, `reading` | — |
| `documents/<uuid>/pages/<n>.png`, `documents/<uuid>/pages/<n>/geometry` | — |
| `documents/<uuid>/why/<element>` (a kind letter, `:`, 16 hex, an optional `:<n>`, an optional `#<role>`) | — |
| `jobs/<uuid>`, `jobs/<uuid>/events` | `after=<digits>` on `events` only |

Each segment is re-encoded (`encodeURIComponent`) onto `${NEXT_PUBLIC_API_URL}`; the result must keep
the backend's origin. Writes (uploads aside, § 3) and the admin routes are never proxied.

**Request headers** copied from the browser: `accept`, `last-event-id`, `x-request-id`,
`if-none-match`. Never `cookie` or `authorization`; an incoming `x-platform-token` is replaced by the
fresh one. `x-forwarded-for` carries the leftmost address of the incoming `x-forwarded-for` (or
`x-real-ip`).

**Response.** The upstream status and body, the body handed over as a stream and never read (so the
event stream arrives event by event and a page PNG stays bytes), with only these headers:
`content-type`, `cache-control`, `etag`, `content-disposition`, `retry-after`, `x-request-id`,
`last-event-id`, `x-accel-buffering`.

**Failures.** No usable key → `503 {"error":"proxy not configured"}` (logged by reason, never by value)
and no upstream call. The backend unreachable → `502 {"error":"backend unreachable"}`; a closed tab
aborts the upstream call and is not logged as a failure.

## 3. Uploads: a short-lived token, straight to the backend

Vercel Functions take request bodies up to 4.5 MB; inkthread accepts PDFs up to 15 MB. So an upload
does not pass through the proxy:

1. the browser `POST`s `/api/upload-token`;
2. the server mints one token (§ 1, 60 s) and answers `{"token", "url", "expires_at"}` with
   `Cache-Control: no-store`, where `url` is `${NEXT_PUBLIC_API_URL}/documents`;
3. the browser sends the multipart form to `url` by XHR (upload progress), with `X-Platform-Token`.

The browser holds that token for at most a minute. It grants what the proxy already grants anyone on
the site, for inkthread only (`aud`), and another site's script cannot read it (the route sends no
CORS headers). The backend's CORS must list this site's origin (it does today) and allow
`x-platform-token` (contract v2). No usable key → `503`, and the upload says the site could not
authorise it.

Consequence to know: the backend keys upload limits on the token's `iss:sub`, so every upload through
this site shares one bucket (`UPLOADS_PER_HOUR`, 5 by default).

## 4. Browser code

- `apiUrl(path)` is `/api/backend` + `path`: TanStack queries, page images, exports and the event
  stream (`new EventSource('/api/backend/jobs/<id>/events?after=N')`) all go through the proxy.
- `NEXT_PUBLIC_API_URL` is read by the server (proxy, upload token, CSP) and by the nav's link to the
  backend's public `/docs`; no browser data call is built from it.
- CSP: `img-src` no longer lists the backend (pages are same-origin); `connect-src` keeps it for the
  direct upload.

## 5. Test cases

Token (unit):
- T-PX-1 The claims are exactly § 1's, `exp - iat == 60`, and the token verifies with the public half.
- T-PX-2 Two tokens differ (`jti`); the header is exactly § 1's.
- T-PX-3 A missing, blank, non-base64, RSA, X25519 or public key is refused as missing or malformed;
  a BOM and a trailing CRLF are tolerated.

Rules (unit):
- T-PX-4 Every allowlisted path resolves to the backend URL with its segments re-encoded; `why` ids
  with `:` and `#` survive the round trip.
- T-PX-5 Refused: no segments, an unknown route, a non-UUID id, `..`, a segment with `/`, a page that
  is not digits, `graph.exe`, a query on anything but `events`, an `after` that is not digits, and an
  admin route (`reprocess`).
- T-PX-6 Request headers: only the allowlist, the fresh token, and one `x-forwarded-for` address.
- T-PX-7 Response headers: only the allowlist.

Route (the composed proxy, `fetch` stubbed):
- T-PX-8 A GET reaches the backend with a valid token, `cache: no-store`, `redirect: manual` and the
  request's abort signal; the status and allowlisted headers come back.
- T-PX-9 The event stream: the first event reaches the browser while the upstream is still open, and
  `Last-Event-ID` is forwarded.
- T-PX-10 A page PNG comes back as `image/png` with its bytes intact; an export keeps its
  `content-disposition`.
- T-PX-11 No key → 503 and no upstream call; an unreachable backend → 502; a refused path → 400.
- T-PX-12 The route exports `GET` only, with `runtime`, `dynamic` and `maxDuration` as § 2.
- T-PX-13 `/api/upload-token` answers a token that verifies, the backend's `/documents` URL and
  `no-store`; without a key it answers 503.

Browser (unit and E2E):
- T-PX-14 `apiUrl` builds same-origin `/api/backend/...` URLs.
- T-PX-15 The upload asks for a token, then posts the PDF to the returned URL with the token header;
  a failed token request shows the authorisation message and posts nothing.
- T-PX-16 E2E: the landing, the workspace, the page image, the reading and the live build all load
  through `/api/backend`, and an upload goes token-then-backend.
