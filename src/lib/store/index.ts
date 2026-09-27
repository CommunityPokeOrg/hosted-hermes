import { randomUUID, scryptSync, randomBytes } from "node:crypto";
import { loadConfig } from "@/lib/config";
import { hashPassword } from "@/lib/auth/passwords";
import { FileStore } from "./file";
import type { Store } from "./store";

let store: Store | null = null;

/**
 * Process-wide store singleton. Route handlers and server components share
 * one instance so state survives across requests in dev and production.
 */
export function getStore(): Store {
  if (!store) {
    const config = loadConfig();
    store = new FileStore(config.storePath);
    seedAdmin(store, config.adminEmail, config.adminPassword);
  }
  return store;
}

/** For tests: inject a fresh store implementation. */
export function setStoreForTesting(s: Store | null): void {
  store = s;
}

export function seedAdmin(s: Store, email: string, password: string): void {
  if (s.getUserByEmail(email)) return;
  s.createUser({
    id: randomUUID(),
    email,
    passwordHash: hashPassword(password),
    role: "admin",
  });
}

// Re-export so callers never need deep imports.
export { hashPassword, verifyPassword } from "@/lib/auth/passwords";
export { randomBytes, scryptSync };
