import type {
  AgentConfig,
  ApiKey,
  Instance,
  InstanceStats,
  Session,
  User,
} from "@/lib/models";
import type { Store } from "./store";

const MAX_STATS_PER_INSTANCE = 512;

/** In-memory store. The default driver for tests and for development. */
export class MemoryStore implements Store {
  protected users = new Map<string, User>();
  protected sessions = new Map<string, Session>();
  protected apiKeys = new Map<string, ApiKey>();
  private apiKeyHashIndex = new Map<string, string>();
  protected agentConfigs = new Map<string, AgentConfig>();
  protected instances = new Map<string, Instance>();
  protected stats = new Map<string, InstanceStats[]>();

  /** Hook for subclasses that persist state; called after every mutation. */
  protected dirty(): void {}

  createUser(user: Omit<User, "createdAt">): User {
    if (this.getUserByEmail(user.email)) {
      throw new StoreError("email already registered", "CONFLICT");
    }
    const full: User = { ...user, createdAt: new Date().toISOString() };
    this.users.set(full.id, full);
    this.dirty();
    return full;
  }

  getUser(id: string): User | null {
    return this.users.get(id) ?? null;
  }

  getUserByEmail(email: string): User | null {
    const normalized = email.toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalized) return u;
    }
    return null;
  }

  listUsers(): User[] {
    return [...this.users.values()];
  }

  createSession(session: Session): Session {
    this.sessions.set(session.token, session);
    this.dirty();
    return session;
  }

  getSession(token: string): Session | null {
    const s = this.sessions.get(token) ?? null;
    if (s && new Date(s.expiresAt).getTime() <= Date.now()) {
      this.sessions.delete(token);
      this.dirty();
      return null;
    }
    return s;
  }

  deleteSession(token: string): void {
    if (this.sessions.delete(token)) this.dirty();
  }

  createApiKey(key: Omit<ApiKey, "createdAt" | "lastUsedAt" | "revokedAt">): ApiKey {
    const full: ApiKey = {
      ...key,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null,
    };
    this.apiKeys.set(full.id, full);
    this.apiKeyHashIndex.set(full.hash, full.id);
    this.dirty();
    return full;
  }

  getApiKey(id: string): ApiKey | null {
    return this.apiKeys.get(id) ?? null;
  }

  findApiKeyByHash(hash: string): ApiKey | null {
    const id = this.apiKeyHashIndex.get(hash);
    return id ? (this.apiKeys.get(id) ?? null) : null;
  }

  listApiKeys(): ApiKey[] {
    return [...this.apiKeys.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  revokeApiKey(id: string): ApiKey | null {
    const key = this.apiKeys.get(id);
    if (!key) return null;
    key.revokedAt = new Date().toISOString();
    this.dirty();
    return key;
  }

  touchApiKey(id: string, at: string): void {
    const key = this.apiKeys.get(id);
    if (key) {
      key.lastUsedAt = at;
      this.dirty();
    }
  }

  createAgentConfig(config: Omit<AgentConfig, "createdAt" | "updatedAt">): AgentConfig {
    const now = new Date().toISOString();
    const full: AgentConfig = { ...config, createdAt: now, updatedAt: now };
    this.agentConfigs.set(full.id, full);
    this.dirty();
    return full;
  }

  getAgentConfig(id: string): AgentConfig | null {
    return this.agentConfigs.get(id) ?? null;
  }

  listAgentConfigs(): AgentConfig[] {
    return [...this.agentConfigs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  updateAgentConfig(
    id: string,
    patch: Partial<Omit<AgentConfig, "id">>,
  ): AgentConfig | null {
    const existing = this.agentConfigs.get(id);
    if (!existing) return null;
    const updated: AgentConfig = {
      ...existing,
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.agentConfigs.set(id, updated);
    this.dirty();
    return updated;
  }

  deleteAgentConfig(id: string): boolean {
    const inUse = [...this.instances.values()].some((i) => i.agentConfigId === id);
    if (inUse) throw new StoreError("agent config is in use by an instance", "CONFLICT");
    const removed = this.agentConfigs.delete(id);
    if (removed) this.dirty();
    return removed;
  }

  createInstance(instance: Omit<Instance, "createdAt" | "updatedAt">): Instance {
    if ([...this.instances.values()].some((i) => i.name === instance.name)) {
      throw new StoreError("instance name already in use", "CONFLICT");
    }
    const now = new Date().toISOString();
    const full: Instance = { ...instance, createdAt: now, updatedAt: now };
    this.instances.set(full.id, full);
    this.dirty();
    return full;
  }

  getInstance(id: string): Instance | null {
    return this.instances.get(id) ?? null;
  }

  listInstances(): Instance[] {
    return [...this.instances.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  updateInstance(id: string, patch: Partial<Omit<Instance, "id">>): Instance | null {
    const existing = this.instances.get(id);
    if (!existing) return null;
    const updated: Instance = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    this.instances.set(id, updated);
    this.dirty();
    return updated;
  }

  deleteInstance(id: string): boolean {
    const removed = this.instances.delete(id);
    this.stats.delete(id);
    if (removed) this.dirty();
    return removed;
  }

  recordStats(stats: InstanceStats): void {
    const list = this.stats.get(stats.instanceId) ?? [];
    list.push(stats);
    if (list.length > MAX_STATS_PER_INSTANCE) list.splice(0, list.length - MAX_STATS_PER_INSTANCE);
    this.stats.set(stats.instanceId, list);
    this.dirty();
  }

  latestStats(instanceId: string): InstanceStats | null {
    const list = this.stats.get(instanceId);
    return list && list.length > 0 ? list[list.length - 1] : null;
  }

  recentStats(instanceId: string, limit: number): InstanceStats[] {
    const list = this.stats.get(instanceId) ?? [];
    return list.slice(-limit);
  }

  async flush(): Promise<void> {}

  /** Serialize all state — used by the file-backed store. */
  snapshot(): PersistedState {
    return {
      users: [...this.users.values()],
      sessions: [...this.sessions.values()],
      apiKeys: [...this.apiKeys.values()],
      agentConfigs: [...this.agentConfigs.values()],
      instances: [...this.instances.values()],
      stats: [...this.stats.entries()].map(([k, v]) => [k, v]),
    };
  }

  protected restore(state: PersistedState): void {
    for (const u of state.users) this.users.set(u.id, u);
    for (const s of state.sessions) this.sessions.set(s.token, s);
    for (const k of state.apiKeys) {
      this.apiKeys.set(k.id, k);
      this.apiKeyHashIndex.set(k.hash, k.id);
    }
    for (const c of state.agentConfigs) this.agentConfigs.set(c.id, c);
    for (const i of state.instances) this.instances.set(i.id, i);
    for (const [k, v] of state.stats) this.stats.set(k, v);
  }
}

export interface PersistedState {
  users: User[];
  sessions: Session[];
  apiKeys: ApiKey[];
  agentConfigs: AgentConfig[];
  instances: Instance[];
  stats: [string, InstanceStats[]][];
}

export class StoreError extends Error {
  constructor(
    message: string,
    public readonly code: "CONFLICT" | "NOT_FOUND" = "NOT_FOUND",
  ) {
    super(message);
    this.name = "StoreError";
  }
}
