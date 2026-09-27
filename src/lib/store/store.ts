import type {
  AgentConfig,
  ApiKey,
  Instance,
  InstanceStats,
  Session,
  User,
} from "@/lib/models";

/**
 * Persistence abstraction for all dashboard state. Implementations must be
 * safe for concurrent use within a single Node.js process (all operations
 * are synchronous reads over in-memory indexes plus async persistence).
 */
export interface Store {
  // Users
  createUser(user: Omit<User, "createdAt">): User;
  getUser(id: string): User | null;
  getUserByEmail(email: string): User | null;
  listUsers(): User[];

  // Sessions
  createSession(session: Session): Session;
  getSession(token: string): Session | null;
  deleteSession(token: string): void;

  // API keys
  createApiKey(key: Omit<ApiKey, "createdAt" | "lastUsedAt" | "revokedAt">): ApiKey;
  getApiKey(id: string): ApiKey | null;
  findApiKeyByHash(hash: string): ApiKey | null;
  listApiKeys(): ApiKey[];
  revokeApiKey(id: string): ApiKey | null;
  touchApiKey(id: string, at: string): void;

  // Agent configs
  createAgentConfig(config: Omit<AgentConfig, "createdAt" | "updatedAt">): AgentConfig;
  getAgentConfig(id: string): AgentConfig | null;
  listAgentConfigs(): AgentConfig[];
  updateAgentConfig(id: string, patch: Partial<Omit<AgentConfig, "id">>): AgentConfig | null;
  deleteAgentConfig(id: string): boolean;

  // Instances
  createInstance(instance: Omit<Instance, "createdAt" | "updatedAt">): Instance;
  getInstance(id: string): Instance | null;
  listInstances(): Instance[];
  updateInstance(id: string, patch: Partial<Omit<Instance, "id">>): Instance | null;
  deleteInstance(id: string): boolean;

  // Stats
  recordStats(stats: InstanceStats): void;
  latestStats(instanceId: string): InstanceStats | null;
  recentStats(instanceId: string, limit: number): InstanceStats[];

  // Lifecycle
  flush(): Promise<void>;
}
