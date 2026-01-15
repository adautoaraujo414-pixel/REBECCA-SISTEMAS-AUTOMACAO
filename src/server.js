// ========================================
// REBECA - SERVIDOR HTTP + WEBSOCKET
// API + Painel Admin + Webhook Evolution
// ========================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const config = require('./config');
const { query } = require('./database/connection');

class Server {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
    this.whatsappClient = null;
    this.fluxoConversa = null;
    
    // Clientes conectados (motoristas, admins)
    this.clientesConectados = new Map();
  }

  /**
   * Injeta dependências
   */
  setDependencias(whatsappClient, fluxoConversa) {
    this.whatsappClient = whatsappClient;
    this.fluxoConversa = fluxoConversa;
  }

  /**
   * Configura middlewares
   */
  configurarMiddlewares() {
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
    }));
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Log de requisições
    this.app.use((req, res, next) => {
      const timestamp = new Date().toLocaleTimeString('pt-BR');
      console.log(`[${timestamp}] 📡 ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Configura rotas
   */
  configurarRotas() {
    // ==========================================
    // WEBHOOK - EVOLUTION API
    // ==========================================
    this.app.post('/webhook', async (req, res) => {
      try {
        const event = req.body;
        console.log('📨 Webhook recebido:', event.event);
        
        // Processar evento
        await this.processarWebhook(event);
        
        res.status(200).json({ received: true });
      } catch (error) {
        console.error('❌ Erro no webhook:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ==========================================
    // API - STATUS DO SISTEMA
    // ==========================================
    this.app.get('/api/status', (req, res) => {
      res.json({
        sistema: 'REBECA',
        versao: '1.0.0',
        status: 'online',
        whatsapp: this.whatsappClient?.estaConectado() || false,
        motoristasOnline: this.contarMotoristasOnline(),
        corridasAtivas: this.contarCorridasAtivas(),
        timestamp: new Date().toISOString()
      });
    });

    // ==========================================
    // API - MOTORISTAS
    // ==========================================
    this.app.get('/api/motoristas', (req, res) => {
      const motoristas = this.getMotoristas();
      res.json(motoristas);
    });

    this.app.get('/api/motoristas/:id', (req, res) => {
      const motorista = this.getMotorista(req.params.id);
      if (motorista) {
        res.json(motorista);
      } else {
        res.status(404).json({ error: 'Motorista não encontrado' });
      }
    });

    this.app.post('/api/motoristas/:id/localizacao', (req, res) => {
      const { lat, lng, local } = req.body;
      this.atualizarLocalizacaoMotorista(req.params.id, lat, lng, local);
      
      // Notificar admins via WebSocket
      this.io.to('admins').emit('motorista:localizacao', {
        motoristaId: req.params.id,
        lat, lng, local,
        timestamp: Date.now()
      });
      
      res.json({ success: true });
    });

    // ==========================================
    // API - CORRIDAS
    // ==========================================
    this.app.get('/api/corridas', (req, res) => {
      const corridas = this.getCorridas();
      res.json(corridas);
    });

    this.app.get('/api/corridas/ativas', (req, res) => {
      const corridas = this.getCorridasAtivas();
      res.json(corridas);
    });

    this.app.post('/api/corridas', async (req, res) => {
      try {
        const corrida = await this.criarCorrida(req.body);
        res.json(corrida);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // ==========================================
    // API - CONFIGURAÇÕES (PAINEL ADM)
    // A Rebeca busca valores daqui
    // ==========================================
    this.app.get('/api/configuracoes', async (req, res) => {
      try {
        const { ConfiguracaoRepository } = require('./database');
        const configs = await ConfiguracaoRepository.buscarAgrupadas();
        res.json(configs);
      } catch (error) {
        console.error('❌ Erro ao buscar configurações:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/configuracoes/todas', async (req, res) => {
      try {
        const { ConfiguracaoRepository } = require('./database');
        const configs = await ConfiguracaoRepository.buscarTodas();
        res.json(configs);
      } catch (error) {
        console.error('❌ Erro ao buscar configurações:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/configuracoes/:chave', async (req, res) => {
      try {
        const { ConfiguracaoRepository } = require('./database');
        const valor = await ConfiguracaoRepository.buscar(req.params.chave);
        res.json({ chave: req.params.chave, valor });
      } catch (error) {
        console.error('❌ Erro ao buscar configuração:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/configuracoes', async (req, res) => {
      try {
        const { ConfiguracaoRepository } = require('./database');
        const { chave, valor, descricao } = req.body;
        
        if (!chave || valor === undefined) {
          return res.status(400).json({ error: 'Chave e valor são obrigatórios' });
        }
        
        const config = await ConfiguracaoRepository.salvar(chave, valor, descricao);
        console.log(`⚙️ Configuração alterada: ${chave} = ${valor}`);
        
        // Emitir evento para atualizar clientes conectados
        this.io?.emit('config:atualizada', { chave, valor });
        
        res.json(config);
      } catch (error) {
        console.error('❌ Erro ao salvar configuração:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.put('/api/configuracoes', async (req, res) => {
      try {
        const { ConfiguracaoRepository } = require('./database');
        const configs = req.body;
        
        if (!configs || typeof configs !== 'object') {
          return res.status(400).json({ error: 'Configurações inválidas' });
        }
        
        const resultados = await ConfiguracaoRepository.salvarVarias(configs);
        console.log(`⚙️ ${resultados.length} configurações atualizadas`);
        
        // Emitir evento para atualizar clientes conectados
        this.io?.emit('config:atualizadas', configs);
        
        res.json({ success: true, atualizados: resultados.length });
      } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Endpoint específico para valor da corrida
    this.app.get('/api/configuracoes/valor/corrida', async (req, res) => {
      try {
        const { ConfiguracaoRepository } = require('./database');
        const valor = await ConfiguracaoRepository.getValorCorrida();
        res.json({ valor });
      } catch (error) {
        console.error('❌ Erro ao buscar valor:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.put('/api/configuracoes/valor/corrida', async (req, res) => {
      try {
        const { ConfiguracaoRepository } = require('./database');
        const { valor } = req.body;
        
        if (!valor || isNaN(parseFloat(valor))) {
          return res.status(400).json({ error: 'Valor inválido' });
        }
        
        await ConfiguracaoRepository.salvar('valor_corrida', valor, 'Valor da corrida');
        console.log(`💰 Valor da corrida alterado para R$ ${valor}`);
        
        this.io?.emit('config:valor_corrida', { valor });
        
        res.json({ success: true, valor });
      } catch (error) {
        console.error('❌ Erro ao salvar valor:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ==========================================
    // API - ENVIAR MENSAGEM WHATSAPP
    // ==========================================
    this.app.post('/api/whatsapp/enviar', async (req, res) => {
      const { telefone, mensagem } = req.body;
      
      if (!this.whatsappClient?.estaConectado()) {
        return res.status(503).json({ error: 'WhatsApp não conectado' });
      }
      
      try {
        await this.whatsappClient.enviarMensagem(telefone, mensagem);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ==========================================
    // API - QR CODE
    // ==========================================
    this.app.get('/api/whatsapp/qrcode', (req, res) => {
      if (this.whatsappClient?.qrCode) {
        res.json({ qrcode: this.whatsappClient.qrCode });
      } else if (this.whatsappClient?.estaConectado()) {
        res.json({ connected: true });
      } else {
        res.json({ qrcode: null, connected: false });
      }
    });

    // ==========================================
    // ARQUIVOS ESTÁTICOS
    // ==========================================
    this.app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
    this.app.use('/motorista', express.static(path.join(__dirname, 'public/motorista')));
    this.app.use('/master', express.static(path.join(__dirname, 'public/master')));
    this.app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

    // ==========================================
    // API MASTER (SaaS)
    // ==========================================
    const { masterRoutes, adminRoutes, motoristaRoutes, authRoutes } = require('./api');
    this.app.use('/api/master', masterRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/motorista', motoristaRoutes);
    this.app.use('/api/auth', authRoutes);

    // ==========================================
    // API TELEFONIA (Twilio + OpenAI)
    // ==========================================
    const telefoneRoutes = require('./api/telefone');
    this.app.use('/api/telefone', telefoneRoutes);
    console.log('📞 Rotas de telefonia configuradas');

    // Rotas de páginas
    this.app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, 'public/admin/index.html'));
    });

    this.app.get('/admin/primeiro-acesso', (req, res) => {
      res.sendFile(path.join(__dirname, 'public/admin/primeiro-acesso.html'));
    });

    this.app.get('/motorista', (req, res) => {
      res.sendFile(path.join(__dirname, 'public/motorista/index.html'));
    });
    
    this.app.get('/motorista/primeiro-acesso', (req, res) => {
      res.sendFile(path.join(__dirname, 'public/motorista/primeiro-acesso.html'));
    });

    this.app.get('/master', (req, res) => {
      res.sendFile(path.join(__dirname, 'public/master/index.html'));
    });

    // ==========================================
    // RASTREAMENTO - Cliente acompanha corrida
    // ==========================================
    this.app.get('/rastrear/:id', (req, res) => {
      res.sendFile(path.join(__dirname, 'public/rastrear/index.html'));
    });

    // API de rastreamento (pública - cliente acessa sem login)
    this.app.get('/api/rastrear/:id', async (req, res) => {
      try {
        const corridaId = req.params.id;
        
        const result = await query(`
          SELECT 
            c.*,
            m.nome as motorista_nome,
            m.telefone as motorista_telefone,
            m.veiculo_modelo,
            m.veiculo_cor,
            m.veiculo_placa,
            m.latitude as motorista_latitude,
            m.longitude as motorista_longitude
          FROM corridas c
          LEFT JOIN motoristas m ON c.motorista_id = m.id
          WHERE c.id = $1
        `, [corridaId]);

        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Corrida não encontrada' });
        }

        const corrida = result.rows[0];

        // Calcular tempo estimado
        let tempoEstimado = null;
        if (corrida.motorista_latitude && corrida.motorista_longitude && 
            corrida.origem_latitude && corrida.origem_longitude) {
          const distancia = this.calcularDistancia(
            corrida.motorista_latitude, corrida.motorista_longitude,
            corrida.origem_latitude, corrida.origem_longitude
          );
          tempoEstimado = Math.ceil(distancia / 0.5); // 30km/h
          tempoEstimado = Math.max(1, Math.min(tempoEstimado, 60));
        }

        res.json({
          success: true,
          data: {
            corrida: {
              id: corrida.id,
              status: corrida.status,
              origem_endereco: corrida.origem_endereco,
              origem_latitude: corrida.origem_latitude,
              origem_longitude: corrida.origem_longitude,
              destino_endereco: corrida.destino_endereco,
              valor: corrida.valor,
              motivo_cancelamento: corrida.motivo_cancelamento,
            },
            motorista: corrida.motorista_id ? {
              nome: corrida.motorista_nome,
              telefone: corrida.motorista_telefone,
              veiculo_modelo: corrida.veiculo_modelo,
              veiculo_cor: corrida.veiculo_cor,
              veiculo_placa: corrida.veiculo_placa,
              latitude: corrida.motorista_latitude,
              longitude: corrida.motorista_longitude,
            } : null,
            tempo_estimado: tempoEstimado,
          }
        });

      } catch (error) {
        console.error('Erro rastreamento:', error);
        res.status(500).json({ success: false, error: 'Erro interno' });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString() 
      });
    });

    // Rota raiz
    this.app.get('/', (req, res) => {
      res.json({
        sistema: 'REBECA',
        versao: '1.0.0',
        status: 'online',
        endpoints: {
          admin: '/admin',
          motorista: '/motorista',
          api: '/api/status',
          webhook: '/webhook'
        }
      });
    });
  }

  /**
   * Calcula distância entre duas coordenadas (Haversine)
   */
  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Configura WebSocket
   */
  configurarWebSocket() {
    this.io = new SocketIO(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Exportar globalmente para uso no fluxo da Rebeca
    global.io = this.io;

    this.io.on('connection', (socket) => {
      console.log(`🔌 Cliente conectado: ${socket.id}`);

      // ==========================================
      // SALAS POR EMPRESA (MULTI-TENANT)
      // ==========================================
      
      // Entrar na sala de uma empresa específica (ADM)
      socket.on('entrar:empresa', (data) => {
        const { empresa_id } = data;
        socket.empresa_id = empresa_id;
        socket.join(`empresa_${empresa_id}`);
        socket.tipo = 'admin';
        console.log(`🏢 ADM entrou na empresa ${empresa_id}`);
      });
      
      // Entrar na sala MASTER (vê todas as empresas)
      socket.on('entrar:master', () => {
        socket.join('master');
        socket.tipo = 'master';
        console.log(`👑 MASTER conectado`);
      });

      // Autenticação do cliente
      // Admin entra na sala
      socket.on('admin:entrar', () => {
        socket.join('admins');
        socket.tipo = 'admin';
        console.log(`👨‍💼 Admin conectado: ${socket.id}`);
      });

      // Notificação de novo motorista criado
      socket.on('motorista:novo', (data) => {
        console.log(`👤 Novo motorista criado: ${data.nome}`);
        // Notificar admins da MESMA empresa
        if (data.empresa_id) {
          this.io.to(`empresa_${data.empresa_id}`).emit('motorista:criado', data);
        }
        // Notificar MASTER
        this.io.to('master').emit('motorista:criado', data);
      });

      socket.on('auth', (data) => {
        const { tipo, id, nome, empresa_id } = data;
        
        socket.tipo = tipo;
        socket.usuarioId = id;
        socket.usuarioNome = nome;
        socket.empresa_id = empresa_id;
        
        // Adicionar à sala apropriada
        if (tipo === 'motorista') {
          socket.join('motoristas');
          socket.join(`motorista_${id}`);
          if (empresa_id) {
            socket.join(`empresa_${empresa_id}`);
            socket.join(`empresa_${empresa_id}_motoristas`);
          }
          this.clientesConectados.set(`motorista_${id}`, socket);
          console.log(`🚗 Motorista conectado: ${nome} (empresa ${empresa_id})`);
        } else if (tipo === 'admin') {
          socket.join('admins');
          if (empresa_id) {
            socket.join(`empresa_${empresa_id}`);
          }
          this.clientesConectados.set(`admin_${id}`, socket);
          console.log(`👤 Admin conectado: ${nome} (empresa ${empresa_id})`);
        } else if (tipo === 'cliente') {
          socket.join('clientes');
          socket.join(`cliente_${id}`);
          this.clientesConectados.set(`cliente_${id}`, socket);
          console.log(`👥 Cliente conectado: ${nome}`);
        }
        
        socket.emit('auth:success', { message: 'Autenticado com sucesso' });
      });

      // ==========================================
      // EVENTOS DO MOTORISTA
      // ==========================================
      
      // Motorista atualiza localização
      socket.on('motorista:localizacao', (data) => {
        const { lat, lng, local, status, empresa_id } = data;
        const empId = empresa_id || socket.empresa_id;
        
        // Salvar no banco
        this.atualizarLocalizacaoMotorista(socket.usuarioId, lat, lng, local, status);
        
        const dadosEmitir = {
          motorista_id: socket.usuarioId,
          motoristaId: socket.usuarioId,
          motoristaNome: socket.usuarioNome,
          nome: socket.usuarioNome,
          empresa_id: empId,
          lat, lng, local, status,
          timestamp: Date.now()
        };
        
        // Notificar APENAS admins da MESMA empresa
        if (empId) {
          this.io.to(`empresa_${empId}`).emit('motorista:localizacao', dadosEmitir);
        }
        
        // Notificar MASTER (vê tudo)
        this.io.to('master').emit('motorista:localizacao', dadosEmitir);
      });

      // Motorista fica online/offline
      socket.on('motorista:status', (data) => {
        const { online, empresa_id } = data;
        const empId = empresa_id || socket.empresa_id;
        
        this.atualizarStatusMotorista(socket.usuarioId, online);
        
        const dadosEmitir = {
          motorista_id: socket.usuarioId,
          motoristaId: socket.usuarioId,
          motoristaNome: socket.usuarioNome,
          empresa_id: empId,
          status: online ? 'online' : 'offline',
          disponivel: online,
          online,
          timestamp: Date.now()
        };
        
        // Notificar APENAS admins da MESMA empresa
        if (empId) {
          this.io.to(`empresa_${empId}`).emit('motorista:status', dadosEmitir);
        }
        
        // Notificar MASTER
        this.io.to('master').emit('motorista:status', dadosEmitir);
      });

      // Motorista aceita corrida
      socket.on('motorista:aceitar_corrida', (data) => {
        const { corridaId } = data;
        
        this.aceitarCorrida(corridaId, socket.usuarioId);
        
        // Notificar cliente
        const corrida = this.getCorrida(corridaId);
        if (corrida) {
          this.io.to(`cliente_${corrida.clienteId}`).emit('corrida:aceita', {
            corridaId,
            motorista: {
              id: socket.usuarioId,
              nome: socket.usuarioNome
            }
          });
          
          // Notificar admins
          this.io.to('admins').emit('corrida:aceita', {
            corridaId,
            motoristaId: socket.usuarioId
          });
        }
      });

      // Motorista finaliza corrida
      socket.on('motorista:finalizar_corrida', (data) => {
        const { corridaId, valor } = data;
        
        this.finalizarCorrida(corridaId, valor);
        
        // Notificar cliente
        const corrida = this.getCorrida(corridaId);
        if (corrida) {
          this.io.to(`cliente_${corrida.clienteId}`).emit('corrida:finalizada', { valor });
          
          // Enviar WhatsApp para cliente
          if (this.whatsappClient?.estaConectado()) {
            this.whatsappClient.enviarMensagem(
              corrida.clienteTelefone,
              `✅ Corrida finalizada!\n\nValor: R$ ${valor.toFixed(2)}\n\nObrigada por usar a UBMAX! 🚗`
            );
          }
        }
        
        // Notificar admins
        this.io.to('admins').emit('corrida:finalizada', { corridaId, valor });
      });

      // ==========================================
      // CHAT DA FROTA
      // ==========================================
      
      socket.on('chat:mensagem', (data) => {
        const { tipo, mensagem, destinatarioId } = data;
        
        if (tipo === 'grupo') {
          // Mensagem para todos os motoristas
          this.io.to('motoristas').emit('chat:mensagem', {
            de: socket.usuarioNome,
            deId: socket.usuarioId,
            mensagem,
            timestamp: Date.now()
          });
        } else if (tipo === 'privado') {
          // Mensagem privada
          this.io.to(`motorista_${destinatarioId}`).emit('chat:mensagem_privada', {
            de: socket.usuarioNome,
            deId: socket.usuarioId,
            mensagem,
            timestamp: Date.now()
          });
        }
      });

      // ==========================================
      // DESCONEXÃO
      // ==========================================
      
      socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id} (${socket.usuarioNome || 'anônimo'})`);
        
        if (socket.tipo === 'motorista') {
          this.clientesConectados.delete(`motorista_${socket.usuarioId}`);
          
          // Notificar admins
          this.io.to('admins').emit('motorista:desconectado', {
            motoristaId: socket.usuarioId,
            motoristaNome: socket.usuarioNome
          });
        }
      });
    });

    console.log('🔌 WebSocket configurado!');
  }

  /**
   * Processa webhook da Evolution API
   */
  async processarWebhook(event) {
    const { event: eventType, data } = event;

    switch (eventType) {
      case 'MESSAGES_UPSERT':
        // Nova mensagem recebida
        if (data.messages && data.messages.length > 0) {
          for (const msg of data.messages) {
            if (!msg.key.fromMe) {
              const mensagemFormatada = this.formatarMensagemWebhook(msg);
              
              // Processar no fluxo de conversa
              if (this.fluxoConversa) {
                await this.fluxoConversa.processar(mensagemFormatada);
              }
              
              // Notificar admins
              this.io?.to('admins').emit('whatsapp:mensagem', mensagemFormatada);
            }
          }
        }
        break;

      case 'CONNECTION_UPDATE':
        console.log('📱 Status WhatsApp:', data.state);
        this.io?.to('admins').emit('whatsapp:status', { state: data.state });
        break;

      case 'QRCODE_UPDATED':
        console.log('🔲 QR Code atualizado');
        this.io?.to('admins').emit('whatsapp:qrcode', { qrcode: data.qrcode?.base64 });
        break;

      // ==========================================
      // LIGAÇÃO RECEBIDA - RECUSAR E RESPONDER
      // ==========================================
      case 'CALL':
      case 'call':
        await this.processarLigacao(data);
        break;
    }
  }

  /**
   * Processa ligação recebida no WhatsApp
   * Recusa automaticamente e envia mensagem
   */
  async processarLigacao(callData) {
    try {
      const telefone = callData.from?.replace('@s.whatsapp.net', '') || 
                       callData.remoteJid?.replace('@s.whatsapp.net', '') ||
                       callData.phone;
      const status = callData.status || callData.state;
      
      console.log(`📞 LIGAÇÃO RECEBIDA de ${telefone} - Status: ${status}`);
      
      // Só processa ligações recebidas (não as que nós fizemos)
      if (status === 'offer' || status === 'ringing' || status === 'incoming' || !status) {
        
        // Enviar mensagem automática via Evolution API
        const mensagem = `Olá! 👋

Vi que você me ligou, mas não consigo atender ligações. 📵

*Precisa de um veículo?* 🚗

Se sim, é só me responder com:
• Seu *endereço de origem* 📍
• E o *destino* onde quer ir 🏁

Vou encontrar um motorista disponível para você! 😊

_Rebeca - Assistente Virtual_`;

        // Enviar via Evolution API
        await this.enviarMensagemWhatsApp(telefone, mensagem);
        
        console.log(`✅ Mensagem automática enviada para ${telefone} após ligação`);
        
        // Notificar admins
        this.io?.to('admins').emit('whatsapp:ligacao', {
          telefone,
          timestamp: new Date().toISOString(),
          mensagemEnviada: true
        });
      }
    } catch (error) {
      console.error('❌ Erro ao processar ligação:', error.message);
    }
  }

  /**
   * Envia mensagem via Evolution API
   */
  async enviarMensagemWhatsApp(telefone, mensagem) {
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'rebeca';

    if (!evolutionUrl || !evolutionKey) {
      console.log('⚠️ Evolution API não configurada');
      return;
    }

    try {
      const fetch = require('node-fetch');
      await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionKey
        },
        body: JSON.stringify({
          number: telefone,
          text: mensagem
        })
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error.message);
    }
  }

  /**
   * Formata mensagem do webhook
   */
  formatarMensagemWebhook(msg) {
    const remoteJid = msg.key.remoteJid;
    const telefone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    
    return {
      id: msg.key.id,
      from: remoteJid,
      telefone: telefone,
      isGroup: remoteJid.includes('@g.us'),
      fromMe: msg.key.fromMe,
      timestamp: msg.messageTimestamp,
      body: msg.message?.conversation || 
            msg.message?.extendedTextMessage?.text || '',
      pushName: msg.pushName || 'Cliente',
      type: msg.message?.audioMessage ? 'audio' : 
            msg.message?.imageMessage ? 'image' : 'text'
    };
  }

  // ==========================================
  // MÉTODOS DE DADOS (substituir por banco real)
  // ==========================================
  
  motoristas = new Map();
  corridas = new Map();
  corridaIdCounter = 1000;

  getMotoristas() {
    return Array.from(this.motoristas.values());
  }

  getMotorista(id) {
    return this.motoristas.get(id);
  }

  atualizarLocalizacaoMotorista(id, lat, lng, local, status) {
    const motorista = this.motoristas.get(id) || { id };
    motorista.lat = lat;
    motorista.lng = lng;
    motorista.local = local;
    motorista.status = status;
    motorista.ultimaAtualizacao = Date.now();
    this.motoristas.set(id, motorista);
  }

  atualizarStatusMotorista(id, online) {
    const motorista = this.motoristas.get(id) || { id };
    motorista.online = online;
    motorista.status = online ? 'online' : 'offline';
    motorista.ultimaAtualizacao = Date.now();
    this.motoristas.set(id, motorista);
  }

  getCorridas() {
    return Array.from(this.corridas.values());
  }

  getCorridasAtivas() {
    return Array.from(this.corridas.values()).filter(c => 
      ['aguardando', 'aceita', 'em_andamento'].includes(c.status)
    );
  }

  getCorrida(id) {
    return this.corridas.get(id);
  }

  async criarCorrida(dados) {
    const corrida = {
      id: ++this.corridaIdCounter,
      ...dados,
      status: 'aguardando',
      criadaEm: Date.now()
    };
    this.corridas.set(corrida.id, corrida);
    
    // Notificar motoristas disponíveis
    this.io?.to('motoristas').emit('nova_corrida', corrida);
    
    return corrida;
  }

  aceitarCorrida(corridaId, motoristaId) {
    const corrida = this.corridas.get(corridaId);
    if (corrida) {
      corrida.motoristaId = motoristaId;
      corrida.status = 'aceita';
      corrida.aceitaEm = Date.now();
    }
  }

  finalizarCorrida(corridaId, valor) {
    const corrida = this.corridas.get(corridaId);
    if (corrida) {
      corrida.status = 'finalizada';
      corrida.valor = valor;
      corrida.finalizadaEm = Date.now();
    }
  }

  contarMotoristasOnline() {
    return Array.from(this.motoristas.values()).filter(m => m.online).length;
  }

  contarCorridasAtivas() {
    return this.getCorridasAtivas().length;
  }

  /**
   * Emitir evento para uma empresa específica
   * IMPORTANTE: Mantém isolamento de dados entre empresas
   */
  emitirParaEmpresa(empresa_id, evento, dados) {
    if (!this.io) return;
    
    // Adicionar empresa_id aos dados para garantir rastreabilidade
    const dadosComEmpresa = { ...dados, empresa_id };
    
    // Emitir APENAS para a sala da empresa
    this.io.to(`empresa_${empresa_id}`).emit(evento, dadosComEmpresa);
    
    // MASTER sempre recebe (para visão geral)
    this.io.to('master').emit(evento, dadosComEmpresa);
  }

  /**
   * Emitir evento de nova corrida
   */
  emitirNovaCorrida(corrida) {
    this.emitirParaEmpresa(corrida.empresa_id, 'corrida:nova', corrida);
  }

  /**
   * Emitir evento de corrida atualizada
   */
  emitirCorridaAtualizada(corrida) {
    this.emitirParaEmpresa(corrida.empresa_id, 'corrida:atualizada', corrida);
  }

  /**
   * Emitir alerta para uma empresa
   */
  emitirAlerta(empresa_id, alerta) {
    this.emitirParaEmpresa(empresa_id, 'alerta:novo', alerta);
  }

  /**
   * Emitir atualização de empresa (para MASTER)
   */
  emitirAtualizacaoEmpresa(empresa) {
    if (!this.io) return;
    this.io.to('master').emit('empresa:atualizada', empresa);
  }

  /**
   * Inicia o servidor
   */
  async iniciar() {
    this.configurarMiddlewares();
    this.configurarRotas();

    return new Promise((resolve) => {
      this.server = http.createServer(this.app);
      this.configurarWebSocket();
      
      this.server.listen(config.server.port, () => {
        console.log(`\n🌐 Servidor HTTP rodando na porta ${config.server.port}`);
        console.log(`📊 Painel Admin: http://localhost:${config.server.port}/admin`);
        console.log(`📊 Dashboard ADM: http://localhost:${config.server.port}/admin/dashboard-tempo-real.html`);
        console.log(`👑 Dashboard MASTER: http://localhost:${config.server.port}/master/dashboard-tempo-real.html`);
        console.log(`🚗 Painel Motorista: http://localhost:${config.server.port}/motorista`);
        console.log(`📡 Webhook: http://localhost:${config.server.port}/webhook`);
        console.log(`🔌 WebSocket: ws://localhost:${config.server.port}`);
        
        // Iniciar monitoramento de corridas (atrasos, reatribuições)
        this.iniciarMonitoramentoCorridas();
        
        resolve();
      });
    });
  }

  /**
   * Inicia monitoramento de corridas
   */
  iniciarMonitoramentoCorridas() {
    try {
      const { MonitoramentoCorridas } = require('./services');
      this.monitoramento = new MonitoramentoCorridas(this.whatsappClient, null);
      this.monitoramento.iniciar();
      console.log('👁️ Monitoramento de atrasos ativado');
    } catch (error) {
      console.log('⚠️ Monitoramento de corridas não iniciado:', error.message);
    }
  }

  /**
   * Para o servidor
   */
  async parar() {
    // Parar monitoramento de corridas
    if (this.monitoramento) {
      this.monitoramento.parar();
    }
    
    if (this.io) {
      this.io.close();
    }
    if (this.server) {
      this.server.close();
      console.log('🛑 Servidor HTTP parado');
    }
  }
}

module.exports = Server;
