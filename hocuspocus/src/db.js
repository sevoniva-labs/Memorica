const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

module.exports = { pool, getDoc, saveDoc }
