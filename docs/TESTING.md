# Testing

## Running

```bash
npm test              # unit + integration (vitest, node env)
npm run test:watch    # watch mode
npm run test:coverage # v8 coverage over src/lib and src/app/api
npm run typecheck     # tsc --noEmit
npm run lint          # eslint (next/core-web-vitals)
```

## Layout

```
tests/
  helpers/fixtures.ts        — store/user/config factories, NextRequest builder
  unit/                      — isolated module tests
    passwords.test.ts        — scrypt hashing/verification
    apiKeys.test.ts          — key generation, scope enforcement, revocation
    store.test.ts            — MemoryStore invariants + FileStore persistence
    models.test.ts           — zod schema validation
    mock-provisioner.test.ts — simulated container lifecycle
    ui.test.tsx              — component/format helpers (jsdom)
  integration/
    provision-service.test.ts   — full lifecycle, port allocation, failure paths,
                                  status sync, env injection (MockProvisioner)
    docker-provisioner.test.ts  — DockerProvisioner against a fake Docker Engine
                                  API (node:http server over TCP) verifying
                                  request payloads and response parsing
    api-routes.test.ts          — route handlers end-to-end: login → session →
                                  instance/agent/key CRUD + v1 API with keys
```

## How tests are wired

- `setStoreForTesting(store)` / `setProvisionerForTesting(p, config)` swap the
  singletons used by route handlers — no server needed; handlers are called
  directly with `NextRequest` objects built by the `req()` helper.
- `DockerProvisioner` accepts `host: "tcp://127.0.0.1:<port>"`, so integration
  tests run a fake daemon locally — no real Docker needed in CI.
- `MockProvisioner.failNextCreate` forces provisioning failures.

## Writing new tests

1. Build state through `makeStore()`, `makeUser()`, `makeAgentConfig()`.
2. For API tests: reset singletons in `beforeEach`
   (`setStoreForTesting` **before** `setProvisionerForTesting`, since the
   service binds the store), sign in via the real `/api/auth/login` handler or
   `createSession`, then call the route handler.
3. Component tests need `// @vitest-environment jsdom` at the top.
