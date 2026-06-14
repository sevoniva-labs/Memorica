import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const findReplacePath = 'frontend/src/components/FindReplace.tsx'
const requiredAntdComponents = ['Button', 'Input', 'Space', 'Tooltip', 'Typography']

test('find and replace bar uses Ant Design controls', async () => {
  const source = await readFile(findReplacePath, 'utf8')

  assert.match(source, /from 'antd'/)
  for (const component of requiredAntdComponents) {
    assert.match(source, new RegExp(`\\b${component}\\b`))
  }

  assert.match(source, /<Input\b[\s\S]*ref=\{findInputRef\}[\s\S]*placeholder="查找\.\.\."/)
  assert.match(source, /<Input\b[\s\S]*value=\{replace\}[\s\S]*placeholder="替换为\.\.\."/)
  assert.match(source, /<Tooltip\b[\s\S]*title="上一个匹配"/)
  assert.match(source, /<Button\b[\s\S]*aria-label="上一个匹配"/)
  assert.match(source, /<Space\b[\s\S]*className="memorica-find-row"/)
  assert.match(source, /<Text\b[\s\S]*className="memorica-find-count"/)
})

test('find and replace bar does not render native form controls directly', async () => {
  const source = await readFile(findReplacePath, 'utf8')

  assert.doesNotMatch(source, /<button\b/)
  assert.doesNotMatch(source, /<input\b/)
})

test('frontend-check runs the find and replace Ant Design policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-find-replace-policy-test: ## Verify find and replace bar uses Ant Design controls$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
