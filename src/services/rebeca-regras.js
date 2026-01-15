// ========================================
// REBECA - REGRAS DE COMUNICAÇÃO
// ========================================
// 
// REGRA PRINCIPAL: Cliente ↔ Rebeca ↔ Motorista
// Cliente e Motorista NUNCA falam diretamente!
//
// ========================================

const REGRAS = {
  // Hierarquia do sistema
  HIERARQUIA: {
    MASTER: 'master',      // Dono do SaaS (você)
    ADM: 'adm',            // Dono da frota (cliente do SaaS)
    MOTORISTA: 'motorista', // Trabalha para o ADM
    REBECA: 'rebeca',      // IA intermediária
    CLIENTE: 'cliente'     // Passageiro
  },

  // Fluxo de comunicação
  COMUNICACAO: {
    // Cliente SEMPRE fala com Rebeca
    CLIENTE_PARA_REBECA: true,
    REBECA_PARA_CLIENTE: true,
    
    // Motorista SEMPRE fala com Rebeca
    MOTORISTA_PARA_REBECA: true,
    REBECA_PARA_MOTORISTA: true,
    
    // PROIBIDO: Comunicação direta
    CLIENTE_PARA_MOTORISTA: false,
    MOTORISTA_PARA_CLIENTE: false
  },

  // Privacidade de dados
  PRIVACIDADE: {
    // Cliente NÃO vê
    CLIENTE_NAO_VE: [
      'telefone_motorista',
      'endereco_motorista',
      'cpf_motorista',
      'dados_financeiros_motorista'
    ],
    
    // Motorista NÃO vê
    MOTORISTA_NAO_VE: [
      'telefone_cliente', // Usa CVS para ligar
      'historico_cliente',
      'dados_pessoais_cliente'
    ],
    
    // O que cada um pode ver
    CLIENTE_VE: [
      'nome_motorista',      // Apenas primeiro nome
      'veiculo_modelo',
      'veiculo_cor',
      'veiculo_placa',
      'foto_motorista',
      'avaliacao_motorista',
      'tempo_estimado',
      'valor_corrida'        // SÓ quando perguntar - busca do painel ADM
    ],
    
    MOTORISTA_VE: [
      'nome_cliente',        // Apenas primeiro nome
      'endereco_origem',
      'endereco_destino',
      'valor_corrida',
      'observacoes_corrida'
    ]
  }
};

// ========================================
// FUNÇÕES DE SEGURANÇA
// ========================================

/**
 * Mascara telefone para exibição
 * 14999991234 -> (14) 9****-1234
 */
function mascararTelefone(telefone) {
  if (!telefone) return null;
  const nums = telefone.replace(/\D/g, '');
  if (nums.length < 10) return '****';
  return `(${nums.slice(0,2)}) 9****-${nums.slice(-4)}`;
}

/**
 * Extrai apenas primeiro nome
 * "João Carlos Silva" -> "João"
 */
function primeiroNome(nomeCompleto) {
  if (!nomeCompleto) return 'Cliente';
  return nomeCompleto.split(' ')[0];
}

/**
 * Filtra dados do motorista para o cliente
 */
function dadosMotoristParaCliente(motorista) {
  return {
    nome: primeiroNome(motorista.nome),
    veiculo: motorista.veiculo_modelo,
    cor: motorista.veiculo_cor,
    placa: motorista.veiculo_placa,
    avaliacao: motorista.avaliacao || 5.0
    // SEM telefone, CPF, endereço
  };
}

/**
 * Filtra dados do cliente para o motorista
 */
function dadosClienteParaMotorista(cliente, corrida) {
  return {
    nome: primeiroNome(cliente.nome),
    origem: corrida.origem_endereco,
    destino: corrida.destino_endereco,
    valor: corrida.valor,
    observacoes: corrida.observacoes
    // SEM telefone, histórico
  };
}

/**
 * Verifica se comunicação é permitida
 */
function comunicacaoPermitida(de, para) {
  // Tudo passa pela Rebeca
  if (de === 'rebeca' || para === 'rebeca') {
    return true;
  }
  
  // ADM pode falar com motorista
  if ((de === 'adm' && para === 'motorista') || 
      (de === 'motorista' && para === 'adm')) {
    return true;
  }
  
  // Cliente e Motorista NÃO podem se comunicar diretamente
  if ((de === 'cliente' && para === 'motorista') ||
      (de === 'motorista' && para === 'cliente')) {
    return false;
  }
  
  return true;
}

