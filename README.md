# Memorica

一个支持多人实时协作的在线文档编辑器。你可以创建文档、邀请他人同时编辑、查看光标位置和选区同步，文档内容通过 Yjs CRDT 自动合并冲突，无需手动解决。

![editor](docs/editor.png)

## 功能

- **实时协作** — 多人同时编辑同一文档，光标和选区实时同步，基于 Yjs + Hocuspocus + WebSocket
- **版本历史** — 手动保存版本快照，随时回退到之前的状态
- **图示编辑** — 集成 diagrams.net/drawio，支持模板插入、编辑、重命名、复制、下载、删除和版本恢复
- **权限管理** — 文档可设为私有/公开，支持按用户授予查看/编辑权限
- **文件夹** — 支持创建文件夹组织文档，支持嵌套
- **AI 助手** — 集成 DeepSeek，支持续写、润色、总结等操作
- **文件上传** — 图片和附件上传，存储在 MinIO
- **审计日志** — 关键操作（登录、文档变更、权限调整）记录到审计表

## 技术栈

**前端**
- React 19 + TypeScript + Vite
- TipTap 3（ProseMirror）— 富文本编辑器核心
- Ant Design 5 + Ant Design ProComponents — 组件库
- Yjs — CRDT 协作算法
- @ant-design/icons — 图标

> 注：项目中安装了 Tailwind CSS，但当前产品界面以 Ant Design 组件 + BEM 全局 CSS 为主。

**后端**
- Spring Boot 3.5 + Java 21
- Spring Security + JWT（Access 15min / Refresh 7d）
- Spring Data JPA + PostgreSQL 16 + Flyway
- Redis — Token 黑名单、缓存、Hocuspocus pub/sub
- MinIO — 对象存储

**协作服务**
- Hocuspocus — WebSocket 协作服务器，Yjs 文档同步
- Redis pub/sub — 多实例间广播

**运维**
- Docker + docker-compose
- Kubernetes  manifests
- Prometheus + Grafana 监控
- GitHub Actions CI

## 快速开始

需要：Java 21、Node.js 22、Docker

### 一键启动

```bash
./scripts/dev-setup.sh
```

### 手动启动

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 启动基础设施（PostgreSQL + Redis + MinIO）和全部服务
make dev
```

或者分别启动：

```bash
# 后端 API
cd backend && ./gradlew bootRun

# 协作 WebSocket
cd hocuspocus && npm start

# 前端
cd frontend && npm run dev
```

启动后访问：
- 前端：http://localhost:5173
- API：http://localhost:8080
- Swagger UI：http://localhost:8080/swagger-ui.html
- MinIO Console：http://localhost:9001

当前开发预览常用账号：
- 用户名：`demo`
- 密码：`Memorica2026`

完整本地栈启动后，可以准备一篇可演示文档：

```bash
make demo-seed-dry-run
make demo-seed
```

脚本会通过 API 确保 `demo` 和 `demo_viewer` 用户存在，创建或复用 `Memorica 预发布演示文档`，上传一个 PDF 附件，保存两个版本，并授予 `demo_viewer` 只读权限。默认 API 地址是 `http://127.0.0.1:8080/api/v1`，可用 `MEMORICA_API_BASE`、`MEMORICA_DEMO_USERNAME`、`MEMORICA_DEMO_PASSWORD` 等环境变量覆盖。

### 国内源

仓库根目录的 `.npmrc` 已配置 npm 使用 `https://registry.npmmirror.com`。后端 Gradle Wrapper 使用腾讯云 Gradle 分发镜像，Maven 依赖优先走阿里云 public 仓库，失败时再回落到 Maven Central。

本地 CORS 默认允许 `localhost` 和 `127.0.0.1` 的 5173/5174 端口，覆盖首选开发地址和可选工具端口。前端开发环境默认走 Vite 同源代理，减少浏览器跨域差异。

## 项目结构

```
Memorica/
├── backend/          # Spring Boot API
│   ├── src/main/java/sevoniva/memorica/
│   │   ├── controller/   # REST 接口
│   │   ├── service/      # 业务逻辑
│   │   ├── entity/       # JPA 实体
│   │   ├── repository/   # 数据访问
│   │   ├── security/     # JWT 认证
│   │   └── service/ai/   # DeepSeek AI 集成
│   └── src/main/resources/db/migration/  # Flyway 迁移脚本
├── frontend/         # React SPA
│   ├── src/
│   │   ├── components/   # CollabEditor, Toolbar, AIAssistant 等
│   │   ├── pages/        # 登录、文档列表、编辑器、版本历史
│   │   ├── api/client.ts # Axios 封装
│   │   └── stores/       # Zustand 状态管理
│   └── e2e/              # Playwright 测试
├── hocuspocus/       # WebSocket 协作服务器
│   ├── server.js         # Hocuspocus + Redis pub/sub
│   └── db.js             # 文档权限校验
├── docker/           # Docker Compose 配置
│   ├── docker-compose.yml      # 开发环境
│   ├── docker-compose.prod.yml # 生产环境
│   └── nginx/
└── k8s/              # Kubernetes 部署配置
```

