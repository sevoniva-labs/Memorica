import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('frontend declares Markdown paste and Mermaid rendering dependencies', async () => {
  const pkg = JSON.parse(await readFile('frontend/package.json', 'utf8'))

  assert.ok(pkg.dependencies['@tiptap/markdown'])
  assert.ok(pkg.dependencies['@tiptap/extension-code-block'])
  assert.ok(pkg.dependencies.mermaid)
})

test('collaboration editor wires Markdown paste parsing and Mermaid code blocks', async () => {
  const source = await readFile('frontend/src/components/CollabEditor.tsx', 'utf8')

  assert.match(source, /from '@tiptap\/markdown'/)
  assert.match(source, /from '\.\.\/extensions\/MermaidCodeBlock'/)
  assert.match(source, /Markdown\.configure/)
  assert.match(source, /MermaidCodeBlock\.configure/)
  assert.match(source, /handlePaste/)
  assert.match(source, /contentType: 'markdown'/)
})

test('Mermaid code block renders preview and source affordances', async () => {
  const extensionSource = await readFile('frontend/src/extensions/MermaidCodeBlock.tsx', 'utf8')
  const viewSource = await readFile('frontend/src/extensions/MermaidCodeBlockView.tsx', 'utf8')

  assert.match(extensionSource, /ReactNodeViewRenderer/)
  assert.match(extensionSource, /MermaidCodeBlockView/)
  assert.match(viewSource, /import\('mermaid'\)/)
  assert.match(viewSource, /data-testid="memorica-mermaid-block"/)
  assert.match(viewSource, /data-testid="memorica-mermaid-preview"/)
  assert.match(viewSource, /data-testid="memorica-mermaid-source"/)
})

test('frontend-check runs the Markdown and Mermaid policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-markdown-mermaid-policy-test: ## Verify Markdown paste and Mermaid editor support$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test frontend-ai-permission-policy-test frontend-diagram-template-format-test frontend-diagram-template-picker-policy-test frontend-diagram-node-policy-test frontend-markdown-mermaid-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})

test('Mermaid dependencies stay outside the default eager vendor chunk', async () => {
  const source = await readFile('frontend/vite.config.ts', 'utf8')

  assert.match(source, /vendor-mermaid/)
  assert.match(source, /node_modules\/mermaid/)
  assert.match(source, /node_modules\\\/d3/)
})
