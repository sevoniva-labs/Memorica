const { Server } = require('@hocuspocus/server')
const { Logger } = require('@hocuspocus/extension-logger')
const { getDoc, saveDoc } = require('./db')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const PORT = parseInt(process.env.PORT || '1234', 10)
const JWT_SECRET = process.env.JWT_SECRET || 'memorica-jwt-secret-key-2026-very-long-and-secure'

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

const server = new Server({
  port: PORT,
  extensions: [new Logger()],

  async onLoadDocument({ documentName }) {
    const data = await getDoc(documentName)
    if (data) {
      return new Uint8Array(data)
    }
    return null
  },

  async onStoreDocument({ documentName, state }) {
    await saveDoc(documentName, Buffer.from(state))
  },

  async onAuthenticate({ token }) {
    if (!token) {
      return { user: { name: 'Guest', color: '#9ca3af' } }
    }
    const payload = verifyToken(token)
    if (!payload) {
      throw new Error('Invalid token')
    }
    const name = payload.username || payload.displayName || 'User'
    const color = payload.color || '#2563eb'
    return { user: { name, color, id: payload.sub } }
  },

  async onConnect({ documentName, context }) {
    console.log(`[Connect] ${documentName} — ${context.user?.name || 'guest'}`)
  },

  async onDisconnect({ documentName, context }) {
    console.log(`[Disconnect] ${documentName} — ${context.user?.name || 'guest'}`)
  },
})

server.listen().then(() => {
  console.log(`Hocuspocus running on ws://localhost:${PORT}`)
})
