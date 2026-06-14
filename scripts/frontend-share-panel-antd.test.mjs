import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const sharePanelPath = 'frontend/src/components/ShareSettingsPanel.tsx'
const requiredAntdComponents = [
  'Alert',
  'Button',
  'Drawer',
  'Input',
  'List',
  'Select',
  'Space',
  'Spin',
  'Switch',
  'Tag',
  'Typography',
]

test('share settings panel uses Ant Design drawer and form controls', async () => {
  const source = await readFile(sharePanelPath, 'utf8')

  assert.match(source, /from 'antd'/)
  for (const component of requiredAntdComponents) {
    assert.match(source, new RegExp(`\\b${component}\\b`))
  }

  assert.match(source, /<Drawer\b[\s\S]*open=\{open\}[\s\S]*onClose=\{onClose\}/)
  assert.match(source, /<Switch\b[\s\S]*checked=\{sharing\?\.isPublic === true\}[\s\S]*onChange=\{updatePublic\}/)
  assert.match(source, /<Input\b[\s\S]*data-testid="memorica-share-username"/)
  assert.match(source, /<Select\b[\s\S]*value=\{role\}[\s\S]*options=\{shareRoleOptions\}/)
  assert.match(source, /<Button\b[\s\S]*data-testid="memorica-share-add-member"/)
  assert.match(source, /<List\b[\s\S]*dataSource=\{sharing\?\.members \|\| \[\]\}/)
})

test('share settings panel does not render native form controls directly', async () => {
  const source = await readFile(sharePanelPath, 'utf8')

  assert.doesNotMatch(source, /<button\b/)
  assert.doesNotMatch(source, /<input\b/)
  assert.doesNotMatch(source, /<select\b/)
})

test('frontend-check runs the share panel Ant Design policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-share-panel-policy-test: ## Verify share settings panel uses Ant Design controls$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
