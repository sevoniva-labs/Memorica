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

/**
 * Check if a user has access to a given document.
 * Returns true if the document is public or the user has a permission entry.
 */
async function checkDocumentAccess(documentName, userId) {
  if (!userId) return false

  const { rows } = await pool.query(
    `SELECT 1 FROM documents d
     WHERE d.id = $1
       AND (d.is_public = true OR d.owner_id = $2
            OR EXISTS (SELECT 1 FROM document_permissions dp
                       WHERE dp.document_id = d.id AND dp.user_id = $2))`,
    [documentName, userId]
  )
  return rows.length > 0
}

module.exports = { pool, getDoc, saveDoc, checkDocumentAccess }
