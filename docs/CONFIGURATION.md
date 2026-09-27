# Configuration

All configuration is via environment variables (`.env` in development). See
`.env.example` for a ready-to-copy file.

## Dashboard settings

| Variable | Default | Description |
| --- | --- | --- |
| `HH_ADMIN_EMAIL` | `admin@example.com` | Email of the admin user seeded on first boot |
| `HH_ADMIN_PASSWORD` | `admin` | Password for the seeded admin — **change in production** |
| `HH_STORE_PATH` | `./data/hosted-hermes.json` | Path of the JSON state file |
| `HH_SESSION_TTL` | `604800` | Session lifetime in seconds (7 days) |

## Provisioner settings

| Variable | Default | Description |
| --- | --- | --- |
| `HH_PROVISIONER` | `mock` | `mock` (in-process simulation) or `docker` |
| `HH_DOCKER_SOCKET` | `/var/run/docker.sock` | Engine API unix socket (docker driver) |
| `HH_DOCKER_HOST` | — | `tcp://host:port` to use TCP instead of the socket |
| `HH_DOCKER_NETWORK` | `hosted-hermes` | Bridge network for agent containers |
| `HH_AGENT_IMAGE` | `ghcr.io/communitypokeorg/hermes-agent:latest` | Default agent image |
| `HH_PORT_RANGE_START` | `19000` | First host port for published agent endpoints |
| `HH_PORT_RANGE_END` | `19999` | Last host port |
| `HH_AGENT_CALLBACK_TOKEN` | — | Optional token passed to agents as `HERMES_CALLBACK_TOKEN` |

## Agent container contract

Every provisioned container receives these environment variables:

| Variable | Source |
| --- | --- |
| `HERMES_INSTANCE_ID` | Instance UUID |
| `HERMES_INSTANCE_NAME` | Instance name |
| `HERMES_MODEL` | Agent config `model` |
| `HERMES_SYSTEM_PROMPT` | Agent config `systemPrompt` |
| `HERMES_TOOLS` | Comma-separated tool list |
| `HERMES_CALLBACK_TOKEN` | `HH_AGENT_CALLBACK_TOKEN`, when set |
| *(custom)* | Agent config `env` entries |

Container requirements:

- Listen on **port 8080** (published to the allocated host port).
- Implement `GET /healthz` for health checking.
- The example `docker/agent/` image implements this contract and prints its
  `HERMES_*` config on `GET /config`.

## API key scopes

| Scope | Allows |
| --- | --- |
| `read` | `GET` on `/api/v1/*` |
| `write` | `POST`/`DELETE` on `/api/v1/*` |
| `admin` | all scopes |
