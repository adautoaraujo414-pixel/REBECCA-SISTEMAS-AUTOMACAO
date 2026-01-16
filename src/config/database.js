/**
 * Configuração do Banco de Dados PostgreSQL
 * Sistema REBECA - Central de Corridas via WhatsApp
 */

const { Pool } = require('pg');

// Configuração do Pool de conexões
const poolConfig = {
  // String de conexão do banco de dados
  connectionString: process.env.DATABASE_URL,
  
  // SSL para produção (Render, Railway, etc)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // IMPORTANTE: Força uso de IPv4 para evitar erro ENETUNREACH
  family: 4,
  
  // Configurações do pool de conexões
  max: 20,                        // Máximo de conexões simultâneas
  min: 2,                         // Mínimo de conexões mantidas
  idleTimeoutMillis: 30000,       // Tempo máximo de inatividade (30 segundos)
  connectionTimeoutMillis: 10000, // Timeout para conectar (10 segundos)
  acquireTimeoutMillis: 30000,    // Timeout para adquirir conexão do pool
};

// Criar o pool de conexões
const pool = new Pool(poolConfig);

// Evento de erro no pool
pool.on('error', (err, client) => {
  console.error('❌ Erro inesperado no cliente do pool:', err);
});

// Evento de conexão bem-sucedida
pool.on('connect', (client) => {
  console.log('✅ Nova conexão estabelecida com o banco de dados');
});

// Função para testar a conexão
async function testarConexao() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Conexão com banco de dados OK:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com banco de dados:', error.message);
    return false;
  }
}

// Função para executar queries com retry
async function query(text, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      console.error(`❌ Erro na query (tentativa ${i + 1}/${retries}):`, error.message);
      if (i === retries - 1) throw error;
      // Aguarda antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Função para obter um cliente do pool
async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);
  
  // Timeout para liberar cliente automaticamente
  const timeout = setTimeout(() => {
    console.error('⚠️ Cliente do banco não foi liberado em 30 segundos!');
    client.release();
  }, 30000);
  
  client.query = (...args) => {
    return originalQuery(...args);
  };
  
  client.release = () => {
    clearTimeout(timeout);
    return originalRelease();
  };
  
  return client;
}

// Função para fechar o pool (graceful shutdown)
async function fecharPool() {
  try {
    await pool.end();
    console.log('✅ Pool de conexões fechado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao fechar pool:', error.message);
  }
}

// Exportar o pool e funções utilitárias
module.exports = {
  pool,
  query,
  getClient,
  testarConexao,
  fecharPool
};