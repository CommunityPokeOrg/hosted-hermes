# Hosted Hermes

A full-stack dashboard for managing and provisioning hosted **Hermes** agent
instances. Each instance runs as an isolated container on a Docker host; the
dashboard handles provisioning, configuration, monitoring, logs, and API key
management — plus a REST API for automation.

Built with Next.js (App Router), TypeScript, and Tailwind CSS. No external
services required for development: a mock provisioner simulates the full
container lifecycle without Docker.

## Quickstart

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000 and sign in with `HH_ADMIN_EMAIL` / `HH_ADMIN_PASSWORD`
(defaults: `admin@example.com` / `admin` — change before exposing).

With a Docker daemon available:

```bash
HH_PROVISIONER=docker npm run dev        # provision real containers
docker compose up --build               # or the full containerized stack
```

## Features

- **Container provisioning** — pluggable provisioner (`docker` Engine API
  driver, `mock` in-process driver) with port allocation, resource limits,
  and lifecycle actions (start/stop/restart/delete).
- **Agent configuration** — reusable templates: model, system prompt, tools,
  env vars, CPU/memory limits, image overrides.
- **Instance monitoring** — status sync, CPU/memory/network metrics, uptime,
  log tailing, and a live fleet view.
- **API key management** — scoped keys (`read`, `write`, `admin`) with hashed
  storage and one-time reveal, authenticating the external `/api/v1` API.
- **Authentication scaffolding** — scrypt password hashing, session cookies,
  middleware gate; designed to be swapped for an SSO/OIDC provider.

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/SETUP.md](docs/SETUP.md) | Local dev, Docker, production deploy |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, components, data flow |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Every env var and agent container contract |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Day-2 ops: monitoring, logs, backup, troubleshooting |
| [docs/API.md](docs/API.md) | External `v1` API reference |
| [docs/TESTING.md](docs/TESTING.md) | Test layout, how to run, adding tests |

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest (unit + integration)
npm run test:coverage
```
