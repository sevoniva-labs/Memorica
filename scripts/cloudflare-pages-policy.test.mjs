import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { test } from 'node:test'

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
  assert.match(makefile, /^verify-local: .* cloudflare-pages-policy-test .*## Run local checks that do not require browser services$/m)
  assert.match(readme, /docs\/cloudflare-pages\.md/)
  assert.match(checklist, /docs\/cloudflare-pages\.md/)
})
