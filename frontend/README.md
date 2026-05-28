# Memorica 前端

## 技术栈

- React 19 + TypeScript + Vite
- TipTap 3（ProseMirror）— 编辑器核心
- Semi UI (`@douyinfe/semi-ui-19`) — 组件库
- Yjs — 协作同步
- lucide-react — 图标
- Zustand — 状态管理
- React Router — 路由

样式采用 BEM 命名 + 全局 CSS（`src/index.css`），未使用 Tailwind。

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 代码检查
npm run lint

# E2E 测试
npm run test:e2e
```

开发服务器默认运行在 `http://localhost:5173`，代理到后端 `http://localhost:8080`。E2E 默认使用 `http://127.0.0.1:5174`，避免和手动开发端口冲突：

```bash
E2E_BASE_URL=http://127.0.0.1:5174 \
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
npm run test:e2e

# 真实 AI 提供商回归，默认跳过以避免无密钥或额度导致主回归不稳定
E2E_RUN_AI=true npm run test:e2e -- --grep "AI provider"
```

配置见 `vite.config.ts` 和 `playwright.config.ts`。

## 项目结构

```
src/
├── api/client.ts          # Axios 封装，自动携带 Token 和 X-Trace-Id
├── stores/
│   └── authStore.ts       # Zustand：登录态、Token 刷新、登出
├── contexts/
│   └── SidebarContext.tsx # 全局 Sidebar 状态（最近文档、搜索、折叠）
├── components/
│   ├── AppLayout.tsx      # 全局布局：Sidebar + Main
│   ├── CollabEditor.tsx   # 协作编辑器（TipTap + Yjs）
│   ├── Toolbar.tsx        # 富文本工具栏
│   ├── DrawioDialog.tsx   # diagrams.net 图示编辑器嵌入
│   ├── BubbleMenuBar.tsx  # 行内浮动菜单
│   ├── SlashMenu.tsx      # / 命令菜单
│   ├── AIAssistant.tsx    # AI 助手浮动面板
│   ├── FindReplace.tsx    # 查找替换
│   └── ShareSettingsPanel.tsx # 分享权限设置
├── pages/
│   ├── DocumentListPage.tsx   # 文档列表首页
│   ├── EditorPage.tsx         # 编辑器页面
│   └── VersionHistoryPage.tsx # 版本历史
└── index.css              # 全局样式（BEM + 自定义变量）
```

## 编辑器架构

`CollabEditor.tsx` 是核心组件：

1. **TipTap** 提供编辑器实例（ProseMirror 封装）
2. **Yjs** 将文档内容同步为 CRDT 结构
3. **HocuspocusProvider** 通过 WebSocket 连接到 `ws://localhost:1234`，实现多人实时同步
4. **CollaborationCaret** 显示其他用户的光标和选区

编辑器支持两种模式：
- **轻文档** — 类似 Notion 的块级编辑器，支持拖拽排序
- **富文本** — 传统富文本编辑器，带固定工具栏

## 协作状态同步

- 标题修改通过 `updateDocumentMeta` API 异步保存，同时通过 `SidebarContext` 本地乐观更新 sidebar 列表
- 文档内容通过 Yjs + Hocuspocus 自动同步，12 秒无操作后自动保存版本快照
- `Ctrl+S` / `Cmd+S` 触发手动保存版本
- `VITE_DRAWIO_URL` 控制图示编辑器地址，生产环境建议使用自托管 diagrams.net 服务
- 上传图片和附件会绑定当前文档，分享用户按文档权限刷新临时访问链接

## 样式约定

- 类名前缀：`memorica-`
- 命名方式：BEM（`.memorica-block__element--modifier` 或简化为 `.memorica-block-element`）
- 所有样式写在 `src/index.css`，按模块分节注释
- 覆盖 Semi UI 样式时使用 `!important`（Semi UI 内部优先级极高）
