# Memorica

一个支持实时协作的在线文档编辑器。多人可以在同一篇文档上同时编辑，光标位置、选区、内容变更实时同步。

[在线演示]（如需部署后补充）

## 项目结构

```
.
├── frontend/      React + Tiptap 编辑器
├── backend/       Spring Boot 业务 API
└── hocuspocus/    WebSocket 协作服务
```

## 功能

- 用户注册 / 登录（JWT）
- 文档创建、列表、删除
- 富文本编辑（Tiptap）：标题、列表、表格、图片、链接、代码块、任务列表、公式等
- 实时多人协作（基于 Yjs + Hocuspocus）
- 图片上传到 MinIO
- 文档历史版本保存与回溯
- AI 辅助写作（当前为 Mock 实现，可替换为真实模型接口）

## 技术选型

| 层 | 技术 |
|---|---|
| 前端 | React 19, TypeScript, Vite, Tailwind CSS, Tiptap v3 |
| 协作 | Yjs, Hocuspocus |
| 后端 | Spring Boot 3.5, Java 21, Spring Security, JPA |
| 数据库 | PostgreSQL 16 |
| 对象存储 | MinIO |

## 本地开发

### 准备基础设施

```bash
# PostgreSQL
docker run -d --name memorica-postgres \
  -e POSTGRES_USER=collab \
  -e POSTGRES_PASSWORD=collab123 \
  -e POSTGRES_DB=collab \
  -p 5432:5432 postgres:16

# MinIO
docker run -d --name memorica-minio \
  -p 9000:9000 -p 9001:9001 \
  -v /tmp/minio-data:/data \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

### 启动后端

```bash
cd backend
export JAVA_HOME="$HOME/.jdks/jdk-21.0.11.jdk/Contents/Home"
./gradlew bootRun
```

### 启动协作服务

```bash
cd hocuspocus
npm install
node src/server.js
```

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 http://localhost:5173。

## 配置说明

后端配置位于 `backend/src/main/resources/application.yml`，主要包含：

- `spring.datasource`：PostgreSQL 连接
- `app.jwt.secret`：JWT 签名密钥
- `app.minio`：MinIO 端点与凭证

本地开发使用上述 Docker 命令中的默认参数即可，生产环境请替换为实际密钥。

## 账号

本地开发时，首次使用可以自行注册账号，或直接使用已有账号登录。

## License

MIT
