import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const diagramPath = 'frontend/src/extensions/Diagram.tsx'
const requiredAntdComponents = ['Button', 'Tooltip']

test('diagram node actions use Ant Design buttons and tooltips', async () => {
  const source = await readFile(diagramPath, 'utf8')

  assert.match(source, /from 'antd'/)
  for (const component of requiredAntdComponents) {
    assert.match(source, new RegExp(`\\b${component}\\b`))
  }

  assert.match(source, /<Tooltip\b[\s\S]*title=\{label\}/)
  assert.match(source, /<Button\b[\s\S]*className="memorica-diagram-action"[\s\S]*data-testid=\{testId\}/)
  assert.match(source, /memorica-diagram-action-edit/)
  assert.match(source, /memorica-diagram-action-rename/)
  assert.match(source, /memorica-diagram-action-duplicate/)
  assert.match(source, /memorica-diagram-action-delete/)
  assert.match(source, /memorica-diagram-action-download/)
  assert.match(source, /!attrs\.svg/)
})

test('diagram node does not render native button elements directly', async () => {
  const source = await readFile(diagramPath, 'utf8')

  assert.doesNotMatch(source, /<button\b/)
})

test('frontend-check runs the diagram node Ant Design policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-diagram-node-policy-test: ## Verify Draw\.io diagram node uses Ant Design controls$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test frontend-diagram-template-format-test frontend-diagram-template-picker-policy-test frontend-diagram-node-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
