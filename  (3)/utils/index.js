// ========================================
// REBECA - UTILITÁRIOS
// ========================================

const delay = require('./delay');
const horario = require('./horario');
const logger = require('./logger');

module.exports = {
  ...delay,
  ...horario,
  logger
};
