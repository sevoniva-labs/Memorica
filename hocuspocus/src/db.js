const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function getDoc(name) {
  const { rows } = await pool.query('SELECT data FROM documents WHERE name = $1', [name])
  return rows[0]?.data
}

async function saveDoc(name, data) {
  await pool.query(
    `INSERT INTO documents (name, data, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (name) DO UPDATE SET data = $2, updated_at = NOW()`,
    [name, data]
  )
}

async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  return rows[0]
}

module.exports = { pool, getDoc, saveDoc, getUserById }
