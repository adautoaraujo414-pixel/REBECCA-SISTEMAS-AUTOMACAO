// ========================================
// REBECA - SISTEMA DE LOGS ESTRUTURADOS
// Winston Logger
// ========================================

const winston = require('winston');
const path = require('path');

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
  })
);

// Formato para console (colorido)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

// Criar diretório de logs se não existir
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'rebeca' },
  transports: [
    // Arquivo de erros
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Arquivo de todos os logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // Arquivo de corridas
    new winston.transports.File({
      filename: path.join(logsDir, 'corridas.log'),
      level: 'info',
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

// Console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// ========================================
// MÉTODOS ESPECÍFICOS DO SISTEMA
// ========================================

// Log de corrida
logger.corrida = (acao, dados) => {
  logger.info(`🚗 CORRIDA: ${acao}`, {
    tipo: 'corrida',
    acao,
    ...dados
  });
};

// Log de motorista
logger.motorista = (acao, dados) => {
  logger.info(`👤 MOTORISTA: ${acao}`, {
    tipo: 'motorista',
    acao,
    ...dados
  });
};

// Log de WhatsApp
logger.whatsapp = (acao, dados) => {
  logger.info(`📱 WHATSAPP: ${acao}`, {
    tipo: 'whatsapp',
    acao,
    ...dados
  });
};

// Log de telefonia
logger.telefone = (acao, dados) => {
  logger.info(`📞 TELEFONE: ${acao}`, {
    tipo: 'telefone',
    acao,
    ...dados
  });
};

// Log de API
logger.api = (method, path, status, duration) => {
  const level = status >= 400 ? 'warn' : 'info';
  logger.log(level, `${method} ${path} ${status} ${duration}ms`, {
    tipo: 'api',
    method,
    path,
    status,
    duration
  });
};

// Log de erro com contexto
logger.erro = (mensagem, erro, contexto = {}) => {
  logger.error(mensagem, {
    tipo: 'erro',
    erro: erro.message,
    stack: erro.stack,
    ...contexto
  });
};

// Log de segurança
logger.seguranca = (acao, dados) => {
  logger.warn(`🔒 SEGURANÇA: ${acao}`, {
    tipo: 'seguranca',
    acao,
    ...dados
  });
};

// Log de performance
logger.performance = (operacao, duracao, dados = {}) => {
  const level = duracao > 1000 ? 'warn' : 'info';
  logger.log(level, `⚡ PERFORMANCE: ${operacao} - ${duracao}ms`, {
    tipo: 'performance',
    operacao,
    duracao,
    ...dados
  });
};

module.exports = logger;
