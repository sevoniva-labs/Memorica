import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('Cloudflare demo smoke script validates runtime URLs and login payloads', async () => {
  assert.equal(existsSync('scripts/cloudflare-demo-smoke.mjs'), true)

  const {
    apiV1Endpoint,
    extractLoginSession,
    validateCloudflareDemoConfig,
  } = await import('./cloudflare-demo-smoke.mjs')

  const valid = validateCloudflareDemoConfig({
    pagesUrl: 'https://memorica-frontend-5ut.pages.dev',
    apiBaseUrl: 'https://api.memorica.example',
    wsUrl: 'wss://ws.memorica.example',
  })

  assert.equal(valid.ok, true)
  assert.deepEqual(valid.errors, [])
  assert.equal(valid.pagesOrigin, 'https://memorica-frontend-5ut.pages.dev')
  assert.equal(apiV1Endpoint('https://api.memorica.example/', '/auth/login'), 'https://api.memorica.example/api/v1/auth/login')

  const invalid = validateCloudflareDemoConfig({
    pagesUrl: 'http://localhost:5173',
    apiBaseUrl: 'https://api.memorica.example/api/v1',
    wsUrl: 'ws://127.0.0.1:1234',
  })

  assert.equal(invalid.ok, false)
  assert.match(invalid.errors.join('\n'), /Pages URL must use https/)
  assert.match(invalid.errors.join('\n'), /must not include \/api\/v1/)
  assert.match(invalid.errors.join('\n'), /VITE_WS_URL must use wss:\/\//)

  const session = extractLoginSession({
    data: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { username: 'demo' },
    },
  })

  assert.equal(session.accessToken, 'access-token')
  assert.equal(session.refreshToken, 'refresh-token')
  assert.equal(session.username, 'demo')
})

test('Cloudflare demo smoke command is documented and part of local policy checks', async () => {
  const makefile = await readFile('Makefile', 'utf8')
  const readme = await readFile('README.md', 'utf8')
  const cloudflareDocs = await readFile('docs/cloudflare-pages.md', 'utf8')
  const checklist = await readFile('docs/release-checklist.md', 'utf8')

  assert.match(makefile, /^cloudflare-demo-smoke-test: ## Verify Cloudflare demo smoke script behavior$/m)
  assert.match(makefile, /^cloudflare-demo-smoke: ## Smoke test deployed Cloudflare Pages demo against a public API\/WSS backend$/m)
  assert.match(makefile, /^verify-local: .* cloudflare-demo-smoke-test .*## Run local checks that do not require browser services$/m)
  assert.match(readme, /make cloudflare-demo-smoke/)
  assert.match(cloudflareDocs, /make cloudflare-demo-smoke/)
  assert.match(cloudflareDocs, /Temporary Tunnel Demo Smoke/)
  assert.match(checklist, /make cloudflare-demo-smoke/)
})
