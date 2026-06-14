# Memorica 前端

## 技术栈

- React 19 + TypeScript + Vite
- TipTap 3（ProseMirror）— 编辑器核心
- Ant Design 5 + Ant Design ProComponents — 组件库
- Yjs — 协作同步
- @ant-design/icons — 图标
- Zustand — 状态管理
- React Router — 路由

样式采用 Ant Design 组件 + BEM 命名全局 CSS（`src/index.css`）。仓库根目录 `.npmrc` 使用 `https://registry.npmmirror.com`。

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

# Ant Design 迁移检查
npm run antd:doctor
npm run antd:lint

# E2E 测试
npm run test:e2e
```

开发服务器默认运行在 `http://localhost:5173`，通过 Vite 代理访问后端 `/api` 和协作 `/ws`。后端默认允许 `localhost` 与 `127.0.0.1` 的 5173/5174 端口，覆盖手动开发和 Playwright 默认端口。

```bash
E2E_SKIP_WEB_SERVER=true \
E2E_BASE_URL=http://localhost:5173 \
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health \
npm run test:e2e -- editor-regression.spec.ts --workers=2

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
│   ├── DiagramTemplatePicker.tsx # Draw.io 模板选择器
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
├── diagram/
│   └── templates.ts       # Draw.io 模板 XML
└── index.css              # 全局样式（BEM + Ant Design 覆盖）
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
- `VITE_DRAWIO_URL` 控制图示编辑器地址，生产环境和国内网络建议使用自托管 diagrams.net 服务
- Draw.io 图示以 TipTap `diagram` 节点保存 XML/SVG，支持模板插入、编辑、重命名、复制、下载、删除和版本恢复
- 上传图片和附件会绑定当前文档，分享用户按文档权限刷新临时访问链接

## 样式约定

- 类名前缀：`memorica-`
- 命名方式：BEM（`.memorica-block__element--modifier` 或简化为 `.memorica-block-element`）
- 所有样式写在 `src/index.css`，按模块分节注释
- 覆盖 Ant Design 样式时优先使用局部类名和组件 props，避免全局选择器外溢
