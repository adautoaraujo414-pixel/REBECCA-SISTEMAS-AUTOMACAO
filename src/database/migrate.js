// ========================================
// REBECA - MIGRATIONS DO BANCO DE DADOS
// MULTI-TENANT: Cada empresa tem dados isolados
// ========================================

const { pool } = require('../config/database');

const migrations = `

-- ========================================
-- TABELA: PLANOS
-- ========================================
CREATE TABLE IF NOT EXISTS planos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE,
  valor DECIMAL(10, 2) NOT NULL,
  max_motoristas INTEGER DEFAULT 5,
  max_corridas_mes INTEGER DEFAULT 300,
  tem_api BOOLEAN DEFAULT FALSE,
  tem_white_label BOOLEAN DEFAULT FALSE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: EMPRESAS (MULTI-TENANT)
-- ========================================
CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  nome_exibido VARCHAR(100),
  cnpj VARCHAR(20),
  telefone_adm VARCHAR(20) NOT NULL,
  telefone_dono VARCHAR(20),
  nome_dono VARCHAR(100),
  whatsapp_rebeca VARCHAR(20),
  whatsapp_instancia VARCHAR(100),
  whatsapp_conectado BOOLEAN DEFAULT FALSE,
  whatsapp_ultima_conexao TIMESTAMP,
  telefone_rebeca VARCHAR(20),
  email VARCHAR(100),
  cidade VARCHAR(100),
  ativo BOOLEAN DEFAULT TRUE,
  plano VARCHAR(20) DEFAULT 'basico',
  token_api VARCHAR(64) UNIQUE,
  msg_corrida_finalizada TEXT,
  white_label BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: ADMINS
-- ========================================
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  telefone VARCHAR(20),
  senha_hash VARCHAR(64),
  token_sessao VARCHAR(64),
  token_primeiro_acesso VARCHAR(64),
  primeiro_acesso BOOLEAN DEFAULT TRUE,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: MOTORISTAS
-- ========================================
CREATE TABLE IF NOT EXISTS motoristas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  senha_hash VARCHAR(64),
  cpf VARCHAR(14),
  cnh VARCHAR(20),
  veiculo_modelo VARCHAR(50),
  veiculo_cor VARCHAR(30),
  veiculo_placa VARCHAR(10),
  veiculo_ano VARCHAR(4),
  status VARCHAR(20) DEFAULT 'offline',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  disponivel BOOLEAN DEFAULT FALSE,
  em_corrida BOOLEAN DEFAULT FALSE,
  em_manutencao BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE,
  tem_comissao BOOLEAN DEFAULT FALSE,
  comissao_percentual DECIMAL(5, 2) DEFAULT 0,
  valor_mensalidade DECIMAL(10, 2) DEFAULT 150,
  tipo_recorrencia VARCHAR(20) DEFAULT 'mensal',
  dia_vencimento INTEGER DEFAULT 10,
  corridas_perdidas INTEGER DEFAULT 0,
  ultima_corrida_perdida TIMESTAMP,
  token_sessao VARCHAR(64),
  token_primeiro_acesso VARCHAR(64),
  token_acesso VARCHAR(64) UNIQUE,
  primeiro_acesso BOOLEAN DEFAULT TRUE,
  token_expira_em TIMESTAMP,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(empresa_id, telefone)
);

-- ========================================
-- TABELA: LOGS DE LOCALIZAÇÃO (GPS)
-- Histórico completo de GPS de todos os motoristas
-- ========================================
CREATE TABLE IF NOT EXISTS logs_localizacao (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  motorista_id INTEGER REFERENCES motoristas(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  precisao DECIMAL(6, 2),
  velocidade DECIMAL(6, 2),
  heading DECIMAL(5, 2),
  altitude DECIMAL(8, 2),
  corrida_id INTEGER REFERENCES corridas(id) ON DELETE SET NULL,
  status_motorista VARCHAR(20),
  evento VARCHAR(50),
  dispositivo_info TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_localizacao_motorista ON logs_localizacao(motorista_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_localizacao_empresa ON logs_localizacao(empresa_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_localizacao_corrida ON logs_localizacao(corrida_id);

-- ========================================
-- TABELA: CLIENTES
-- ========================================
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  telefone VARCHAR(20) NOT NULL,
  nome VARCHAR(100),
  recorrente BOOLEAN DEFAULT FALSE,
  total_corridas INTEGER DEFAULT 0,
  bloqueado BOOLEAN DEFAULT FALSE,
  motivo_bloqueio TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(empresa_id, telefone)
);

-- ========================================
-- TABELA: CORRIDAS
-- ========================================
CREATE TABLE IF NOT EXISTS corridas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id),
  motorista_id INTEGER REFERENCES motoristas(id),
  
  -- Origem
  origem_endereco TEXT,
  origem_referencia TEXT,
  origem_latitude DECIMAL(10, 8),
  origem_longitude DECIMAL(11, 8),
  origem_bairro VARCHAR(100),
  origem_cidade VARCHAR(100),
  
  -- Destino
  destino_endereco TEXT,
  destino_referencia TEXT,
  destino_latitude DECIMAL(10, 8),
  destino_longitude DECIMAL(11, 8),
  destino_bairro VARCHAR(100),
  destino_cidade VARCHAR(100),
  
  -- Valores
  valor_estimado DECIMAL(10, 2),
  valor_final DECIMAL(10, 2),
  distancia_km DECIMAL(10, 2),
  tempo_estimado_min INTEGER,
  
  -- Status
  status VARCHAR(30) DEFAULT 'aguardando_motorista',
  motivo_cancelamento TEXT,
  
  -- Timestamps
  solicitado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  aceito_em TIMESTAMP,
  iniciado_em TIMESTAMP,
  finalizado_em TIMESTAMP,
  cancelado_em TIMESTAMP,
  
  -- Avaliação
  avaliacao_cliente INTEGER,
  avaliacao_motorista INTEGER,
  comentario_cliente TEXT,
  
  -- Observações
  observacoes TEXT,
  
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: CONVERSAS
-- ========================================
CREATE TABLE IF NOT EXISTS conversas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id),
  telefone VARCHAR(20) NOT NULL,
  etapa VARCHAR(50) DEFAULT 'inicio',
  contexto JSONB DEFAULT '{}',
  ativa BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: MENSAGENS
-- ========================================
CREATE TABLE IF NOT EXISTS mensagens (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  conversa_id INTEGER REFERENCES conversas(id),
  telefone VARCHAR(20) NOT NULL,
  direcao VARCHAR(10) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'texto',
  conteudo TEXT,
  midia_url TEXT,
  lido BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: CONFIGURACOES
-- ========================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  chave VARCHAR(100) NOT NULL,
  valor TEXT,
  tipo VARCHAR(20) DEFAULT 'texto',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(empresa_id, chave)
);

-- ========================================
-- TABELA: PONTOS DE REFERÊNCIA
-- ========================================
CREATE TABLE IF NOT EXISTS pontos_referencia (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  apelidos TEXT[],
  endereco TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: OFERTAS DE CORRIDA
-- ========================================
CREATE TABLE IF NOT EXISTS ofertas_corrida (
  id SERIAL PRIMARY KEY,
  corrida_id INTEGER REFERENCES corridas(id),
  motorista_id INTEGER REFERENCES motoristas(id),
  status VARCHAR(20) DEFAULT 'enviada',
  enviada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  respondida_em TIMESTAMP,
  tempo_resposta_seg INTEGER
);

-- ========================================
-- TABELA: MENSALIDADES
-- ========================================
CREATE TABLE IF NOT EXISTS mensalidades (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  motorista_id INTEGER REFERENCES motoristas(id),
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente',
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: PAGAMENTOS
-- ========================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  motorista_id INTEGER REFERENCES motoristas(id),
  tipo VARCHAR(30) NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  descricao TEXT,
  comprovante_url TEXT,
  status VARCHAR(20) DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: ALERTAS FRAUDE
-- ========================================
CREATE TABLE IF NOT EXISTS alertas_fraude (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  motorista_id INTEGER REFERENCES motoristas(id),
  tipo VARCHAR(50) NOT NULL,
  descricao TEXT,
  nivel VARCHAR(20) DEFAULT 'medio',
  resolvido BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: AVARIAS
-- ========================================
CREATE TABLE IF NOT EXISTS avarias (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  motorista_id INTEGER REFERENCES motoristas(id),
  corrida_id INTEGER REFERENCES corridas(id),
  descricao TEXT NOT NULL,
  fotos TEXT[],
  valor_estimado DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: CHAT FROTA
-- ========================================
CREATE TABLE IF NOT EXISTS chat_frota (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  remetente_tipo VARCHAR(20) NOT NULL,
  remetente_id INTEGER,
  destinatario_tipo VARCHAR(20),
  destinatario_id INTEGER,
  mensagem TEXT NOT NULL,
  lido BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: ASSINATURAS
-- ========================================
CREATE TABLE IF NOT EXISTS assinaturas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  plano_id INTEGER REFERENCES planos(id),
  status VARCHAR(20) DEFAULT 'ativa',
  data_inicio DATE NOT NULL,
  data_fim DATE,
  valor_mensal DECIMAL(10, 2),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: NOTIFICAÇÕES
-- ========================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  destinatario_tipo VARCHAR(20) NOT NULL,
  destinatario_id INTEGER,
  mensagem TEXT,
  lido BOOLEAN DEFAULT FALSE,
  enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lido_em TIMESTAMP
);

-- ========================================
-- TABELA: MENSAGENS SUPORTE (Rebeca → ADM)
-- ========================================
CREATE TABLE IF NOT EXISTS mensagens_suporte (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  telefone_cliente VARCHAR(20),
  mensagem_cliente TEXT,
  duvida_rebeca TEXT,
  resposta_adm TEXT,
  status VARCHAR(20) DEFAULT 'pendente',
  respondido_em TIMESTAMP,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: USUÁRIOS MASTER
-- ========================================
CREATE TABLE IF NOT EXISTS usuarios_master (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  senha_hash VARCHAR(64) NOT NULL,
  nome VARCHAR(100),
  ativo BOOLEAN DEFAULT TRUE,
  token_sessao VARCHAR(64),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: LOG MASTER
-- ========================================
CREATE TABLE IF NOT EXISTS log_master (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  acao VARCHAR(100),
  detalhes JSONB,
  ip VARCHAR(45),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELA: CONFIG REBECA POR EMPRESA
-- ========================================
CREATE TABLE IF NOT EXISTS config_rebeca (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  prompt_personalizado TEXT,
  mensagens_personalizadas JSONB,
  regras_especiais JSONB,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INSERIR PLANOS PADRÃO
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM planos WHERE nome = 'Básico') THEN
    INSERT INTO planos (nome, valor, max_motoristas, max_corridas_mes, tem_api, tem_white_label, descricao) VALUES ('Básico', 99.90, 5, 300, false, false, 'Ideal para iniciar');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM planos WHERE nome = 'Profissional') THEN
    INSERT INTO planos (nome, valor, max_motoristas, max_corridas_mes, tem_api, tem_white_label, descricao) VALUES ('Profissional', 199.90, 15, 1000, true, false, 'Para frotas em crescimento');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM planos WHERE nome = 'Enterprise') THEN
    INSERT INTO planos (nome, valor, max_motoristas, max_corridas_mes, tem_api, tem_white_label, descricao) VALUES ('Enterprise', 399.90, 50, 5000, true, true, 'Solução completa com white-label');
  END IF;
END $$;

-- ========================================
-- INSERIR EMPRESA PADRÃO
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = 1) THEN
    INSERT INTO empresas (nome, telefone_adm, cidade, plano) VALUES ('UBMAX Transportes', '14999990000', 'Guaiçara', 'basico');
  END IF;
END $$;

`;

const runMigrations = async () => {
  console.log('🔄 Executando migrations...');
  
  try {
    await pool.query(migrations);
    console.log('✅ Migrations executadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro nas migrations:', error.message);
    throw error;
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ Processo concluído!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Falha nas migrations:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };