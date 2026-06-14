# --- Build Stage ---
FROM node:22-alpine AS builder
WORKDIR /app
ARG VITE_API_BASE_URL=
ARG VITE_WS_URL=
ARG VITE_DRAWIO_URL=https://embed.diagrams.net/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_DRAWIO_URL=$VITE_DRAWIO_URL
COPY package.json package-lock.json ./
RUN HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= ALL_PROXY= all_proxy= npm ci --registry=https://registry.npmmirror.com --audit=false --fund=false
COPY . .
RUN npm run build

# --- Runtime Stage ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
