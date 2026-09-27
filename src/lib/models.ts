import { z } from "zod";

export const RoleSchema = z.enum(["admin", "operator", "viewer"]);
export type Role = z.infer<typeof RoleSchema>;

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export const ApiKeyScopeSchema = z.enum(["read", "write", "admin"]);
export type ApiKeyScope = z.infer<typeof ApiKeyScopeSchema>;

export interface ApiKey {
  id: string;
  name: string;
  /** First 12 chars of the key, shown in the UI for identification. */
  prefix: string;
  /** SHA-256 hex digest of the full key. The plaintext key is never stored. */
  hash: string;
  scopes: ApiKeyScope[];
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export const AgentConfigInputSchema = z.object({
  name: z.string().min(1).max(80),
  model: z.string().min(1).max(120),
  systemPrompt: z.string().max(16000).default(""),
  tools: z.array(z.string().min(1)).default([]),
  env: z.record(z.string(), z.string()).default({}),
  resources: z
    .object({
      cpus: z.number().positive().max(16).default(1),
      memoryMb: z.number().int().positive().max(32768).default(512),
    })
    .default({ cpus: 1, memoryMb: 512 }),
  image: z.string().max(255).optional(),
});
export type AgentConfigInput = z.infer<typeof AgentConfigInputSchema>;

/** PATCH body for agent configs: every field optional, inner objects whole. */
export const AgentConfigPatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  model: z.string().min(1).max(120).optional(),
  systemPrompt: z.string().max(16000).optional(),
  tools: z.array(z.string().min(1)).optional(),
  env: z.record(z.string(), z.string()).optional(),
  resources: z
    .object({
      cpus: z.number().positive().max(16),
      memoryMb: z.number().int().positive().max(32768),
    })
    .optional(),
  image: z.string().max(255).optional(),
});

export interface AgentConfig extends AgentConfigInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const InstanceStatusSchema = z.enum([
  "pending",
  "provisioning",
  "running",
  "stopped",
  "failed",
  "deleting",
]);
export type InstanceStatus = z.infer<typeof InstanceStatusSchema>;

export const CreateInstanceInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "lowercase letters, digits and hyphens only"),
  agentConfigId: z.string().min(1),
});
export type CreateInstanceInput = z.infer<typeof CreateInstanceInputSchema>;

export interface Instance {
  id: string;
  name: string;
  agentConfigId: string;
  status: InstanceStatus;
  containerId: string | null;
  /** Host port the agent's HTTP endpoint is published on, when running. */
  hostPort: number | null;
  /** Last known error message, e.g. a provisioning failure. */
  error: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated from the provisioner during status sync. */
  startedAt: string | null;
  exitCode: number | null;
}

export interface InstanceStats {
  instanceId: string;
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number;
  networkRxBytes: number;
  networkTxBytes: number;
  collectedAt: string;
}

export const CreateApiKeyInputSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(ApiKeyScopeSchema).min(1).default(["read"]),
});
export type CreateApiKeyInput = z.infer<typeof CreateApiKeyInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;
