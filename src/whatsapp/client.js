// ========================================
// REBECA - CLIENTE WHATSAPP
// Conexão via WhatsApp Web (testes)
// ========================================

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppClient {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.onMessageCallback = null;
  }

  /**
   * Inicializa o cliente WhatsApp
   */
  async inicializar() {
    console.log('🚀 Inicializando WhatsApp...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: './whatsapp-session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
      },
    });

    // Evento: QR Code para escanear
    this.client.on('qr', (qr) => {
      console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n⏳ Aguardando escaneamento...\n');
    });

    // Evento: Autenticado
    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp autenticado!');
    });

    // Evento: Falha na autenticação
    this.client.on('auth_failure', (error) => {
      console.error('❌ Falha na autenticação:', error);
    });

    // Evento: Pronto para uso
    this.client.on('ready', () => {
      this.isReady = true;
      console.log('✅ WhatsApp pronto para uso!');
      console.log('📞 Rebeca está online e aguardando mensagens...\n');
    });

    // Evento: Desconectado
    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      console.log('⚠️ WhatsApp desconectado:', reason);
      console.log('🔄 Tentando reconectar...');
    });

    // Evento: Mensagem recebida
    this.client.on('message', async (msg) => {
      // Ignorar mensagens de grupo
      if (msg.from.includes('@g.us')) return;
      
      // Ignorar mensagens enviadas por nós
      if (msg.fromMe) return;

      // Ignorar status/broadcast
      if (msg.from === 'status@broadcast') return;

      // Chamar callback de processamento
      if (this.onMessageCallback) {
        try {
          await this.onMessageCallback(msg);
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error);
        }
      }
    });

    // Iniciar cliente
    await this.client.initialize();
  }

  /**
   * Define callback para mensagens recebidas
   */
  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  /**
   * Envia mensagem para um número
   * @param {string} para - Número no formato XXXXXXXXXXX@c.us
   * @param {string} texto - Texto da mensagem
   */
  async enviarMensagem(para, texto) {
    if (!this.isReady) {
      console.error('❌ WhatsApp não está pronto');
      return false;
    }

    try {
      // Simular "digitando..."
      const chat = await this.client.getChatById(para);
      await chat.sendStateTyping();
      
      // Pequeno delay antes de enviar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Enviar mensagem
      await this.client.sendMessage(para, texto);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  /**
   * Envia localização
   * @param {string} para - Número
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {string} descricao 
   */
  async enviarLocalizacao(para, latitude, longitude, descricao = '') {
    if (!this.isReady) {
      console.error('❌ WhatsApp não está pronto');
      return false;
    }

    try {
      const location = new (require('whatsapp-web.js')).Location(latitude, longitude, descricao);
      await this.client.sendMessage(para, location);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar localização:', error);
      return false;
    }
  }

  /**
   * Verifica se está conectado
   */
  estaConectado() {
    return this.isReady;
  }

  /**
   * Desconecta o cliente
   */
  async desconectar() {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
      console.log('👋 WhatsApp desconectado');
    }
  }
}

module.exports = WhatsAppClient;
