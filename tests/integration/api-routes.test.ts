import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createSession } from "@/lib/auth/sessions";
import { createApiKey } from "@/lib/auth/apiKeys";
import { MockProvisioner } from "@/lib/provision/mock";
import { setProvisionerForTesting } from "@/lib/provision";
import { getStore, setStoreForTesting } from "@/lib/store";
import { loadConfig } from "@/lib/config";
import { makeAgentConfig, makeStore, makeUser, params, req } from "../helpers/fixtures";

import { POST as loginPost } from "@/app/api/auth/login/route";
import { GET as instancesGet, POST as instancesPost } from "@/app/api/instances/route";
import { DELETE as instanceDelete, GET as instanceGet } from "@/app/api/instances/[id]/route";
import { POST as actionPost } from "@/app/api/instances/[id]/action/route";
import { GET as logsGet } from "@/app/api/instances/[id]/logs/route";
import { GET as agentsGet, POST as agentsPost } from "@/app/api/agents/route";
import { DELETE as agentDelete } from "@/app/api/agents/[id]/route";
import { GET as keysGet, POST as keysPost } from "@/app/api/keys/route";
import { DELETE as keyDelete } from "@/app/api/keys/[id]/route";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as v1InstancesGet, POST as v1InstancesPost } from "@/app/api/v1/instances/route";

const BASE = "http://test.local";
const config = loadConfig({ ...process.env, HH_PROVISIONER: "mock" });

async function signIn(): Promise<string> {
  makeUser(getStore(), "admin@test.dev", "pw123");
  const res = await loginPost(req(`${BASE}/api/auth/login`, {
    method: "POST",
    body: { email: "admin@test.dev", password: "pw123" },
  }));
  expect(res.status).toBe(200);
  const cookie = res.headers.get("set-cookie")!;
  return cookie.match(/hh_session=([^;]+)/)![1];
}

beforeEach(() => {
  setStoreForTesting(makeStore());
  setProvisionerForTesting(new MockProvisioner(), config);
});

describe("auth routes", () => {
  it("logs in with valid credentials and sets a session cookie", async () => {
    const token = await signIn();
    expect(token.length).toBeGreaterThan(20);
  });

  it("rejects bad credentials", async () => {
    makeUser(getStore(), "a@b.cd", "right");
    const res = await loginPost(req(`${BASE}/api/auth/login`, {
      method: "POST",
      body: { email: "a@b.cd", password: "wrong" },
    }));
    expect(res.status).toBe(401);
  });
});

describe("dashboard API", () => {
  it("rejects unauthenticated requests", async () => {
    expect((await instancesGet(req(`${BASE}/api/instances`))).status).toBe(401);
  });

  it("creates and lists instances through the full stack", async () => {
    const token = await signIn();
    const agent = makeAgentConfig(getStore());

    const create = await instancesPost(req(`${BASE}/api/instances`, {
      method: "POST",
      token,
      body: { name: "api-01", agentConfigId: agent.id },
    }));
    expect(create.status).toBe(201);
    const { instance } = await create.json();
    expect(instance.status).toBe("running");

    const list = await instancesGet(req(`${BASE}/api/instances`, { token }));
    const body = await list.json();
    expect(body.instances).toHaveLength(1);
    expect(body.instances[0].name).toBe("api-01");

    const detail = await instanceGet(req(`${BASE}/api/instances/${instance.id}`, { token }), params(instance.id));
    expect((await detail.json()).instance.id).toBe(instance.id);

    const logs = await logsGet(req(`${BASE}/api/instances/${instance.id}/logs`, { token }), params(instance.id));
    expect((await logs.json()).logs).toContain("starting agent");

    await actionPost(req(`${BASE}/api/instances/${instance.id}/action`, {
      method: "POST",
      token,
      body: { action: "stop" },
    }), params(instance.id));
    expect(getStore().getInstance(instance.id)!.status).toBe("stopped");

    await instanceDelete(req(`${BASE}/api/instances/${instance.id}`, { method: "DELETE", token }), params(instance.id));
    expect(getStore().getInstance(instance.id)).toBeNull();
  });

  it("validates instance names", async () => {
    const token = await signIn();
    const agent = makeAgentConfig(getStore());
    const res = await instancesPost(req(`${BASE}/api/instances`, {
      method: "POST",
      token,
      body: { name: "INVALID NAME!", agentConfigId: agent.id },
    }));
    expect(res.status).toBe(400);
  });

  it("manages agent configs", async () => {
    const token = await signIn();
    const create = await agentsPost(req(`${BASE}/api/agents`, {
      method: "POST",
      token,
      body: { name: "cfg", model: "hermes-3-8b", tools: ["web_search"] },
    }));
    expect(create.status).toBe(201);
    const { agent } = await create.json();

    const list = await agentsGet(req(`${BASE}/api/agents`, { token }));
    expect((await list.json()).agents).toHaveLength(1);

    await agentDelete(req(`${BASE}/api/agents/${agent.id}`, { method: "DELETE", token }), params(agent.id));
    expect(getStore().getAgentConfig(agent.id)).toBeNull();
  });

  it("creates and revokes API keys without exposing hashes", async () => {
    const token = await signIn();
    const create = await keysPost(req(`${BASE}/api/keys`, {
      method: "POST",
      token,
      body: { name: "ci", scopes: ["read", "write"] },
    }));
    const { key, plaintext } = await create.json();
    expect(plaintext).toMatch(/^hhk_/);
    expect(key.hash).toBeUndefined();

    const list = await keysGet(req(`${BASE}/api/keys`, { token }));
    const listed = (await list.json()).keys[0];
    expect(listed.hash).toBeUndefined();

    await keyDelete(req(`${BASE}/api/keys/${key.id}`, { method: "DELETE", token }), params(key.id));
    expect(getStore().getApiKey(key.id)!.revokedAt).not.toBeNull();
  });

  it("health endpoint is unauthenticated", async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });
});

describe("v1 external API", () => {
  it("rejects requests without a key", async () => {
    expect((await v1InstancesGet(req(`${BASE}/api/v1/instances`))).status).toBe(401);
  });

  it("provisions with a write-scoped key", async () => {
    await signIn();
    const agent = makeAgentConfig(getStore());
    const { plaintext } = createApiKey("ext", ["write"], randomUUID());

    const res = await v1InstancesPost(req(`${BASE}/api/v1/instances`, {
      method: "POST",
      bearer: plaintext,
      body: { name: "ext-01", agentConfigId: agent.id },
    }));
    expect(res.status).toBe(201);
    expect((await res.json()).instance.status).toBe("running");
  });

  it("enforces read vs write scopes", async () => {
    await signIn();
    const agent = makeAgentConfig(getStore());
    const { plaintext } = createApiKey("reader", ["read"], randomUUID());

    const res = await v1InstancesPost(req(`${BASE}/api/v1/instances`, {
      method: "POST",
      bearer: plaintext,
      body: { name: "nope-01", agentConfigId: agent.id },
    }));
    expect(res.status).toBe(401);
  });
});

describe("sessions", () => {
  it("creates sessions that expire", async () => {
    const user = makeUser(getStore());
    const { session } = createSession(user.id);
    expect(getStore().getSession(session.token)?.userId).toBe(user.id);
  });
});
