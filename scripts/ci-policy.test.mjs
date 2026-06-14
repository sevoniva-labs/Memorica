import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('GitHub CI reuses the same Makefile quality gates as local verification', async () => {
  const workflow = await readFile('.github/workflows/ci.yml', 'utf8')

  assert.match(workflow, /run: make backend-check/)
  assert.match(workflow, /run: make frontend-check/)
  assert.match(workflow, /run: make frontend-audit/)
  assert.match(workflow, /run: make hocuspocus-check/)
  assert.match(workflow, /run: make hocuspocus-audit/)
})

test('local verification runs the CI policy guard', async () => {
  const makefile = await readFile('Makefile', 'utf8')

  assert.match(makefile, /\.PHONY:[\s\S]*\bci-policy-test\b/)
  assert.match(makefile, /^ci-policy-test: ## Verify GitHub Actions reuse local quality gates$/m)
  assert.match(makefile, /^verify-local: .*ci-policy-test.* ## Run local checks that do not require browser services$/m)
})
