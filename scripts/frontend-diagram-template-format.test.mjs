import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { inflateRawSync } from 'node:zlib'
import { test } from 'node:test'

const templatePath = 'frontend/src/diagram/templates.ts'

function diagramBodies(source) {
  return Array.from(source.matchAll(/const [A-Z_]+_DIAGRAM_BODY = '([^']+)'/g), (match) => match[1])
}

function decodeDiagramBody(body) {
  return decodeURIComponent(inflateRawSync(Buffer.from(body, 'base64')).toString('utf8'))
}

test('diagram templates store diagrams.net-compatible compressed graph bodies', async () => {
  const source = await readFile(templatePath, 'utf8')
  const bodies = diagramBodies(source)

  assert.equal(bodies.length, 8)
  assert.doesNotMatch(source, /<diagram[^>]*>\s*<mxGraphModel/)

  for (const body of bodies) {
    const graph = decodeDiagramBody(body)

    assert.match(graph, /^<mxGraphModel\b/)
    assert.match(graph, /<root><mxCell id="0"\/><mxCell id="1" parent="0"\/>/)
  }
})

test('frontend-check runs the diagram template format test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-diagram-template-format-test: ## Verify Draw\.io templates use compressed graph bodies$/m)
  assert.match(source, /^frontend-check: frontend-antd-compat-test frontend-ui-policy-test frontend-login-policy-test frontend-version-history-policy-test frontend-document-list-policy-test frontend-share-panel-policy-test frontend-toolbar-policy-test frontend-find-replace-policy-test frontend-collab-editor-policy-test frontend-bubble-menu-policy-test frontend-diagram-template-format-test frontend-diagram-template-picker-policy-test frontend-diagram-node-policy-test frontend-markdown-mermaid-policy-test ## Run frontend lint, Ant Design checks, and production build$/m)
})
