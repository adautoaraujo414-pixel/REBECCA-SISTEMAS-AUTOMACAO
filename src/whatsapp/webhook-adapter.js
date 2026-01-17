// ========================================
// ADAPTADOR WEBHOOK EVOLUTION → REBECA
// ========================================

const fluxo = require('../conversation/fluxo');

async function receberMensagemEvolution(payload) {
  const event = payload.event;
  const data = payload.data;

  if (event !== 'MESSAGES_UPSERT') return;

  if (!data?.messages || !Array.isArray(data.messages)) return;

  for (const msg of data.messages) {
    if (msg.key?.fromMe) continue;

    const telefone = msg.key.remoteJid
      .replace('@s.whatsapp.net', '')
      .replace('@g.us', '');

    const texto =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';

    if (!texto) continue;

    const mensagem = {
      telefone,
      texto,
      origem: 'whatsapp',
      raw: msg
    };

    // 🔥 AQUI o WhatsApp entra no sistema
    await fluxo.processar(mensagem);
  }
}

module.exports = {
  receberMensagemEvolution
};
