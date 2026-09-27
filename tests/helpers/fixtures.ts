import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import type { AgentConfig } from "@/lib/models";
import { hashPassword } from "@/lib/auth/passwords";
import { SESSION_COOKIE } from "@/lib/auth/sessions";
import { MemoryStore } from "@/lib/store/memory";
import type { Store } from "@/lib/store/store";

export function makeStore(): Store {
  return new MemoryStore();
}

export function makeUser(store: Store, email = "admin@test.dev", password = "pw") {
  return store.createUser({
    id: randomUUID(),
    email,
    passwordHash: hashPassword(password),
    role: "admin",
  });
}

export function makeAgentConfig(store: Store, overrides: Partial<AgentConfig> = {}): AgentConfig {
  return store.createAgentConfig({
    id: randomUUID(),
    name: "test-agent",
    model: "hermes-3-70b",
    systemPrompt: "test",
    tools: ["web_search"],
    env: {},
    resources: { cpus: 1, memoryMb: 512 },
    ...overrides,
  });
}

/** Build a NextRequest suitable for calling a route handler directly. */
export function req(
  url: string,
  opts: { method?: string; body?: unknown; token?: string; bearer?: string } = {},
): NextRequest {
  const headers = new Headers();
  if (opts.body !== undefined) headers.set("content-type", "application/json");
  if (opts.token) headers.set("cookie", `${SESSION_COOKIE}=${opts.token}`);
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);
  return new NextRequest(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

export function params(id: string) {
  return { params: Promise.resolve({ id }) };
}
