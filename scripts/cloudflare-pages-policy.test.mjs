import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { test } from 'node:test'
import {
  readViteEnv,
  validateCloudflarePagesPreflight,
} from './cloudflare-pages-preflight.mjs'

test('frontend has a Cloudflare Pages wrangler config for direct deploys', async () => {
  const source = await readFile('frontend/wrangler.jsonc', 'utf8')
  const config = JSON.parse(source)

  assert.equal(config.name, 'memorica-frontend')
  assert.equal(config.pages_build_output_dir, './dist')
})

test('Cloudflare Pages docs explain frontend build settings and runtime environment', async () => {
  const source = await readFile('docs/cloudflare-pages.md', 'utf8')

  assert.match(source, /Root directory:\s+`frontend`/)
  assert.match(source, /Build command:\s+`npm ci --registry=https:\/\/registry\.npmmirror\.com && npm run build`/)
  assert.match(source, /Output directory:\s+`dist`/)
  assert.match(source, /VITE_API_BASE_URL/)
  assert.match(source, /VITE_WS_URL/)
  assert.match(source, /VITE_DRAWIO_URL/)
})

test('GitHub Actions can deploy the frontend to Cloudflare Pages', async () => {
  const source = await readFile('.github/workflows/cloudflare-pages.yml', 'utf8')

  assert.match(source, /name:\s*Deploy Cloudflare Pages/)
  assert.match(source, /workflow_dispatch:/)
  assert.match(source, /feat\/pre-release-hardening/)
  assert.match(source, /scripts\/cloudflare-demo-smoke\*\.mjs/)
  assert.match(source, /npm ci --registry=https:\/\/registry\.npmmirror\.com/)
  assert.match(source, /npm run build/)
  assert.match(source, /CLOUDFLARE_API_TOKEN/)
  assert.match(source, /CLOUDFLARE_ACCOUNT_ID/)
  assert.match(source, /CLOUDFLARE_PAGES_BRANCH/)
  assert.match(source, /CLOUDFLARE_PAGES_URL/)
  assert.match(source, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24/)
  assert.match(source, /node scripts\/cloudflare-pages-preflight\.mjs --skip-dist/)
  assert.match(source, /wrangler@4\.100\.0 pages deploy dist/)
  assert.match(source, /node scripts\/cloudflare-demo-smoke\.mjs/)
  assert.match(source, /memorica-frontend/)
})

test('Cloudflare Pages preflight accepts public API and WebSocket origins', () => {
  const result = validateCloudflarePagesPreflight({
    wranglerSource: '{"name":"memorica-frontend","pages_build_output_dir":"./dist"}',
    envSource: [
      'VITE_API_BASE_URL=https://api.memorica.example',
      'VITE_WS_URL=wss://api.memorica.example/ws',
      'VITE_DRAWIO_URL=https://embed.diagrams.net/',
    ].join('\n'),
  })

  assert.equal(result.ok, true)
  assert.deepEqual(result.errors, [])
})

test('Cloudflare Pages preflight rejects empty or local backend origins', () => {
  const empty = validateCloudflarePagesPreflight({
    wranglerSource: '{"name":"memorica-frontend","pages_build_output_dir":"./dist"}',
    envSource: 'VITE_API_BASE_URL=\nVITE_WS_URL=\n',
  })
  assert.equal(empty.ok, false)
  assert.match(empty.errors.join('\n'), /VITE_API_BASE_URL/)
  assert.match(empty.errors.join('\n'), /VITE_WS_URL/)

  const local = validateCloudflarePagesPreflight({
    wranglerSource: '{"name":"memorica-frontend","pages_build_output_dir":"./dist"}',
    envSource: [
      'VITE_API_BASE_URL=http://localhost:8080',
      'VITE_WS_URL=ws://127.0.0.1:1234',
      'VITE_DRAWIO_URL=http://localhost:8081/',
    ].join('\n'),
  })
  assert.equal(local.ok, false)
  assert.match(local.errors.join('\n'), /localhost/)
  assert.match(local.errors.join('\n'), /127\.0\.0\.1/)
  assert.match(local.errors.join('\n'), /wss:\/\//)
})

test('Cloudflare Pages preflight rejects API base URLs that already include /api/v1', () => {
  const result = validateCloudflarePagesPreflight({
    wranglerSource: '{"name":"memorica-frontend","pages_build_output_dir":"./dist"}',
    envSource: [
      'VITE_API_BASE_URL=https://api.memorica.example/api/v1',
      'VITE_WS_URL=wss://api.memorica.example/ws',
      'VITE_DRAWIO_URL=https://embed.diagrams.net/',
    ].join('\n'),
  })

  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /must not include \/api\/v1/)
})

test('Cloudflare Pages preflight reads Vite env files', () => {
  assert.deepEqual(
    readViteEnv('VITE_API_BASE_URL=https://api.example.test\n# comment\nVITE_WS_URL="wss://api.example.test/ws"\n'),
    {
      VITE_API_BASE_URL: 'https://api.example.test',
      VITE_WS_URL: 'wss://api.example.test/ws',
    }
  )
})

test('Cloudflare Pages preflight can validate runtime env before dist exists', () => {
  const result = validateCloudflarePagesPreflight({
    wranglerSource: '{"name":"memorica-frontend","pages_build_output_dir":"./dist"}',
    envSource: [
      'VITE_API_BASE_URL=https://api.memorica.example',
      'VITE_WS_URL=wss://api.memorica.example/ws',
    ].join('\n'),
    distExists: false,
    skipDist: true,
  })

  assert.equal(result.ok, true)
  assert.deepEqual(result.errors, [])
})

test('Cloudflare deployment docs state backend free-tier boundary and practical path', async () => {
  const source = await readFile('docs/cloudflare-pages.md', 'utf8')

  assert.match(source, /Spring Boot \+ PostgreSQL \+ Redis \+ MinIO \+ Hocuspocus/)
  assert.match(source, /cannot be deployed unchanged to Workers free tier/i)
  assert.match(source, /Cloudflare Tunnel/)
  assert.match(source, /D1/)
  assert.match(source, /R2/)
  assert.match(source, /Durable Objects/)
})

test('Cloudflare Pages SPA fallback stays enabled by not shipping a top-level 404', async () => {
  await assert.rejects(
    access('frontend/public/404.html', constants.F_OK),
    (error) => error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
  )
})

test('Makefile and release docs include the Cloudflare Pages policy check', async () => {
  const makefile = await readFile('Makefile', 'utf8')
  const readme = await readFile('README.md', 'utf8')
  const checklist = await readFile('docs/release-checklist.md', 'utf8')

  assert.match(makefile, /^cloudflare-pages-policy-test: ## Verify Cloudflare Pages deployment docs and config$/m)
  assert.match(makefile, /^cloudflare-pages-preflight: ## Check Cloudflare Pages direct deployment readiness$/m)
  assert.match(makefile, /^cloudflare-pages-build: ## Build frontend for Cloudflare Pages direct upload$/m)
  assert.match(makefile, /node scripts\/cloudflare-pages-preflight\.mjs --skip-dist/)
  assert.match(makefile, /^verify-local: .* cloudflare-pages-policy-test .*## Run local checks that do not require browser services$/m)
  assert.match(readme, /docs\/cloudflare-pages\.md/)
  assert.match(checklist, /docs\/cloudflare-pages\.md/)
})
