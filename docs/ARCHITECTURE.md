# Architecture

## Overview

Hosted Hermes is a single Next.js application serving both the dashboard UI
(server-rendered React + client components) and the REST API (route handlers).
It manages Hermes agent instances that run as containers on a Docker host.

```
┌──────────────┐      session cookie       ┌───────────────────────────────┐
│   Browser    │ ────────────────────────▶ │  Dashboard pages (RSC)        │
└──────────────┘                           │  /dashboard/*                 │
                                           ├───────────────────────────────┤
┌──────────────┐      Bearer hhk_…         │  Internal API /api/*          │
│ API clients  │ ────────────────────────▶ │  External API /api/v1/*       │
└──────────────┘                           ├───────────────────────────────┤
                                           │  ProvisionService             │
                                           │    ├─ Store (file-backed)     │
                                           │    └─ Provisioner (driver)    │
                                           └────────────┬──────────────────┘
                                                        │ Engine API
                                                 ┌──────▼──────┐
                                                 │   Docker    │
                                                 │  containers │
                                                 └─────────────┘
```

## Components

### Store (`src/lib/store/`)

All dashboard state — users, sessions, API keys, agent configs, instances,
metric samples — behind the `Store` interface:

- `MemoryStore` — in-process Maps; used by tests.
- `FileStore` — wraps `MemoryStore`, debounce-persists a JSON snapshot to
  `HH_STORE_PATH`. Suitable for single-node deployments. Swap in a database
  implementation of `Store` for HA.

The singleton (`getStore()`) seeds the admin user on first boot.

### Provisioner (`src/lib/provision/`)

`Provisioner` is the runtime backend abstraction:

| Driver | Purpose |
| --- | --- |
| `DockerProvisioner` | Docker Engine API over unix socket or TCP via `node:http` — zero external deps |
| `MockProvisioner` | In-process simulation for dev/CI: lifecycle, logs, stats |

`ProvisionService` orchestrates: port allocation from `HH_PORT_RANGE_*`,
container spec construction (`buildAgentEnv` injects `HERMES_*` vars), status
reconciliation (`syncInstances` inspects containers and samples stats), and
error recording on the instance record.

### Authentication (`src/lib/auth/`)

Two layers, deliberately independent:

- **Dashboard sessions** — scrypt password hashes, opaque session tokens in
  the store, `HttpOnly` + `SameSite=Lax` cookie (`hh_session`).
  `middleware.ts` gates `/dashboard/*` on cookie presence; the layout and API
  handlers validate the session in the Node.js runtime.
- **API keys** — `hhk_<random>` keys, stored as SHA-256 hashes only (prefix
  kept for identification). `authenticateApiKey(req, scopes)` checks the
  `Authorization: Bearer` header and enforces scopes; `admin` implies all.
  Used by `/api/v1/*`. Plaintext is returned exactly once at creation.

The auth layer is scaffolding: sessions/users live behind `Store`, so adding
SSO/OIDC (e.g. an OAuth provider in front of `/api/auth/*`) only requires
replacing the login flow — session issuance and authorization stay the same.

### API surface (`src/app/api/`)

- `/api/auth/*` — login/logout/session
- `/api/instances*` — CRUD + `action` (start/stop/restart) + `logs` + `stats`
- `/api/agents*` — agent config CRUD
- `/api/keys*` — API key create/list/revoke (hashes never returned)
- `/api/health` — unauthenticated liveness
- `/api/v1/*` — external, API-key-authenticated provisioning API
  (see [API.md](API.md))

### Dashboard (`src/app/dashboard/`)

Server components read the store directly; client components (`StatsPanel`,
`LogsViewer`, `MonitoringTable`) poll the internal API for live updates.

## Data model

- **User** — id, email, scrypt hash, role (`admin`/`operator`/`viewer`)
- **Session** — token, userId, expiry
- **ApiKey** — name, prefix, sha256 hash, scopes, revokedAt
- **AgentConfig** — model, systemPrompt, tools, env, resources, image
- **Instance** — name, status (`pending → provisioning → running | stopped |
  failed | deleting`), containerId, hostPort, error
- **InstanceStats** — cpu %, memory, net rx/tx samples (capped at 512/instance)

## Request flows

**Provision**: `POST /api/instances` → validate → `ProvisionService.createInstance`
→ store record (`provisioning`) → `provisioner.create(spec)` → `start()` →
`running`. Failure → record `failed` + error.

**Monitor**: `/api/instances` list or `/stats` → `syncInstances()` →
`inspect()` each container, sample `stats()` for running ones, record.

**External API**: `Authorization: Bearer hhk_…` → `authenticateApiKey` →
scope check → same service layer as the dashboard.
