import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inflateRawSync } from 'node:zlib'

import * as seedDemo from './seed-demo.mjs'
import { buildVersionTwoContent, demoPdfBytes, extractPlainText } from './seed-demo.mjs'

function decodeDiagramXml(xml) {
  const body = xml.match(/<diagram[^>]*>([^<]+)<\/diagram>/)?.[1]
  assert.ok(body)
  return decodeURIComponent(inflateRawSync(Buffer.from(body, 'base64')).toString('utf8'))
}

test('demo final version contains editable diagram and attachment nodes', () => {
  const content = buildVersionTwoContent({
    objectName: 'demo-file.pdf',
    originalName: 'memorica-demo-brief.pdf',
    url: 'http://minio.local/demo-file.pdf',
    sizeBytes: 512,
    contentType: 'application/pdf',
  })

  assert.equal(content.type, 'doc')
  const diagram = content.content.find((node) => node.type === 'diagram')
  assert.ok(diagram)
  assert.match(decodeDiagramXml(diagram.attrs.xml), /Memorica demo architecture/)
  assert.ok(content.content.some((node) => node.type === 'attachment' && node.attrs.objectName === 'demo-file.pdf'))
  assert.match(extractPlainText(content), /三分钟演示/)
})

test('demo final snapshot renders diagram and attachment summaries', () => {
  const content = buildVersionTwoContent({
    objectName: 'demo-file.pdf',
    originalName: 'memorica-demo-brief.pdf',
    url: 'http://minio.local/demo-file.pdf',
    sizeBytes: 512,
    contentType: 'application/pdf',
  })

  assert.equal(typeof seedDemo.buildVersionSnapshotHtml, 'function')
  const html = seedDemo.buildVersionSnapshotHtml(content)

  assert.match(html, /memorica-diagram-static/)
  assert.match(html, /演示系统架构图/)
  assert.match(html, /memorica-attachment-static/)
  assert.match(html, /memorica-demo-brief\.pdf/)
})

test('demo PDF bytes are a syntactically complete single-page PDF', () => {
  const pdf = demoPdfBytes().toString('utf8')

  assert.ok(pdf.startsWith('%PDF-1.4'))
  assert.match(pdf, /xref\n0 6/)
  assert.match(pdf, /startxref\n\d+/)
  assert.ok(pdf.endsWith('%%EOF\n'))
})
