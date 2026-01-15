// ========================================
// REBECA - UTILITÁRIOS DE DELAY
// Faz a Rebeca parecer humana
// ========================================

const config = require('../config');

/**
 * Gera um delay aleatório entre min e max
 * @param {number} min - Mínimo em ms
 * @param {number} max - Máximo em ms
 * @returns {Promise}
 */
const delay = (min, max) => {
  const tempo = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, tempo));
};

/**
 * Delay padrão para primeira resposta (1-3 segundos)
 */
const delayResposta = () => {
  return delay(config.rebeca.delay.min, config.rebeca.delay.max);
};

/**
 * Delay para confirmações importantes (2-5 segundos)
 */
const delayConfirmacao = () => {
  return delay(config.rebeca.delayConfirmacao.min, config.rebeca.delayConfirmacao.max);
};

/**
 * Delay curto para "digitando..." (500ms - 1.5s)
 */
const delayDigitando = () => {
  return delay(500, 1500);
};

/**
 * Simula tempo de "busca" de motorista (3-6 segundos)
 */
const delayBuscaMotorista = () => {
  return delay(3000, 6000);
};

module.exports = {
  delay,
  delayResposta,
  delayConfirmacao,
  delayDigitando,
  delayBuscaMotorista,
};
