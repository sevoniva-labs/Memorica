import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const bubbleMenuPath = 'frontend/src/components/BubbleMenuBar.tsx'
const requiredAntdComponents = ['Button', 'Dropdown', 'Tooltip']

test('bubble menu uses Ant Design buttons, tooltips, and dropdowns', async () => {
  const source = await readFile(bubbleMenuPath, 'utf8')

  assert.match(source, /from 'antd'/)
  for (const component of requiredAntdComponents) {
    assert.match(source, new RegExp(`\\b${component}\\b`))
  }

  assert.match(source, /<Tooltip\b[\s\S]*title=\{label\}/)
  assert.match(source, /<Button\b[\s\S]*aria-label=\{label\}[\s\S]*icon=\{icon\}/)
  assert.match(source, /<Dropdown\b[\s\S]*menu=\{\{ items: colorMenuItems, onClick: handleColorMenuClick \}\}/)
  assert.match(source, /<Dropdown\b[\s\S]*menu=\{\{ items: fontMenuItems, onClick: handleFontMenuClick \}\}/)
})

test('bubble menu does not render native button elements directly', async () => {
  const source = await readFile(bubbleMenuPath, 'utf8')

  assert.doesNotMatch(source, /<button\b/)
})

test('frontend-check runs the bubble menu Ant Design policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-bubble-menu-policy-test: ## Verify editor bubble menu uses Ant Design controls$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
