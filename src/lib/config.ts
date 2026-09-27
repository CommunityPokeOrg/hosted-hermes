export interface AppConfig {
  adminEmail: string;
  adminPassword: string;
  storePath: string;
  provisioner: "docker" | "mock";
  dockerSocket: string;
  dockerHost: string | null;
  dockerNetwork: string;
  agentImage: string;
  agentCallbackToken: string | null;
  sessionTtlSeconds: number;
  /** First host port used when publishing agent containers. */
  portRangeStart: number;
  portRangeEnd: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    adminEmail: env.HH_ADMIN_EMAIL ?? "admin@example.com",
    adminPassword: env.HH_ADMIN_PASSWORD ?? "admin",
    storePath: env.HH_STORE_PATH ?? "./data/hosted-hermes.json",
    provisioner: env.HH_PROVISIONER === "docker" ? "docker" : "mock",
    dockerSocket: env.HH_DOCKER_SOCKET ?? "/var/run/docker.sock",
    dockerHost: env.HH_DOCKER_HOST ?? null,
    dockerNetwork: env.HH_DOCKER_NETWORK ?? "hosted-hermes",
    agentImage: env.HH_AGENT_IMAGE ?? "ghcr.io/communitypokeorg/hermes-agent:latest",
    agentCallbackToken: env.HH_AGENT_CALLBACK_TOKEN ?? null,
    sessionTtlSeconds: Number(env.HH_SESSION_TTL ?? 604800),
    portRangeStart: Number(env.HH_PORT_RANGE_START ?? 19000),
    portRangeEnd: Number(env.HH_PORT_RANGE_END ?? 19999),
  };
}
