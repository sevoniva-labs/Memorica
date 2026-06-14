import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const collabEditorPath = 'frontend/src/components/CollabEditor.tsx'
const requiredAntdComponents = ['Alert', 'Button', 'Dropdown', 'Input', 'Modal', 'Tooltip']

test('collaboration editor chrome uses Ant Design controls', async () => {
  const source = await readFile(collabEditorPath, 'utf8')

  assert.match(source, /from 'antd'/)
  for (const component of requiredAntdComponents) {
    assert.match(source, new RegExp(`\\b${component}\\b`))
  }

  assert.match(source, /<Button\b[\s\S]*aria-label="返回"[\s\S]*className="memorica-editor-icon-btn"/)
  assert.match(source, /<Input\b[\s\S]*className="memorica-editor-title-input"[\s\S]*placeholder="无标题"/)
  assert.match(source, /<Button\b[\s\S]*className="memorica-editor-btn-primary"[\s\S]*分享/)
  assert.match(source, /<Dropdown\b[\s\S]*menu=\{\{ items: moreMenuItems, onClick: handleMoreMenuClick \}\}/)
  assert.match(source, /<Button\b[\s\S]*title="更多"[\s\S]*aria-label="更多"|<Button\b[\s\S]*aria-label="更多"[\s\S]*title="更多"/)
  assert.match(source, /<Alert\b[\s\S]*className="memorica-editor-draft-banner"[\s\S]*action=/)
  assert.match(source, /<Alert\b[\s\S]*className="memorica-editor-upload-status"[\s\S]*data-testid="memorica-upload-status"/)
  assert.match(source, /<Tooltip\b[\s\S]*title="AI 助手"/)
  assert.match(source, /<Button\b[\s\S]*title="AI 助手"/)
})

test('collaboration editor keeps only hidden native file inputs', async () => {
  const source = await readFile(collabEditorPath, 'utf8')

  assert.doesNotMatch(source, /<button\b/)
  assert.doesNotMatch(source, /<input\b[\s\S]{0,180}className="memorica-editor-title-input"/)
  assert.match(source, /<input\b[\s\S]*data-testid="memorica-image-upload"[\s\S]*type="file"[\s\S]*hidden/)
  assert.match(source, /<input\b[\s\S]*data-testid="memorica-attachment-upload"[\s\S]*type="file"[\s\S]*hidden/)
})

test('frontend-check runs the collaboration editor Ant Design policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-collab-editor-policy-test: ## Verify collaboration editor chrome uses Ant Design controls$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test frontend-diagram-template-picker-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
