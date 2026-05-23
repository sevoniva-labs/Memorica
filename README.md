# 协同文档平台

一个完整的实时协同文档系统，包含前端编辑器、Spring Boot 业务后端、Hocuspocus 实时协作后端。

---

## 目录结构

```
collab-doc-platform/
├── README.md                 # 本文件
├── frontend/                 # 前端（React + Tiptap）
│   ├── src/
│   │   ├── api/client.ts     # Axios 封装 + 后端 API 调用
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx       # 登录/注册
│   │   │   ├── DocumentListPage.tsx # 文档列表
│   │   │   ├── EditorPage.tsx       # 编辑器入口
│   │   │   └── VersionHistoryPage.tsx # 历史版本
│   │   ├── components/
│   │   │   ├── CollabEditor.tsx    # Tiptap 编辑器核心
│   │   │   ├── Toolbar.tsx         # 富文本工具栏
│   │   │   ├── BubbleMenuBar.tsx   # 气泡菜单
│   │   │   ├── SlashMenu.tsx       # / 命令菜单
│   │   │   ├── AIAssistant.tsx     # AI 助手面板
│   │   │   └── FindReplace.tsx     # 查找替换
│   │   ├── ai/mockAI.ts            # AI Mock 流式响应
│   │   └── App.tsx                 # 路由配置
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                  # Spring Boot 业务后端
│   ├── src/main/java/com/collabdoc/
│   │   ├── CollabDocApiApplication.java
│   │   ├── config/
│   │   │   ├── SecurityConfig.java    # Spring Security + CORS
│   │   │   └── MinioConfig.java       # MinIO 客户端配置
│   │   ├── controller/
│   │   │   ├── AuthController.java    # 登录/注册/Me
│   │   │   ├── DocumentController.java # 文档 CRUD + 版本
│   │   │   ├── FileController.java    # 文件上传
│   │   │   └── HealthController.java
│   │   ├── service/
│   │   │   ├── AuthService.java
│   │   │   ├── DocumentService.java
│   │   │   └── FileService.java       # MinIO 上传
│   │   ├── security/
│   │   │   ├── JwtUtil.java           # JWT 生成/解析
│   │   │   ├── JwtAuthenticationFilter.java
│   │   │   ├── UserDetailsImpl.java
│   │   │   └── UserDetailsServiceImpl.java
│   │   ├── entity/
│   │   │   ├── User.java
│   │   │   ├── Document.java
│   │   │   └── DocumentVersion.java
│   │   ├── repository/                # JPA Repositories
│   │   └── dto/                       # Request/Response DTO
│   ├── src/main/resources/
│   │   └── application.yml            # DB / JWT / MinIO 配置
│   └── build.gradle
│
└── hocuspocus/               # 实时协作 WebSocket 后端
    ├── src/
    │   ├── server.js        # Hocuspocus Server + JWT 鉴权
    │   └── db.js            # PostgreSQL 持久化
    └── package.json
```

---

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS v3 + Tiptap v3 |
| 协作 | Hocuspocus v4 + Yjs |
| 业务后端 | Spring Boot 3.5.0 + Java 21 + Spring Security + JPA |
| 协作后端 | Node.js + @hocuspocus/server |
| 数据库 | PostgreSQL 16 |
| 文件存储 | MinIO |

---

## 启动方式

### 1. 基础设施（Docker）

```bash
# PostgreSQL
docker run -d --name collab-postgres \
  -e POSTGRES_USER=collab -e POSTGRES_PASSWORD=collab123 -e POSTGRES_DB=collab \
  -p 5432:5432 postgres:16

# MinIO
docker run -d --name collab-minio \
  -p 9000:9000 -p 9001:9001 \
  -v /tmp/minio-data:/data \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

### 2. 业务后端（Spring Boot）

```bash
cd backend
export JAVA_HOME="$HOME/.jdks/jdk-21.0.11.jdk/Contents/Home"
./gradlew build -x test
java -jar build/libs/collab-doc-api-0.0.1-SNAPSHOT.jar
# 默认端口 8080
```

### 3. 协作后端（Hocuspocus）

```bash
cd hocuspocus
npm install
node src/server.js
# 默认端口 1234
```

### 4. 前端

```bash
cd frontend
npm install
npm run dev
# 默认端口 5173，访问 http://localhost:5173
```

---

## 核心功能清单

- [x] JWT 登录/注册鉴权
- [x] 文档列表（我的/公开）
- [x] Tiptap 双模式编辑器（Notion / 富文本）
- [x] 实时多人协作（Hocuspocus + Yjs）
- [x] 图片上传（MinIO 预签名 URL）
- [x] 文档历史版本（保存 + 列表 + 预览）
- [x] AI 助手（Mock 流式响应）
- [x] 查找替换、气泡菜单、Slash 命令、拖拽排序
