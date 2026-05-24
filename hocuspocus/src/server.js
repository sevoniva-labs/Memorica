const { Server } = require('@hocuspocus/server')
const { Logger } = require('@hocuspocus/extension-logger')
const { getDoc, saveDoc, getDocumentAccess } = require('./db')
const jwt = require('jsonwebtoken')
const Y = require('yjs')
require('dotenv').config()

const PORT = parseInt(process.env.PORT || '1234', 10)
const JWT_SECRET = requiredSecret('JWT_SECRET')
const REDIS_URL = process.env.REDIS_URL || null
const MAX_DOCUMENT_SIZE = parseInt(process.env.MAX_DOCUMENT_SIZE || String(10 * 1024 * 1024), 10) // 10MB
const MAX_CONNECTIONS = parseInt(process.env.MAX_CONNECTIONS || '1000', 10)
const MAX_CONNECTIONS_PER_DOC = parseInt(process.env.MAX_CONNECTIONS_PER_DOC || '50', 10)

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

function requiredSecret(name) {
  const value = process.env[name]
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error(`${name} must be configured and at least 32 bytes`)
  }
  return value
}

const extensions = [new Logger()]

function redisConfigFromUrl(value) {
  const parsed = new URL(value)
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    options: parsed.password ? { password: decodeURIComponent(parsed.password) } : {},
  }
}

// Redis extension for horizontal scaling (multi-instance broadcast)
if (REDIS_URL) {
  try {
    const { Redis } = require('@hocuspocus/extension-redis')
    extensions.push(new Redis(redisConfigFromUrl(REDIS_URL)))
    console.log('[Hocuspocus] Redis extension enabled for multi-instance scaling')
  } catch (e) {
    console.warn(`[Hocuspocus] Redis extension disabled: ${e.message}`)
  }
}

const server = new Server({
  port: PORT,
  timeout: 30000,
  maxDebounce: 3000,
  maxConnections: MAX_CONNECTIONS,

  extensions,

  async onLoadDocument({ documentName }) {
    const data = await getDoc(documentName)
    if (data) {
      // Enforce max document size
      if (data.length > MAX_DOCUMENT_SIZE) {
        throw new Error('Document too large')
      }
      return new Uint8Array(data)
    }
    return null
  },

  async onStoreDocument({ documentName, document }) {
    const state = Y.encodeStateAsUpdate(document)
    if (state.length > MAX_DOCUMENT_SIZE) {
      console.warn(`[Hocuspocus] Document ${documentName} exceeds size limit, rejecting store`)
      return
    }
    await saveDoc(documentName, Buffer.from(state))
  },

  async onAuthenticate({ token, documentName }) {
    if (!token) {
      throw new Error('Authentication required')
    }

    const payload = verifyToken(token)
    if (!payload) {
      throw new Error('Invalid token')
    }

    const access = await getDocumentAccess(documentName, payload.sub)
    if (!access?.canWrite) {
      throw new Error('Write access denied to this document')
    }

    const name = payload.username || payload.displayName || 'User'
    const color = payload.color || '#2563eb'
    return {
      user: { name, color, id: payload.sub },
      connectionProps: { role: access.role },
    }
  },

  async beforeHandleConnection({ documentName, context, socketId }) {
    // Rate limit: count connections per document
    const connectionCount = await server.getConnectionsCount(documentName)
    if (connectionCount >= MAX_CONNECTIONS_PER_DOC) {
      console.warn(`[Hocuspocus] Document ${documentName} hit connection limit (${MAX_CONNECTIONS_PER_DOC})`)
      throw new Error('Too many connections to this document')
    }
  },

  async onConnect({ documentName, context, request }) {
    const sessionId = request.url ? new URL(request.url, 'http://localhost').searchParams.get('sessionId') : null
    console.log(`[Connect] ${documentName} — ${context.user?.name || 'guest'} (${context.user?.id || 'anon'}) session=${sessionId || 'N/A'}`)
  },

  async onDisconnect({ documentName, context }) {
    console.log(`[Disconnect] ${documentName} — ${context.user?.name || 'guest'}`)
  },

  async onError({ error, documentName }) {
    console.error(`[Error] ${documentName || 'unknown'} — ${error.message}`)
  },
})

server.listen().then(() => {
  console.log(`Hocuspocus running on ws://localhost:${PORT}`)
  if (REDIS_URL) {
    console.log(`Redis pub/sub: ${REDIS_URL}`)
  }
  console.log(`Max connections: ${MAX_CONNECTIONS} total, ${MAX_CONNECTIONS_PER_DOC} per document`)
  console.log(`Max document size: ${(MAX_DOCUMENT_SIZE / 1024 / 1024).toFixed(1)}MB`)
})
