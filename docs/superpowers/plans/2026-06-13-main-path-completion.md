# Memorica Main Path Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the collaborative document main path with Draw.io as a first-class diagram block that can be inserted, edited, renamed, duplicated, downloaded, deleted, restored from versions, and safely viewed in read-only mode.

**Architecture:** Keep diagram data embedded in the existing Tiptap/Yjs document JSON. Add a small template module and Ant Design picker on the frontend, harden the Draw.io iframe protocol boundary, and expand the existing `Diagram` node view into an action-capable block. Backend APIs remain unchanged unless tests expose a defect.

**Tech Stack:** React 19, TypeScript, Vite, Ant Design 5, Ant Design ProComponents, Tiptap, Yjs, Hocuspocus, Playwright, Spring Boot, PostgreSQL, Redis, MinIO.

---

## File Structure

- Create `frontend/src/diagram/templates.ts`
  - Pure Draw.io template definitions and XML creation helpers.
- Create `frontend/src/components/DiagramTemplatePicker.tsx`
  - Ant Design modal for selecting a diagram template and title.
- Modify `frontend/src/components/DrawioDialog.tsx`
  - Iframe protocol state machine and retryable save/export behavior.
- Modify `frontend/src/extensions/Diagram.tsx`
  - Diagram node actions, read-only behavior, and test selectors.
- Modify `frontend/src/components/CollabEditor.tsx`
  - Orchestrate template picker, Draw.io dialog, diagram actions, dirty state, and version save.
- Modify `frontend/src/index.css`
  - Diagram picker and diagram block action styling.
- Modify `frontend/e2e/editor-regression.spec.ts`
  - Add main path and Draw.io behavior coverage.
- Modify `frontend/e2e/helpers/api.ts`
  - Add helper APIs only when the E2E scenarios need them.
- Modify `README.md` and `frontend/README.md`
  - Update local preview notes after implementation is verified.

---

### Task 1: Main Path Demo Regression

**Files:**
- Modify: `frontend/e2e/editor-regression.spec.ts`
- Modify: `frontend/e2e/helpers/api.ts`

- [ ] **Step 1: Add a failing main path E2E test**

Add this test to `frontend/e2e/editor-regression.spec.ts` after `shared documents tab shows documents explicitly shared with the current user`:

```ts
test('new user can complete the collaborative document demo path', async ({ page, request }) => {
  const owner = await registerTestUser(request, 'demopath');
  const viewer = await registerTestUser(request, 'demoviewer');
  const title = uniqueName('演示闭环');
  const bodyText = `主路径正文 ${uniqueName('body')}`;
  const diagramMarker = uniqueName('main-diagram');
  const fileName = `${uniqueName('demo-file')}.pdf`;

  await loginByStorage(page, owner);
  await page.goto('/');
  await page.getByRole('button', { name: '新建文档' }).click();
  await expect(page.locator('.memorica-editor-shell')).toBeVisible({ timeout: 12_000 });
  await page.locator('.memorica-editor-title-input').fill(title);
  await waitForCollaboration(page);

  await page.locator('.notion-editor').click();
  await page.keyboard.type(bodyText);

  await openDrawioDialog(page);
  await simulateDrawioExport(page, diagramMarker);

  await page.setInputFiles('[data-testid="memorica-attachment-upload"]', {
    name: fileName,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
  });

  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 15_000 });
  await expectLatestVersionContains(request, owner, await currentDocumentId(page), bodyText);
  await expectLatestVersionContains(request, owner, await currentDocumentId(page), diagramMarker);
  await expectLatestVersionContains(request, owner, await currentDocumentId(page), fileName);

  await page.getByRole('button', { name: '分享' }).click();
  await page.locator('.memorica-share-form input').fill(viewer.user.username);
  await page.locator('.memorica-share-form button').click();
  await expect(page.locator('.memorica-share-members')).toContainText(viewer.user.username, { timeout: 12_000 });

  await loginByStorage(page, viewer);
  await page.goto('/');
  await page.getByRole('button', { name: '与我共享' }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 12_000 });
});
```

