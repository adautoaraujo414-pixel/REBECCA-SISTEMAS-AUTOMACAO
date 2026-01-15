// ========================================
// REBECA - UTILITÁRIOS DE HORÁRIO
// ========================================

const config = require('../config');

/**
 * Verifica se está dentro do horário de funcionamento
 * @returns {boolean}
 */
const dentroDoHorario = () => {
  const agora = new Date();
  const horaAtual = agora.getHours() * 60 + agora.getMinutes();

  const [inicioH, inicioM] = config.horario.inicio.split(':').map(Number);
  const [fimH, fimM] = config.horario.fim.split(':').map(Number);

  const inicio = inicioH * 60 + inicioM;
  const fim = fimH * 60 + fimM;

  // Se funcionamento 24h
  if (inicio === 0 && fim === 23 * 60 + 59) {
    return true;
  }

  return horaAtual >= inicio && horaAtual <= fim;
};

/**
 * Retorna mensagem de fora do horário
 * @returns {string}
 */
const mensagemForaDoHorario = () => {
  return `Oi! No momento estamos fora do horário de atendimento.\nFuncionamos das ${config.horario.inicio} às ${config.horario.fim}.\nMande uma mensagem nesse período que te atendo 👍`;
};

module.exports = {
  dentroDoHorario,
  mensagemForaDoHorario,
};
