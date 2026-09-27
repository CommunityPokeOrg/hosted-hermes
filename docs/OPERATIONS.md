# Operations

## Day-to-day

- **Provision**: Instances → enter a name, pick an agent config → Provision.
  Names must be lowercase DNS-safe (`a-z0-9-`).
- **Lifecycle**: start / stop / restart / delete from the instances table or
  the instance detail page. Deleting removes the container (`force`).
- **Monitor**: Monitoring page shows live CPU/memory/network per instance
  (5s refresh). Instance detail shows a CPU sparkline and tailing logs.
- **Rotate credentials**: revoke and re-issue API keys on the API Keys page.
  Revocation is immediate.

## Container management

Agent containers are labelled:

```
hosted-hermes.managed=true
hosted-hermes.instance-id=<uuid>
hosted-hermes.agent-config-id=<uuid>
```

Find them on the host:

```bash
docker ps --filter label=hosted-hermes.managed=true
docker logs hh-agent-<name>
```

If a container is removed out-of-band, the next status sync marks the
instance `failed` with "container missing on host".

## Backing up state

All dashboard state lives in the JSON file at `HH_STORE_PATH`. Stop the app
(or accept a slightly stale snapshot) and copy the file. Restore by placing
it back at the same path before boot.

## Health check

`GET /api/health` → `{ "status": "ok" }` — no auth; wire it to your load
balancer or uptime monitor.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Instance stuck `provisioning` | Provisioner reachable? Docker socket mounted? Docker driver logs show the Engine API error on the instance record (`error` field). |
| Instance `failed` at create | `error` field on the instance — usually image pull, port conflict, or network missing. |
| `no free host ports` | Widen `HH_PORT_RANGE_*` or delete unused instances. |
| 401 on `/api/v1` | Key revoked, wrong scopes (`write` needed for mutations), or `Bearer` header malformed. |
| Docker API errors | Verify `HH_DOCKER_SOCKET`/`HH_DOCKER_HOST`; test with `curl --unix-socket /var/run/docker.sock http://x/v1.43/_ping`. |

## Security notes

- Passwords are scrypt-hashed; API keys are stored as SHA-256 hashes only.
- The Docker socket grants root-equivalent access to the host — when running
  the dashboard containerized, treat the socket mount as privileged and
  restrict dashboard access accordingly.
- Run behind TLS in production (the session cookie is `Secure` when
  `NODE_ENV=production`).