Add this helper above the tests in `frontend/e2e/editor-regression.spec.ts`:

```ts
async function currentDocumentId(page: Page) {
  const match = page.url().match(/\/doc\/([^/?#]+)/);
  expect(match?.[1], `Expected editor URL to contain a document id, got ${page.url()}`).toBeTruthy();
  return match![1];
}
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd frontend
E2E_SKIP_WEB_SERVER=true \
E2E_BASE_URL=http://127.0.0.1:5173 \
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health \
npm run test:e2e -- editor-regression.spec.ts -g "new user can complete the collaborative document demo path"
```

Expected: FAIL because the document list create flow does not yet expose a deterministic route from `新建文档` to the editor or the share/form selectors are not stable enough for the full path.

- [ ] **Step 3: Make selectors deterministic without changing behavior**

Add stable test ids where the test needs them:

```tsx
// frontend/src/pages/DocumentListPage.tsx
<Button
  data-testid="memorica-create-document"
  icon={<PlusOutlined />}
  type="primary"
  size="small"
  onClick={() => handleCreate()}
>
  新建文档
</Button>
```

```tsx
// frontend/src/components/ShareSettingsPanel.tsx
<input
  data-testid="memorica-share-username"
  value={username}
  onChange={(event) => setUsername(event.target.value)}
/>
<button
  data-testid="memorica-share-add-member"
  disabled={saving || !username.trim()}
  onClick={grantAccess}
>
  添加
</button>
```

Update the test to use the stable selectors:

```ts
await page.getByTestId('memorica-create-document').click();
await page.getByTestId('memorica-share-username').fill(viewer.user.username);
await page.getByTestId('memorica-share-add-member').click();
```

- [ ] **Step 4: Run the test and verify it passes**

Run the same focused E2E command.

Expected: PASS.

- [ ] **Step 5: Run frontend lint**

Run:

```bash
cd frontend && npm run lint
```

Expected: exit 0.

---

### Task 2: Draw.io Template Picker

**Files:**
- Create: `frontend/src/diagram/templates.ts`
- Create: `frontend/src/components/DiagramTemplatePicker.tsx`
- Modify: `frontend/src/components/CollabEditor.tsx`
- Modify: `frontend/src/index.css`
- Modify: `frontend/e2e/editor-regression.spec.ts`

- [ ] **Step 1: Add a failing template insert E2E test**

Add this test after `drawio diagram inserts into the editor and persists in version content`:

```ts
test('drawio template picker inserts a titled flowchart diagram', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'flowchart');
  const document = await createDocument(request, auth, uniqueName('图示模板验证'));
  const title = `流程图 ${uniqueName('diagram-title')}`;
  const marker = uniqueName('flowchart-marker');

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();
  await expect(page.getByTestId('memorica-diagram-template-picker')).toBeVisible();
  await page.getByTestId('memorica-diagram-title').fill(title);
  await page.getByTestId('memorica-diagram-template-flowchart').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });

  await simulateDrawioExport(page, marker);
  await expect(page.getByTestId('memorica-diagram-node')).toContainText(title);
  await expectLatestVersionContains(request, auth, document.id, title);
  await expectLatestVersionContains(request, auth, document.id, marker);
});
```

Run:

```bash
cd frontend
E2E_SKIP_WEB_SERVER=true \
E2E_BASE_URL=http://127.0.0.1:5173 \
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health \
npm run test:e2e -- editor-regression.spec.ts -g "drawio template picker inserts a titled flowchart diagram"
```

Expected: FAIL because the template picker does not exist.

- [ ] **Step 2: Create diagram templates**

Create `frontend/src/diagram/templates.ts`:

