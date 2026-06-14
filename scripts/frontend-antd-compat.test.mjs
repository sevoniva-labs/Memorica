import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const patchPackage = '@ant-design/v5-patch-for-react-19'

test('frontend declares the Ant Design React 19 compatibility patch', async () => {
  const pkg = JSON.parse(await readFile('frontend/package.json', 'utf8'))

  assert.ok(pkg.dependencies?.[patchPackage])
})

test('frontend entry imports the React 19 compatibility patch before Ant Design styles', async () => {
  const source = await readFile('frontend/src/main.tsx', 'utf8')
  const imports = source.split('\n').filter((line) => line.startsWith('import '))

  assert.equal(imports[0], `import '${patchPackage}'`)
  assert.ok(imports.findIndex((line) => line.includes('antd/dist/reset.css')) > 0)
})

test('frontend-check runs the Ant Design React 19 compatibility policy', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
