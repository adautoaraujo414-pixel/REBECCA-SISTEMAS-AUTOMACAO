// ========================================
// REBECA - CONFIGURAÇÕES DO SISTEMA
// ========================================

require('dotenv').config();

module.exports = {
  // Banco de Dados
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'rebeca_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // Servidor
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  },

  // Delays da Rebeca (em milissegundos)
  rebeca: {
    delay: {
      min: parseInt(process.env.REBECA_DELAY_MIN) || 1000,
      max: parseInt(process.env.REBECA_DELAY_MAX) || 3000,
    },
    delayConfirmacao: {
      min: parseInt(process.env.REBECA_DELAY_CONFIRMACAO_MIN) || 2000,
      max: parseInt(process.env.REBECA_DELAY_CONFIRMACAO_MAX) || 5000,
    },
  },

  // Horário de Funcionamento
  horario: {
    inicio: process.env.HORARIO_INICIO || '00:00',
    fim: process.env.HORARIO_FIM || '23:59',
  },

  // Nome da Frota
  frota: {
    nome: process.env.NOME_FROTA || 'Frota Rebeca',
  },
};