```ts
export type DiagramTemplateId = 'blank' | 'flowchart' | 'mindmap' | 'sequence'

export interface DiagramTemplate {
  id: DiagramTemplateId
  name: string
  description: string
  accent: string
  xml: string
}

const graph = (cells: string) =>
  `<mxfile host="embed.diagrams.net"><diagram name="第 1 页"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}</root></mxGraphModel></diagram></mxfile>`

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: 'blank',
    name: '空白图示',
    description: '从空白画布开始',
    accent: '#2563eb',
    xml: graph(''),
  },
  {
    id: 'flowchart',
    name: '流程图',
    description: '适合业务流、审批流、状态流',
    accent: '#16a34a',
    xml: graph('<mxCell id="start" value="开始" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dcfce7;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="120" y="120" width="120" height="50" as="geometry"/></mxCell><mxCell id="step" value="处理步骤" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="300" y="120" width="140" height="50" as="geometry"/></mxCell><mxCell id="edge" edge="1" parent="1" source="start" target="step" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell>'),
  },
  {
    id: 'mindmap',
    name: '脑图',
    description: '适合拆主题、想结构',
    accent: '#9333ea',
    xml: graph('<mxCell id="center" value="主题" style="ellipse;whiteSpace=wrap;html=1;fillColor=#f3e8ff;strokeColor=#9333ea;" vertex="1" parent="1"><mxGeometry x="260" y="160" width="120" height="70" as="geometry"/></mxCell><mxCell id="branch-a" value="分支 A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#faf5ff;strokeColor=#a855f7;" vertex="1" parent="1"><mxGeometry x="80" y="80" width="110" height="44" as="geometry"/></mxCell><mxCell id="branch-b" value="分支 B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#faf5ff;strokeColor=#a855f7;" vertex="1" parent="1"><mxGeometry x="460" y="80" width="110" height="44" as="geometry"/></mxCell><mxCell id="edge-a" edge="1" parent="1" source="center" target="branch-a" style="endArrow=none;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="edge-b" edge="1" parent="1" source="center" target="branch-b" style="endArrow=none;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell>'),
  },
  {
    id: 'sequence',
    name: '过程草图',
    description: '适合画系统之间的交互',
    accent: '#ea580c',
    xml: graph('<mxCell id="actor-a" value="系统 A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#ea580c;" vertex="1" parent="1"><mxGeometry x="120" y="100" width="120" height="44" as="geometry"/></mxCell><mxCell id="actor-b" value="系统 B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#475569;" vertex="1" parent="1"><mxGeometry x="380" y="100" width="120" height="44" as="geometry"/></mxCell><mxCell id="message" value="请求 / 响应" edge="1" parent="1" source="actor-a" target="actor-b" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell>'),
  },
]

export function createDiagramXml(id: DiagramTemplateId) {
  return DIAGRAM_TEMPLATES.find((template) => template.id === id)?.xml || DIAGRAM_TEMPLATES[0].xml
}
```

- [ ] **Step 3: Create the Ant Design picker**

Create `frontend/src/components/DiagramTemplatePicker.tsx`:

