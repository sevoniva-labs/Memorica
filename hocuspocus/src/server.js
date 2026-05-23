const { Server } = require('@hocuspocus/server')
const { Logger } = require('@hocuspocus/extension-logger')
const { getDoc, saveDoc, checkDocumentAccess } = require('./db')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const PORT = parseInt(process.env.PORT || '1234', 10)
const JWT_SECRET = process.env.JWT_SECRET || 'memorica-jwt-secret-key-2026-very-long-and-secure'
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

const extensions = [new Logger()]

// Redis extension for horizontal scaling (multi-instance broadcast)
if (REDIS_URL) {
  try {
    const { Redis } = require('@hocuspocus/extension-redis')
    extensions.push(new Redis({ url: REDIS_URL }))
    console.log('[Hocuspocus] Redis extension enabled for multi-instance scaling')
  } catch (e) {
    console.warn('[Hocuspocus] @hocuspocus/extension-redis not installed; running single-instance')
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

  async onStoreDocument({ documentName, state }) {
    if (state.length > MAX_DOCUMENT_SIZE) {
      console.warn(`[Hocuspocus] Document ${documentName} exceeds size limit, rejecting store`)
      return
    }
    await saveDoc(documentName, Buffer.from(state))
  },

  async onAuthenticate({ token, documentName }) {
    if (!token) {
      // Allow read-only anonymous access for public documents
      return { user: { name: 'Guest', color: '#9ca3af' }, connectionProps: { role: 'viewer' } }
    }

    const payload = verifyToken(token)
    if (!payload) {
      throw new Error('Invalid token')
    }

    // Check document-level access permission
    const hasAccess = await checkDocumentAccess(documentName, payload.sub)
    if (!hasAccess) {
      throw new Error('Access denied to this document')
    }

    const name = payload.username || payload.displayName || 'User'
    const color = payload.color || '#2563eb'
    return {
      user: { name, color, id: payload.sub },
      connectionProps: { role: 'editor' },
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

  async onConnect({ documentName, context }) {
    console.log(`[Connect] ${documentName} — ${context.user?.name || 'guest'} (${context.user?.id || 'anon'})`)
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
