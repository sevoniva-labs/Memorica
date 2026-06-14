#!/usr/bin/env node

const DEFAULTS = {
  apiBase: process.env.MEMORICA_API_BASE || 'http://127.0.0.1:8080/api/v1',
  ownerUsername: process.env.MEMORICA_DEMO_USERNAME || 'demo',
  ownerPassword: process.env.MEMORICA_DEMO_PASSWORD || 'Memorica2026',
  ownerEmail: process.env.MEMORICA_DEMO_EMAIL || 'demo@memorica.local',
  viewerUsername: process.env.MEMORICA_DEMO_VIEWER_USERNAME || 'demo_viewer',
  viewerPassword: process.env.MEMORICA_DEMO_VIEWER_PASSWORD || 'Memorica2026',
  viewerEmail: process.env.MEMORICA_DEMO_VIEWER_EMAIL || 'demo.viewer@memorica.local',
  documentTitle: process.env.MEMORICA_DEMO_DOCUMENT_TITLE || 'Memorica 预发布演示文档',
}

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const help = args.has('--help') || args.has('-h')

if (help) {
  printHelp()
  process.exit(0)
}

main().catch((error) => {
  console.error(`Demo seed failed: ${error.message}`)
  process.exit(1)
})

async function main() {
  if (dryRun) {
    console.log('Memorica demo seed dry run')
    console.log(`API: ${DEFAULTS.apiBase}`)
    console.log(`Owner: ${DEFAULTS.ownerUsername} / ${DEFAULTS.ownerEmail}`)
    console.log(`Viewer: ${DEFAULTS.viewerUsername} / ${DEFAULTS.viewerEmail}`)
    console.log(`Document: ${DEFAULTS.documentTitle}`)
    console.log('Planned actions: ensure users, create/reuse document, upload PDF, save two versions, grant viewer access.')
    return
  }

  const owner = await ensureUser({
    username: DEFAULTS.ownerUsername,
    password: DEFAULTS.ownerPassword,
    email: DEFAULTS.ownerEmail,
  })
  const viewer = await ensureUser({
    username: DEFAULTS.viewerUsername,
    password: DEFAULTS.viewerPassword,
    email: DEFAULTS.viewerEmail,
  })
  const document = await createOrReuseDocument(owner.accessToken, DEFAULTS.documentTitle)
  const uploaded = await uploadDemoAttachment(owner.accessToken, document.id)

  await saveVersion(owner.accessToken, document.id, buildVersionOneContent(), 'seed-demo-initial')
  await saveVersion(owner.accessToken, document.id, buildVersionTwoContent(uploaded), 'seed-demo-final')
  await grantViewerAccess(owner.accessToken, document.id, viewer.user.username)

  console.log('Memorica demo seed complete')
  console.log(`Owner: ${owner.user.username}`)
  console.log(`Viewer: ${viewer.user.username}`)
  console.log(`Document: ${document.title} (${document.id})`)
  console.log(`Attachment: ${uploaded.originalName} (${uploaded.objectName})`)
  console.log('Open http://localhost:5173 and log in with demo / Memorica2026 to run the three-minute demo.')
}

function printHelp() {
  console.log(`Usage: node scripts/seed-demo.mjs [--dry-run]

Environment:
  MEMORICA_API_BASE                 API base URL, default ${DEFAULTS.apiBase}
  MEMORICA_DEMO_USERNAME            Owner username, default ${DEFAULTS.ownerUsername}
  MEMORICA_DEMO_PASSWORD            Owner password, default ${DEFAULTS.ownerPassword}
  MEMORICA_DEMO_EMAIL               Owner email, default ${DEFAULTS.ownerEmail}
  MEMORICA_DEMO_VIEWER_USERNAME     Viewer username, default ${DEFAULTS.viewerUsername}
  MEMORICA_DEMO_VIEWER_PASSWORD     Viewer password, default ${DEFAULTS.viewerPassword}
  MEMORICA_DEMO_VIEWER_EMAIL        Viewer email, default ${DEFAULTS.viewerEmail}
  MEMORICA_DEMO_DOCUMENT_TITLE      Demo document title, default ${DEFAULTS.documentTitle}
`)
}

async function ensureUser({ username, password, email }) {
  const register = await rawJson('/auth/register', {
    method: 'POST',
    body: { username, password, email },
  })
  if (register.ok) {
    return register.data
  }

  const login = await rawJson('/auth/login', {
    method: 'POST',
    body: { username, password },
  })
  if (login.ok) {
    return login.data
  }

  throw new Error(`cannot register or log in as ${username}: ${register.error}; ${login.error}`)
}