```tsx
import { Button, Input, Modal } from 'antd'
import { PartitionOutlined } from '@ant-design/icons'
import { DIAGRAM_TEMPLATES, type DiagramTemplateId } from '../diagram/templates'

interface Props {
  open: boolean
  title: string
  onTitleChange: (value: string) => void
  onCancel: () => void
  onSelect: (templateId: DiagramTemplateId) => void
}

export default function DiagramTemplatePicker({ open, title, onTitleChange, onCancel, onSelect }: Props) {
  return (
    <Modal
      title="插入图示"
      open={open}
      footer={null}
      onCancel={onCancel}
      width={720}
      destroyOnHidden
    >
      <div className="memorica-diagram-picker" data-testid="memorica-diagram-template-picker">
        <Input
          data-testid="memorica-diagram-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          maxLength={80}
        />
        <div className="memorica-diagram-template-grid">
          {DIAGRAM_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              data-testid={`memorica-diagram-template-${template.id}`}
              className="memorica-diagram-template-card"
              onClick={() => onSelect(template.id)}
            >
              <span className="memorica-diagram-template-icon" style={{ color: template.accent }}>
                <PartitionOutlined />
              </span>
              <strong>{template.name}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </div>
        <div className="memorica-diagram-picker-foot">
          <Button onClick={onCancel}>取消</Button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Wire picker into the editor**

Modify `frontend/src/components/CollabEditor.tsx`:

```tsx
import DiagramTemplatePicker from './DiagramTemplatePicker'
import { createDiagramXml, type DiagramTemplateId } from '../diagram/templates'
```

Add state:

```tsx
const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
const [pendingDiagramTitle, setPendingDiagramTitle] = useState('图示')
const [pendingDiagramXml, setPendingDiagramXml] = useState('')
```

Replace `openCreateDiagram`:

```tsx
const openCreateDiagram = useCallback(() => {
  if (!canEdit) return
  setActiveDiagram(null)
  setPendingDiagramTitle('图示')
  setPendingDiagramXml('')
  setTemplatePickerOpen(true)
}, [canEdit])
```

Add template selection:

```tsx
const startDiagramFromTemplate = (templateId: DiagramTemplateId) => {
  setPendingDiagramXml(createDiagramXml(templateId))
  setTemplatePickerOpen(false)
  setDrawioOpen(true)
}
```

Render the picker before `DrawioDialog`:

```tsx
<DiagramTemplatePicker
  open={templatePickerOpen}
  title={pendingDiagramTitle}
  onTitleChange={setPendingDiagramTitle}
  onCancel={() => setTemplatePickerOpen(false)}
  onSelect={startDiagramFromTemplate}
/>
```

Update `DrawioDialog` props:

```tsx
<DrawioDialog
  open={drawioOpen}
  initialXml={activeDiagram?.attrs.xml || pendingDiagramXml}
  initialTitle={activeDiagram?.attrs.title || pendingDiagramTitle || '图示'}
  onCancel={closeDrawio}
  onSave={saveDiagram}
/>
```

- [ ] **Step 5: Add picker CSS**

Append to the diagram section in `frontend/src/index.css`:

```css
.memorica-diagram-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.memorica-diagram-template-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.memorica-diagram-template-card {
  min-height: 112px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  padding: 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.memorica-diagram-template-card:hover {
  border-color: #245bdb;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.memorica-diagram-template-icon {
  font-size: 22px;
}

.memorica-diagram-template-card strong {
  color: #111827;
  font-size: 14px;
}

.memorica-diagram-template-card span:last-child {
  color: #6b7280;
  font-size: 12px;
}

.memorica-diagram-picker-foot {
  display: flex;
  justify-content: flex-end;
}
```

- [ ] **Step 6: Run focused test**

Run the template E2E command from Step 1.

Expected: PASS.

---

### Task 3: Draw.io Protocol State And Timeout Recovery

**Files:**
- Modify: `frontend/src/components/DrawioDialog.tsx`
- Modify: `frontend/e2e/editor-regression.spec.ts`

- [ ] **Step 1: Add failing timeout recovery E2E test**

Add this test after the template picker test:

```ts
test('drawio save timeout keeps the dialog open and allows retry', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'drawiotimeout');
  const document = await createDocument(request, auth, uniqueName('图示超时验证'));
  const marker = uniqueName('retry-marker');

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();
  await page.getByTestId('memorica-diagram-template-blank').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: '保存图示' }).click();
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('保存没有响应', { timeout: 13_000 });
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible();

  await simulateDrawioExport(page, marker);
  await expect(page.getByTestId('memorica-diagram-node')).toBeVisible();
  await expectLatestVersionContains(request, auth, document.id, marker);
});
```

Run the focused E2E test. Expected: FAIL because `memorica-drawio-status` does not exist and timeout state is not explicit.

- [ ] **Step 2: Add explicit dialog state**

In `frontend/src/components/DrawioDialog.tsx`, add:

```ts
type DrawioState = 'loading' | 'ready' | 'saving' | 'timeout' | 'error'
```

Replace `message`/`saving` state with:

```tsx
const [state, setState] = useState<DrawioState>('loading')
const message = {
  loading: '图示编辑器加载中',
  ready: '可以开始编辑图示',
  saving: '正在保存图示',
  timeout: '保存没有响应，请重试',
  error: '图示编辑器出现异常，请重试',
}[state]
const saving = state === 'saving'
```

Update event handlers:

```ts
if (payload.event === 'init') {
  pendingXmlRef.current = initialXml || EMPTY_DRAWIO_XML
  postToDrawio({
    action: 'load',
    autosave: 1,
    modified: 'unsavedChanges',
    title: `${initialTitle || '图示'}.drawio`,
    xml: pendingXmlRef.current,
  })
  setState('ready')
  return
}

