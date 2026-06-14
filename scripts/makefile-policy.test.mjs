import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('Makefile exposes a seeded local E2E gate for the demo path', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /\.PHONY:[\s\S]*\bdemo-e2e-local\b/)
  assert.match(source, /^demo-e2e-local: demo-seed e2e-local ## Seed demo data and run the main local E2E gate$/m)
})

test('Makefile help includes targets with digits in their names', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /\^\[a-zA-Z0-9_-\]\+/)
})

test('pre-release docs mention the seeded local E2E gate', async () => {
  const readme = await readFile('README.md', 'utf8')
  const checklist = await readFile('docs/release-checklist.md', 'utf8')

  assert.match(readme, /make demo-e2e-local/)
  assert.match(checklist, /make demo-e2e-local/)
})
