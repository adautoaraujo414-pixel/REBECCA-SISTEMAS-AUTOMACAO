// ========================================
// REBECA - SERVIÇOS
// ========================================

const OpenAIService = require('./openai');
const AtribuicaoService = require('./atribuicao');
const GeocodingService = require('./geocoding');
const TelefoniaService = require('./telefonia');
const OfertaCorridaService = require('./ofertaCorrida');
const { MonitoramentoCorridas, CONFIG_TEMPO, STATUS_CORRIDA } = require('./monitoramento');
const { AntiFraude, CONFIG_FRAUDE, TIPO_ALERTA, SEVERIDADE } = require('./antifraude');

module.exports = {
  OpenAIService,
  AtribuicaoService,
  GeocodingService,
  TelefoniaService,
  OfertaCorridaService,
  MonitoramentoCorridas,
  CONFIG_TEMPO,
  STATUS_CORRIDA,
  AntiFraude,
  CONFIG_FRAUDE,
  TIPO_ALERTA,
  SEVERIDADE,
};