if (payload.event === 'export') {
  clearSaveTimer()
  setState('ready')
  onSave({
    xml: payload.xml || pendingXmlRef.current,
    svg: payload.data || '',
    title: initialTitle || '图示',
    updatedAt: new Date().toISOString(),
  })
  return
}
```

Update `handleSave`:

```tsx
const handleSave = () => {
  setState('saving')
  postToDrawio({ action: 'save' })
  clearSaveTimer()
  saveTimerRef.current = window.setTimeout(() => {
    setState('timeout')
  }, 12000)
}
```

Add status selector:

```tsx
<span data-testid="memorica-drawio-status">{message}</span>
```

- [ ] **Step 3: Run focused timeout test**

Run:

```bash
cd frontend
E2E_SKIP_WEB_SERVER=true \
E2E_BASE_URL=http://127.0.0.1:5173 \
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health \
npm run test:e2e -- editor-regression.spec.ts -g "drawio save timeout keeps the dialog open and allows retry"
```

Expected: PASS.

---

### Task 4: Diagram Block Actions

**Files:**
- Modify: `frontend/src/extensions/Diagram.tsx`
- Modify: `frontend/src/components/CollabEditor.tsx`
- Modify: `frontend/src/index.css`
- Modify: `frontend/e2e/editor-regression.spec.ts`

- [ ] **Step 1: Add failing action E2E tests**

Add these tests after the timeout recovery test:

```ts
test('diagram block can be renamed duplicated and deleted', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'diagramactions');
  const document = await createDocument(request, auth, uniqueName('图示操作验证'));
  const marker = uniqueName('action-marker');
  const renamed = `重命名图示 ${uniqueName('renamed')}`;

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await openDrawioDialog(page);
  await simulateDrawioExport(page, marker);

  await page.getByTestId('memorica-diagram-action-rename').click();
  await page.getByTestId('memorica-diagram-rename-input').fill(renamed);
  await page.getByRole('button', { name: '保存名称' }).click();
  await expect(page.getByTestId('memorica-diagram-node')).toContainText(renamed);

  await page.getByTestId('memorica-diagram-action-duplicate').click();
  await expect(page.getByTestId('memorica-diagram-node')).toHaveCount(2);

  await page.getByTestId('memorica-diagram-action-delete').click();
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(page.getByTestId('memorica-diagram-node')).toHaveCount(1);
  await expectLatestVersionContains(request, auth, document.id, renamed);
});

