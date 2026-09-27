import { describe, expect, it, beforeEach } from "vitest";
import { loadConfig } from "@/lib/config";
import { MockProvisioner } from "@/lib/provision/mock";
import { ProvisionService } from "@/lib/provision/service";
import { ProvisionerError } from "@/lib/provision/types";
import { MemoryStore } from "@/lib/store/memory";
import { makeAgentConfig } from "../helpers/fixtures";

const config = loadConfig({ ...process.env, HH_PORT_RANGE_START: "19100", HH_PORT_RANGE_END: "19102" });

describe("ProvisionService", () => {
  let store: MemoryStore;
  let mock: MockProvisioner;
  let service: ProvisionService;

  beforeEach(() => {
    store = new MemoryStore();
    mock = new MockProvisioner();
    service = new ProvisionService(store, mock, config);
  });

  it("provisions an instance end-to-end", async () => {
    const agent = makeAgentConfig(store);
    const instance = await service.createInstance("web-01", agent.id);

    expect(instance.status).toBe("running");
    expect(instance.containerId).toMatch(/^mock-/);
    expect(instance.hostPort).toBe(19100);

    const info = await mock.inspect(instance.containerId!);
    expect(info.running).toBe(true);
  });

  it("allocates distinct ports from the configured range", async () => {
    const agent = makeAgentConfig(store);
    const a = await service.createInstance("a1", agent.id);
    const b = await service.createInstance("a2", agent.id);
    await service.createInstance("a3", agent.id);
    expect(a.hostPort).toBe(19100);
    expect(b.hostPort).toBe(19101);
    await expect(service.createInstance("a4", agent.id)).rejects.toThrow("no free host ports");
  });

  it("marks the instance failed when provisioning fails", async () => {
    const agent = makeAgentConfig(store);
    mock.failNextCreate = "daemon unavailable";
    await expect(service.createInstance("bad", agent.id)).rejects.toThrow(ProvisionerError);
    const instance = store.listInstances()[0];
    expect(instance.status).toBe("failed");
    expect(instance.error).toBe("daemon unavailable");
  });

  it("injects agent env into the container spec", async () => {
    const agent = makeAgentConfig(store, { env: { CUSTOM: "yes" } });
    const instance = await service.createInstance("envtest", agent.id);
    const spec = service.buildSpec(instance, agent, instance.hostPort!);
    expect(spec.env.HERMES_MODEL).toBe("hermes-3-70b");
    expect(spec.env.HERMES_INSTANCE_NAME).toBe("envtest");
    expect(spec.env.CUSTOM).toBe("yes");
    expect(spec.containerName).toBe("hh-agent-envtest");
  });

  it("supports stop/start/restart lifecycle", async () => {
    const agent = makeAgentConfig(store);
    const instance = await service.createInstance("life", agent.id);

    await service.performAction(instance.id, "stop");
    expect(store.getInstance(instance.id)!.status).toBe("stopped");

    await service.performAction(instance.id, "start");
    expect(store.getInstance(instance.id)!.status).toBe("running");

    await service.performAction(instance.id, "restart");
    expect(store.getInstance(instance.id)!.status).toBe("running");
  });

  it("deletes an instance and removes its container", async () => {
    const agent = makeAgentConfig(store);
    const instance = await service.createInstance("doomed", agent.id);
    const containerId = instance.containerId!;

    await service.deleteInstance(instance.id);
    expect(store.getInstance(instance.id)).toBeNull();
    await expect(mock.inspect(containerId)).rejects.toThrow();
  });

  it("syncs status and records stats for running instances", async () => {
    const agent = makeAgentConfig(store);
    const instance = await service.createInstance("monitored", agent.id);
    await service.syncInstances();
    const stats = store.latestStats(instance.id);
    expect(stats).not.toBeNull();
    expect(stats!.memoryLimitMb).toBe(512);
  });

  it("marks instances failed when the container vanishes", async () => {
    const agent = makeAgentConfig(store);
    const instance = await service.createInstance("ghost", agent.id);
    await mock.remove(instance.containerId!);
    await service.syncInstances();
    expect(store.getInstance(instance.id)!.status).toBe("failed");
    expect(store.getInstance(instance.id)!.error).toContain("missing");
  });

  it("rejects duplicate instance names", async () => {
    const agent = makeAgentConfig(store);
    await service.createInstance("dup", agent.id);
    await expect(service.createInstance("dup", agent.id)).rejects.toThrow();
  });
});
