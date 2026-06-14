import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const documentListPagePath = 'frontend/src/pages/DocumentListPage.tsx'
const requiredAntdComponents = [
  'Alert',
  'Breadcrumb',
  'Button',
  'Dropdown',
  'Input',
  'Modal',
  'Popconfirm',
  'Select',
  'Skeleton',
  'Space',
  'Tabs',
  'Typography',
]

test('document list page uses Ant Design navigation and action controls', async () => {
  const source = await readFile(documentListPagePath, 'utf8')

  assert.match(source, /from 'antd'/)
  assert.match(source, /ProTable/)
  for (const component of requiredAntdComponents) {
    assert.match(source, new RegExp(`\\b${component}\\b`))
  }

  assert.match(source, /<Button\b[\s\S]*className="memorica-quick-button"[\s\S]*className="memorica-quick-card"/)
  assert.match(source, /<Breadcrumb\b[\s\S]*items=\{breadcrumbItems\}/)
  assert.match(source, /<Tabs\b[\s\S]*activeKey=\{tab\}[\s\S]*items=\{documentTabs\}[\s\S]*onChange=/)
})

test('document list page does not render native button elements directly', async () => {
  const source = await readFile(documentListPagePath, 'utf8')

  assert.doesNotMatch(source, /<button\b/)
})

test('frontend-check runs the document list Ant Design policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-document-list-policy-test: ## Verify document list page uses Ant Design controls$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test frontend-diagram-template-picker-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
