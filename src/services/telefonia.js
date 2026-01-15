// ========================================
// REBECA - ATENDIMENTO TELEFÔNICO COM IA
// Twilio + OpenAI Whisper + TTS
// INTEGRADO COM SISTEMA DE CORRIDAS
// ========================================

const twilio = require('twilio');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Importar serviços do sistema (mesmo do WhatsApp)
const AtribuicaoService = require('./atribuicao');
const GeocodingService = require('./geocoding');
const { CorridaRepository, ClienteRepository, MotoristaRepository } = require('../database/repositories');

// Configurações
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Clientes
const twilioClient = TWILIO_ACCOUNT_SID ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// VoiceResponse para gerar TwiML
const VoiceResponse = twilio.twiml.VoiceResponse;

// Contexto das ligações (memória da conversa)
const contextoLigacoes = new Map();

const TelefoniaService = {

  // ========================================
  // TRANSCREVER ÁUDIO (Whisper)
  // ========================================
  async transcreverAudio(audioPath) {
    try {
      console.log('🎤 Transcrevendo áudio com Whisper...');
      
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        language: 'pt'
      });

      console.log(`📝 Transcrição: "${transcription.text}"`);
      return transcription.text;
    } catch (error) {
      console.error('❌ Erro ao transcrever:', error);
      return null;
    }
  },

  // ========================================
  // GERAR VOZ (OpenAI TTS) - Opcional
  // ========================================
  async gerarVoz(texto, outputPath) {
    try {
      console.log('🔊 Gerando voz com OpenAI TTS...');
      
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: texto,
        speed: 1.0
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(outputPath, buffer);
      
      console.log(`✅ Áudio gerado: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('❌ Erro ao gerar voz:', error);
      return null;
    }
  },

  // ========================================
  // PROCESSAR COM REBECA (GPT-4)
  // Mesmo comportamento do WhatsApp
  // ========================================
  async processarComRebeca(mensagem, contexto = {}) {
    try {
      const systemPrompt = `Você é a Rebeca, atendente virtual da frota ${process.env.NOME_FROTA || 'UBMAX'}.
Você está atendendo uma LIGAÇÃO TELEFÔNICA.

REGRAS IMPORTANTES:
- Seja BREVE e DIRETA (máximo 2-3 frases)
- Use linguagem FALADA, não escrita
- Não use emojis
- Fale de forma natural como uma atendente real

FLUXO DE ATENDIMENTO:
1. Se cliente quer corrida: pergunte "Qual o endereço de partida?"
2. Se deu endereço de origem: pergunte "E qual o destino?"
3. Se deu destino: diga "Vou verificar o motorista mais próximo, um momento"
4. Após buscar motorista: "Encontrei motorista a X minutos. Posso confirmar?"
5. Se confirmou: "Corrida confirmada! Motorista a caminho."

CONTEXTO ATUAL:
Etapa: ${contexto.etapa || 'inicio'}
Origem: ${contexto.origem_endereco || 'não informada'}
Destino: ${contexto.destino_endereco || 'não informado'}
Motorista: ${contexto.motorista_nome || 'não buscado'}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mensagem }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const resposta = response.choices[0].message.content;
      console.log(`🤖 Rebeca: "${resposta}"`);
      return resposta;
    } catch (error) {
      console.error('❌ Erro no GPT-4:', error);
      return 'Desculpe, tive um problema. Pode repetir?';
    }
  },

  // ========================================
  // ANALISAR INTENÇÃO DO CLIENTE
  // ========================================
  async analisarIntencao(texto, contexto) {
    const textoLower = texto.toLowerCase();
    
    // Detectar confirmação
    if (textoLower.match(/sim|pode|confirma|manda|quero|ok|isso|certo|beleza/)) {
      return 'confirmar';
    }
    
    // Detectar negação
    if (textoLower.match(/não|nao|cancela|deixa|desisto/)) {
      return 'cancelar';
    }
    
    // Detectar endereço (se tem número ou palavras-chave)
    if (textoLower.match(/rua|avenida|av\.|travessa|praça|numero|nº|\d{2,}/)) {
      return 'endereco';
    }
    
    // Detectar pedido de corrida
    if (textoLower.match(/carro|corrida|uber|taxi|transporte|preciso ir|quero ir|me leva/)) {
      return 'solicitar_corrida';
    }
    
    return 'outro';
  },

  // ========================================
  // PROCESSAR FLUXO DE CORRIDA
  // Mesmo fluxo do WhatsApp
  // ========================================
  async processarFluxoCorrida(texto, contexto) {
    const intencao = await this.analisarIntencao(texto, contexto);
    
    console.log(`📍 Etapa: ${contexto.etapa}, Intenção: ${intencao}`);
    
    // ETAPA: INÍCIO
    if (contexto.etapa === 'inicio') {
      if (intencao === 'solicitar_corrida' || intencao === 'endereco') {
        contexto.etapa = 'aguardando_origem';
        
        // Se já veio com endereço
        if (intencao === 'endereco') {
          return await this.processarOrigem(texto, contexto);
        }
        
        return {
          resposta: 'Claro! Qual o endereço de partida?',
          contexto
        };
      }
      
      return {
        resposta: await this.processarComRebeca(texto, contexto),
        contexto
      };
    }
    
    // ETAPA: AGUARDANDO ORIGEM
    if (contexto.etapa === 'aguardando_origem') {
      return await this.processarOrigem(texto, contexto);
    }
    
    // ETAPA: AGUARDANDO DESTINO
    if (contexto.etapa === 'aguardando_destino') {
      return await this.processarDestino(texto, contexto);
    }
    
    // ETAPA: AGUARDANDO CONFIRMAÇÃO
    if (contexto.etapa === 'aguardando_confirmacao') {
      if (intencao === 'confirmar') {
        return await this.confirmarCorrida(contexto);
      }
      if (intencao === 'cancelar') {
        contexto.etapa = 'inicio';
        return {
          resposta: 'Tudo bem, cancelado. Posso ajudar com mais alguma coisa?',
          contexto
        };
      }
      
      return {
        resposta: 'Desculpe, não entendi. Posso confirmar a corrida?',
        contexto
      };
    }
    
    // Default
    return {
      resposta: await this.processarComRebeca(texto, contexto),
      contexto
    };
  },

  // ========================================
  // PROCESSAR ENDEREÇO DE ORIGEM
  // ========================================
  async processarOrigem(texto, contexto) {
    console.log('📍 Processando origem:', texto);
    
    // Geocoding - converter endereço em coordenadas
    const coords = await GeocodingService.geocode(texto);
    
    if (!coords) {
      return {
        resposta: 'Não encontrei esse endereço. Pode repetir com mais detalhes?',
        contexto
      };
    }
    
    contexto.origem_endereco = texto;
    contexto.origem_latitude = coords.latitude;
    contexto.origem_longitude = coords.longitude;
    contexto.etapa = 'aguardando_destino';
    
    return {
      resposta: `Certo, partindo de ${texto}. E qual o destino?`,
      contexto
    };
  },

  // ========================================
  // PROCESSAR ENDEREÇO DE DESTINO
  // ========================================
  async processarDestino(texto, contexto) {
    console.log('📍 Processando destino:', texto);
    
    // Geocoding
    const coords = await GeocodingService.geocode(texto);
    
    if (!coords) {
      return {
        resposta: 'Não encontrei esse endereço de destino. Pode repetir?',
        contexto
      };
    }
    
    contexto.destino_endereco = texto;
    contexto.destino_latitude = coords.latitude;
    contexto.destino_longitude = coords.longitude;
    
    // BUSCAR MOTORISTA MAIS PRÓXIMO (mesmo do WhatsApp)
    const motorista = await AtribuicaoService.buscarMotoristaProximo(
      contexto.origem_latitude,
      contexto.origem_longitude
    );
    
    if (!motorista) {
      contexto.etapa = 'inicio';
      return {
        resposta: 'Poxa, não tem motorista disponível agora. Tenta de novo em alguns minutos?',
        contexto
      };
    }
    
    // Salvar dados do motorista
    contexto.motorista_id = motorista.id;
    contexto.motorista_nome = motorista.nome;
    contexto.motorista_veiculo = motorista.veiculo_modelo;
    contexto.motorista_cor = motorista.veiculo_cor;
    contexto.motorista_placa = motorista.veiculo_placa;
    contexto.tempo_estimado = motorista.tempo_estimado_min || 5;
    contexto.etapa = 'aguardando_confirmacao';
    
    return {
      resposta: `Encontrei um motorista a ${contexto.tempo_estimado} minutos de você. Posso confirmar a corrida?`,
      contexto
    };
  },

  // ========================================
  // CONFIRMAR CORRIDA
  // Cria no banco igual WhatsApp
  // ========================================
  async confirmarCorrida(contexto) {
    console.log('✅ Confirmando corrida por telefone...');
    
    try {
      // Criar ou buscar cliente pelo telefone
      let cliente = await ClienteRepository.buscarPorTelefone(contexto.telefone);
      if (!cliente) {
        cliente = await ClienteRepository.criar({
          telefone: contexto.telefone,
          nome: 'Cliente Telefone'
        });
      }
      
      // Criar corrida no banco (IGUAL WhatsApp)
      const corrida = await CorridaRepository.criar({
        cliente_id: cliente.id,
        motorista_id: contexto.motorista_id,
        origem_endereco: contexto.origem_endereco,
        origem_latitude: contexto.origem_latitude,
        origem_longitude: contexto.origem_longitude,
        destino_endereco: contexto.destino_endereco,
        destino_latitude: contexto.destino_latitude,
        destino_longitude: contexto.destino_longitude,
        valor: parseFloat(process.env.VALOR_CORRIDA_FIXA) || 13.00,
        status: 'aceita',
        origem: 'telefone'
      });
      
      // Marcar motorista em corrida
      await MotoristaRepository.iniciarCorrida(contexto.motorista_id);
      
      // TODO: Notificar motorista via WebSocket (igual WhatsApp)
      // io.to(`motorista_${contexto.motorista_id}`).emit('nova-corrida', {...});
      
      console.log(`✅ Corrida #${corrida.id} criada por telefone!`);
      
      contexto.corrida_id = corrida.id;
      contexto.etapa = 'corrida_confirmada';
      
      return {
        resposta: `Corrida confirmada! ${contexto.motorista_nome} está a caminho com um ${contexto.motorista_veiculo} ${contexto.motorista_cor}, placa ${contexto.motorista_placa}. Aguarde no local!`,
        contexto
      };
    } catch (error) {
      console.error('❌ Erro ao criar corrida:', error);
      return {
        resposta: 'Desculpe, tive um problema ao confirmar. Pode tentar novamente?',
        contexto
      };
    }
  },

  // ========================================
  // WEBHOOK: RECEBER LIGAÇÃO
  // ========================================
  gerarRespostaInicial(callSid, telefone) {
    const twiml = new VoiceResponse();
    
    // Inicializar contexto
    contextoLigacoes.set(callSid, {
      telefone: telefone,
      inicio: new Date(),
      etapa: 'inicio',
      origem_endereco: null,
      destino_endereco: null,
      motorista_id: null
    });
    
    // Mensagem de boas-vindas
    twiml.say({
      voice: 'Polly.Camila',
      language: 'pt-BR'
    }, `Olá! Aqui é a Rebeca da ${process.env.NOME_FROTA || 'UBMAX'}. Como posso ajudar?`);

    // Gravar resposta do cliente
    twiml.record({
      action: '/api/telefone/processar',
      method: 'POST',
      maxLength: 30,
      timeout: 3,
      playBeep: false
    });

    // Se não falar nada
    twiml.say({
      voice: 'Polly.Camila',
      language: 'pt-BR'
    }, 'Não consegui ouvir. Pode repetir?');

    return twiml.toString();
  },

  // ========================================
  // WEBHOOK: PROCESSAR GRAVAÇÃO
  // ========================================
  async processarGravacao(recordingUrl, callSid) {
    const twiml = new VoiceResponse();

    try {
      // Recuperar contexto
      let contexto = contextoLigacoes.get(callSid) || { etapa: 'inicio' };
      
      // 1. Baixar áudio da gravação
      const audioPath = `/tmp/recording_${callSid}.wav`;
      await this.baixarAudio(recordingUrl, audioPath);

      // 2. Transcrever com Whisper
      const textoCliente = await this.transcreverAudio(audioPath);
      
      if (!textoCliente) {
        twiml.say({
          voice: 'Polly.Camila',
          language: 'pt-BR'
        }, 'Desculpe, não consegui entender. Pode repetir?');
        
        twiml.record({
          action: '/api/telefone/processar',
          method: 'POST',
          maxLength: 30,
          timeout: 3
        });
        
        return twiml.toString();
      }

      // 3. Processar fluxo de corrida (INTEGRADO)
      const resultado = await this.processarFluxoCorrida(textoCliente, contexto);
      
      // Atualizar contexto
      contextoLigacoes.set(callSid, resultado.contexto);

      // 4. Responder com Polly
      twiml.say({
        voice: 'Polly.Camila',
        language: 'pt-BR'
      }, resultado.resposta);

      // 5. Se corrida confirmada, encerrar
      if (resultado.contexto.etapa === 'corrida_confirmada') {
        twiml.say({
          voice: 'Polly.Camila',
          language: 'pt-BR'
        }, 'Obrigada por ligar! Tenha uma ótima viagem!');
        twiml.hangup();
      } else {
        // Continuar gravando
        twiml.record({
          action: '/api/telefone/processar',
          method: 'POST',
          maxLength: 30,
          timeout: 3
        });
      }

      // Limpar arquivo temporário
      fs.unlink(audioPath, () => {});

    } catch (error) {
      console.error('❌ Erro ao processar gravação:', error);
      twiml.say({
        voice: 'Polly.Camila',
        language: 'pt-BR'
      }, 'Desculpe, tive um problema técnico. Tente novamente.');
      twiml.hangup();
    }

    return twiml.toString();
  },

  // ========================================
  // BAIXAR ÁUDIO DO TWILIO
  // ========================================
  async baixarAudio(url, outputPath) {
    const axios = require('axios');
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      auth: {
        username: TWILIO_ACCOUNT_SID,
        password: TWILIO_AUTH_TOKEN
      }
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  },

  // ========================================
  // FAZER LIGAÇÃO (outbound)
  // ========================================
  async fazerLigacao(numeroDestino, mensagem) {
    if (!twilioClient) {
      console.log('⚠️ Twilio não configurado');
      return null;
    }
    
    try {
      const call = await twilioClient.calls.create({
        to: numeroDestino,
        from: TWILIO_PHONE_NUMBER,
        twiml: `<Response>
          <Say voice="Polly.Camila" language="pt-BR">${mensagem}</Say>
        </Response>`
      });

      console.log(`📞 Ligação iniciada: ${call.sid}`);
      return call;
    } catch (error) {
      console.error('❌ Erro ao fazer ligação:', error);
      return null;
    }
  },

  // ========================================
  // ENVIAR SMS
  // ========================================
  async enviarSMS(numeroDestino, mensagem) {
    if (!twilioClient) {
      console.log('⚠️ Twilio não configurado');
      return null;
    }
    
    try {
      const message = await twilioClient.messages.create({
        to: numeroDestino,
        from: TWILIO_PHONE_NUMBER,
        body: mensagem
      });

      console.log(`📱 SMS enviado: ${message.sid}`);
      return message;
    } catch (error) {
      console.error('❌ Erro ao enviar SMS:', error);
      return null;
    }
  },

  // ========================================
  // OBTER CONTEXTO DA LIGAÇÃO
  // ========================================
  getContexto(callSid) {
    return contextoLigacoes.get(callSid);
  },

  // ========================================
  // LIMPAR CONTEXTO
  // ========================================
  limparContexto(callSid) {
    contextoLigacoes.delete(callSid);
  }
};

module.exports = TelefoniaService;
