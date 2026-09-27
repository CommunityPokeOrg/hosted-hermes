import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import type { ApiKey, ApiKeyScope } from "@/lib/models";

const KEY_PREFIX = "hhk_";

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const plaintext = KEY_PREFIX + randomBytes(24).toString("base64url");
  return { plaintext, prefix: plaintext.slice(0, 12), hash: hashApiKey(plaintext) };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function createApiKey(
  name: string,
  scopes: ApiKeyScope[],
  createdBy: string,
): { apiKey: ApiKey; plaintext: string } {
  const { plaintext, prefix, hash } = generateApiKey();
  const apiKey = getStore().createApiKey({
    id: randomUUID(),
    name,
    prefix,
    hash,
    scopes,
    createdBy,
  });
  return { apiKey, plaintext };
}

/**
 * Authenticate a request carrying `Authorization: Bearer hhk_...`.
 * Returns the key record when valid and holding every required scope.
 */
export function authenticateApiKey(
  req: NextRequest,
  required: ApiKeyScope[] = ["read"],
): ApiKey | null {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.startsWith(KEY_PREFIX)) return null;
  const key = getStore().findApiKeyByHash(hashApiKey(token));
  if (!key || key.revokedAt) return null;
  const hasScopes = required.every((s) => key.scopes.includes(s) || key.scopes.includes("admin"));
  if (!hasScopes) return null;
  getStore().touchApiKey(key.id, new Date().toISOString());
  return key;
}
