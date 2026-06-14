import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildVersionTwoContent, demoPdfBytes, extractPlainText } from './seed-demo.mjs'

test('demo final version contains editable diagram and attachment nodes', () => {
  const content = buildVersionTwoContent({
    objectName: 'demo-file.pdf',
    originalName: 'memorica-demo-brief.pdf',
    url: 'http://minio.local/demo-file.pdf',
    sizeBytes: 512,
    contentType: 'application/pdf',
  })

  assert.equal(content.type, 'doc')
  assert.ok(content.content.some((node) => node.type === 'diagram' && node.attrs.xml.includes('Memorica demo')))
  assert.ok(content.content.some((node) => node.type === 'attachment' && node.attrs.objectName === 'demo-file.pdf'))
  assert.match(extractPlainText(content), /三分钟演示/)
})

test('demo PDF bytes are a syntactically complete single-page PDF', () => {
  const pdf = demoPdfBytes().toString('utf8')

  assert.ok(pdf.startsWith('%PDF-1.4'))
  assert.match(pdf, /xref\n0 6/)
  assert.match(pdf, /startxref\n\d+/)
  assert.ok(pdf.endsWith('%%EOF\n'))
})
