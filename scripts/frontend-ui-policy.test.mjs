import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'

const bannedDependencyNames = [
  '@douyinfe/semi-ui',
  '@douyinfe/semi-icons',
  '@semi-bot/semi-theme-feishu',
  'lucide',
  'lucide-react',
]

const bannedSourcePattern = /(@douyinfe\/semi|@semi-bot|semi-ui|semi-icons|lucide-react|from ['"]lucide['"])/
const bannedCssPattern = /(\.semi-|--semi-)/

async function collectFiles(root, predicate) {
  const entries = await readdir(root, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(path, predicate))
    } else if (predicate(path)) {
      files.push(path)
    }
  }

  return files
}

test('frontend dependencies do not reintroduce banned UI packages', async () => {
  const pkg = JSON.parse(await readFile('frontend/package.json', 'utf8'))
  const dependencyNames = Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies,
  })

  assert.deepEqual(
    dependencyNames.filter((name) => bannedDependencyNames.includes(name)),
    [],
  )
})

test('frontend source imports stay on the Ant Design UI stack', async () => {
  const files = await collectFiles('frontend/src', (path) => /\.[cm]?[jt]sx?$/.test(path))
  const offenders = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    if (bannedSourcePattern.test(source)) offenders.push(file)
  }

  assert.deepEqual(offenders, [])
})

test('frontend css has no legacy Semi UI selectors or variables', async () => {
  const files = await collectFiles('frontend/src', (path) => path.endsWith('.css'))
  const offenders = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    if (bannedCssPattern.test(source)) offenders.push(file)
  }

  assert.deepEqual(offenders, [])
})

test('vite manualChunks contains no legacy UI library buckets', async () => {
  const source = await readFile('frontend/vite.config.ts', 'utf8')

  assert.doesNotMatch(source, bannedSourcePattern)
  assert.match(source, /id\.includes\('antd'\).*id\.includes\('@ant-design'\)/s)
  assert.match(source, /return 'vendor-antd'/)
})

test('frontend-check runs the UI stack policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-ui-policy-test: ## Verify frontend uses only the approved Ant Design UI stack$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
