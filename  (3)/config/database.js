/**
 * Configuração do Banco de Dados PostgreSQL
 * Sistema REBECA - FORÇA IPv4
 */

const { Pool } = require('pg');

// Configuração FORÇANDO IPv4
const poolConfig = {
  host: process.env.DB_HOST || 'db.teipjzzxcghtnxnzlywh.supabase.co',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  
  // FORÇA IPv4 - CRÍTICO!
  family: 4,
  
  // SSL obrigatório
  ssl: {
    rejectUnauthorized: false
  },
  
  // Pool config
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

const pool = new Pool(poolConfig);

// Testes de conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL via IPv4');
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool:', err.message);
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Conexão OK:', result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Erro ao conectar:', err.message);
    return false;
  }
}

async function query(text, params) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection
};