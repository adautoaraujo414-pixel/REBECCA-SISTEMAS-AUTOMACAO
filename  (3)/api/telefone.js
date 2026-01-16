// ========================================
// REBECA - ROTAS DE TELEFONIA
// Webhooks para Twilio
// INTEGRADO COM SISTEMA DE CORRIDAS
// ========================================

const express = require('express');
const router = express.Router();
const TelefoniaService = require('../services/telefonia');

// ========================================
// WEBHOOK: RECEBER LIGAÇÃO (entrada)
// POST /api/telefone/entrada
// ========================================
router.post('/entrada', (req, res) => {
  console.log('\n📞 ========================================');
  console.log('📞 NOVA LIGAÇÃO RECEBIDA!');
  console.log('📞 ========================================');
  console.log(`   De: ${req.body.From}`);
  console.log(`   Para: ${req.body.To}`);
  console.log(`   CallSid: ${req.body.CallSid}`);

  // Responder com TwiML (inicializa contexto internamente)
  const twiml = TelefoniaService.gerarRespostaInicial(req.body.CallSid, req.body.From);
  
  res.type('text/xml');
  res.send(twiml);
});

// ========================================
// WEBHOOK: PROCESSAR GRAVAÇÃO
// POST /api/telefone/processar
// ========================================
router.post('/processar', async (req, res) => {
  console.log('\n🎤 Processando gravação...');
  console.log(`   CallSid: ${req.body.CallSid}`);
  console.log(`   RecordingUrl: ${req.body.RecordingUrl}`);

  const callSid = req.body.CallSid;
  const recordingUrl = req.body.RecordingUrl;

  // Processar gravação (fluxo completo de corrida)
  const twiml = await TelefoniaService.processarGravacao(recordingUrl, callSid);

  res.type('text/xml');
  res.send(twiml);
});

// ========================================
// WEBHOOK: STATUS DA LIGAÇÃO
// POST /api/telefone/status
// ========================================
router.post('/status', (req, res) => {
  const status = req.body.CallStatus;
  const callSid = req.body.CallSid;

  console.log(`📞 Status da ligação ${callSid}: ${status}`);

  // Limpar contexto quando ligação terminar
  if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
    const contexto = TelefoniaService.getContexto(callSid);
    if (contexto) {
      const duracao = (new Date() - contexto.inicio) / 1000;
      console.log(`   Duração: ${duracao.toFixed(0)}s`);
      console.log(`   Corrida criada: ${contexto.corrida_id || 'Não'}`);
    }
    TelefoniaService.limparContexto(callSid);
  }

  res.sendStatus(200);
});

// ========================================
// FAZER LIGAÇÃO (outbound)
// POST /api/telefone/ligar
// ========================================
router.post('/ligar', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({ 
        success: false, 
        error: 'Número e mensagem são obrigatórios' 
      });
    }

    const call = await TelefoniaService.fazerLigacao(numero, mensagem);
    
    if (call) {
      res.json({ success: true, callSid: call.sid });
    } else {
      res.status(500).json({ success: false, error: 'Twilio não configurado ou erro na ligação' });
    }
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// ENVIAR SMS
// POST /api/telefone/sms
// ========================================
router.post('/sms', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({ 
        success: false, 
        error: 'Número e mensagem são obrigatórios' 
      });
    }

    const sms = await TelefoniaService.enviarSMS(numero, mensagem);
    
    if (sms) {
      res.json({ success: true, messageSid: sms.sid });
    } else {
      res.status(500).json({ success: false, error: 'Twilio não configurado ou erro no SMS' });
    }
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// STATUS DO SERVIÇO
// GET /api/telefone/status-servico
// ========================================
router.get('/status-servico', (req, res) => {
  const twilioConfigurado = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  
  res.json({
    success: true,
    telefonia: {
      configurado: twilioConfigurado,
      numero: process.env.TWILIO_PHONE_NUMBER || 'Não configurado',
      webhooks: {
        entrada: '/api/telefone/entrada',
        processar: '/api/telefone/processar',
        status: '/api/telefone/status'
      }
    }
  });
});

module.exports = router;
