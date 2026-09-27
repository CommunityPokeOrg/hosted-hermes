import { describe, expect, it, beforeEach } from "vitest";
import { authenticateApiKey, createApiKey, hashApiKey } from "@/lib/auth/apiKeys";
import { setStoreForTesting } from "@/lib/store";
import { makeStore, makeUser, req } from "../helpers/fixtures";

describe("API keys", () => {
  beforeEach(() => {
    const store = makeStore();
    makeUser(store);
    setStoreForTesting(store);
  });

  it("generates keys with hhk_ prefix and stores only the hash", async () => {
    const { apiKey, plaintext } = createApiKey("ci", ["read"], "u1");
    expect(plaintext).toMatch(/^hhk_/);
    expect(apiKey.hash).toBe(hashApiKey(plaintext));
    expect(apiKey.hash).not.toBe(plaintext);
    expect(apiKey.prefix).toBe(plaintext.slice(0, 12));
  });

  it("authenticates a valid bearer token and touches lastUsedAt", () => {
    const { plaintext } = createApiKey("ci", ["read"], "u1");
    const key = authenticateApiKey(req("http://x/api/v1/instances", { bearer: plaintext }), ["read"]);
    expect(key).not.toBeNull();
    expect(key!.lastUsedAt).not.toBeNull();
  });

  it("rejects missing, malformed, and revoked keys", () => {
    const { apiKey, plaintext } = createApiKey("ci", ["read"], "u1");
    expect(authenticateApiKey(req("http://x/"), ["read"])).toBeNull();
    expect(authenticateApiKey(req("http://x/", { bearer: "nope" }), ["read"])).toBeNull();

    // Revoked key
    const store = makeStore();
    setStoreForTesting(store);
    store.createApiKey({ ...apiKey });
    store.revokeApiKey(apiKey.id);
    expect(authenticateApiKey(req("http://x/", { bearer: plaintext }), ["read"])).toBeNull();
  });

  it("enforces scopes, with admin covering everything", () => {
    const { plaintext: readOnly } = createApiKey("ro", ["read"], "u1");
    const { plaintext: admin } = createApiKey("root", ["admin"], "u1");

    expect(authenticateApiKey(req("http://x/", { bearer: readOnly }), ["write"])).toBeNull();
    // admin covers read+write
    expect(authenticateApiKey(req("http://x/", { bearer: admin }), ["read", "write"])).not.toBeNull();
  });
});
