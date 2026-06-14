# Ant Design Pro Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Memorica frontend UI usage of Semi UI with Ant Design 5 and Ant Design ProComponents, using the antd CLI before writing Ant Design component code and verifying the migration with source scans, lint, build, and antd checks.

**Architecture:** Keep the current React/Vite routing, TipTap editor, Yjs collaboration, API client, and Zustand auth store. Replace only the UI component layer: use `antd` for base controls, `@ant-design/icons` for icons, and `@ant-design/pro-components` for application shell and data-heavy surfaces such as layout and document table.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Ant Design 5.29.x, Ant Design ProComponents 2.8.x, @ant-design/icons 5.6.x, @ant-design/cli 6.4.x.

---

## Scope And Constraints

- Use Ant Design Pro-compatible dependencies. `@ant-design/pro-components@2.8.10` declares `antd: ^4.24.15 || ^5.11.2`, so the project must use Ant Design 5 instead of Ant Design 6.
- Remove Semi UI from source and dependencies: no `@douyinfe/semi-*`, `@semi-bot/*`, or `semi-ui` imports may remain under `frontend/src`.
- Preserve business behavior: login/register, document list tabs, folders, rename, move, delete/restore, favorite, editor collaboration, drawio, file upload, share settings, AI assistant, and version history.
- Do not replace domain libraries: TipTap, Yjs, Hocuspocus, axios, Zustand, KaTeX, and custom editor extensions stay in place.
- Use the antd CLI before component migrations. At minimum, query the components used in each task with `npx antd info <Component> --version 5.29.3 --format json` and fetch demos when the task introduces a new pattern.

## File Map

- Modify `frontend/package.json` and `frontend/package-lock.json`: switch Ant Design dependencies to Pro-compatible versions and add ProComponents.
- Modify `frontend/src/main.tsx`: remove Semi theme CSS import and add Ant Design reset CSS if needed.
- Modify `frontend/src/App.tsx`: wrap the app with `ConfigProvider` and `antd` `App`.
- Modify `frontend/src/components/AppLayout.tsx`: replace custom/Semi-adjacent shell with `ProLayout` and Ant Design input/message patterns.
- Modify `frontend/src/pages/DocumentListPage.tsx`: replace Semi `Table`, `Button`, `Modal`, `Dropdown`, `Input`, `Skeleton`, `Avatar`, `Typography`, `Popconfirm`, and icons with ProTable/antd equivalents.
- Modify `frontend/src/components/DrawioDialog.tsx`: replace Semi `Modal` and `Button` with antd equivalents.
- Modify `frontend/src/components/CollabEditor.tsx`: replace Semi `Dropdown` and `Toast` with antd `Dropdown` and `App.useApp().message`.
- Modify `frontend/src/index.css`: remove or adjust selectors that target Semi-generated DOM; keep custom Memorica editor/layout classes that still apply.
- Verify other UI files do not import Semi and continue to compile.

## Task 1: Dependency Baseline

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

- [ ] **Step 1: Install Pro-compatible dependencies**

Run:

```bash
cd frontend
npm install antd@^5.29.3 @ant-design/icons@^5.6.1 @ant-design/pro-components@^2.8.10 --save --legacy-peer-deps --registry=https://registry.npmmirror.com
npm install @ant-design/cli@^6.4.4 --save-dev --legacy-peer-deps --registry=https://registry.npmmirror.com
```

Expected: `package.json` contains `antd`, `@ant-design/icons`, `@ant-design/pro-components`, and `@ant-design/cli`; `npm ls antd @ant-design/pro-components @ant-design/icons --depth=0` exits 0.

- [ ] **Step 2: Confirm ProComponents peer compatibility**

Run:

```bash
cd frontend
npm ls antd @ant-design/pro-components @ant-design/icons --depth=0
npm run antd:doctor
```

Expected: antd doctor reports no failures; if it warns because CLI prefers current latest antd, treat peer compatibility from `npm ls` and `@ant-design/pro-components` as the source of truth.

## Task 2: Global Ant Design Shell

**Files:**
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Query Ant Design APIs**

Run:

```bash
cd frontend
npx antd info ConfigProvider --version 5.29.3 --format json
npx antd info App --version 5.29.3 --format json
```

Expected: both commands return JSON component metadata.

- [ ] **Step 2: Replace the global provider**

Wrap the router in `ConfigProvider` and `App` from `antd`, using Chinese locale:

```tsx
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'

<ConfigProvider
  locale={zhCN}
  theme={{
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: '#245bdb',
      borderRadius: 8,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Helvetica Neue", "Segoe UI", Arial, sans-serif',
    },
  }}
>
  <AntdApp>
    {/* existing BrowserRouter/Suspense/Routes */}
  </AntdApp>
</ConfigProvider>
```

Remove `@semi-bot/semi-theme-feishu/semi.min.css` from `main.tsx`.

- [ ] **Step 3: Verify global shell**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected: both commands exit 0.

## Task 3: Pro Layout Migration

