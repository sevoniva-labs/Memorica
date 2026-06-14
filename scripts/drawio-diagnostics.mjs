import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const DEFAULT_DRAWIO_URL = 'https://embed.diagrams.net/'

function diagramBodies(source) {
  return Array.from(
    source.matchAll(/const ([A-Z_]+_DIAGRAM_BODY) = '([^']+)'/g),
    (match) => ({ name: match[1], body: match[2] })
  )
}

function readEnvValue(source, key) {
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (match?.[1] !== key) continue
    return match[2].replace(/^['"]|['"]$/g, '').trim()
  }
  return ''
}

function validateCompressedBody(body) {
  if (!/^[A-Za-z0-9+/=]+$/.test(body)) {
    throw new Error('body is not base64')
  }

  const graph = decodeURIComponent(inflateRawSync(Buffer.from(body, 'base64')).toString('utf8'))
  if (!graph.startsWith('<mxGraphModel')) {
    throw new Error('inflated body is not an mxGraphModel')
  }
}

export function analyzeDiagramTemplates(source) {
  const bodies = diagramBodies(source)
  const invalid = []

  for (const { name, body } of bodies) {
    try {
      validateCompressedBody(body)
    } catch (error) {
      invalid.push({
        name,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    total: bodies.length,
    valid: bodies.length - invalid.length,
    invalid,
  }
}

export function resolveDrawioUrl({ envSource = '', env = process.env } = {}) {
  const envValue = env.VITE_DRAWIO_URL?.trim()
  const fileValue = readEnvValue(envSource, 'VITE_DRAWIO_URL')
  const value = envValue || fileValue || DEFAULT_DRAWIO_URL
  const source = envValue ? 'env' : fileValue ? '.env.development' : 'default'

  try {
    new URL(value)
    return { value, source, valid: true, error: '' }
  } catch (error) {
    return {
      value,
      source,
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export function buildDrawioDiagnostics({ templateSource, envSource = '', env = process.env }) {
  const templateResult = analyzeDiagramTemplates(templateSource)
  const drawioUrl = resolveDrawioUrl({ envSource, env })
  const lines = []

  lines.push('Draw.io diagnostics')
  lines.push(`模板压缩体: ${templateResult.valid}/${templateResult.total} valid`)
  if (templateResult.invalid.length > 0) {
    lines.push('模板压缩体异常:')
    for (const issue of templateResult.invalid) {
      lines.push(`- ${issue.name}: ${issue.message}`)
    }
  }

  lines.push(`VITE_DRAWIO_URL=${drawioUrl.value} (${drawioUrl.source})`)
  if (!drawioUrl.valid) {
    lines.push(`Draw.io URL 配置无效: ${drawioUrl.error}`)
  }

  lines.push('invalid stored block lengths 排查:')
  lines.push('- 如果模板压缩体异常，说明 <diagram> 内的内容不是 diagrams.net 需要的 raw-deflate base64，打开时会直接报错。')
  lines.push('- 如果模板压缩体正常，问题通常来自已保存图示 XML 被截断、被当普通 XML 写入 <diagram>，或保存/export 事件缺少 xml/data。优先从版本历史恢复，再重新保存图示。')
  lines.push('内网处理:')
  lines.push('- 浏览器必须能直接访问 VITE_DRAWIO_URL；生产和内网建议自托管 diagrams.net/drawio 并配置可信域名。')
  lines.push('- 外网镜像下载失败时在 Docker daemon 或 Docker Desktop 配当前可用网卡代理；不要继续使用已经失效的 127.0.0.1 代理。')
  lines.push('- 容器内访问宿主机代理时使用 host.docker.internal:<port> 或网卡 IP；可运行 make docker-proxy-check 辅助排查。')

  return lines.join('\n')
}

function readTextIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function main() {
  const cwd = process.cwd()
  const templateSource = readFileSync(join(cwd, 'frontend/src/diagram/templates.ts'), 'utf8')
  const envSource = readTextIfExists(join(cwd, 'frontend/.env.development'))
  const output = buildDrawioDiagnostics({ templateSource, envSource, env: process.env })

  console.log(output)

  const templateResult = analyzeDiagramTemplates(templateSource)
  const drawioUrl = resolveDrawioUrl({ envSource, env: process.env })
  if (templateResult.invalid.length > 0 || !drawioUrl.valid) {
    process.exitCode = 1
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isCli) main()
