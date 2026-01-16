// ==============================================
// REBECA - CONFIGURAÇÃO DO BANCO DE DADOS
// PostgreSQL Connection Pool
// ==============================================

const { Pool } = require('pg');

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'rebeca',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  
  // SSL Configuration
  ssl: {
    rejectUnauthorized: false
  },
  
  // FORÇA IPv4 (resolve problema de IPv6 no Railway)
  family: 4,
  
  // Pool Configuration
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo para fechar conexão ociosa
  connectionTimeoutMillis: 10000, // Timeout para nova conexão
  
  // Retry Configuration
  allowExitOnIdle: false
});

// Event Handlers
pool.on('connect', (client) => {
  console.log('✅ Nova conexão estabelecida com PostgreSQL');
});

pool.on('acquire', (client) => {
  console.log('🔄 Cliente adquirido do pool');
});

pool.on('remove', (client) => {
  console.log('🗑️ Cliente removido do pool');
});

pool.on('error', (err, client) => {
  console.error('❌ Erro inesperado no cliente PostgreSQL:', err);
  process.exit(-1);
});

// Função de teste de conexão
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Conexão com banco de dados OK:', result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
    return false;
  }
}

// Função para executar queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executada:', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('❌ Erro na query:', err.message);
    throw err;
  }
}

// Função para obter um cliente do pool
async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;
  
  // Timeout para liberar cliente
  const timeout = setTimeout(() => {
    console.error('⚠️ Cliente não foi liberado após 5 segundos!');
    console.error(new Error().stack);
  }, 5000);
  
  // Sobrescrever query para logging
  client.query = (...args) => {
    return originalQuery.apply(client, args);
  };
  
  // Sobrescrever release para limpar timeout
  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease.apply(client);
  };
  
  return client;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️ SIGTERM recebido, fechando pool...');
  await pool.end();
  console.log('✅ Pool fechado');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️ SIGINT recebido, fechando pool...');
  await pool.end();
  console.log('✅ Pool fechado');
  process.exit(0);
});

// Exports
module.exports = {
  pool,
  query,
  getClient,
  testConnection
};