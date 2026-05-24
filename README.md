# Memorica

一个支持多人实时协作的在线文档编辑器。你可以创建文档、邀请他人同时编辑、查看光标位置和选区同步，文档内容通过 Yjs CRDT 自动合并冲突，无需手动解决。

![editor](docs/editor.png)

## 功能

- **实时协作** — 多人同时编辑同一文档，光标和选区实时同步，基于 Yjs + Hocuspocus + WebSocket
- **版本历史** — 手动保存版本快照，随时回退到之前的状态
- **权限管理** — 文档可设为私有/公开，支持按用户授予查看/编辑权限
- **文件夹** — 支持创建文件夹组织文档，支持嵌套
- **AI 助手** — 集成 DeepSeek，支持续写、润色、总结等操作
- **文件上传** — 图片和附件上传，存储在 MinIO
- **审计日志** — 关键操作（登录、文档变更、权限调整）记录到审计表

## 技术栈

**前端**
- React 19 + TypeScript + Vite
- TipTap 3（ProseMirror）— 富文本编辑器核心
- Semi UI — 组件库
- Yjs — CRDT 协作算法
- lucide-react — 图标

> 注：项目中安装了 Tailwind CSS 但未使用，样式采用 BEM + 全局 CSS 方案。

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
make test          # 运行前后端测试
make lint          # 运行代码检查
make db-backup     # 备份 PostgreSQL

# 后端
cd backend
./gradlew test     # 运行测试（约 20 个）
./gradlew bootRun  # 启动 API

# 前端
cd frontend
npm run dev        # 开发服务器
npm run build      # 生产构建
npx playwright test # E2E 测试
```

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
