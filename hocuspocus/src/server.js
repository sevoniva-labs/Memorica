const { Server } = require('@hocuspocus/server')
const { Logger } = require('@hocuspocus/extension-logger')
const { getDoc, saveDoc } = require('./db')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const PORT = parseInt(process.env.PORT || '1234', 10)
const JWT_SECRET = process.env.JWT_SECRET || 'collab-doc-jwt-secret-key-2026-very-long-and-secure'

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

const server = new Server({
  port: PORT,

  extensions: [
    new Logger(),
  ],

  // 文档加载：从 PostgreSQL 读取
  async onLoadDocument({ documentName }) {
    const data = await getDoc(documentName)
    if (data) {
      return new Uint8Array(data)
    }
    return null
  },

  // 文档保存：写入 PostgreSQL
  async onStoreDocument({ documentName, state }) {
    await saveDoc(documentName, Buffer.from(state))
  },

  // 鉴权：验证 JWT token
  async onAuthenticate({ token }) {
    if (!token) {
      return { user: { name: '匿名用户', color: '#9ca3af' } }
    }
    const payload = verifyToken(token)
    if (!payload) {
      throw new Error('Invalid token')
    }
    const name = payload.username || payload.displayName || '用户'
    const color = payload.color || '#2563eb'
    return { user: { name, color, id: payload.sub } }
  },

  // 连接建立时
  async onConnect({ documentName, context }) {
    console.log(`[Connect] ${documentName} — user: ${context.user?.name || 'anonymous'}`)
  },

  // 断开连接时
  async onDisconnect({ documentName, context }) {
    console.log(`[Disconnect] ${documentName} — user: ${context.user?.name || 'anonymous'}`)
  },
})

server.listen().then(() => {
  console.log(`🚀 Hocuspocus server running at:`)
  console.log(`   WebSocket: ws://localhost:${PORT}`)
  console.log(`   HTTP:      http://localhost:${PORT}`)
})
