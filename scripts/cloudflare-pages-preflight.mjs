import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const EXPECTED_PROJECT_NAME = 'memorica-frontend'
const EXPECTED_OUTPUT_DIR = './dist'
const PAGES_DOMAIN = 'memorica-frontend-5ut.pages.dev'

export function readViteEnv(source) {
  const values = {}
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[match[1]] = value
  }
  return values
}

function fromEnv(name, fileEnv, runtimeEnv) {
  const runtimeValue = runtimeEnv[name]
  if (typeof runtimeValue === 'string' && runtimeValue.trim()) return runtimeValue.trim()
  return fileEnv[name]?.trim() || ''
}

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

function validateUrl({ name, value, required, protocols, errors, warnings }) {
  if (!value) {
    const message = `${name} is empty`
    if (required) errors.push(message)
    else warnings.push(`${message}; the frontend will use its compiled default`)
    return
  }

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    errors.push(`${name} must be an absolute URL`)
    return
  }

  if (!protocols.includes(parsed.protocol)) {
    const expected = protocols.map((protocol) => `${protocol}//`).join(' or ')
    errors.push(`${name} must use ${expected}`)
  }
  if (isLocalHost(parsed.hostname)) {
    errors.push(`${name} cannot point to ${parsed.hostname} for a Pages deployment`)
  }
}

export function validateCloudflarePagesPreflight({
  wranglerSource,
  envSource = '',
  env = {},
  distExists = true,
} = {}) {
  const errors = []
  const warnings = []
  let wranglerConfig = {}

  try {
    wranglerConfig = JSON.parse(wranglerSource || '{}')
  } catch {
    errors.push('frontend/wrangler.jsonc must be valid JSON')
  }

  if (wranglerConfig.name !== EXPECTED_PROJECT_NAME) {
    errors.push(`wrangler project name must be ${EXPECTED_PROJECT_NAME}`)
  }
  if (wranglerConfig.pages_build_output_dir !== EXPECTED_OUTPUT_DIR) {
    errors.push(`wrangler pages_build_output_dir must be ${EXPECTED_OUTPUT_DIR}`)
  }
  if (!distExists) {
    errors.push('frontend/dist is missing; run cd frontend && npm run build before direct upload')
  }

  const fileEnv = readViteEnv(envSource)
  const apiBaseUrl = fromEnv('VITE_API_BASE_URL', fileEnv, env)
  const wsUrl = fromEnv('VITE_WS_URL', fileEnv, env)
  const drawioUrl = fromEnv('VITE_DRAWIO_URL', fileEnv, env)

  validateUrl({
    name: 'VITE_API_BASE_URL',
    value: apiBaseUrl,
    required: true,
    protocols: ['https:'],
    errors,
    warnings,
  })
  validateUrl({
    name: 'VITE_WS_URL',
    value: wsUrl,
    required: true,
    protocols: ['wss:'],
    errors,
    warnings,
  })
  validateUrl({
    name: 'VITE_DRAWIO_URL',
    value: drawioUrl,
    required: false,
    protocols: ['https:', 'http:'],
    errors,
    warnings,
  })

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    projectName: EXPECTED_PROJECT_NAME,
    pagesDomain: PAGES_DOMAIN,
    runtime: {
      VITE_API_BASE_URL: apiBaseUrl,
      VITE_WS_URL: wsUrl,
      VITE_DRAWIO_URL: drawioUrl,
    },
  }
}

function readTextIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function main() {
  const cwd = process.cwd()
  const wranglerPath = join(cwd, 'frontend/wrangler.jsonc')
  const envPath = join(cwd, 'frontend/.env.production')
  const distPath = resolve(cwd, 'frontend/dist')
  const result = validateCloudflarePagesPreflight({
    wranglerSource: readTextIfExists(wranglerPath),
    envSource: readTextIfExists(envPath),
    env: process.env,
    distExists: existsSync(distPath),
  })

  console.log('Cloudflare Pages preflight')
  console.log(`Project: ${result.projectName}`)
  console.log(`Temporary domain: https://${result.pagesDomain}`)
  console.log(`VITE_API_BASE_URL=${result.runtime.VITE_API_BASE_URL || '<empty>'}`)
  console.log(`VITE_WS_URL=${result.runtime.VITE_WS_URL || '<empty>'}`)
  console.log(`VITE_DRAWIO_URL=${result.runtime.VITE_DRAWIO_URL || '<empty>'}`)

  for (const warning of result.warnings) {
    console.log(`WARN: ${warning}`)
  }
  for (const error of result.errors) {
    console.error(`ERROR: ${error}`)
  }

  if (!result.ok) {
    process.exitCode = 1
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isCli) main()