## 常用命令

```bash
# 查看所有可用命令
make help

# 开发
make dev           # 启动所有服务
make dev-down      # 停止所有服务
make demo-seed-dry-run # 查看演示数据准备配置
make demo-seed     # 创建 demo/viewer 用户、演示文档、版本、图示、附件和只读分享
make demo-seed-test # 测试演示数据脚本的文档内容生成
make build         # 构建后端、前端并检查协作服务语法
make test          # 运行后端快速测试
make lint          # 运行代码检查
make frontend-check        # 前端 lint + Ant Design 检查 + build
make backend-unit-test     # 后端非 Testcontainers 测试
make testcontainers-check  # 检查 Docker 是否可供 Testcontainers 使用
make backend-integration-test # 后端 Testcontainers 集成测试
make e2e-local             # 对已运行的本地服务执行主 E2E
make audit                 # 前端和协作服务生产依赖审计
make verify-local          # 本地快速验证，不启动浏览器服务
make db-backup     # 备份 PostgreSQL

# 后端
cd backend
./gradlew test     # 运行测试（约 20 个）
./gradlew bootRun  # 启动 API

# 前端
cd frontend
npm run dev        # 开发服务器
npm run build      # 生产构建
npm run test:e2e   # E2E 测试
```

E2E 默认要求 API、协作服务和前端可访问。常用本地命令：

```bash
cd frontend
E2E_SKIP_WEB_SERVER=true \
E2E_BASE_URL=http://localhost:5173 \
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health \
npm run test:e2e -- editor-regression.spec.ts --workers=2
```

后端默认 `./gradlew test` 只运行不依赖 Testcontainers 的测试；`make backend-integration-test` 会先执行 `make testcontainers-check`，确认 Docker CLI 可访问后再运行 PostgreSQL Testcontainers 集成测试。若本机 Docker CLI 可用但 Testcontainers 报 “Could not find a valid Docker environment”，先检查 Docker Desktop/Colima、active docker context、socket 和 `DOCKER_HOST`；CI 的 `check` 仍会运行单元测试与集成测试。

`npm audit` 在 npmmirror 上没有稳定 audit endpoint，因此 `make frontend-audit` 和 `make hocuspocus-audit` 显式使用 `https://registry.npmjs.org`，安装依赖仍走仓库 `.npmrc` 的国内 registry。

预发布前请按 [docs/release-checklist.md](docs/release-checklist.md) 逐项确认本地 demo 账号、主路径演示脚本、权限矩阵、E2E、后端测试和 audit 结果。

### AI 助手配置

AI 助手默认使用 DeepSeek，但核心开发和主回归不依赖真实 API Key。本地开发如果不需要真实 AI，保持 `.env` 中 `DEEPSEEK_API_KEY=` 为空即可；用户触发 AI 时后端会返回“DeepSeek API Key 未配置”，前端会显示为 AI 服务暂时不可用，不影响登录、文档、协作、Draw.io、附件和版本历史主路径。

需要验证真实供应商时，在本机环境或未提交的 `.env` 中配置：

```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_THINKING=disabled
DEEPSEEK_TIMEOUT=45s
DEEPSEEK_TEMPERATURE=0.4
```

真实 AI E2E 默认跳过，避免无 key、额度不足或网络波动影响主回归。需要显式打开时运行：

```bash
cd frontend
E2E_RUN_AI=true npm run test:e2e -- --grep "AI provider"
```

不要把真实 `DEEPSEEK_API_KEY`、代理密钥或供应商 token 提交到仓库；生产环境通过部署平台的 Secret/环境变量注入。国内网络不稳定时，可把 `DEEPSEEK_BASE_URL` 指向团队可信的网关或内网代理。

### 图示服务

默认使用 `https://embed.diagrams.net/`。如果需要本地或私有化部署，可以启用可选 drawio 服务：

```bash
COMPOSE_PROFILES=drawio \
VITE_DRAWIO_URL=http://localhost:8081/ \
docker compose -f docker/docker-compose.yml up -d --build
```

生产环境建议把 diagrams.net 部署在可信域名下，并通过 `VITE_DRAWIO_URL` 指向该地址。国内网络下也建议使用自托管或内网可访问的 drawio 地址。

## 部署

### Docker Compose

```bash
# 开发
docker compose -f docker/docker-compose.yml up -d

# 生产
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d
```

### Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

生产配置包含滚动更新（maxUnavailable: 0）、健康探针、资源限制。详见 `k8s/` 目录下的 YAML 文件。

## 监控

- **健康检查**：`/actuator/health`
- **Prometheus 指标**：`/actuator/prometheus`
- **日志**：JSON 结构化日志，带 traceId，支持按 `X-Trace-Id` 追踪全链路
- **Grafana**：`docker/grafana/dashboards/` 下包含预设的 Memorica Overview 看板

## License

MIT
