# Memorica 企业级差距分析报告

> 本报告基于当前 `main` 分支代码走查，从安全、架构、代码质量、数据库、运维、API 设计、前端工程化、协作服务八个维度进行评估。问题按 **P0（致命）/ P1（高危）/ P2（中危）/ P3（建议）** 分级。

---

## 一、安全（Security）

### P0 硬编码敏感凭证

**位置**：`backend/src/main/resources/application.yml`

```yaml
password: collab123
secret: memorica-jwt-secret-key-2026-very-long-and-secure
access-key: minioadmin
secret-key: minioadmin
```

**影响**：数据库密码、JWT 签名密钥、对象存储凭证全部明文写在源码中。一旦仓库公开，攻击者可立即获得全部基础设施权限。

**修复**：
- 生产配置全部改为环境变量注入（`${DB_PASSWORD}`、`${JWT_SECRET}`）
- JWT secret 使用 `openssl rand -base64 64` 生成真正的随机密钥
- 引入 Spring Cloud Config 或至少使用 `.env` + `.gitignore`
- CI/CD 中使用 GitHub Secrets / Vault

---

### P0 CORS 允许任意来源

**位置**：`backend/src/main/java/sevoniva/memorica/config/SecurityConfig.java:50`

```java
config.setAllowedOrigins(List.of("*"));
```

**影响**：任何域名都可以调用 API，配合 XSS 可实现 CSRF 攻击。虽然 JWT 场景下 CSRF 风险降低，但 `*` 仍会导致凭证泄露风险（浏览器预检响应会暴露 `Authorization` header）。

**修复**：
```java
config.setAllowedOrigins(List.of("https://memorica.example.com"));
```

---

### P1 文件上传零安全校验

**位置**：`backend/src/main/java/sevoniva/memorica/controller/FileController.java`

**问题清单**：
- 没有文件大小限制（可上传 10GB 文件打爆磁盘）
- 没有文件类型白名单（可上传 `.jsp`、`.exe` 等可执行文件）
- 文件名直接使用用户原始文件名，存在路径遍历风险（`../../etc/passwd`）
- 没有病毒扫描
- `getFileUrl` 接口没有做权限校验，任何拿到 objectName 的人都可以获取预签名链接

**修复**：
- 限制文件大小（如 10MB）
- 白名单校验：仅允许 `image/jpeg`、`image/png`、`image/webp`
- 生成随机文件名存储，丢弃原始文件名
- 将 objectName 与用户 ID 绑定，校验归属权后再生成 URL
- 上传后异步病毒扫描（ClamAV 或云厂商扫描）

---

### P1 JWT 无撤销机制

**位置**：`backend/src/main/java/sevoniva/memorica/security/JwtUtil.java`

**影响**：Token 签发后 24 小时内无法撤销。用户修改密码、账号被盗、主动登出后，旧 Token 仍然有效。

**修复**：
- 引入 Token 黑名单（Redis `SET` + TTL）
- 或改用短有效期 Access Token（5-15 分钟）+ Refresh Token 机制
- `me` 接口校验 Token 是否在黑名单中

---

### P1 密码策略缺失

**位置**：`backend/src/main/java/sevoniva/memorica/service/AuthService.java`

**影响**：注册时仅校验非空，6 位纯数字 `"123456"` 也能通过。没有密码强度提示，没有常见密码库校验。

**修复**：
- 正则校验：至少 8 位，含大小写字母 + 数字
- 引入 HaveIBeenPwned 或本地常见密码字典校验
- 密码加密使用 `BCryptPasswordEncoder(12)`（当前默认 cost 10，建议提高到 12）

---

### P2 没有 Rate Limiting

**位置**：全站 API

**影响**：登录接口可被暴力破解（10000 次/秒撞库），注册接口可被批量刷号，文件上传可被 DoS。

**修复**：
- 引入 Bucket4j 或 Spring Cloud Gateway 限流
- 登录接口按 IP 限制 5 次/分钟
- 验证码（reCAPTCHA v3 或图形验证码）

---

### P2 没有 HTTPS 强制跳转

**影响**：Token、密码在明文通道传输，可被中间人截获。

**修复**：生产环境强制 HSTS + TLS 1.3，Nginx/Traefik 层做 80→443 跳转。

---

## 二、架构与设计（Architecture）

### P1 没有全局异常处理

**位置**：缺失 `@ControllerAdvice`

**影响**：任何未捕获的异常（NPE、SQL 异常）会直接暴露堆栈给客户端，泄露内部实现细节。

