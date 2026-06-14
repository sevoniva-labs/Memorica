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

test('application layout menu items use Ant Design buttons', async () => {
  const source = await readFile('frontend/src/components/AppLayout.tsx', 'utf8')

  assert.match(source, /import \{[^}]*\bButton\b[^}]*\} from 'antd'/s)
  assert.match(source, /menuItemRender=\{\(item, defaultDom\) => \(\s*<Button\b[\s\S]*className=\{`memorica-pro-menu-button/)
  assert.doesNotMatch(source, /<button\b/)
})

test('attachment node actions use Ant Design buttons and tooltips', async () => {
  const source = await readFile('frontend/src/extensions/Attachment.tsx', 'utf8')

  assert.match(source, /import \{[^}]*\bButton\b[^}]*\bTooltip\b[^}]*\} from 'antd'/s)
  assert.match(source, /<Tooltip\b[\s\S]*title="打开附件"/)
  assert.match(source, /<Button\b[\s\S]*className="memorica-attachment-action"[\s\S]*data-testid="memorica-attachment-open"/)
  assert.doesNotMatch(source, /<button\b/)
})

test('frontend-check runs the UI stack policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-ui-policy-test: ## Verify frontend uses only the approved Ant Design UI stack$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test frontend-diagram-template-format-test frontend-diagram-template-picker-policy-test frontend-diagram-node-policy-test frontend-markdown-mermaid-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
