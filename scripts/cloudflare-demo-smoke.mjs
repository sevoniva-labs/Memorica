import { pathToFileURL } from 'node:url'

const DEFAULT_PAGES_URL = 'https://memorica-frontend-5ut.pages.dev'
const DEFAULT_USERNAME = 'demo'
const DEFAULT_PASSWORD = 'Memorica2026'
const DEFAULT_DEMO_DOC_TITLE = 'Memorica 预发布演示文档'

function isLocalHost(hostname) {
  return (
    hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname.startsWith('127.')
    || hostname.startsWith('10.')
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    || hostname.startsWith('192.168.')
  )
}

function parseUrl({ name, value, protocols, errors }) {
  if (!value) {
    errors.push(`${name} is required`)
    return null
  }

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    errors.push(`${name} must be an absolute URL`)
    return null
  }

  if (!protocols.includes(parsed.protocol)) {
    const expected = protocols.map((protocol) => `${protocol}//`).join(' or ')
    errors.push(`${name} must use ${expected}`)
  }
  if (isLocalHost(parsed.hostname)) {
    errors.push(`${name} cannot point to ${parsed.hostname} for a Cloudflare demo`)
  }

  return parsed
}

export function validateCloudflareDemoConfig({
  pagesUrl = DEFAULT_PAGES_URL,
  apiBaseUrl = '',
  wsUrl = '',
} = {}) {
  const errors = []
  const pages = parseUrl({
    name: 'Pages URL',
    value: pagesUrl,
    protocols: ['https:'],
    errors,
  })
  const api = parseUrl({
    name: 'VITE_API_BASE_URL',
    value: apiBaseUrl,
    protocols: ['https:'],
    errors,
  })
  const ws = parseUrl({
    name: 'VITE_WS_URL',
    value: wsUrl,
    protocols: ['wss:'],
    errors,
  })

  if (api && api.pathname.replace(/\/+$/, '').endsWith('/api/v1')) {
    errors.push('VITE_API_BASE_URL must not include /api/v1 because the frontend API client appends /api/v1')
  }

  return {
    ok: errors.length === 0,
    errors,
    pagesUrl: pages?.href || pagesUrl,
    pagesOrigin: pages?.origin || '',
    apiBaseUrl: api ? api.href.replace(/\/+$/, '') : apiBaseUrl,
    wsUrl: ws?.href || wsUrl,
  }
}

export function apiV1Endpoint(apiBaseUrl, path) {
  const base = apiBaseUrl.replace(/\/+$/, '')
  const cleanPath = path.replace(/^\/+/, '')
  return `${base}/api/v1/${cleanPath}`
}

export function extractLoginSession(payload) {
  const data = payload?.data || payload || {}
  return {
    accessToken: data.accessToken || data.access_token || data.token || '',
    refreshToken: data.refreshToken || data.refresh_token || '',
    username: data.user?.username || data.username || '',
  }
}

function extractList(payload) {
  const data = payload?.data || payload || {}
  if (Array.isArray(data)) return data
  if (Array.isArray(data.content)) return data.content
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.documents)) return data.documents
  return []
}

async function readJsonResponse(response, label) {
  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      throw new Error(`${label} did not return JSON: ${text.slice(0, 180)}`)
    }
  }
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}: ${text.slice(0, 180)}`)
  }
  return body
}

async function checkPages({ pagesUrl }) {
  const response = await fetch(pagesUrl, { redirect: 'follow' })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Pages root failed with HTTP ${response.status}`)
  }
  if (!body.includes('Memorica') && !body.includes('id="root"')) {
    throw new Error('Pages root did not look like the Memorica SPA')
  }
  return { status: response.status }
}

async function checkApi({ config, username, password, demoDocTitle }) {
  const loginResponse = await fetch(apiV1Endpoint(config.apiBaseUrl, '/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: config.pagesOrigin,
    },
    body: JSON.stringify({ username, password }),
  })
  const loginPayload = await readJsonResponse(loginResponse, 'demo login')
  const session = extractLoginSession(loginPayload)
  if (!session.accessToken) {
    throw new Error('demo login response did not include an access token')
  }

  const allowOrigin = loginResponse.headers.get('access-control-allow-origin')
  const allowCredentials = loginResponse.headers.get('access-control-allow-credentials')
  if (allowOrigin !== config.pagesOrigin || allowCredentials !== 'true') {
    throw new Error(`demo login CORS is not browser-ready for ${config.pagesOrigin}`)
  }

  const authHeaders = {
    Authorization: `Bearer ${session.accessToken}`,
    Origin: config.pagesOrigin,
  }
  const workspacesResponse = await fetch(apiV1Endpoint(config.apiBaseUrl, '/workspaces'), {
    headers: authHeaders,
  })
  const workspacesPayload = await readJsonResponse(workspacesResponse, 'workspaces')
  const workspaces = extractList(workspacesPayload)

  const recentResponse = await fetch(apiV1Endpoint(config.apiBaseUrl, '/documents/recent?page=0&size=25'), {
    headers: authHeaders,
  })
  const recentPayload = await readJsonResponse(recentResponse, 'recent documents')
  const recentDocuments = extractList(recentPayload)
  const demoDocument = recentDocuments.find((document) => document.title === demoDocTitle)
  if (!demoDocument) {
    throw new Error(`recent documents did not include "${demoDocTitle}"; run make demo-seed against the backend origin`)
  }

  return {
    username: session.username || username,
    workspaceCount: workspaces.length,
    recentDocumentCount: recentDocuments.length,
    demoDocumentId: demoDocument.id,
    demoDocumentTitle: demoDocument.title,
  }
}

export async function runCloudflareDemoSmoke({
  pagesUrl = process.env.CLOUDFLARE_PAGES_URL || DEFAULT_PAGES_URL,
  apiBaseUrl = process.env.VITE_API_BASE_URL || '',
  wsUrl = process.env.VITE_WS_URL || '',
  username = process.env.MEMORICA_DEMO_USERNAME || DEFAULT_USERNAME,
  password = process.env.MEMORICA_DEMO_PASSWORD || DEFAULT_PASSWORD,
  demoDocTitle = process.env.MEMORICA_DEMO_DOC_TITLE || DEFAULT_DEMO_DOC_TITLE,
} = {}) {
  const config = validateCloudflareDemoConfig({ pagesUrl, apiBaseUrl, wsUrl })
  if (!config.ok) {
    throw new Error(config.errors.join('\n'))
  }
  if (typeof fetch !== 'function') {
    throw new Error('This script requires a Node.js runtime with global fetch support')
  }

  const pages = await checkPages({ pagesUrl: config.pagesUrl })
  const api = await checkApi({ config, username, password, demoDocTitle })

  return { config, pages, api }
}

async function main() {
  console.log('Cloudflare demo smoke')
  console.log(`Pages: ${process.env.CLOUDFLARE_PAGES_URL || DEFAULT_PAGES_URL}`)
  console.log(`API: ${process.env.VITE_API_BASE_URL || '<missing>'}`)
  console.log(`WSS: ${process.env.VITE_WS_URL || '<missing>'}`)

  try {
    const result = await runCloudflareDemoSmoke()
    console.log(`GET Pages root: HTTP ${result.pages.status}`)
    console.log(`POST demo login: ok (${result.api.username})`)
    console.log(`GET workspaces: ${result.api.workspaceCount}`)
    console.log(`GET recent documents: ${result.api.recentDocumentCount}`)
    console.log(`Demo document: ${result.api.demoDocumentTitle} (${result.api.demoDocumentId})`)
    console.log('Cloudflare demo smoke passed')
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isCli) main()
