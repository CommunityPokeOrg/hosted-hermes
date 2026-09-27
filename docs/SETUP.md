# Setup

## Prerequisites

- **Node.js 20+** (developed on Node 24)
- npm, pnpm, or yarn
- **Docker** — only needed for real container provisioning
  (`HH_PROVISIONER=docker`) or the containerized deployment

## Local development

```bash
npm install
cp .env.example .env   # adjust as needed
npm run dev
```

The app listens on http://localhost:3000. On first boot it seeds the admin
account from `HH_ADMIN_EMAIL` / `HH_ADMIN_PASSWORD` and creates the store file
at `HH_STORE_PATH` (`./data/hosted-hermes.json` by default — gitignored).

### Mock provisioner (default, no Docker)

With `HH_PROVISIONER=mock`, instances are simulated in-process: lifecycle
actions update status, logs emit synthetic lines, and stats return plausible
metrics. Use this for UI development and CI.

### Docker provisioner

```bash
HH_PROVISIONER=docker npm run dev
```

The driver talks to the Docker Engine API over `HH_DOCKER_SOCKET`
(default `/var/run/docker.sock`) or `HH_DOCKER_HOST` (`tcp://host:2375`). The
process needs permission to access the socket (e.g. the `docker` group).

Provisioned containers:

- run on the `HH_DOCKER_NETWORK` bridge (create it once:
  `docker network create hosted-hermes`),
- publish port `8080` on a host port allocated from `HH_PORT_RANGE_*`,
- get `HERMES_*` environment variables (see [CONFIGURATION.md](CONFIGURATION.md)),
- are labelled `hosted-hermes.managed=true` plus instance/config IDs.

Build the example agent image locally:

```bash
docker build -f docker/agent/Dockerfile -t ghcr.io/communitypokeorg/hermes-agent:latest docker/agent
```

## Production

### Containerized (recommended)

```bash
docker compose up --build
```

The dashboard image is a multi-stage Next.js standalone build
(`docker/Dockerfile`). State persists in the `hermes-data` volume; the Docker
socket is mounted for provisioning — restrict access appropriately.

### Bare metal / VM

```bash
npm ci
npm run build
HH_PROVISIONER=docker node .next/standalone/server.js
```

## First-run checklist

1. Set a strong `HH_ADMIN_PASSWORD`.
2. Sign in, create an **agent config** (Agents page).
3. Provision an instance (Instances page) and watch it go `running`.
4. Create an API key (API Keys page) for the external API.
5. If using Docker, verify `docker network create hosted-hermes` was run.