// ========================================
// MENSAGENS DA REBECA
// ========================================

const MENSAGENS_REBECA = {
  // Para o CLIENTE
  CLIENTE: {
    SAUDACAO: (nome) => `Oi${nome ? ', ' + primeiroNome(nome) : ''}! Tudo bem? 👋`,
    
    CONFIRMAR_ORIGEM: (endereco) => `📍 Confirma que você está em:\n*${endereco}*\n\nDigite *SIM* para confirmar ou envie o endereço correto.`,
    
    PEDIR_DESTINO: () => `🏁 Para onde você vai?\n\nEnvie o endereço de destino.`,
    
    // NOVO: Quando cliente envia apenas ponto de referência
    PEDIR_ENDERECO_REFERENCIA: (referencia) => `Entendi que você está ${referencia ? 'no ' + referencia : 'nesse local'}! Pra te achar certinho, pode me mandar o endereço completo ou a localização?`,
    
    // NOVO: Quando cliente não informa destino
    SEM_DESTINO_OK: () => `Vi que não informou o destino, mas estou enviando o veículo. Pode informar ao motorista quando ele chegar.`,
    
    MOTORISTA_ENCONTRADO: (motorista, tempo, linkRastreamento) => 
      `✅ Motorista a caminho!\n\n` +
      `👤 *${primeiroNome(motorista.nome)}*\n` +
      `🚗 ${motorista.veiculo_modelo} ${motorista.veiculo_cor}\n` +
      `🔢 Placa: ${motorista.veiculo_placa}\n` +
      `⏱️ Tempo estimado: ${tempo} min\n\n` +
      `📍 *Acompanhe em tempo real:*\n${linkRastreamento}\n\n` +
      `Aguarde no local! 🙌`,
    
    MOTORISTA_CHEGOU: (motorista) => 
      `🚗 *Seu motorista CHEGOU!*\n\n` +
      `👤 ${primeiroNome(motorista.nome)}\n` +
      `🚗 ${motorista.veiculo_modelo} ${motorista.veiculo_cor}\n` +
      `🔢 Placa: ${motorista.veiculo_placa}\n\n` +
      `Ele está te aguardando no local de embarque.`,
    
    // ATUALIZADO: Mensagem final personalizada - SEM VALOR (motorista já confirmou)
    CORRIDA_FINALIZADA: (msgPersonalizada) => {
      const msgFinal = msgPersonalizada || 'Obrigado por usar nossos serviços!';
      return `✅ Corrida finalizada!\n\n${msgFinal} ⭐`;
    },
    
    // ATUALIZADO: Nenhum motorista disponível
    NENHUM_MOTORISTA: () => `😔 No momento não temos motoristas disponíveis.\n\nTente novamente em alguns minutos.`,
    
    // NOVO: Todos ocupados com estimativa de tempo
    TODOS_OCUPADOS: (minutos, nomeMotorista) => {
      if (minutos && nomeMotorista) {
        return `🚗 Todos os veículos estão ocupados no momento.\n\nO próximo ficará disponível em aproximadamente *${minutos} minutos*.\n\nDeseja aguardar?`;
      }
      return `🚗 Todos os veículos estão ocupados no momento.\n\nTente novamente em alguns minutos.`;
    },
    
    LIGAR_MOTORISTA: () => `📞 Para falar com o motorista, use nossa Central de Atendimento.\n\nSua privacidade é garantida!`,
    
    // ======= AGENDAMENTO =======
    AGENDAMENTO_PEDIR_DATA: () => `📅 Claro! Para quando você quer agendar a corrida?\n\nMe passa a data e o horário.\nExemplo: "amanhã às 8h" ou "dia 15 às 14h"`,
    
    AGENDAMENTO_PEDIR_ENDERECO: () => `Perfeito! Agora me passa o endereço de partida ou a localização.`,
    
    AGENDAMENTO_CONFIRMADO: (data, hora, endereco) => 
      `✅ *Corrida agendada!*\n\n` +
      `📅 Data: ${data}\n` +
      `🕐 Horário: ${hora}\n` +
      `📍 Local: ${endereco}\n\n` +
      `Você receberá uma notificação 30 minutos antes.\n` +
      `Se precisar cancelar, é só me avisar.`,
    
    AGENDAMENTO_LEMBRETE: (hora, endereco) => 
      `⏰ *Lembrete de corrida agendada!*\n\n` +
      `Sua corrida está marcada para daqui a 30 minutos.\n\n` +
      `🕐 Horário: ${hora}\n` +
      `📍 Local: ${endereco}\n\n` +
      `Está tudo certo?`,
    
    // ======= HISTÓRICO =======
    HISTORICO_VAZIO: () => `Você ainda não fez nenhuma corrida conosco. 🚗`,
    
    HISTORICO_CORRIDAS: (corridas, total, valorTotal) => {
      let lista = corridas.map((c, i) => {
        const data = new Date(c.criado_em).toLocaleDateString('pt-BR');
        return `${i + 1}. ${data} - R$ ${c.valor?.toFixed(2) || '---'}\n   ${c.origem_endereco?.substring(0, 30) || 'Origem'}...`;
      }).join('\n\n');
      
      return `📋 *Suas últimas corridas:*\n\n${lista}\n\n` +
             `━━━━━━━━━━━━━━━\n` +
             `📊 Total: ${total} corridas\n` +
             `💰 Valor total: R$ ${valorTotal.toFixed(2)}`;
    }
  },
  
  // Para o MOTORISTA
  MOTORISTA: {
    NOVA_CORRIDA: (corrida) => 
      `🚗 *NOVA CORRIDA!*\n\n` +
      `👤 Cliente: ${primeiroNome(corrida.cliente_nome)}\n` +
      `📍 Origem: ${corrida.origem_endereco}\n` +
      `🏁 Destino: ${corrida.destino_endereco || 'A combinar'}\n` +
      `💰 Valor: R$ ${corrida.valor?.toFixed(2) || '---'}\n\n` +
      `Responda *ACEITAR* ou *RECUSAR*`,
    
    CORRIDA_ACEITA: () => `✅ Corrida aceita! Dirija-se ao local de embarque.`,
    
    CLIENTE_AGUARDANDO: (endereco) => `⚠️ Cliente aguardando em:\n${endereco}\n\nNão se atrase!`,
    
    LIGAR_CLIENTE: () => `📞 Use a Central de Atendimento no app para falar com o cliente.\n\nSeu número não será exposto.`,
    
    // NOVO: Corrida sem destino
    CORRIDA_SEM_DESTINO: () => `ℹ️ O cliente não informou o destino. Pergunte quando chegar no local.`
  },
  
  // Para o ADM (Dono da Frota)
  ADM: {
    CORRIDA_SOLICITADA: (corrida) =>
      `📥 *NOVA CORRIDA SOLICITADA*\n\n` +
      `👤 Cliente: ${primeiroNome(corrida.cliente_nome)}\n` +
      `📍 ${corrida.origem_endereco}\n` +
      `🏁 ${corrida.destino_endereco || 'Destino não informado'}\n\n` +
      `Buscando motorista...`,
    
    CORRIDA_ACEITA: (motorista, corrida) =>
      `✅ *CORRIDA ACEITA*\n\n` +
      `🚗 Motorista: ${motorista.nome}\n` +
      `👤 Cliente: ${primeiroNome(corrida.cliente_nome)}\n` +
      `💰 Valor: R$ ${corrida.valor?.toFixed(2)}`,
    
    CORRIDA_FINALIZADA: (corrida, motorista) =>
      `✅ *CORRIDA FINALIZADA*\n\n` +
      `🚗 ${motorista.nome}\n` +
      `💰 R$ ${corrida.valor?.toFixed(2)}\n` +
      `⏱️ Duração: ${corrida.duracao || '--'} min`,
    
    ALERTA_ATRASO: (motorista, minutos) =>
      `⏰ *ALERTA DE ATRASO*\n\n` +
      `🚗 ${motorista.nome}\n` +
      `⚠️ ${minutos} min de atraso\n\n` +
      `Sistema monitorando...`,
    
    ALERTA_FRAUDE: (tipo, motorista, score) =>
      `🚨 *ALERTA ANTI-FRAUDE*\n\n` +
      `Tipo: ${tipo}\n` +
      `Motorista: ${motorista.nome}\n` +
      `Score: ${score}/100\n\n` +
      `Verifique no painel.`,
    
    MANUTENCAO_PROGRAMADA: (motorista, manutencao) =>
      `🔧 *MANUTENÇÃO PROGRAMADA*\n\n` +
      `👤 Motorista: ${motorista.nome}\n` +
      `🚗 Veículo: ${motorista.veiculo}\n\n` +
      `📋 Tipo: ${manutencao.tipo}\n` +
      `🏢 Empresa: ${manutencao.empresa}\n` +
      `💰 Valor: R$ ${manutencao.valor?.toFixed(2)}\n` +
      `📅 Data: ${manutencao.data}\n` +
      `⏱️ Duração: ${manutencao.dias} dia(s)\n\n` +
      `${manutencao.iniciarAgora ? '⚠️ Motorista OFFLINE' : '📌 Agendado'}\n\n` +
      `_Sistema REBECA_`,
    
    AVARIA_REGISTRADA: (motorista, avaria) =>
      `⚠️ *AVARIA REGISTRADA*\n\n` +
      `👤 Motorista: ${motorista.nome}\n` +
      `🚗 Veículo: ${motorista.veiculo}\n\n` +
      `🔴 Tipo: ${avaria.tipo}\n` +
      `📍 Local: ${avaria.local}\n` +
      `⚡ Gravidade: ${avaria.gravidade}\n\n` +
      `📝 ${avaria.descricao}\n\n` +
      `${avaria.impedeTrabalho ? '🚫 MOTORISTA OFFLINE' : '✅ Continua disponível'}\n\n` +
      `_Sistema REBECA_`
  }
};

