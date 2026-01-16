// ========================================
// REBECA - REPOSITÓRIOS
// ========================================

const ClienteRepository = require('./clienteRepository');
const MotoristaRepository = require('./motoristaRepository');
const CorridaRepository = require('./corridaRepository');
const ConversaRepository = require('./conversaRepository');
const MensagemRepository = require('./mensagemRepository');
const PagamentoRepository = require('./pagamentoRepository');
const ConfiguracaoRepository = require('./configuracaoRepository');
const PontoReferenciaRepository = require('./pontoReferenciaRepository');

const EmpresaRepository = require('./empresaRepository');
module.exports = {
  EmpresaRepository,
  ClienteRepository,
  MotoristaRepository,
  CorridaRepository,
  ConversaRepository,
  MensagemRepository,
  PagamentoRepository,
  ConfiguracaoRepository,
  PontoReferenciaRepository,
};
