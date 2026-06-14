import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  analyzeDiagramTemplates,
  buildDrawioDiagnostics,
  resolveDrawioUrl,
} from './drawio-diagnostics.mjs'

test('analyzeDiagramTemplates validates all committed Draw.io template bodies', async () => {
  const source = await readFile('frontend/src/diagram/templates.ts', 'utf8')
  const result = analyzeDiagramTemplates(source)

  assert.equal(result.total, 8)
  assert.equal(result.valid, 8)
  assert.deepEqual(result.invalid, [])
})

test('resolveDrawioUrl prefers explicit env over .env.development and defaults safely', () => {
  assert.deepEqual(
    resolveDrawioUrl({
      envSource: 'VITE_DRAWIO_URL=https://embed.diagrams.net/\n',
      env: { VITE_DRAWIO_URL: 'http://drawio.intra/' },
    }),
    {
      value: 'http://drawio.intra/',
      source: 'env',
      valid: true,
      error: '',
    }
  )

  assert.equal(
    resolveDrawioUrl({ envSource: 'VITE_DRAWIO_URL=\n', env: {} }).value,
    'https://embed.diagrams.net/'
  )
})

test('buildDrawioDiagnostics explains corrupted Draw.io bodies and intranet recovery', () => {
  const output = buildDrawioDiagnostics({
    templateSource: "const BAD_DIAGRAM_BODY = 'not valid base64'\n",
    envSource: 'VITE_DRAWIO_URL=http://drawio.intra/\n',
    env: {},
  })

  assert.match(output, /Draw\.io diagnostics/)
  assert.match(output, /模板压缩体异常/)
  assert.match(output, /invalid stored block lengths/)
  assert.match(output, /VITE_DRAWIO_URL=http:\/\/drawio\.intra\//)
  assert.match(output, /内网/)
  assert.match(output, /127\.0\.0\.1/)
})

test('Makefile and README expose the Draw.io diagnostics command', async () => {
  const makefile = await readFile('Makefile', 'utf8')
  const readme = await readFile('README.md', 'utf8')

  assert.match(makefile, /\.PHONY:[\s\S]*\bdrawio-diagnostics\b/)
  assert.match(makefile, /\.PHONY:[\s\S]*\bdrawio-diagnostics-test\b/)
  assert.match(makefile, /^drawio-diagnostics: ## Diagnose Draw\.io template format and intranet URL configuration$/m)
  assert.match(makefile, /^drawio-diagnostics-test: ## Verify Draw\.io diagnostics script$/m)
  assert.match(makefile, /^verify-local: .*drawio-diagnostics-test drawio-diagnostics.* ## Run local checks that do not require browser services$/m)
  assert.match(readme, /make drawio-diagnostics/)
  assert.match(readme, /invalid stored block lengths/)
})