**修复**：
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handle(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity.status(500)
            .body(ApiResponse.error("服务器内部错误"));
    }
}
```

---

### P1 没有事务边界

**位置**：`DocumentService.saveVersion()`

```java
documentVersionRepository.save(version);  // 成功
// 此处抛异常
documentRepository.save(doc);             // 失败 → 数据不一致
```

**影响**：版本已保存但文档元数据未更新，导致统计信息错误。

**修复**：方法加 `@Transactional`。

---

### P1 没有 DTO 隔离层

**位置**：`DocumentController.create(@RequestBody Map<String, String> body)`

**影响**：
- 使用 `Map` 接收参数，失去类型安全和 IDE 提示
- 没有字段校验注解（`@NotBlank`、`@Size`）
- 密码等敏感字段可能在日志中意外打印

**修复**：所有请求体使用显式 DTO + `@Valid`：
```java
public ApiResponse<DocumentResponse> create(@Valid @RequestBody CreateDocRequest body)
```

---

### P2 权限校验缺失

**位置**：`DocumentController` 多个方法

**影响**：
- `updateDocumentMeta`：任意用户可修改他人文档
- `deleteDocument`：任意用户可删除他人文档
- `saveVersion`：任意用户可向他人文档写入版本
- `getDocument`：私有文档可被任意用户查看

**修复**：Service 层增加所有权校验：
```java
if (!doc.getOwner().getId().equals(currentUserId)) {
    throw new AccessDeniedException("无权操作");
}
```

---

### P2 Autowiring 字段注入

**位置**：几乎所有 Service/Controller

**影响**：字段注入导致单元测试困难（必须启动 Spring 容器），且无法声明 final 保证不可变性。

**修复**：统一改为构造器注入 + Lombok `@RequiredArgsConstructor`。

---

## 三、代码质量（Code Quality）

### P2 大量的 `orElse(null)` 空指针风险

**位置**：`DocumentService` 多处

```java
Document doc = documentRepository.findById(id).orElse(null);
if (doc == null) return ApiResponse.error("文档不存在");
```

**修复**：使用 `Optional` + 抛出自定义异常，由全局异常处理器统一转为 404：
```java
Document doc = documentRepository.findById(id)
    .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
```

---

### P2 `new Random()` 频繁创建

**位置**：`AuthService.randomColor()`

```java
return COLORS[new Random().nextInt(COLORS.length)];
```

**影响**：并发场景下性能差且随机性不足。

**修复**：`ThreadLocalRandom.current().nextInt(COLORS.length)`。

---

### P2 Lombok `@Data` 用于 JPA Entity

**位置**：所有 Entity 类

**影响**：`@Data` 生成 `equals()` 和 `hashCode()` 基于所有字段，对于懒加载的关联对象会导致 `LazyInitializationException`。

**修复**：Entity 只用 `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`，显式重写 `equals/hashCode`（基于 ID 字段）。

---

### P3 魔术字符串

**位置**：`DocumentService.createDocument` 中 `"未命名文档"`

**修复**：提取为常量 `DEFAULT_DOCUMENT_TITLE`。

---

## 四、数据库（Database）

### P0 `ddl-auto: update` 生产环境致命

**位置**：`application.yml:14`

**影响**：Hibernate 会自动修改数据库 schema。加字段、删字段、改类型可能在发布时自动执行，导致数据丢失。

**修复**：
- 生产设为 `validate`
- 引入 Flyway 或 Liquibase 做版本化迁移
- 迁移脚本纳入 Git 管理：`backend/src/main/resources/db/migration/V001__init.sql`

---

### P1 缺少关键索引

**位置**：`DocumentRepository`、`DocumentVersionRepository`

```java
List<Document> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId);
List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(String documentId);
```

**影响**：数据量增大后（用户 10 万、文档 100 万），这些查询会全表扫描。

**修复**：
```sql
CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_public_updated ON documents(is_public, updated_at DESC);
CREATE INDEX idx_doc_versions_doc_id ON document_versions(document_id, version_number DESC);
```

---

### P1 版本数据无限膨胀

**位置**：`document_versions` 表

**影响**：每次点击"保存版本"都产生一条记录。用户每天编辑 50 次，一年产生 18000 条版本记录。

**修复**：
- 自动快照策略：仅当内容变化超过 5% 或距离上次快照超过 30 分钟才保存
- 归档策略：保留最近 30 个版本 + 每天一个永久快照，其余压缩存储到冷存储
- 增加 `deleted_at` 软删除字段

---

### P2 没有连接池调优

**位置**：`application.yml`

**影响**：默认 HikariCP 配置在高并发下可能成为瓶颈。

**修复**：
```yaml
spring.datasource.hikari:
  maximum-pool-size: 20
  minimum-idle: 5
  connection-timeout: 20000
  idle-timeout: 300000
  max-lifetime: 1200000