// ========================================
// REGRAS DE ATRIBUIÇÃO (ATUALIZADAS)
// ========================================

const REGRAS_ATRIBUICAO = {
  // Motorista disponível para corrida?
  motoristaDisponivel: (motorista) => {
    return motorista.status === 'online' &&
           motorista.disponivel === true &&
           motorista.ativo === true &&
           motorista.em_manutencao === false &&
           motorista.bloqueado !== true &&
           motorista.fora_cidade !== true &&
           motorista.bloqueado_inadimplencia !== true; // NOVO: Verificar inadimplência
  },
  
  // PRIORIDADE DE ATRIBUIÇÃO (NOVA)
  // 1. Geolocalização - mais próximo
  // 2. Melhor avaliação
  // 3. Sem alertas antifraude
  // 4. Maior experiência (mais corridas)
  PRIORIDADE: [
    'GEOLOCALIZACAO',   // Mais próximo primeiro
    'AVALIACAO',        // Melhor avaliação
    'ANTIFRAUDE',       // Sem alertas graves
    'EXPERIENCIA'       // Mais corridas realizadas
  ],
  
  // Verificar se motorista pode pegar corrida
  // SÓ pega se finalizou a anterior
  podePegarCorrida: (motorista, corridasAtivas) => {
    return corridasAtivas === 0;
  },
  
  // Tolerância de atraso
  TOLERANCIA_ATRASO: {
    AVISO: 2,        // 2 min - enviar aviso
    CANCELAR: 5      // 5 min - cancelar e reatribuir
  },
  
  // Configurações de busca
  CONFIG_BUSCA: {
    RAIO_PADRAO_KM: 10,
    MAX_MOTORISTAS_BUSCA: 10,
    TEMPO_TIMEOUT_SEG: 30
  }
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Gera link de rastreamento para o cliente
 * @param {string} baseUrl - URL base do sistema
 * @param {number} corridaId - ID da corrida
 * @returns {string} - Link completo de rastreamento
 */
function gerarLinkRastreamento(baseUrl, corridaId) {
  // Remove trailing slash
  const url = baseUrl.replace(/\/$/, '');
  return `${url}/rastrear?id=${corridaId}`;
}

/**
 * Verifica se motorista está bloqueado por inadimplência
 */
function motoristaBloqueadoInadimplencia(motorista) {
  return motorista.bloqueado_inadimplencia === true;
}

// ========================================
// EXPORTAR
// ========================================

module.exports = {
  REGRAS,
  MENSAGENS_REBECA,
  REGRAS_ATRIBUICAO,
  mascararTelefone,
  primeiroNome,
  dadosMotoristParaCliente,
  dadosClienteParaMotorista,
  comunicacaoPermitida,
  gerarLinkRastreamento,
  motoristaBloqueadoInadimplencia
};