**Files:**
- Modify: `frontend/src/components/AppLayout.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Query Ant Design APIs**

Run:

```bash
cd frontend
npx antd info Input --version 5.29.3 --format json
npx antd info Menu --version 5.29.3 --format json
npx antd info Tooltip --version 5.29.3 --format json
```

Expected: commands return JSON metadata.

- [ ] **Step 2: Replace custom shell with ProLayout**

Use `ProLayout` from `@ant-design/pro-components` for the sidebar and keep `SidebarContext` unchanged:

```tsx
import { ProLayout } from '@ant-design/pro-components'
import { App as AntdApp, Input } from 'antd'
import {
  ClockCircleOutlined,
  CloudOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HomeOutlined,
  SettingOutlined,
} from '@ant-design/icons'
```

Map `navItems` and recent docs to `route.routes`; use `menuItemRender` to navigate documents and modules. Replace `Toast.error/info` with `const { message } = AntdApp.useApp()`.

- [ ] **Step 3: Preserve behavior**

Verify these interactions manually in code and with smoke tests:

```text
Search input still updates SidebarContext query.
Clicking "文档库" navigates to /.
Clicking unavailable modules shows an antd message.
Recent document clicks navigate to /doc/:id.
Collapsed state remains persisted in localStorage.
```

- [ ] **Step 4: Run focused checks**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected: both commands exit 0.

## Task 4: Document List Page Migration

**Files:**
- Modify: `frontend/src/pages/DocumentListPage.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Query Ant Design APIs**

Run:

```bash
cd frontend
npx antd info Button --version 5.29.3 --format json
npx antd info Dropdown --version 5.29.3 --format json
npx antd info Input --version 5.29.3 --format json
npx antd info Modal --version 5.29.3 --format json
npx antd info Popconfirm --version 5.29.3 --format json
npx antd info Skeleton --version 5.29.3 --format json
npx antd info Avatar --version 5.29.3 --format json
npx antd info Typography --version 5.29.3 --format json
npx antd info Tabs --version 5.29.3 --format json
npx antd info Select --version 5.29.3 --format json
```

Expected: all commands return JSON metadata.

- [ ] **Step 2: Convert base imports**

Replace Semi imports with:

```tsx
import {
  App as AntdApp,
  Avatar,
  Button,
  Dropdown,
  Input,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Tabs,
  Typography,
} from 'antd'
import type { MenuProps, TableColumnsType } from 'antd'
import { ProTable } from '@ant-design/pro-components'
import {
  BellOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FileOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons'
```

- [ ] **Step 3: Convert table and empty state**

Use `ProTable<WorkspaceRow>` with `search={false}`, `toolBarRender={false}`, `pagination={false}`, `rowKey="id"`, and `columns: TableColumnsType<WorkspaceRow>`. Use `locale.emptyText` for the existing empty UI.

- [ ] **Step 4: Convert modals and selects**

Use antd modal props:

```tsx
<Modal open={folderModalVisible} onOk={handleCreateFolder} onCancel={...}>
  <Input onPressEnter={handleCreateFolder} />
</Modal>
```

Use antd `Select` for move target instead of native `select`.

- [ ] **Step 5: Preserve user flows**

Verify these flows remain intact:

```text
Create document.
Create folder.
Enter folder and breadcrumb back to root.
Rename document/folder.
Move document/folder.
Delete to trash and restore.
Toggle favorite.
Switch tabs.
Search via SidebarContext query.
Logout from header menu.
```

## Task 5: Editor Adjacent Component Migration

**Files:**
- Modify: `frontend/src/components/DrawioDialog.tsx`
- Modify: `frontend/src/components/CollabEditor.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Query Ant Design APIs**

Run:

```bash
cd frontend
npx antd info Modal --version 5.29.3 --format json
npx antd info Button --version 5.29.3 --format json
npx antd info Dropdown --version 5.29.3 --format json
```

Expected: all commands return JSON metadata.

- [ ] **Step 2: Convert DrawioDialog**

Use antd `Modal` and `Button`:

```tsx
<Modal
  title={initialTitle || '图示'}
  open={open}
  width="88vw"
  maskClosable={false}
  keyboard={false}
  styles={{ body: { padding: 0 } }}
  footer={...}
  onCancel={onCancel}
>
```

- [ ] **Step 3: Convert CollabEditor feedback/menu**

Replace `Toast.success/error` with `const { message } = AntdApp.useApp()`. Replace Semi `Dropdown` menu array with antd `menu={{ items, onClick }}`.

- [ ] **Step 4: Run editor regression tests when services are available**

Run after backend, hocuspocus, and frontend are running:

```bash
cd frontend
E2E_BASE_URL=http://127.0.0.1:5174 E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 npm run test:e2e
```

Expected: editor save, read-only sharing, drawio, version restore, and upload tests pass.

## Task 6: Remove Semi Dependencies And Verify

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `Makefile`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Remove Semi dependencies**

Run:

```bash
cd frontend
npm uninstall @douyinfe/semi-icons @douyinfe/semi-ui-19 @semi-bot/semi-theme-feishu --legacy-peer-deps --registry=https://registry.npmmirror.com
```

Expected: these packages disappear from `frontend/package.json`.

- [ ] **Step 2: Source scan**

Run:

```bash
rg -n "@douyinfe|semi-ui|semi-icons|@semi|semi-theme" frontend/src frontend/package.json
```

Expected: no output.

- [ ] **Step 3: Ant Design usage scan**

Run:

```bash
cd frontend
npm run antd:usage
npm run antd:lint
npm run antd:doctor
```

Expected: usage shows antd components in migrated files; lint has 0 issues; doctor has no failures.

- [ ] **Step 4: Full frontend verification**

Run:

```bash
cd frontend
npm run lint
npm run build
cd ..
make frontend-audit
```

Expected: all commands exit 0.

## Completion Evidence

The migration is complete only when all of the following evidence is true:

```bash
rg -n "@douyinfe|semi-ui|semi-icons|@semi|semi-theme" frontend/src frontend/package.json
# Expected: no output

cd frontend && npm run antd:doctor
# Expected: no failures

cd frontend && npm run antd:lint
# Expected: 0 issues

cd frontend && npm run lint
# Expected: exit 0

cd frontend && npm run build
# Expected: exit 0

make frontend-audit
# Expected: found 0 vulnerabilities
```
