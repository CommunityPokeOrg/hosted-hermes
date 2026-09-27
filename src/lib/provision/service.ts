import { randomUUID } from "node:crypto";
import type { AppConfig } from "@/lib/config";
import type { AgentConfig, Instance, InstanceStats } from "@/lib/models";
import type { Store } from "@/lib/store/store";
import {
  ProvisionerError,
  buildAgentEnv,
  type ContainerSpec,
  type Provisioner,
} from "./types";

const CONTAINER_PORT = 8080;

/**
 * Orchestrates instance lifecycle: keeps the store's view of each instance
 * in sync with the provisioner and performs port allocation.
 */
export class ProvisionService {
  constructor(
    private readonly store: Store,
    private readonly provisioner: Provisioner,
    private readonly config: AppConfig,
  ) {}

  /** Allocate a host port not currently assigned to another instance. */
  private allocatePort(): number {
    const used = new Set(
      this.store
        .listInstances()
        .map((i) => i.hostPort)
        .filter((p): p is number => p !== null),
    );
    for (let p = this.config.portRangeStart; p <= this.config.portRangeEnd; p++) {
      if (!used.has(p)) return p;
    }
    throw new ProvisionerError("no free host ports in configured range");
  }

  async createInstance(name: string, agentConfigId: string): Promise<Instance> {
    const agent = this.store.getAgentConfig(agentConfigId);
    if (!agent) throw new ProvisionerError("agent config not found", 404);

    const instance = this.store.createInstance({
      id: randomUUID(),
      name,
      agentConfigId,
      status: "provisioning",
      containerId: null,
      hostPort: null,
      error: null,
      startedAt: null,
      exitCode: null,
    });

    const hostPort = this.allocatePort();
    const spec = this.buildSpec(instance, agent, hostPort);
    try {
      const result = await this.provisioner.create(spec);
      const updated = this.store.updateInstance(instance.id, {
        containerId: result.containerId,
        hostPort: result.hostPort,
      })!;
      await this.provisioner.start(result.containerId);
      return this.store.updateInstance(instance.id, { status: "running" }) ?? updated;
    } catch (err) {
      this.store.updateInstance(instance.id, {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  buildSpec(instance: Instance, agent: AgentConfig, hostPort: number): ContainerSpec {
    const extra: Record<string, string> = {};
    if (this.config.agentCallbackToken) {
      extra.HERMES_CALLBACK_TOKEN = this.config.agentCallbackToken;
    }
    return {
      containerName: `hh-agent-${instance.name}`,
      image: agent.image ?? this.config.agentImage,
      env: buildAgentEnv(instance, agent, extra),
      hostPort,
      containerPort: CONTAINER_PORT,
      cpus: agent.resources.cpus,
      memoryMb: agent.resources.memoryMb,
      network: this.config.dockerNetwork,
      labels: {
        "hosted-hermes.instance-id": instance.id,
        "hosted-hermes.agent-config-id": agent.id,
      },
    };
  }

  async performAction(instanceId: string, action: "start" | "stop" | "restart"): Promise<Instance> {
    const instance = this.requireInstance(instanceId);
    if (!instance.containerId) throw new ProvisionerError("instance has no container", 409);

    if (action === "start") {
      await this.provisioner.start(instance.containerId);
      this.store.updateInstance(instanceId, { status: "running", error: null });
    } else if (action === "stop") {
      await this.provisioner.stop(instance.containerId);
      this.store.updateInstance(instanceId, { status: "stopped" });
    } else {
      await this.provisioner.restart(instance.containerId);
      this.store.updateInstance(instanceId, { status: "running", error: null });
    }
    return this.requireInstance(instanceId);
  }

  async deleteInstance(instanceId: string): Promise<boolean> {
    const instance = this.requireInstance(instanceId);
    this.store.updateInstance(instanceId, { status: "deleting" });
    if (instance.containerId) {
      try {
        await this.provisioner.remove(instance.containerId);
      } catch (err) {
        // Container may already be gone; only surface real failures.
        if (err instanceof ProvisionerError && err.statusCode === 404) {
          // already gone — fine
        } else {
          this.store.updateInstance(instanceId, {
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      }
    }
    return this.store.deleteInstance(instanceId);
  }

  /**
   * Reconcile stored instance state with the provisioner and collect stats
   * for running instances. Called by the monitoring endpoints and the
   * background sync loop.
   */
  async syncInstances(): Promise<Instance[]> {
    const instances = this.store.listInstances();
    for (const instance of instances) {
      if (!instance.containerId || instance.status === "deleting") continue;
      try {
        const info = await this.provisioner.inspect(instance.containerId);
        const status = info.running ? "running" : instance.status === "provisioning" ? "provisioning" : "stopped";
        this.store.updateInstance(instance.id, {
          status,
          startedAt: info.startedAt,
          exitCode: info.exitCode,
        });
        if (info.running) {
          const sample = await this.provisioner.stats(instance.containerId);
          this.store.recordStats({
            instanceId: instance.id,
            ...sample,
            collectedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        if (err instanceof ProvisionerError && err.statusCode === 404) {
          this.store.updateInstance(instance.id, {
            status: "failed",
            error: "container missing on host",
          });
        }
        // Other errors are transient; keep last known state.
      }
    }
    return this.store.listInstances();
  }

  async getLogs(instanceId: string, tail = 200): Promise<string> {
    const instance = this.requireInstance(instanceId);
    if (!instance.containerId) return "";
    return this.provisioner.logs(instance.containerId, tail);
  }

  async getStats(instanceId: string, limit = 60): Promise<InstanceStats[]> {
    this.requireInstance(instanceId);
    return this.store.recentStats(instanceId, limit);
  }

  private requireInstance(id: string): Instance {
    const instance = this.store.getInstance(id);
    if (!instance) throw new ProvisionerError("instance not found", 404);
    return instance;
  }
}
