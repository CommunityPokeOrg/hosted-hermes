import { describe, expect, it } from "vitest";
import { MockProvisioner } from "@/lib/provision/mock";
import { ProvisionerError, type ContainerSpec } from "@/lib/provision/types";

const spec: ContainerSpec = {
  containerName: "hh-agent-test",
  image: "hermes:latest",
  env: { HERMES_MODEL: "m" },
  hostPort: 19000,
  containerPort: 8080,
  cpus: 1,
  memoryMb: 512,
  network: "hosted-hermes",
  labels: {},
};

describe("MockProvisioner", () => {
  it("runs the full lifecycle", async () => {
    const p = new MockProvisioner();
    const { containerId, hostPort } = await p.create(spec);
    expect(hostPort).toBe(19000);

    let info = await p.inspect(containerId);
    expect(info.running).toBe(false);

    await p.start(containerId);
    info = await p.inspect(containerId);
    expect(info.running).toBe(true);
    expect(info.startedAt).not.toBeNull();

    const stats = await p.stats(containerId);
    expect(stats.cpuPercent).toBeGreaterThan(0);
    expect(stats.memoryLimitMb).toBe(512);

    const logs = await p.logs(containerId, 50);
    expect(logs).toContain("starting agent");

    await p.stop(containerId);
    expect((await p.inspect(containerId)).running).toBe(false);

    await p.remove(containerId);
    await expect(p.inspect(containerId)).rejects.toThrow(ProvisionerError);
  });

  it("can be told to fail the next create", async () => {
    const p = new MockProvisioner();
    p.failNextCreate = "image pull failed";
    await expect(p.create(spec)).rejects.toThrow("image pull failed");
    // Next create succeeds
    await expect(p.create(spec)).resolves.toBeTruthy();
  });
});
