import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const dockerConfigPath = join(homedir(), '.docker', 'config.json')

export function isLoopbackProxy(value) {
  if (!value) return false

  try {
    const parsed = new URL(value.includes('://') ? value : `http://${value}`)
    const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase()
    return host === 'localhost' || host === '::1' || host.startsWith('127.')
  } catch {
    return /(^|:\/\/)(localhost|127\.|(\[)?::1(\])?)(:|\/|$)/i.test(value)
  }
}

export function buildProxySummary({ dockerInfo, dockerConfigProxy, hostLanIp }) {
  const lines = []
  const daemonHttp = dockerInfo?.httpProxy || ''
  const daemonHttps = dockerInfo?.httpsProxy || ''
  const daemonNoProxy = dockerInfo?.noProxy || ''
  const runtimeHttp = dockerConfigProxy?.httpProxy || ''
  const runtimeHttps = dockerConfigProxy?.httpsProxy || ''
  const runtimeNoProxy = dockerConfigProxy?.noProxy || ''
  const hasRuntimeLoopback = [runtimeHttp, runtimeHttps].some(isLoopbackProxy)

  lines.push('Docker proxy check')
  lines.push(`外网镜像拉取代理: HTTP=${daemonHttp || '(未配置)'} HTTPS=${daemonHttps || '(未配置)'}`)
  if (daemonNoProxy) lines.push(`外网镜像拉取 NoProxy: ${daemonNoProxy}`)
  lines.push(`容器运行时代理: HTTP=${runtimeHttp || '(未配置)'} HTTPS=${runtimeHttps || '(未配置)'}`)
  if (runtimeNoProxy) lines.push(`容器运行时 NoProxy: ${runtimeNoProxy}`)

  if (hasRuntimeLoopback) {
    lines.push('风险: 容器运行时代理指向 127.0.0.1/localhost；容器内的 loopback 不是宿主机，失效代理会导致 npm/Gradle 下载失败。')
    lines.push(`建议: 如果需要代理，改成 host.docker.internal:<port> 或当前网卡 IP ${hostLanIp || '<LAN_IP>'}:<port>；如果代理已不存在，请从 ~/.docker/config.json 的 proxies.default 中移除。`)
  } else if (runtimeHttp || runtimeHttps) {
    lines.push('容器运行时代理看起来不是 loopback；如果镜像拉取失败，优先检查 Docker Desktop/daemon 代理。')
  } else {
    lines.push('容器运行时未配置代理；项目 Dockerfile 会优先使用国内依赖源。')
  }

  lines.push('说明: FROM 基础镜像拉取由 Docker daemon 处理；容器内 npm/Gradle 下载由 Dockerfile 或工具自身配置处理。')
  return lines.join('\n')
}

function readDockerConfigProxy() {
  if (!existsSync(dockerConfigPath)) return {}

  const config = JSON.parse(readFileSync(dockerConfigPath, 'utf8'))
  return config.proxies?.default || {}
}

function readDockerInfo() {
  try {
    const output = execFileSync('docker', ['info', '--format', '{{json .}}'], { encoding: 'utf8' })
    const info = JSON.parse(output)
    return {
      httpProxy: info.HttpProxy || '',
      httpsProxy: info.HttpsProxy || '',
      noProxy: info.NoProxy || '',
    }
  } catch {
    return {}
  }
}

function readHostLanIp() {
  for (const iface of ['en0', 'en1']) {
    try {
      const output = execFileSync('ipconfig', ['getifaddr', iface], { encoding: 'utf8' }).trim()
      if (output) return output
    } catch {
      // Try the next common macOS interface.
    }
  }
  return ''
}

function main() {
  const dockerInfo = readDockerInfo()
  const dockerConfigProxy = readDockerConfigProxy()
  const hostLanIp = readHostLanIp()
  const summary = buildProxySummary({ dockerInfo, dockerConfigProxy, hostLanIp })

  console.log(summary)

  if ([dockerConfigProxy.httpProxy, dockerConfigProxy.httpsProxy].some(isLoopbackProxy)) {
    process.exitCode = 1
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isCli) main()