test('viewer cannot mutate diagram blocks', async ({ page, request }) => {
  const owner = await registerTestUser(request, 'diagramowner');
  const viewer = await registerTestUser(request, 'diagramviewer');
  const document = await createDocument(request, owner, uniqueName('图示只读验证'));
  const marker = uniqueName('readonly-diagram');

  await loginByStorage(page, owner);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);
  await openDrawioDialog(page);
  await simulateDrawioExport(page, marker);
  await expectLatestVersionContains(request, owner, document.id, marker);
  await grantDocumentAccess(request, owner, document.id, viewer.user.username, 'viewer');

  await loginByStorage(page, viewer);
  await openEditorForDocument(page, document.id);
  await expect(page.getByTestId('memorica-diagram-node')).toBeVisible({ timeout: 12_000 });
  await expect(page.getByTestId('memorica-diagram-action-download')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-action-edit')).not.toBeVisible();
  await expect(page.getByTestId('memorica-diagram-action-rename')).not.toBeVisible();
  await expect(page.getByTestId('memorica-diagram-action-duplicate')).not.toBeVisible();
  await expect(page.getByTestId('memorica-diagram-action-delete')).not.toBeVisible();
});
```

Run each focused test and verify both fail because diagram action controls do not exist.

- [ ] **Step 2: Add action payload types**

In `frontend/src/extensions/Diagram.tsx`, add:

```ts
export type DiagramAction = 'edit' | 'rename' | 'duplicate' | 'delete'

