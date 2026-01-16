// ========================================
// REBECA - MÓDULO WHATSAPP
// ========================================

const WhatsAppClient = require('./client');
const EvolutionClient = require('./evolution');

// Usar Evolution API em produção, whatsapp-web.js em desenvolvimento
const useEvolution = process.env.USE_EVOLUTION === 'true' || process.env.NODE_ENV === 'production';

module.exports = {
  WhatsAppClient: useEvolution ? EvolutionClient : WhatsAppClient,
  EvolutionClient,
  LegacyClient: WhatsAppClient
};
