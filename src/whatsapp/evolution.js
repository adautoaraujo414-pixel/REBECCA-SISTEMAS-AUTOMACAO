// ========================================
// REBECA - CLIENTE WHATSAPP VIA EVOLUTION API
// PRODUÇÃO (SEM WEBSOCKET)
// ========================================

const axios = require('axios');
const EventEmitter = require('events');

class EvolutionClient extends EventEmitter {
  constructor(config = {}) {
    super();

    this.baseURL = config.baseURL || process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = config.apiKey || process.env.EVOLUTION_API_KEY || '';
    this.instanceName = config.instanceName || process.env.EVOLUTION_INSTANCE || 'rebeca';

    this.isConnected = false;
    this.isReady = false;
    this.qrCode = null;

    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey
      },
      timeout: 30000
    });
  }

  // ========================================
  // INICIALIZAÇÃO
  // ========================================
  async inicializar() {
    console.log('🚀 Conectando à Evolution API...');
    console.log(`📍 URL: ${this.baseURL}`);
    console.log(`📱 Instância: ${this.instanceName}`);

    try {
      const exists = await this.verificarInstancia();
      if (!exists) await this.criarInstancia();

      const status = await this.verificarStatus();
      if (status.state === 'open') {
        this.isConnected = true;
        this.isReady = true;
        console.log('✅ WhatsApp já conectado!');
      } else {
        await this.conectar();
      }

      await this.configurarWebhook();
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar Evolution:', error.message);
      throw error;
    }
  }

  // ========================================
  // INSTÂNCIA
  // ========================================
  async verificarInstancia() {
    try {
      const res = await this.api.get('/instance/fetchInstances');
      return (res.data || []).some(i => i.instance?.instanceName === this.instanceName);
    } catch {
      return false;
    }
  }

  async criarInstancia() {
    console.log('📦 Criando instância...');
    try {
      await this.api.post('/instance/create', {
        instanceName: this.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });
      console.log('✅ Instância criada');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('ℹ️ Instância já existe');
      } else {
        throw error;
      }
    }
  }

  async verificarStatus() {
    try {
      const res = await this.api.get(`/instance/connectionState/${this.instanceName}`);
      return res.data?.instance || { state: 'close' };
    } catch {
      return { state: 'close' };
    }
  }

  async conectar() {
    console.log('📱 Gerando QR Code...');
    const res = await this.api.get(`/instance/connect/${this.instanceName}`);
    if (res.data?.base64) {
      this.qrCode = res.data.base64;
      this.emit('qr', this.qrCode);
      console.log('🔲 QR Code gerado');
    }
  }

  // ========================================
  // WEBHOOK (JEITO CERTO)
  // ========================================
  async configurarWebhook() {
    const webhookURL = process.env.WEBHOOK_URL;
    if (!webhookURL) {
      console.log('⚠️ WEBHOOK_URL não definido — webhook ignorado');
      return;
    }

    console.log(`🔗 Configurando Webhook: ${webhookURL}`);

    try {
      await this.api.post(`/webhook/set/${this.instanceName}`, {
        url: webhookURL,
        webhook_by_events: false,
        webhook_base64: true,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
          'CALL'
        ]
      });
      console.log('✅ Webhook configurado');
    } catch (error) {
      console.log('⚠️ Falha ao configurar webhook');
    }
  }

  // ========================================
  // ENVIO DE MENSAGENS
  // ========================================
  async enviarMensagem(para, texto) {
    if (!this.isReady) return false;
    const numero = this.formatarNumero(para);

    try {
      await this.api.post(`/message/sendText/${this.instanceName}`, {
        number: numero,
        text: texto,
        delay: 1200
      });
      return true;
    } catch {
      return false;
    }
  }

  // ========================================
  // UTILIDADES
  // ========================================
  formatarNumero(numero) {
    let n = numero.replace(/\D/g, '');
    if (n.length === 10 || n.length === 11) n = '55' + n;
    return n;
  }

  estaConectado() {
    return this.isReady;
  }

  async desconectar() {
    try {
      await this.api.delete(`/instance/logout/${this.instanceName}`);
      this.isConnected = false;
      this.isReady = false;
      console.log('👋 WhatsApp desconectado');
    } catch {}
  }
}

module.exports = EvolutionClient;
