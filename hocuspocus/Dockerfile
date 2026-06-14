FROM node:22-alpine
RUN addgroup -S memorica && adduser -S memorica -G memorica
WORKDIR /app
COPY package.json package-lock.json ./
RUN HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= ALL_PROXY= all_proxy= npm ci --registry=https://registry.npmmirror.com --audit=false --fund=false
COPY src/ src/
USER memorica

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= ALL_PROXY= all_proxy= wget -qO- --header="Upgrade: websocket" http://localhost:${HOCUSPOCUS_PORT:-1234}/health || exit 1

EXPOSE ${HOCUSPOCUS_PORT:-1234}
CMD ["node", "src/server.js"]