async function createOrReuseDocument(token, title) {
  const existing = await apiJson(`/documents/my?q=${encodeURIComponent(title)}&size=50`, { token })
  const match = (existing.content || []).find(
    (item) => item.title === title && item.itemType !== 'folder' && !item.deletedAt
  )
  if (match) {
    return match
  }
  return apiJson('/documents', {
    method: 'POST',
    token,
    body: { title },
  })
}

async function uploadDemoAttachment(token, documentId) {
  const fileName = 'memorica-demo-brief.pdf'
  const form = new FormData()
  form.append('documentId', documentId)
  form.append(
    'file',
    new Blob([demoPdfBytes()], { type: 'application/pdf' }),
    fileName
  )
  return apiForm('/files/upload', { token, form })
}

async function saveVersion(token, documentId, content, source) {
  const plainText = extractPlainText(content)
  return apiJson(`/documents/${documentId}/versions`, {
    method: 'POST',
    token,
    body: {
      contentJson: JSON.stringify(content),
      snapshotHtml: snapshotHtml(content),
      wordCount: plainText.split(/\s+/).filter(Boolean).length,
      charCount: plainText.length,
      source,
    },
  })
}

async function grantViewerAccess(token, documentId, username) {
  return apiJson(`/documents/${documentId}/sharing/members`, {
    method: 'POST',
    token,
    body: { username, role: 'viewer' },
  })
}

async function apiJson(path, options = {}) {
  const response = await rawJson(path, options)
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path}: ${response.error}`)
  }
  return response.data
}

async function rawJson(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${DEFAULTS.apiBase}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      error: payload.message || payload.error || `${response.status} ${response.statusText}`,
    }
  }
  return { ok: true, data: payload.data }
}

async function apiForm(path, { token, form }) {
  const response = await fetch(`${DEFAULTS.apiBase}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`POST ${path}: ${payload.message || payload.error || `${response.status} ${response.statusText}`}`)
  }
  return payload.data
}

function buildVersionOneContent() {
  return doc([
    heading('Memorica 预发布演示'),
    paragraph('这是一篇用于三分钟演示的协作文档，覆盖正文编辑、版本历史、Draw.io 图示、附件和只读分享。'),
    paragraph('第一版用于展示版本历史中的初始内容，稍后会恢复或对比这一版。'),
  ])
}

function buildVersionTwoContent(attachment) {
  const now = new Date().toISOString()
  return doc([
    heading('Memorica 预发布演示'),
    paragraph('这是一篇用于三分钟演示的协作文档，覆盖正文编辑、版本历史、Draw.io 图示、附件和只读分享。'),
    diagram(now),
    paragraph('第二版加入了系统架构图和 PDF 附件，可用于展示保存状态、版本变化和 viewer 只读访问。'),
    {
      type: 'attachment',
      attrs: {
        objectName: attachment.objectName,
        url: attachment.url,
        name: attachment.originalName,
        sizeBytes: attachment.sizeBytes,
        contentType: attachment.contentType,
        uploadedAt: now,
      },
    },
  ])
}

function doc(content) {
  return { type: 'doc', content }
}

function heading(text) {
  return { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text }] }
}

function paragraph(text) {
  return { type: 'paragraph', content: [{ type: 'text', text }] }
}

function diagram(updatedAt) {
  const xml = '<mxfile><diagram name="Page-1">Memorica demo architecture</diagram></mxfile>'
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="220"><rect width="520" height="220" rx="12" fill="#f8fafc"/><rect x="36" y="70" width="110" height="60" rx="8" fill="#e0f2fe" stroke="#0284c7"/><text x="91" y="105" text-anchor="middle" font-size="14" fill="#075985">Frontend</text><rect x="205" y="70" width="110" height="60" rx="8" fill="#dcfce7" stroke="#16a34a"/><text x="260" y="105" text-anchor="middle" font-size="14" fill="#166534">Backend</text><rect x="374" y="70" width="110" height="60" rx="8" fill="#fef3c7" stroke="#d97706"/><text x="429" y="105" text-anchor="middle" font-size="14" fill="#92400e">Storage</text><path d="M146 100 H205" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/><path d="M315 100 H374" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#475569"/></marker></defs></svg>'
  return {
    type: 'diagram',
    attrs: {
      xml,
      svg,
      title: '演示系统架构图',
      updatedAt,
    },
  }
}

function extractPlainText(node) {
  if (!node) return ''
  if (node.text) return node.text
  if (!Array.isArray(node.content)) return ''
  return node.content.map(extractPlainText).filter(Boolean).join(' ')
}

function snapshotHtml(content) {
  return `<article><h1>Memorica 预发布演示</h1><p>${escapeHtml(extractPlainText(content))}</p></article>`
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function demoPdfBytes() {
  const stream = 'BT /F1 18 Tf 40 82 Td (Memorica demo attachment) Tj ET'
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ]
  const offsets = []
  let pdf = '%PDF-1.4\n'
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += object
  }
  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf)
}
