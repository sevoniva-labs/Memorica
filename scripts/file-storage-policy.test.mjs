import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('backend file storage settings stay environment-driven', async () => {
  const source = await readFile('backend/src/main/resources/application.yml', 'utf8')

  assert.match(source, /MINIO_ENDPOINT/)
  assert.match(source, /MINIO_ACCESS_KEY/)
  assert.match(source, /MINIO_SECRET_KEY/)
  assert.match(source, /MINIO_BUCKET/)
  assert.match(source, /FILE_MAX_SIZE/)
  assert.match(source, /FILE_ALLOWED_TYPES/)
  assert.match(source, /FILE_URL_EXPIRY_MINUTES/)
  assert.match(source, /FILE_ORPHAN_RETENTION_DAYS/)
})

test('pre-release docs describe local and production MinIO requirements', async () => {
  const readme = await readFile('README.md', 'utf8')
  const checklist = await readFile('docs/release-checklist.md', 'utf8')

  for (const source of [readme, checklist]) {
    assert.match(source, /MINIO_ENDPOINT/)
    assert.match(source, /MINIO_ACCESS_KEY/)
    assert.match(source, /MINIO_SECRET_KEY/)
    assert.match(source, /MINIO_BUCKET/)
    assert.match(source, /FILE_URL_EXPIRY_MINUTES/)
    assert.match(source, /minioadmin/)
    assert.match(source, /1-60/)
    assert.match(source, /15/)
  }
})

test('Cloudflare deployment docs keep file storage behind the backend boundary', async () => {
  const source = await readFile('docs/cloudflare-pages.md', 'utf8')

  assert.match(source, /MinIO/)
  assert.match(source, /R2/)
  assert.match(source, /VITE_API_BASE_URL/)
  assert.match(source, /presigned/)
})

test('Makefile includes file storage policy checks in verify-local', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /\.PHONY:[\s\S]*\bfile-storage-policy-test\b/)
  assert.match(source, /^file-storage-policy-test: ## Verify MinIO and file URL deployment policy$/m)
  assert.match(source, /^verify-local: .* file-storage-policy-test .*## Run local checks that do not require browser services$/m)
})
