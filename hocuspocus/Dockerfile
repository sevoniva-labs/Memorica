FROM node:22-alpine
RUN addgroup -S memorica && adduser -S memorica -G memorica
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile
COPY src/ src/
USER memorica

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- --header="Upgrade: websocket" http://localhost:${HOCUSPOCUS_PORT:-1234}/health || exit 1

EXPOSE ${HOCUSPOCUS_PORT:-1234}
CMD ["node", "src/server.js"]