```

---

## 五、运维与工程化（DevOps & Engineering）

### P1 零测试覆盖

**位置**：`backend/src/test/java/sevoniva/memorica/`

**影响**：只有 Spring Boot 启动测试，没有单元测试、集成测试、API 契约测试。重构时无法保证不破坏现有功能。

**修复**：
- 单元测试：JUnit 5 + Mockito，覆盖 Service 层核心逻辑
- 集成测试：`@SpringBootTest` + Testcontainers（PostgreSQL、MinIO）
- API 测试：RestAssured 或 Spring MockMvc
- 覆盖率目标：行覆盖率 ≥ 70%，分支覆盖率 ≥ 60%

---

### P1 没有结构化日志

**位置**：全站

**影响**：`System.out.println` 和默认日志无法支撑生产排障。无法按用户、请求链路、文档 ID 过滤日志。

**修复**：
- 引入 logback-spring.xml 或 log4j2
- 统一日志格式：JSON（方便 ELK/Loki 采集）
- 关键操作打印审计日志：谁、何时、对哪个文档做了什么操作

---

### P1 没有健康检查深度探测

**位置**：`HealthController`

```java
// 当前只有静态 UP 响应
```

**影响**：服务进程活着但数据库连不上时，K8s 探针仍认为健康，流量继续打到故障实例。

**修复**：
```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    public Health health() {
        // 执行 SELECT 1
    }
}
```

---

### P2 没有 API 文档

**影响**：前后端联调靠口头约定，新人上手成本高。

**修复**：引入 SpringDoc OpenAPI + Swagger UI：`/swagger-ui.html`。

---

### P2 没有 Dockerfile

**影响**：无法容器化部署，环境不一致风险高。

**修复**：
- Backend：基于 `eclipse-temurin:21-jre-alpine` 的多阶段构建
- Frontend：基于 `nginx:alpine` 的静态文件服务
- Hocuspocus：基于 `node:22-alpine`

---

### P2 没有 CI/CD

**影响**：手动构建、手动测试、手动部署，容易出错。

**修复**：GitHub Actions 工作流：
- `lint.yml`：ESLint、Spotless、Checkstyle
- `test.yml`：单元测试 + 集成测试
- `build.yml`：构建 Docker 镜像并推送到镜像仓库
- `deploy.yml`：自动化部署到测试/生产环境

---

## 六、API 设计（API Design）

### P2 没有分页

**位置**：`GET /api/documents/my`、`GET /api/documents/public`

**影响**：用户文档数量达到数千时，一次返回全部数据导致前端卡顿、后端内存溢出。

**修复**：
```java
@GetMapping("/my")
public ApiResponse<Page<DocumentResponse>> listMy(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    return documentService.listMyDocuments(PageRequest.of(page, size, Sort.by("updatedAt").descending()));
}
```

---

### P2 没有 API 版本控制

**位置**：全站 `/api/...`

**影响**：一旦接口字段变更，前端旧版本直接崩溃。无法灰度发布。

**修复**：路径加版本前缀 `/api/v1/documents`，Header 版本协商作为备选方案。

---

### P2 响应体封装冗余

**位置**：`ApiResponse<T>`

```java
public static <T> ApiResponse<T> error(String message) {
    return ApiResponse.<T>builder().code(500).message(message).data(null).build();
}
```

**影响**：HTTP 状态码 200 但 body 里 `code: 500`，导致前端 axios 拦截器无法统一处理。

**修复**：错误时返回对应的 HTTP 状态码（400、401、403、404、500），body 简化：
```json
{
  "error": "DOCUMENT_NOT_FOUND",
  "message": "文档不存在"
}
```

---

### P3 URL 设计歧义

**位置**：
- `GET /api/documents/{id}/versions`（某文档的版本列表）
- `GET /api/documents/versions/{versionId}`（某个具体版本）

**影响**：路径冲突风险，不符合 REST 嵌套资源规范。

**修复**：
```
GET    /api/v1/documents/{docId}/versions
GET    /api/v1/documents/{docId}/versions/{versionId}
```

---

## 七、前端工程化（Frontend）

### P1 路由守卫只检查 token 存在性

**位置**：`frontend/src/App.tsx`

```tsx
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}
```

**影响**：用户随便写个字符串 `"fake"` 存到 localStorage 就能绕过登录。Token 过期后仍显示已登录，直到 API 返回 401。

**修复**：
- 应用启动时调用 `/api/auth/me` 校验 Token 有效性
- 使用全局状态管理（Zustand / Redux Toolkit）存储用户信息
- Token 解析后根据 `exp` 时间提前刷新

---

### P1 API URL 硬编码

**位置**：`frontend/src/api/client.ts:3`

```ts
const API_BASE = 'http://localhost:8080'
```

**影响**：无法部署到任何非本地环境。

**修复**：
```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
```
`.env.production`：
```
VITE_API_BASE_URL=https://api.memorica.example.com
```

---

### P1 没有错误边界

**位置**：全站

**影响**：编辑器渲染异常会导致整个应用白屏，用户数据丢失。

**修复**：
```tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    // 上报 Sentry
  }
  render() {
    if (this.state.hasError) return <FallbackUI />;
    return this.props.children;
  }
}
```

---

### P2 useEffect 清理缺失

**位置**：`frontend/src/components/CollabEditor.tsx`

```tsx
useEffect(() => {
  const t = setTimeout(saveTitle, 800)
  return () => clearTimeout(t)
}, [title, saveTitle])
```

虽然这里有清理，但 `HocuspocusProvider` 的销毁逻辑在 StrictMode 下可能执行两次，导致连接泄漏。

**修复**：使用 `useRef` 保存 provider 实例，确保 `destroy()` 只执行一次。

---

### P2 没有请求缓存/去重

**位置**：`DocumentListPage`

**影响**：快速切换"我的文档"和"公开文档"tab 会发起重复请求。

**修复**：引入 React Query (TanStack Query)，自带缓存、去重、重试、后台刷新。

---

### P3 没有国际化

**影响**：所有文案是中文，无法服务海外用户。

**修复**：引入 i18next，中英双语支持。

---

## 八、协作服务（Hocuspocus）

### P1 无连接数限制

**位置**：`hocuspocus/src/server.js`

**影响**：一个恶意用户开 10 万个 WebSocket 连接可耗尽服务器文件描述符。

**修复**：
- Hocuspocus Server 配置 `maxConnectionsPerDocument` 和全局 `maxConnections`
- Nginx/Traefik 层限制单 IP 并发连接数

---

### P1 没有房间权限校验

**位置**：`onAuthenticate`

**影响**：任何人拿到文档 ID 就能连接并编辑，即使文档是私有的。

**修复**：`onAuthenticate` 中查询数据库，校验当前用户是否有该文档的访问权限：
```js
async onAuthenticate({ token, documentName }) {
  const payload = verifyToken(token);
  const hasAccess = await checkDocumentAccess(documentName, payload.sub);
  if (!hasAccess) throw new Error('Forbidden');
}
```

---

### P2 没有消息大小限制

**影响**：用户粘贴一张 50MB 的 Base64 图片到编辑器，Yjs 更新消息会超大，导致内存溢出。

**修复**：Hocuspocus 配置 `maxDocumentSize`，前端限制单张图片大小。

---

### P2 单点故障

**影响**：Hocuspocus 是单进程 Node.js，无法利用多核 CPU，一台机器挂掉全站协作瘫痪。

**修复**：
- 使用 Redis 作为 Yjs 更新广播中心（`@hocuspocus/extension-redis`）
- 部署多实例 + 负载均衡（Sticky Session 或基于文档名的哈希路由）
- 或迁移到 Tiptap Cloud / Y-Sweet 托管服务

---

## 九、汇总与优先级建议

### 立即处理（本周内）

| # | 问题 | 影响 |
|---|------|------|
| 1 | 移除硬编码凭证，改用环境变量 | 安全红线 |
| 2 | CORS 改为白名单 | 安全红线 |
| 3 | 文件上传加大小/类型限制 | 安全红线 |
| 4 | 增加文档所有权校验 | 数据安全 |
| 5 | `ddl-auto: update` 改为 `validate` + Flyway | 数据安全 |

### 短期处理（一个月内）

| # | 问题 | 影响 |
|---|------|------|
| 6 | 全局异常处理 + 统一错误码 | 稳定性 |
| 7 | Service 层加 `@Transactional` | 数据一致性 |
| 8 | 添加数据库索引 | 性能 |
| 9 | 引入 Token 黑名单 / 双 Token | 安全 |
| 10 | 前端路由守卫校验 Token 有效性 | 安全 |
| 11 | API 分页 | 性能 |
| 12 | Hocuspocus 房间权限校验 | 数据安全 |

### 中期处理（三个月内）

| # | 问题 | 影响 |
|---|------|------|
| 13 | 测试覆盖（单元 + 集成） | 可维护性 |
| 14 | 结构化日志 + 链路追踪 | 可观测性 |
| 15 | Dockerfile + CI/CD | 工程化 |
| 16 | Redis 集群化 Hocuspocus | 扩展性 |
| 17 | React Query + 状态管理 | 前端体验 |
| 18 | API 版本控制 + OpenAPI 文档 | 可维护性 |

---

> 本报告基于 2026-05-23 代码快照生成。建议每季度进行一次安全审计和代码走查。
