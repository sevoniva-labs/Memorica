import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const versionHistoryPagePath = 'frontend/src/pages/VersionHistoryPage.tsx'
const requiredAntdComponents = ['Alert', 'Button', 'Card', 'Empty', 'List', 'Space', 'Spin', 'Tag', 'Typography']

test('version history page uses Ant Design controls for history browsing', async () => {
  const source = await readFile(versionHistoryPagePath, 'utf8')

  assert.match(source, /from 'antd'/)
  for (const component of requiredAntdComponents) {
    assert.match(source, new RegExp(`\\b${component}\\b`))
  }

  assert.match(source, /<Button\b[\s\S]*aria-label="返回编辑器"[\s\S]*icon=\{<ArrowLeftOutlined \/>/)
  assert.match(source, /<List\b[\s\S]*dataSource=\{versions\}[\s\S]*renderItem=/)
  assert.match(source, /<Empty\b[\s\S]*description="暂无历史版本"/)
  assert.match(source, /<Card\b[\s\S]*<Button\b[\s\S]*icon=\{<RollbackOutlined \/>[\s\S]*loading=\{restoring\}[\s\S]*恢复此版本/)
})

test('version history page does not render native button elements directly', async () => {
  const source = await readFile(versionHistoryPagePath, 'utf8')

  assert.doesNotMatch(source, /<button\b/)
})

test('frontend-check runs the version history Ant Design policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-version-history-policy-test: ## Verify version history page uses Ant Design controls$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test frontend-diagram-template-picker-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
