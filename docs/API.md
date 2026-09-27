# External API (`/api/v1`)

Authenticated with `Authorization: Bearer hhk_<key>`. Keys are created in the
dashboard (API Keys page) and carry scopes: `read`, `write`, `admin`
(admin implies all).

Base URL: `http://<host>:3000/api/v1`

## Endpoints

### `GET /v1/instances` — list instances *(read)*

```bash
curl -H "Authorization: Bearer $KEY" http://localhost:3000/api/v1/instances
```

```json
{ "instances": [ { "id": "…", "name": "web-01", "status": "running",
                   "hostPort": 19000, "agentConfigId": "…" } ] }
```

### `POST /v1/instances` — provision an instance *(write)*

```bash
curl -X POST -H "Authorization: Bearer $KEY" -H "content-type: application/json" \
  -d '{"name":"ci-agent-1","agentConfigId":"<config-id>"}' \
  http://localhost:3000/api/v1/instances
```

`name` must match `^[a-z0-9][a-z0-9-]*[a-z0-9]$` (≤63 chars). Returns `201`
with the instance once the container is created and started, or an error with
the instance left in `failed` state.

### `GET /v1/instances/{id}` — instance detail *(read)*

Returns the instance plus the latest stats sample.

### `DELETE /v1/instances/{id}` — remove *(write)*

Force-removes the container and deletes the record.

### `GET /v1/agents` — list agent configs *(read)*

Needed to find `agentConfigId` values for provisioning.

## Errors

| Status | Meaning |
| --- | --- |
| 400 | Validation failed (`error` describes the field problem) |
| 401 | Missing/revoked key or insufficient scope |
| 404 | Instance/agent config not found |
| 409 | Conflict (e.g. duplicate instance name) |
| 502 | Provisioner/driver failure |

## Internal API (`/api/*`)

The dashboard consumes `/api/auth/*`, `/api/instances*`, `/api/agents*`,
`/api/keys*` with session-cookie auth. These endpoints are not a stable
public surface — use `/api/v1` for integrations.
