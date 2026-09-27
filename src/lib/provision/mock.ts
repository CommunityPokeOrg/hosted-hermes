import { randomUUID } from "node:crypto";
import {
  ProvisionerError,
  type ContainerInfo,
  type ContainerSpec,
  type ContainerStatsSample,
  type ProvisionResult,
  type Provisioner,
} from "./types";

interface MockContainer {
  id: string;
  spec: ContainerSpec;
  running: boolean;
  startedAt: string | null;
  bootTime: number;
  logLines: string[];
}

/**
 * In-process provisioner for development and tests. Simulates the full
 * container lifecycle, emits plausible logs and metrics, and requires no
 * Docker daemon.
 */
export class MockProvisioner implements Provisioner {
  readonly driver = "mock";
  private containers = new Map<string, MockContainer>();

  /** Test hook: make the next create() fail with this message. */
  failNextCreate: string | null = null;

  private get(id: string): MockContainer {
    const c = this.containers.get(id);
    if (!c) throw new ProvisionerError("container not found", 404, id);
    return c;
  }

  async create(spec: ContainerSpec): Promise<ProvisionResult> {
    if (this.failNextCreate) {
      const msg = this.failNextCreate;
      this.failNextCreate = null;
      throw new ProvisionerError(msg, 500);
    }
    const id = `mock-${randomUUID().slice(0, 12)}`;
    this.containers.set(id, {
      id,
      spec,
      running: false,
      startedAt: null,
      bootTime: Date.now(),
      logLines: [`[hermes] container created for ${spec.containerName}`],
    });
    return { containerId: id, hostPort: spec.hostPort };
  }

  async start(containerId: string): Promise<void> {
    const c = this.get(containerId);
    if (c.running) return;
    c.running = true;
    c.startedAt = new Date().toISOString();
    c.logLines.push(
      `[hermes] starting agent image=${c.spec.image}`,
      `[hermes] model=${c.spec.env.HERMES_MODEL ?? "unknown"}`,
      "[hermes] listening on :8080",
    );
  }

  async stop(containerId: string): Promise<void> {
    const c = this.get(containerId);
    if (!c.running) return;
    c.running = false;
    c.logLines.push("[hermes] received SIGTERM, shutting down");
  }

  async restart(containerId: string): Promise<void> {
    await this.stop(containerId);
    await this.start(containerId);
  }

  async remove(containerId: string): Promise<void> {
    this.containers.delete(containerId);
  }

  async inspect(containerId: string): Promise<ContainerInfo> {
    const c = this.get(containerId);
    return {
      containerId: c.id,
      running: c.running,
      status: c.running ? "running" : "exited",
      startedAt: c.startedAt,
      exitCode: c.running ? null : 0,
    };
  }

  async logs(containerId: string, tail: number): Promise<string> {
    const c = this.get(containerId);
    if (c.running) {
      c.logLines.push(`[hermes] heartbeat uptime=${Math.round((Date.now() - c.bootTime) / 1000)}s`);
    }
    return c.logLines.slice(-tail).join("\n");
  }

  async stats(containerId: string): Promise<ContainerStatsSample> {
    const c = this.get(containerId);
    if (!c.running) {
      return { cpuPercent: 0, memoryMb: 0, memoryLimitMb: c.spec.memoryMb, networkRxBytes: 0, networkTxBytes: 0 };
    }
    const t = Date.now() / 1000;
    return {
      // Deterministic-ish plausible metrics that vary over time.
      cpuPercent: Math.round((8 + 6 * Math.sin(t / 7) + Math.random() * 4) * 100) / 100,
      memoryMb: Math.round((c.spec.memoryMb * (0.35 + 0.1 * Math.sin(t / 11)) * 10)) / 10,
      memoryLimitMb: c.spec.memoryMb,
      networkRxBytes: Math.round(50_000 + t * 120),
      networkTxBytes: Math.round(20_000 + t * 60),
    };
  }
}
