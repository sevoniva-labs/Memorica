import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const loginPagePath = 'frontend/src/pages/LoginPage.tsx'
const requiredAntdComponents = ['Alert', 'Button', 'Card', 'Form', 'Input', 'Typography']

test('login page uses Ant Design form components instead of native controls', async () => {
  const source = await readFile(loginPagePath, 'utf8')

  assert.match(source, /from 'antd'/)
  for (const component of requiredAntdComponents) {
    assert.match(source, new RegExp(`\\b${component}\\b`))
  }

  assert.match(source, /<Form\b/)
  assert.match(source, /onFinish=\{handleSubmit\}/)
  assert.match(source, /<Form\.Item\b[\s\S]*name="username"/)
  assert.match(source, /<Input\b[\s\S]*placeholder="请输入用户名"/)
  assert.match(source, /<Input\.Password\b[\s\S]*placeholder="请输入密码"/)
  assert.match(source, /<Button\b[\s\S]*htmlType="submit"[\s\S]*loading=\{loading\}/)
  assert.match(source, /<Alert\b[\s\S]*type="error"/)
})

test('login page does not render native form, input, or button elements directly', async () => {
  const source = await readFile(loginPagePath, 'utf8')

  assert.doesNotMatch(source, /<form\b/)
  assert.doesNotMatch(source, /<input\b/)
  assert.doesNotMatch(source, /<button\b/)
})

test('frontend-check runs the login Ant Design policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-login-policy-test: ## Verify login page uses Ant Design form controls$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
