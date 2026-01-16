// ========================================
// REBECA - CONEXÃO COM BANCO DE DADOS
// Suporta DATABASE_URL (Railway) ou variáveis separadas
// ========================================

const { Pool } = require('pg');
const config = require('../config');

// Railway/Render usa DATABASE_URL, outros usam variáveis separadas
// CORRIGIDO: Força IPv4 para evitar erro ENETUNREACH em IPv6
const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      family: 4,  // FORÇA IPv4
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 20
    })
  : new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      family: 4
    });

// Testar conexão
pool.on('connect', () => {
  console.log('✅ Banco de dados conectado');
});

pool.on('error', (err) => {
  console.error('❌ Erro no banco de dados:', err);
});

/**
 * Executa uma query no banco
 * @param {string} text - SQL query
 * @param {Array} params - Parâmetros
 * @returns {Promise}
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (config.server.env === 'development') {
      console.log('📊 Query executada:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro na query:', error);
    throw error;
  }
};

/**
 * Obtém um cliente do pool para transações
 * @returns {Promise}
 */
const getClient = () => {
  return pool.connect();
};

module.exports = {
  query,
  getClient,
  pool,
};