export interface DiagramActionPayload {
  action: DiagramAction
  attrs: DiagramAttrs
  updateAttributes: (attrs: Partial<DiagramAttrs>) => void
  duplicate: () => void
  remove: () => void
}
```

- [ ] **Step 3: Render action controls in node view**

Update `DiagramView` to derive read-only from the editor:

```tsx
function DiagramView({ node, selected, updateAttributes, editor, getPos }: NodeViewProps) {
  const attrs = node.attrs as DiagramAttrs
  const src = previewSrc(attrs.svg)
  const title = attrs.title || '图示'
  const canEdit = editor.isEditable

  const dispatchAction = (action: DiagramAction) => {
    window.dispatchEvent(new CustomEvent<DiagramActionPayload>('memorica:diagram-action', {
      detail: {
        action,
        attrs,
        updateAttributes,
        duplicate: () => {
          const pos = typeof getPos === 'function' ? getPos() : undefined
          if (typeof pos !== 'number') return
          editor.chain().focus().insertContentAt(pos + node.nodeSize, {
            type: 'diagram',
            attrs: {
              ...attrs,
              title: `${title} 副本`,
              updatedAt: new Date().toISOString(),
            },
          }).run()
        },
        remove: () => {
          const pos = typeof getPos === 'function' ? getPos() : undefined
          if (typeof pos !== 'number') return
          editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
        },
      },
    }))
  }

  const downloadSvg = () => {
    if (!attrs.svg) return
    const blob = new Blob([attrs.svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }
```

Render action buttons:

```tsx
<div className="memorica-diagram-actions">
  {canEdit && (
    <>
      <button data-testid="memorica-diagram-action-edit" type="button" onClick={() => dispatchAction('edit')}>编辑</button>
      <button data-testid="memorica-diagram-action-rename" type="button" onClick={() => dispatchAction('rename')}>重命名</button>
      <button data-testid="memorica-diagram-action-duplicate" type="button" onClick={() => dispatchAction('duplicate')}>复制</button>
      <button data-testid="memorica-diagram-action-delete" type="button" onClick={() => dispatchAction('delete')}>删除</button>
    </>
  )}
  <button data-testid="memorica-diagram-action-download" type="button" onClick={downloadSvg} disabled={!attrs.svg}>下载 SVG</button>
</div>
```

Add `data-testid="memorica-diagram-node"` to `NodeViewWrapper`.

- [ ] **Step 4: Handle actions in CollabEditor**

Import the payload type:

```tsx
import { Diagram, type DiagramActionPayload, type DiagramAttrs, type DiagramEditPayload } from '../extensions/Diagram'
```

Add state:

```tsx
const [renameDiagram, setRenameDiagram] = useState<DiagramActionPayload | null>(null)
const [renameDiagramTitle, setRenameDiagramTitle] = useState('')
const [deleteDiagram, setDeleteDiagram] = useState<DiagramActionPayload | null>(null)
```

Add action listener:

```tsx
useEffect(() => {
  const handleDiagramAction = (event: Event) => {
    if (!canEdit) return
    const detail = (event as CustomEvent<DiagramActionPayload>).detail
    if (!detail) return
    if (detail.action === 'edit') {
      setActiveDiagram({ attrs: detail.attrs, updateAttributes: detail.updateAttributes })
      setDrawioOpen(true)
    }
    if (detail.action === 'rename') {
      setRenameDiagram(detail)
      setRenameDiagramTitle(detail.attrs.title || '图示')
    }
    if (detail.action === 'duplicate') {
      detail.duplicate()
      setVersionSaveState('saving')
      window.setTimeout(() => void saveCurrentVersionRef.current('auto'), 300)
    }
    if (detail.action === 'delete') {
      setDeleteDiagram(detail)
    }
  }
  window.addEventListener('memorica:diagram-action', handleDiagramAction)
  return () => window.removeEventListener('memorica:diagram-action', handleDiagramAction)
}, [canEdit])
```

Render rename and delete modals:

```tsx
<Modal
  title="重命名图示"
  open={Boolean(renameDiagram)}
  okText="保存名称"
  cancelText="取消"
  onCancel={() => setRenameDiagram(null)}
  onOk={() => {
    const nextTitle = renameDiagramTitle.trim() || '图示'
    renameDiagram?.updateAttributes({ title: nextTitle, updatedAt: new Date().toISOString() })
    setRenameDiagram(null)
    setVersionSaveState('saving')
    window.setTimeout(() => void saveCurrentVersionRef.current('auto'), 300)
  }}
>
  <Input
    data-testid="memorica-diagram-rename-input"
    value={renameDiagramTitle}
    onChange={(event) => setRenameDiagramTitle(event.target.value)}
    maxLength={80}
  />
</Modal>

<Modal
  title="删除图示"
  open={Boolean(deleteDiagram)}
  okText="确认删除"
  cancelText="取消"
  okButtonProps={{ danger: true }}
  onCancel={() => setDeleteDiagram(null)}
  onOk={() => {
    deleteDiagram?.remove()
    setDeleteDiagram(null)
    setVersionSaveState('saving')
    window.setTimeout(() => void saveCurrentVersionRef.current('auto'), 300)
  }}
>
  删除后会随下一次保存写入版本历史。
</Modal>
```

- [ ] **Step 5: Add action CSS**

Append:

```css
.memorica-diagram-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.memorica-diagram-actions button {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #4b5563;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}

.memorica-diagram-actions button:hover:not(:disabled) {
  border-color: #245bdb;
  color: #245bdb;
}

.memorica-diagram-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
```

- [ ] **Step 6: Run action tests**

Run both focused tests from Step 1.

Expected: PASS.

---

### Task 5: Version Restore Keeps Diagrams Editable

**Files:**
- Modify: `frontend/e2e/editor-regression.spec.ts`
- Modify: `frontend/src/components/CollabEditor.tsx` only if the test reveals a defect.

- [ ] **Step 1: Add a failing restore editability test**

Add this test after `version history can restore an older version into the editor`:

```ts
test('restored diagram version remains editable', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'diagramrestore');
  const document = await createDocument(request, auth, uniqueName('图示恢复验证'));
  const firstMarker = uniqueName('diagram-first');
  const restoredMarker = uniqueName('diagram-restored-edit');

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await openDrawioDialog(page);
  await simulateDrawioExport(page, firstMarker);
  await expectLatestVersionContains(request, auth, document.id, firstMarker);

  await page.locator('.notion-editor').click();
  await page.keyboard.type(` ${uniqueName('later-text')}`);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 12_000 });

  await page.goto(`/doc/${document.id}/versions`);
  await page.getByRole('button', { name: /版本 1/ }).click();
  await page.getByRole('button', { name: '恢复此版本' }).click();
  await expect(page.getByTestId('memorica-diagram-node')).toBeVisible({ timeout: 15_000 });

  await page.getByTestId('memorica-diagram-action-edit').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });
  await simulateDrawioExport(page, restoredMarker);
  await expectLatestVersionContains(request, auth, document.id, restoredMarker);
});
```

Run the focused test. Expected: FAIL until diagram action edit and restore flow are both wired.

- [ ] **Step 2: Fix restore handling only if needed**

If the restored content appears but actions do not work, make sure `Diagram` node actions use `editor.isEditable` and not stale props.

If the restored content does not appear, inspect `CollabEditor` restore effect:

```tsx
editor.commands.setContent(JSON.parse(version.contentJson || '{}'))
window.setTimeout(() => saveCurrentVersion('restore'), 300)
```

Preserve that flow and fix the smallest bug shown by the failure.

- [ ] **Step 3: Run restore editability test**

Run the focused test again.

Expected: PASS.

---

### Task 6: Documentation And Domestic Source Notes

**Files:**
- Modify: `README.md`
- Modify: `frontend/README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Add `.superpowers/` to gitignore**

