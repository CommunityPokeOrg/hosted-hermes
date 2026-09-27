# Deployment

This app needs a Node.js runtime — it uses API route handlers, middleware,
cookies, and a file-backed store, so **static hosting (GitHub Pages, plain
Cloudflare Pages/Netlify static) will not work**. Options below.

## Option A — Vercel (recommended)

Next.js runs natively on Vercel. Two ways to set it up:

### Git integration (simplest)

1. In Vercel: **Add New → Project → Import** `CommunityPokeOrg/hosted-hermes`.
2. Framework preset is auto-detected (Next.js); defaults work.
3. Set env vars in Project Settings → Environment Variables:
   `HH_ADMIN_EMAIL`, `HH_ADMIN_PASSWORD`, `HH_PROVISIONER` (`mock` is a good
   start; `docker` requires the serverless function to reach a Docker daemon —
   see notes below).

Every push to `main` then deploys automatically, plus per-PR previews.

### CI-driven deploy (token-based)

The repo ships a ready-to-enable Vercel job in
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). Create:

| Secret | Where to get it |
| --- | --- |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel → Team Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Vercel → Project Settings → General → Project ID |

and set repo **variable** `VERCEL_ENABLED=true`. Every push to `main` builds
and deploys production.

## Option B — GHCR image + any container host (no external account needed)

`.github/workflows/deploy.yml` builds and pushes
`ghcr.io/communitypokeorg/hosted-hermes:latest` on every `main` push using
`GITHUB_TOKEN` only. Run it anywhere Docker runs:

```bash
docker run -d -p 3000:3000 \
  -e HH_ADMIN_PASSWORD=<secret> \
  -e HH_PROVISIONER=docker \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v hermes-data:/app/data \
  ghcr.io/communitypokeorg/hosted-hermes:latest
```

Suitable hosts: any VM, Fly.io (`fly launch` on the image), Railway, Render
(web service from image), ECS, a Nomad/K8s cluster.

### Fly.io sketch

```bash
fly launch --image ghcr.io/communitypokeorg/hosted-hermes:latest
fly secrets set HH_ADMIN_PASSWORD=...
fly volumes create hermes_data
```

Note: provisioning real Docker containers requires Docker access *inside* the
runtime — most serverless container hosts don't offer that. On those hosts
run `HH_PROVISIONER=mock` for the control-plane demo, or self-host the
dashboard on a VM next to the Docker daemon it manages.

## Notes

- Set `HH_ADMIN_PASSWORD` to a strong value before exposing the app.
- The store is a JSON file on disk (`HH_STORE_PATH`). On serverless/ephemeral
  filesystems it resets on redeploy; mount a volume (compose/Fly) for
  persistence, or swap the `Store` interface for a database driver.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests, and build on
  every push and PR.
