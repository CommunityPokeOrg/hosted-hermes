# Dashboard container image (multi-stage, standalone output).
#
#   docker build -f docker/Dockerfile -t hosted-hermes .
#
# Mount the Docker socket and set HH_PROVISIONER=docker to let the dashboard
# provision agent containers on the host daemon.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN mkdir -p /app/data && chown -R app:app /app/data
USER app

EXPOSE 3000
CMD ["node", "server.js"]
