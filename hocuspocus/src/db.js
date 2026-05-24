const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

async function getDoc(name) {
  const { rows } = await pool.query(
    'SELECT state FROM document_states WHERE id = $1',
    [name]
  )
  return rows[0]?.state
}

async function saveDoc(name, data) {
  await pool.query(
    `INSERT INTO document_states (id, state, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET state = $2, updated_at = NOW()`,
    [name, data]
  )
}

async function getDocumentAccess(documentName, userId) {
  if (!userId) return false

  const { rows } = await pool.query(
    `SELECT d.owner_id, d.is_public, dp.role, wm.role AS workspace_role
     FROM documents d
     LEFT JOIN document_permissions dp
       ON dp.document_id = d.id AND dp.user_id = $2
     LEFT JOIN workspace_members wm
       ON wm.workspace_id = d.workspace_id AND wm.user_id = $2
     WHERE d.id = $1 AND d.deleted_at IS NULL AND d.item_type = 'document'`,
    [documentName, userId]
  )

  if (rows.length === 0) return null

  const row = rows[0]
  const isOwner = String(row.owner_id) === String(userId)
  const role = isOwner ? 'owner' : row.role
  const workspaceRole = row.workspace_role
  const canManageWorkspace = workspaceRole === 'owner' || workspaceRole === 'admin'

  return {
    exists: true,
    role: role || (canManageWorkspace ? workspaceRole : row.is_public || workspaceRole ? 'viewer' : null),
    workspaceRole,
    canRead: row.is_public || isOwner || Boolean(row.role) || Boolean(workspaceRole),
    canWrite: isOwner || canManageWorkspace || row.role === 'owner' || row.role === 'editor',
  }
}

module.exports = { pool, getDoc, saveDoc, getDocumentAccess }
