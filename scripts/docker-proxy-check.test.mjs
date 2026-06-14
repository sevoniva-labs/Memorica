import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildProxySummary, isLoopbackProxy } from './docker-proxy-check.mjs'

test('isLoopbackProxy detects loopback proxy hosts that break inside containers', () => {
  assert.equal(isLoopbackProxy('http://127.0.0.1:6666'), true)
  assert.equal(isLoopbackProxy('http://localhost:6666'), true)
  assert.equal(isLoopbackProxy('http://[::1]:6666'), true)
  assert.equal(isLoopbackProxy('http://host.docker.internal:6666'), false)
  assert.equal(isLoopbackProxy('http://10.25.24.240:6666'), false)
})

test('buildProxySummary explains daemon image pulls separately from container runtime proxies', () => {
  const summary = buildProxySummary({
    dockerInfo: {
      httpProxy: 'http.docker.internal:3128',
      httpsProxy: 'http.docker.internal:3128',
      noProxy: 'hubproxy.docker.internal',
    },
    dockerConfigProxy: {
      httpProxy: 'http://127.0.0.1:6666',
      httpsProxy: 'http://127.0.0.1:6666',
    },
    hostLanIp: '10.25.24.240',
  })

  assert.match(summary, /外网镜像拉取/)
  assert.match(summary, /http\.docker\.internal:3128/)
  assert.match(summary, /容器运行时代理/)
  assert.match(summary, /127\.0\.0\.1/)
  assert.match(summary, /10\.25\.24\.240/)
  assert.match(summary, /host\.docker\.internal/)
})
