// ========================================
// REBECA - CLIENTE WHATSAPP VIA EVOLUTION API
// Conexão profissional para produção
// ========================================

const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

class EvolutionClient extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Configurações da Evolution API
    this.baseURL = config.baseURL || process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = config.apiKey || process.env.EVOLUTION_API_KEY || '';
    this.instanceName = config.instanceName || process.env.EVOLUTION_INSTANCE || 'rebeca';
    
    // Estado
    this.isConnected = false;
    this.isReady = false;
    this.qrCode = null;
    this.ws = null;
    
    // Axios instance
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey
      },
      timeout: 30000
    });
  }

  /**
   * Inicializa conexão com Evolution API
   */
  async inicializar() {
    console.log('🚀 Conectando à Evolution API...');
    console.log(`📍 URL: ${this.baseURL}`);
    console.log(`📱 Instância: ${this.instanceName}`);

    try {
      // 1. Verificar se instância existe
      const instanceExists = await this.verificarInstancia();
      
      if (!instanceExists) {
        // 2. Criar instância se não existir
        await this.criarInstancia();
      }

      // 3. Verificar estado da conexão
      const status = await this.verificarStatus();
      
      if (status.state === 'open') {
        this.isConnected = true;
        this.isReady = true;
        console.log('✅ WhatsApp já está conectado!');
      } else {
        // 4. Conectar (gerar QR Code)
        await this.conectar();
      }

      // 5. Configurar WebSocket para eventos em tempo real
      await this.configurarWebSocket();

      // 6. Configurar Webhook para receber mensagens
      await this.configurarWebhook();

      return true;

    } catch (error) {
      console.error('❌ Erro ao inicializar Evolution API:', error.message);
      throw error;
    }
  }

  /**
   * Verifica se a instância existe
   */
  async verificarInstancia() {
    try {
      const response = await this.api.get(`/instance/fetchInstances`);
      const instances = response.data || [];
      return instances.some(i => i.instance?.instanceName === this.instanceName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Cria nova instância
   */
  async criarInstancia() {
    console.log('📦 Criando instância...');
    
    try {
      const response = await this.api.post('/instance/create', {
        instanceName: this.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });
      
      console.log('✅ Instância criada!');
      return response.data;
    } catch (error) {
      // Se já existe, tudo bem
      if (error.response?.status === 403) {
        console.log('ℹ️ Instância já existe');
        return true;
      }
      throw error;
    }
  }

  /**
   * Verifica status da conexão
   */
  async verificarStatus() {
    try {
      const response = await this.api.get(`/instance/connectionState/${this.instanceName}`);
      return response.data?.instance || { state: 'close' };
    } catch (error) {
      return { state: 'close' };
    }
  }

  /**
   * Conecta ao WhatsApp (gera QR Code)
   */
  async conectar() {
    console.log('📱 Gerando QR Code...');
    
    try {
      const response = await this.api.get(`/instance/connect/${this.instanceName}`);
      
      if (response.data?.base64) {
        this.qrCode = response.data.base64;
        console.log('\n🔲 QR Code gerado! Escaneie com seu WhatsApp:\n');
        
        // Emitir evento de QR Code
        this.emit('qr', this.qrCode);
        
        // Se tiver code, mostrar no terminal
        if (response.data?.code) {
          console.log(`📝 Código: ${response.data.code}\n`);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao conectar:', error.message);
      throw error;
    }
  }

  /**
   * Configura WebSocket para eventos em tempo real
   * SÓ conecta se Evolution API estiver configurada
   */
  async configurarWebSocket() {
    // NÃO conectar WebSocket se Evolution API não estiver configurada
    if (!this.baseURL || this.baseURL === 'http://localhost:8080' || !this.apiKey) {
      console.log('⚠️ Evolution API não configurada - WebSocket desativado');
      console.log('   Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no .env');
      return;
    }

    const wsURL = this.baseURL.replace('http', 'ws') + `/ws/${this.instanceName}`;
    
    console.log('🔌 Conectando WebSocket...');
    console.log(`   URL: ${wsURL}`);
    
    try {
      this.ws = new WebSocket(wsURL, {
        headers: {
          'apikey': this.apiKey
        }
      });

      this.ws.on('open', () => {
        console.log('✅ WebSocket conectado!');
      });

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this.processarEvento(event);
        } catch (error) {
          console.error('Erro ao processar evento WS:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('⚠️ WebSocket desconectado');
        this.isConnected = false;
        
        // Reconectar após 10 segundos (aumentado para evitar spam)
        setTimeout(() => this.configurarWebSocket(), 10000);
      });

      this.ws.on('error', (error) => {
        console.error('❌ Erro WebSocket:', error.message);
        // Não tentar reconectar imediatamente em caso de erro
      });
    } catch (error) {
      console.error('❌ Falha ao criar WebSocket:', error.message);
    }
  }

  /**
   * Processa eventos do WebSocket
   */
  processarEvento(event) {
    const { event: eventType, data } = event;

    switch (eventType) {
      case 'connection.update':
        if (data.state === 'open') {
          this.isConnected = true;
          this.isReady = true;
          console.log('✅ WhatsApp conectado!');
          this.emit('ready');
        } else if (data.state === 'close') {
          this.isConnected = false;
          this.isReady = false;
          console.log('⚠️ WhatsApp desconectado');
          this.emit('disconnected');
        }
        break;

      case 'qrcode.updated':
        this.qrCode = data.qrcode?.base64;
        this.emit('qr', this.qrCode);
        break;

      case 'messages.upsert':
        // Nova mensagem recebida
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach(msg => {
            if (!msg.key.fromMe) {
              this.emit('message', this.formatarMensagem(msg));
            }
          });
        }
        break;

      case 'messages.update':
        // Atualização de mensagem (lida, entregue, etc)
        this.emit('message_update', data);
        break;

      // ==========================================
      // HANDLER PARA LIGAÇÕES
      // Quando alguém liga para a Rebeca
      // ==========================================
      case 'call':
      case 'call.update':
        if (data) {
          this.processarLigacao(data);
        }
        break;

      default:
        // Outros eventos
        this.emit(eventType, data);
    }
  }

  /**
   * Processa ligação recebida
   * Recusa automaticamente e envia mensagem
   */
  async processarLigacao(callData) {
    try {
      const telefone = callData.from?.replace('@s.whatsapp.net', '') || 
                       callData.remoteJid?.replace('@s.whatsapp.net', '');
      const callId = callData.id || callData.callId;
      const status = callData.status || callData.state;
      
      console.log(`📞 Ligação recebida de ${telefone} - Status: ${status}`);
      
      // Só processa se for ligação incoming (recebida)
      if (status === 'offer' || status === 'ringing' || status === 'incoming') {
        
        // 1. Recusar a ligação automaticamente
        try {
          await this.recusarLigacao(callId, telefone);
          console.log(`❌ Ligação de ${telefone} recusada automaticamente`);
        } catch (e) {
          console.log('Não foi possível recusar ligação via API, mas mensagem será enviada');
        }
        
        // 2. Enviar mensagem automática (CURTA conforme padrão Rebeca)
        const mensagem = `Oi! Vi que você ligou, mas não consigo atender.

Precisa de um carro? Me manda o endereço.`;

        await this.enviarMensagem(telefone + '@s.whatsapp.net', mensagem);
        console.log(`✅ Mensagem enviada para ${telefone} após ligação`);
        
        // 3. Emitir evento para o sistema processar
        this.emit('call_received', {
          telefone,
          callId,
          timestamp: new Date().toISOString(),
          handled: true
        });
      }
    } catch (error) {
      console.error('❌ Erro ao processar ligação:', error.message);
    }
  }

  /**
   * Recusa uma ligação via API
   */
  async recusarLigacao(callId, telefone) {
    try {
      // Tentar recusar via Evolution API
      await this.api.post(`/call/reject/${this.instanceName}`, {
        callId: callId,
        from: telefone + '@s.whatsapp.net'
      });
    } catch (error) {
      // Algumas versões da Evolution API não têm esse endpoint
      // A ligação vai cair sozinha eventualmente
      console.log('API de recusa não disponível');
    }
  }

  /**
   * Formata mensagem recebida
   */
  formatarMensagem(msg) {
    const remoteJid = msg.key.remoteJid;
    const isGroup = remoteJid.includes('@g.us');
    const telefone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    
    return {
      id: msg.key.id,
      from: remoteJid,
      telefone: telefone,
      isGroup: isGroup,
      fromMe: msg.key.fromMe,
      timestamp: msg.messageTimestamp,
      type: this.getTipoMensagem(msg.message),
      body: this.getTextoMensagem(msg.message),
      message: msg.message,
      pushName: msg.pushName || 'Cliente',
      // Dados extras para áudio
      hasMedia: !!(msg.message?.audioMessage || msg.message?.imageMessage || msg.message?.documentMessage),
      mediaType: msg.message?.audioMessage ? 'audio' : 
                 msg.message?.imageMessage ? 'image' : 
                 msg.message?.documentMessage ? 'document' : null
    };
  }

  /**
   * Obtém tipo da mensagem
   */
  getTipoMensagem(message) {
    if (!message) return 'unknown';
    if (message.conversation || message.extendedTextMessage) return 'text';
    if (message.audioMessage) return 'audio';
    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.documentMessage) return 'document';
    if (message.locationMessage) return 'location';
    if (message.contactMessage) return 'contact';
    if (message.stickerMessage) return 'sticker';
    return 'unknown';
  }

  /**
   * Obtém texto da mensagem
   */
  getTextoMensagem(message) {
    if (!message) return '';
    return message.conversation || 
           message.extendedTextMessage?.text ||
           message.imageMessage?.caption ||
           message.videoMessage?.caption ||
           message.documentMessage?.caption ||
           '';
  }

  /**
   * Configura Webhook para receber mensagens
   */
  async configurarWebhook() {
    const webhookURL = process.env.WEBHOOK_URL || 'http://localhost:3000/webhook';
    
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
          'QRCODE_UPDATED'
        ]
      });
      
      console.log('✅ Webhook configurado!');
    } catch (error) {
      console.log('⚠️ Webhook não configurado (será usado WebSocket)');
    }
  }

  /**
   * Envia mensagem de texto
   */
  async enviarMensagem(para, texto) {
    if (!this.isReady) {
      console.error('❌ WhatsApp não está pronto');
      return false;
    }

    // Formatar número
    const numero = this.formatarNumero(para);

    try {
      const response = await this.api.post(`/message/sendText/${this.instanceName}`, {
        number: numero,
        text: texto,
        delay: 1200 // Delay para parecer humano
      });

      console.log(`📤 Mensagem enviada para ${numero}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
      return false;
    }
  }

  /**
   * Envia localização
   */
  async enviarLocalizacao(para, latitude, longitude, nome = '', endereco = '') {
    if (!this.isReady) return false;

    const numero = this.formatarNumero(para);

    try {
      const response = await this.api.post(`/message/sendLocation/${this.instanceName}`, {
        number: numero,
        latitude: latitude,
        longitude: longitude,
        name: nome,
        address: endereco
      });

      console.log(`📍 Localização enviada para ${numero}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar localização:', error.message);
      return false;
    }
  }

  /**
   * Envia botões (lista de opções)
   */
  async enviarBotoes(para, titulo, botoes) {
    if (!this.isReady) return false;

    const numero = this.formatarNumero(para);

    try {
      const response = await this.api.post(`/message/sendButtons/${this.instanceName}`, {
        number: numero,
        title: titulo,
        buttons: botoes.map((b, i) => ({
          buttonId: `btn_${i}`,
          buttonText: { displayText: b }
        })),
        footerText: 'Rebeca - Sua assistente de corridas'
      });

      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar botões:', error.message);
      return false;
    }
  }

  /**
   * Envia lista de opções
   */
  async enviarLista(para, titulo, descricao, botaoTexto, secoes) {
    if (!this.isReady) return false;

    const numero = this.formatarNumero(para);

    try {
      const response = await this.api.post(`/message/sendList/${this.instanceName}`, {
        number: numero,
        title: titulo,
        description: descricao,
        buttonText: botaoTexto,
        footerText: 'Rebeca - Sua assistente de corridas',
        sections: secoes
      });

      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar lista:', error.message);
      return false;
    }
  }

  /**
   * Envia áudio
   */
  async enviarAudio(para, audioBase64) {
    if (!this.isReady) return false;

    const numero = this.formatarNumero(para);

    try {
      const response = await this.api.post(`/message/sendWhatsAppAudio/${this.instanceName}`, {
        number: numero,
        audio: audioBase64,
        encoding: true
      });

      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar áudio:', error.message);
      return false;
    }
  }

  /**
   * Baixa mídia de uma mensagem
   */
  async baixarMidia(messageId) {
    try {
      const response = await this.api.get(`/chat/getBase64FromMediaMessage/${this.instanceName}`, {
        params: { messageId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao baixar mídia:', error.message);
      return null;
    }
  }

  /**
   * Simula "digitando..."
   */
  async simularDigitando(para) {
    const numero = this.formatarNumero(para);
    
    try {
      await this.api.post(`/chat/sendPresence/${this.instanceName}`, {
        number: numero,
        presence: 'composing'
      });
    } catch (error) {
      // Silencioso
    }
  }

  /**
   * Para de "digitar"
   */
  async pararDigitando(para) {
    const numero = this.formatarNumero(para);
    
    try {
      await this.api.post(`/chat/sendPresence/${this.instanceName}`, {
        number: numero,
        presence: 'paused'
      });
    } catch (error) {
      // Silencioso
    }
  }

  /**
   * Formata número para padrão WhatsApp
   */
  formatarNumero(numero) {
    // Remover caracteres não numéricos
    let limpo = numero.replace(/\D/g, '');
    
    // Adicionar código do Brasil se não tiver
    if (limpo.length === 11) {
      limpo = '55' + limpo;
    } else if (limpo.length === 10) {
      limpo = '55' + limpo;
    }
    
    return limpo;
  }

  /**
   * Verifica se está conectado
   */
  estaConectado() {
    return this.isReady;
  }

  /**
   * Desconecta o WhatsApp
   */
  async desconectar() {
    try {
      await this.api.delete(`/instance/logout/${this.instanceName}`);
      this.isConnected = false;
      this.isReady = false;
      
      if (this.ws) {
        this.ws.close();
      }
      
      console.log('👋 WhatsApp desconectado');
    } catch (error) {
      console.error('Erro ao desconectar:', error.message);
    }
  }

  /**
   * Registra callback para mensagens (compatibilidade com client.js)
   */
  onMessage(callback) {
    this.on('message', callback);
  }

  /**
   * Reinicia a conexão
   */
  async reiniciar() {
    try {
      console.log('🔄 Reiniciando WhatsApp...');
      await this.desconectar();
      await new Promise(r => setTimeout(r, 2000));
      await this.conectar();
      console.log('✅ WhatsApp reiniciado!');
    } catch (error) {
      console.error('❌ Erro ao reiniciar:', error.message);
    }
  }

  // ========================================
  // RECONEXÃO AUTOMÁTICA
  // ========================================
  
  /**
   * Configurar reconexão automática em caso de queda
   */
  configurarReconexaoAutomatica() {
    console.log('🔄 Configurando reconexão automática...');
    
    // Verificar conexão a cada 30 segundos
    this.reconnectInterval = setInterval(async () => {
      try {
        const status = await this.verificarStatus();
        
        if (status && status.state !== 'open' && status.state !== 'connecting') {
          console.log('⚠️ WhatsApp desconectado! Tentando reconectar...');
          await this.reconectarWhatsApp();
        }
      } catch (error) {
        console.log('🔄 Tentando reconexão automática...');
        await this.reconectarWhatsApp();
      }
    }, 30000);
    
    console.log('✅ Reconexão automática configurada!');
  }
  
  /**
   * Reconectar WhatsApp
   */
  async reconectarWhatsApp() {
    try {
      console.log('🔄 Reconectando WhatsApp...');
      await this.api.post(`/instance/restart/${this.instanceName}`);
      console.log('✅ Reconexão iniciada!');
    } catch (error) {
      console.error('❌ Erro ao reconectar:', error.message);
    }
  }
  
  /**
   * Parar reconexão automática
   */
  pararReconexaoAutomatica() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
      console.log('⏹️ Reconexão automática desativada');
    }
  }
}

module.exports = EvolutionAPI;
