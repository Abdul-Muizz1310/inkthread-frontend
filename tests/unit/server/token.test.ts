// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadSigningKey, mintPlatformToken } from "@/lib/server/platform-token";
import { parseKeyEnv, TOKEN_HEADER, tokenClaims } from "@/lib/server/token-claims";
import { decodePart, ed25519Pair, rsaPrivateB64, verifiesWith, x25519PrivateB64 } from "./keys";

/** Spec 02 § 1, T-PX-1…3: the frontend's platform token, contract v2. */

const pair = ed25519Pair();

function key() {
  const loaded = loadSigningKey(pair.privateB64);
  if (!loaded.ok) throw new Error("test key did not load");
  return loaded.key;
}

describe("claims (T-PX-1)", () => {
  it("are exactly contract v2's for inkthread", () => {
    const claims = tokenClaims(1_700_000_000_999, "jti-1");
    expect(claims).toEqual({
      iss: "inkthread-frontend",
      aud: "inkthread",
      sub: "inkthread-frontend",
      role: "frontend",
      service: "inkthread",
      iat: 1_700_000_000,
      exp: 1_700_000_060,
      jti: "jti-1",
    });
  });
  it("sign into a token the public half verifies", () => {
    const token = mintPlatformToken(key(), 1_700_000_000_000, "jti-2");
    expect(verifiesWith(token, pair.publicB64)).toBe(true);
    const [head, body] = token.split(".");
    expect(decodePart(head)).toEqual(TOKEN_HEADER);
    expect(decodePart(body)).toMatchObject({ aud: "inkthread", iss: "inkthread-frontend" });
    expect(verifiesWith(token, ed25519Pair().publicB64)).toBe(false);
  });
});

describe("freshness (T-PX-2)", () => {
  it("gives every token its own jti and the fixed header", () => {
    const a = mintPlatformToken(key());
    const b = mintPlatformToken(key());
    expect(a).not.toBe(b);
    expect(decodePart(a.split(".")[1])).not.toEqual(decodePart(b.split(".")[1]));
    expect(TOKEN_HEADER).toEqual({ alg: "EdDSA", typ: "JWT", kid: "inkthread-frontend-2026-10" });
  });
});

describe("the key's env value (T-PX-3)", () => {
  it.each([undefined, "", "   ", "\r\n"])("%j is missing", (raw) => {
    expect(parseKeyEnv(raw)).toEqual({ kind: "missing" });
    expect(loadSigningKey(raw)).toEqual({ ok: false, reason: "missing" });
  });
  it.each(["not base64!", "abc", "ab\ncd==", "===="])("%j is malformed", (raw) => {
    expect(parseKeyEnv(raw).kind).toBe("malformed");
  });
  it("refuses a key that is not an Ed25519 private key", () => {
    expect(loadSigningKey(rsaPrivateB64())).toEqual({ ok: false, reason: "malformed" });
    expect(loadSigningKey(x25519PrivateB64())).toEqual({ ok: false, reason: "malformed" });
    expect(loadSigningKey(pair.publicB64)).toEqual({ ok: false, reason: "malformed" });
  });
  it("tolerates a BOM and a trailing CRLF", () => {
    expect(loadSigningKey(`﻿${pair.privateB64}\r\n`).ok).toBe(true);
  });
});
