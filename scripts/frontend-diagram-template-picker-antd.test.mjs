import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const pickerPath = 'frontend/src/components/DiagramTemplatePicker.tsx'
const requiredAntdComponents = ['Button', 'Empty', 'Input', 'Modal', 'Segmented', 'Tag']

test('diagram template picker uses Ant Design controls for picker content', async () => {
  const source = await readFile(pickerPath, 'utf8')

  assert.match(source, /from 'antd'/)
  for (const component of requiredAntdComponents) {
    assert.match(source, new RegExp(`\\b${component}\\b`))
  }

  assert.match(source, /<Modal\b[\s\S]*title="插入图示"[\s\S]*width=\{720\}/)
  assert.match(source, /<Input\b[\s\S]*data-testid="memorica-diagram-title"[\s\S]*placeholder="图示标题"/)
  assert.match(source, /<Segmented\b[\s\S]*data-testid="memorica-diagram-template-category"/)
  assert.match(source, /<Button\b[\s\S]*data-testid=\{`memorica-diagram-template-\$\{template\.id\}`\}/)
  assert.match(source, /<Tag\b[\s\S]*bordered=\{false\}/)
  assert.match(source, /<Empty\b[\s\S]*description="没有找到匹配的图示模板"/)
})

test('diagram template picker does not render native button elements directly', async () => {
  const source = await readFile(pickerPath, 'utf8')

  assert.doesNotMatch(source, /<button\b/)
})

test('frontend-check runs the diagram template picker Ant Design policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-diagram-template-picker-policy-test: ## Verify Draw\.io template picker uses Ant Design controls$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test frontend-diagram-template-format-test frontend-diagram-template-picker-policy-test frontend-diagram-node-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
