import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const nodeDockerfiles = ['frontend/Dockerfile', 'hocuspocus/Dockerfile']
const dockerContexts = ['backend', 'frontend', 'hocuspocus']

for (const file of nodeDockerfiles) {
  test(`${file} installs npm dependencies from the domestic mirror`, async () => {
    const source = await readFile(file, 'utf8')

    assert.match(source, /npm ci --registry=https:\/\/registry\.npmmirror\.com\b/)
  })

  test(`${file} uses npm lockfile install flags only`, async () => {
    const source = await readFile(file, 'utf8')

    assert.doesNotMatch(source, /--frozen-lockfile\b/)
  })

  test(`${file} clears container-local proxy settings before npm install`, async () => {
    const source = await readFile(file, 'utf8')

    assert.match(source, /HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= ALL_PROXY= all_proxy= npm ci/)
  })

  test(`${file} leaves dependency audit to the explicit Makefile audit targets`, async () => {
    const source = await readFile(file, 'utf8')

    assert.match(source, /npm ci .*--audit=false\b/)
  })
}

for (const directory of dockerContexts) {
  test(`${directory}/.dockerignore excludes local dependency and build artifacts`, async () => {
    const source = await readFile(`${directory}/.dockerignore`, 'utf8')

    assert.match(source, /^node_modules$/m)
    assert.match(source, /^dist$/m)
    assert.match(source, /^test-results$/m)
    assert.match(source, /^playwright-report$/m)
  })
}

test('backend Gradle wrapper uses a domestic distribution mirror with a Docker-friendly timeout', async () => {
  const source = await readFile('backend/gradle/wrapper/gradle-wrapper.properties', 'utf8')

  assert.match(source, /^distributionUrl=https\\:\/\/repo\.huaweicloud\.com\/gradle\/gradle-8\.14\.4-bin\.zip$/m)
  assert.match(source, /^distributionSha256Sum=f1771298a70f6db5a29daf62378c4e18a17fc33c9ba6b14362e0cdf40610380d$/m)
  assert.match(source, /^networkTimeout=60000$/m)
})

test('backend Dockerfile fails fast instead of caching a corrupt Gradle wrapper download', async () => {
  const source = await readFile('backend/Dockerfile', 'utf8')

  assert.match(source, /RUN chmod \+x gradlew && \.\/gradlew --version --no-daemon/)
  assert.doesNotMatch(source, /\.\/gradlew dependencies --no-daemon 2>\/dev\/null \|\| true/)
})
