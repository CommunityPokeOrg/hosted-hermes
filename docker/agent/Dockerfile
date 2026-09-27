# Example Hermes agent image.
#
# Instances are provisioned with this image (or the image referenced by
# HH_AGENT_IMAGE / the agent config's image override). The platform sets
# HERMES_* environment variables on the container — see docs/CONFIGURATION.md.
#
#   docker build -f docker/agent/Dockerfile -t hermes-agent:local docker/agent

FROM node:24-alpine
WORKDIR /agent
COPY server.mjs ./server.mjs
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
