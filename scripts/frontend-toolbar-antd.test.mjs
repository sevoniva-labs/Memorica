import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const toolbarPath = 'frontend/src/components/Toolbar.tsx'
const requiredAntdComponents = ['Button', 'Dropdown', 'Tooltip']

test('editor toolbar uses Ant Design buttons, tooltips, and dropdowns', async () => {
  const source = await readFile(toolbarPath, 'utf8')

  assert.match(source, /from 'antd'/)
  for (const component of requiredAntdComponents) {
    assert.match(source, new RegExp(`\\b${component}\\b`))
  }

  assert.match(source, /<Tooltip\b[\s\S]*title=/)
  assert.match(source, /<Button\b[\s\S]*type="text"[\s\S]*icon=/)
  assert.match(source, /<Dropdown\b[\s\S]*trigger=\{\['click'\]\}/)
})

test('editor toolbar does not render native button elements directly', async () => {
  const source = await readFile(toolbarPath, 'utf8')

  assert.doesNotMatch(source, /<button\b/)
})

test('frontend-check runs the editor toolbar Ant Design policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-toolbar-policy-test: ## Verify editor toolbar uses Ant Design controls$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test frontend-diagram-template-format-test frontend-diagram-template-picker-policy-test frontend-diagram-node-policy-test frontend-markdown-mermaid-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
