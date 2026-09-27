# Trama — hosted mode (account-less, secret-link workspaces).
# Build:  docker build -t trama .
# Run:    docker run -p 127.0.0.1:4180:4180 -v trama-data:/data -e TRAMA_PUBLIC_URL=https://trama.org-agents.work trama

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4180 \
    TRAMA_DATA_ROOT=/data
WORKDIR /app
# Only what the hosted server needs at runtime. The research corpus,
# prototypes, docs and tests stay out of the image.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/server ./server
COPY --from=build /app/cli ./cli
COPY --from=build /app/assets/fonts ./assets/fonts
# Public example map imported at runtime by src/models/examples.js.
COPY --from=build /app/seeds ./seeds
# Node illustrations of the example maps (read by src/models/exampleAssets.js).
COPY --from=build /app/assets/demo ./assets/demo
COPY --from=build /app/scripts/trama-admin.mjs /app/scripts/trama-backup.mjs ./scripts/
COPY --from=build /app/index.html /app/styles.css /app/standalone.css /app/atlas-embed.css /app/server-hosted.mjs ./
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 4180
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4180)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--no-warnings", "server-hosted.mjs"]
