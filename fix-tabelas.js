const { pool } = require('./src/database/connection');
pool.query("CREATE TABLE IF NOT EXISTS corridas (id SERIAL PRIMARY KEY, empresa_id INTEGER, cliente_id INTEGER, motorista_id INTEGER, origem_endereco TEXT, destino_endereco TEXT, valor_estimado DECIMAL(10,2), status VARCHAR(30) DEFAULT 'aguardando_motorista', solicitado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)").then(() => {
  console.log('Tabela corridas criada!');
  return pool.query("ALTER TABLE logs_localizacao DROP CONSTRAINT IF EXISTS logs_localizacao_corrida_id_fkey");
}).then(() => {
  console.log('Constraint removida!');
  pool.end();
}).catch(e => {
  console.error('Erro:', e.message);
  pool.end();
});