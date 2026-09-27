import type { AgentConfig, Instance } from "@/lib/models";

/** Spec handed to the provisioner when creating an agent container. */
export interface ContainerSpec {
  /** Stable name derived from the instance (e.g. "hh-agent-<name>"). */
  containerName: string;
  image: string;
  env: Record<string, string>;
  hostPort: number;
  containerPort: number;
  cpus: number;
  memoryMb: number;
  network: string;
  /** Extra labels for observability. */
  labels: Record<string, string>;
}

export interface ProvisionResult {
  containerId: string;
  hostPort: number;
}

export interface ContainerInfo {
  containerId: string;
  running: boolean;
  status: string;
  startedAt: string | null;
  exitCode: number | null;
}

export interface ContainerStatsSample {
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number;
  networkRxBytes: number;
  networkTxBytes: number;
}

export class ProvisionerError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly containerId?: string,
  ) {
    super(message);
    this.name = "ProvisionerError";
  }
}

/**
 * Pluggable runtime backend for agent instances. The Docker driver talks to
 * the Docker Engine API; the mock driver simulates containers in-process for
 * local development and tests.
 */
export interface Provisioner {
  readonly driver: string;
  create(spec: ContainerSpec): Promise<ProvisionResult>;
  start(containerId: string): Promise<void>;
  stop(containerId: string): Promise<void>;
  restart(containerId: string): Promise<void>;
  remove(containerId: string): Promise<void>;
  inspect(containerId: string): Promise<ContainerInfo>;
  logs(containerId: string, tail: number): Promise<string>;
  stats(containerId: string): Promise<ContainerStatsSample>;
}

/** Environment passed into every agent container. */
export function buildAgentEnv(
  instance: Instance,
  config: AgentConfig,
  extra: Record<string, string>,
): Record<string, string> {
  return {
    HERMES_INSTANCE_ID: instance.id,
    HERMES_INSTANCE_NAME: instance.name,
    HERMES_MODEL: config.model,
    HERMES_SYSTEM_PROMPT: config.systemPrompt,
    HERMES_TOOLS: config.tools.join(","),
    ...config.env,
    ...extra,
  };
}
