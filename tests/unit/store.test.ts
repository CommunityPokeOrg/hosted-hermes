import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileStore } from "@/lib/store/file";
import { MemoryStore, StoreError } from "@/lib/store/memory";
import { makeAgentConfig, makeStore, makeUser } from "../helpers/fixtures";

describe("MemoryStore", () => {
  it("enforces unique user emails case-insensitively", () => {
    const s = makeStore();
    makeUser(s, "a@b.c");
    expect(() => makeUser(s, "A@B.C")).toThrow(StoreError);
  });

  it("enforces unique instance names", () => {
    const s = makeStore();
    const agent = makeAgentConfig(s);
    const base = {
      agentConfigId: agent.id,
      status: "pending" as const,
      containerId: null,
      hostPort: null,
      error: null,
      startedAt: null,
      exitCode: null,
    };
    s.createInstance({ id: "i1", name: "n1", ...base });
    expect(() => s.createInstance({ id: "i2", name: "n1", ...base })).toThrow(StoreError);
  });

  it("expires sessions", () => {
    const s = makeStore();
    s.createSession({
      token: "t",
      userId: "u",
      createdAt: new Date(0).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(s.getSession("t")).toBeNull();
  });

  it("blocks deleting agent configs in use", () => {
    const s = makeStore();
    const agent = makeAgentConfig(s);
    s.createInstance({
      id: "i1",
      name: "n1",
      agentConfigId: agent.id,
      status: "running",
      containerId: null,
      hostPort: null,
      error: null,
      startedAt: null,
      exitCode: null,
    });
    expect(() => s.deleteAgentConfig(agent.id)).toThrow(StoreError);
  });

  it("caps stats history per instance", () => {
    const s = makeStore();
    for (let i = 0; i < 600; i++) {
      s.recordStats({
        instanceId: "i1",
        cpuPercent: i,
        memoryMb: 1,
        memoryLimitMb: 512,
        networkRxBytes: 0,
        networkTxBytes: 0,
        collectedAt: new Date().toISOString(),
      });
    }
    expect(s.recentStats("i1", 1000).length).toBe(512);
    expect(s.latestStats("i1")!.cpuPercent).toBe(599);
  });
});

describe("FileStore", () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("persists state across instances", async () => {
    dir = mkdtempSync(join(tmpdir(), "hh-store-"));
    const path = join(dir, "state.json");
    const s1 = new FileStore(path);
    const agent = makeAgentConfig(s1);
    await s1.flush();

    const raw = JSON.parse(readFileSync(path, "utf8"));
    expect(raw.agentConfigs).toHaveLength(1);

    const s2 = new FileStore(path);
    expect(s2.getAgentConfig(agent.id)?.name).toBe("test-agent");
  });
});
