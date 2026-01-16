const { pool } = require('./src/database/connection');
pool.query("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS admin_token_sessao VARCHAR(64), ADD COLUMN IF NOT EXISTS admin_token_expira_em TIMESTAMP, ADD COLUMN IF NOT EXISTS admin_senha_hash VARCHAR(64)").then(() => {
  console.log('Colunas adicionadas na tabela empresas');
  return pool.query("ALTER TABLE admins ADD COLUMN IF NOT EXISTS token_expira_em TIMESTAMP");
}).then(() => {
  console.log('Coluna adicionada na tabela admins');
  console.log('Correcao concluida!');
  pool.end();
}).catch(e => {
  console.error('Erro:', e.message);
  pool.end();
});