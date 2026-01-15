// ========================================
// REBECA - MIDDLEWARES
// ========================================

const rateLimiter = require('./rateLimiter');
const monitoring = require('./monitoring');
const errorHandler = require('./errorHandler');

module.exports = {
  // Rate Limiting
  ...rateLimiter,
  
  // Monitoramento
  ...monitoring,
  
  // Tratamento de Erros
  ...errorHandler
};