Modify `.gitignore`:

```gitignore
.superpowers/
```

- [ ] **Step 2: Update README tech stack**

In `README.md`, replace the old frontend stack bullets:

```md
- Ant Design 5 + Ant Design ProComponents — 应用布局、表格、表单和操作组件
- Tiptap 3（ProseMirror）— 富文本编辑器核心
- Yjs + Hocuspocus — CRDT 协作算法和 WebSocket 同步
- Draw.io / diagrams.net — 图示编辑
- Zustand + Axios — 前端状态和 API 调用
```

- [ ] **Step 3: Add local preview account note**

Add to `README.md` quick-start section:

```md
本地预览没有内置固定账号。启动服务后可以在登录页注册，也可以用 API 创建演示账号：

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","email":"demo@memorica.local","password":"Memorica2026"}'
```
```

- [ ] **Step 4: Add domestic source note**

Add:

```md
本地开发默认使用 `.npmrc` 中的 `https://registry.npmmirror.com`。Gradle wrapper 使用腾讯 Gradle 镜像，后端依赖优先使用阿里云 Maven public 镜像，并保留 Maven Central 兜底。
```

- [ ] **Step 5: Run docs-adjacent verification**

Run:

```bash
rg -n "Semi UI|lucide-react" README.md frontend/README.md
```

Expected: no output.

---

### Task 7: Full Verification

**Files:**
- No production file changes unless verification exposes a defect.

- [ ] **Step 1: Run static frontend checks**

Run:

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
```

Expected: all exit 0. `npm run build` may print the existing large chunk warning; that warning is not a failure.

- [ ] **Step 2: Run audits**

Run:

```bash
make frontend-audit
make hocuspocus-audit
```

Expected: both report `found 0 vulnerabilities`.

- [ ] **Step 3: Run E2E regression**

With services running:

```bash
cd frontend
E2E_SKIP_WEB_SERVER=true \
E2E_BASE_URL=http://127.0.0.1:5173 \
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health \
npm run test:e2e
```

Expected: all non-provider E2E tests pass. The provider-backed AI test remains skipped unless `E2E_RUN_AI=true`.

- [ ] **Step 4: Browser smoke**

Open `http://127.0.0.1:5173/` and verify:

- Login page renders.
- Demo account or a fresh registered user can enter the document library.
- New document opens.
- Diagram picker appears.
- Draw.io dialog appears after selecting a template.
- Diagram block renders after simulated export or real save.

Expected: no browser console errors.

- [ ] **Step 5: Completion audit**

Check the acceptance criteria from `docs/superpowers/specs/2026-06-13-main-path-completion-design.md` one by one against command output, E2E output, source scans, and browser smoke evidence.

Expected: every criterion has direct evidence.
