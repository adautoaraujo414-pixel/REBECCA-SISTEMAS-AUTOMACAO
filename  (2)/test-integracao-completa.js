// ========================================
// TESTE DE INTEGRAÇÃO COMPLETO
// Fluxo: Atraso → Anti-Fraude → Notificação ADM
// Execute: node tests/test-integracao-completa.js
// ========================================

console.log('🧪 TESTE DE INTEGRAÇÃO COMPLETA\n');
console.log('='.repeat(70));
console.log('Testando fluxo: Motorista atrasa → Sistema detecta → ADM é notificado');
console.log('='.repeat(70));

// ========================================
// MOCKS
// ========================================
const mensagensWhatsApp = [];
const alertasRegistrados = [];
const configADM = {
  telefone_adm: '5514999990001',
  notificacoes: {
    atrasos: true,
    antifraude: true,
    corridas: true,
    financeiro: false
  }
};

const mockWhatsApp = {
  enviarMensagem: async (telefone, mensagem) => {
    mensagensWhatsApp.push({ 
      telefone, 
      mensagem, 
      timestamp: new Date().toISOString() 
    });
    console.log(`\n📱 [WhatsApp] → ${telefone}`);
    console.log('─'.repeat(50));
    console.log(mensagem.substring(0, 200) + (mensagem.length > 200 ? '...' : ''));
    console.log('─'.repeat(50));
    return true;
  }
};

// ========================================
// SIMULAÇÃO DO BANCO DE DADOS
// ========================================
const corridasDB = [
  {
    id: 127,
    cliente_id: 1,
    motorista_id: 1,
    status: 'aceita',
    tempo_estimado: 5,
    aceito_em: new Date(Date.now() - 8 * 60 * 1000), // Aceito há 8 minutos
    origem_endereco: 'Rua das Flores, 123 - Centro',
    cliente_nome: 'Maria Silva',
    cliente_telefone: '5514999998888',
    motorista_nome: 'João Silva',
    motorista_telefone: '5514999991111'
  }
];

const motoristasDB = {
  1: { 
    id: 1, 
    nome: 'João Silva', 
    telefone: '5514999991111',
    qtd_atrasos: 4,
    ativo: true
  }
};

// ========================================
// FUNÇÕES DO SISTEMA
// ========================================

function calcularMinutosAtraso(horaAceite, tempoEstimado) {
  const horaPrevista = new Date(horaAceite.getTime() + tempoEstimado * 60 * 1000);
  const agora = new Date();
  return (agora.getTime() - horaPrevista.getTime()) / (1000 * 60);
}

async function verificarCorrida(corrida) {
  const minutosAtraso = calcularMinutosAtraso(corrida.aceito_em, corrida.tempo_estimado);
  
  console.log(`\n⏱️ Corrida #${corrida.id}:`);
  console.log(`   Tempo estimado: ${corrida.tempo_estimado} min`);
  console.log(`   Atraso atual: ${minutosAtraso.toFixed(1)} min`);
  
  return minutosAtraso;
}

async function avisarClienteAtraso(corrida) {
  const mensagem = `⚠️ Oi! O motorista ${corrida.motorista_nome} está com um pequeno atraso.

Ele deve chegar em mais alguns minutos. Estamos acompanhando!

Se demorar muito, vou buscar outro motorista pra você automaticamente, tá? 👍`;

  await mockWhatsApp.enviarMensagem(corrida.cliente_telefone, mensagem);
  console.log(`   ✅ Cliente avisado sobre atraso`);
}

async function avisarMotoristaAtraso(corrida) {
  const mensagem = `⚠️ Atenção! Você está atrasado para a corrida.

Cliente: ${corrida.cliente_nome}
Local: ${corrida.origem_endereco}

Por favor, agilize ou avise se tiver algum problema.`;

  await mockWhatsApp.enviarMensagem(corrida.motorista_telefone, mensagem);
  console.log(`   ✅ Motorista avisado sobre atraso`);
}

async function registrarAtrasoAntiFraude(motorista, corridaId) {
  // Incrementar contador
  motorista.qtd_atrasos++;
  
  // Registrar alerta
  const alerta = {
    tipo: 'atraso',
    severidade: motorista.qtd_atrasos >= 5 ? 'vermelho' : 'amarelo',
    titulo: '⏰ Atraso em corrida',
    descricao: `Não chegou no tempo estimado na corrida #${corridaId}`,
    motorista_id: motorista.id,
    motorista_nome: motorista.nome,
    timestamp: new Date().toISOString()
  };
  
  alertasRegistrados.push(alerta);
  
  console.log(`\n🚨 [Anti-Fraude] Alerta registrado:`);
  console.log(`   Tipo: ${alerta.tipo}`);
  console.log(`   Severidade: ${alerta.severidade.toUpperCase()}`);
  console.log(`   Motorista: ${motorista.nome} (${motorista.qtd_atrasos} atrasos)`);
  
  return alerta;
}

async function notificarADM(tipo, motorista, corrida) {
  // Verificar se notificação está habilitada
  if (configADM.notificacoes[tipo] === false) {
    console.log(`   ⚠️ Notificação [${tipo}] desabilitada pelo ADM`);
    return false;
  }
  
  let mensagem;
  
  if (tipo === 'atrasos') {
    mensagem = `⚠️ *REBECA - Alerta de Atraso*

O motorista *${motorista.nome}* atrasou novamente!

📊 Total de atrasos: ${motorista.qtd_atrasos}
🔢 Corrida: #${corrida.id}
📍 Local: ${corrida.origem_endereco}

_Considere verificar no painel Anti-Fraude._`;
  } else if (tipo === 'antifraude') {
    mensagem = `🚨 *ALERTA ANTI-FRAUDE - REBECA*

Motorista com comportamento suspeito detectado:

👤 *${motorista.nome}*
📊 Atrasos: ${motorista.qtd_atrasos}
⚠️ Status: ${motorista.qtd_atrasos >= 5 ? 'CRÍTICO' : 'ATENÇÃO'}

_Acesse o painel ADM > Anti-Fraude para mais detalhes._`;
  }
  
  await mockWhatsApp.enviarMensagem(configADM.telefone_adm, mensagem);
  console.log(`   ✅ ADM notificado [${tipo}]`);
  
  return true;
}

async function cancelarPorAtrasoEReatribuir(corrida, motorista) {
  console.log(`\n🔄 Cancelando corrida #${corrida.id} por atraso excessivo`);
  
  // 1. Cancelar corrida
  corrida.status = 'cancelada_atraso';
  corrida.motivo_cancelamento = 'Motorista não chegou no tempo estimado';
  console.log(`   ✅ Corrida cancelada`);
  
  // 2. Notificar motorista
  const msgMotorista = `❌ A corrida foi cancelada porque você não chegou a tempo.

O cliente foi redirecionado para outro motorista.

Por favor, fique atento aos tempos de chegada.`;
  
  await mockWhatsApp.enviarMensagem(motorista.telefone, msgMotorista);
  console.log(`   ✅ Motorista notificado sobre cancelamento`);
  
  // 3. Notificar cliente
  const msgCliente = `🔄 Trocamos seu motorista!

O anterior teve um imprevisto, mas já encontrei outro mais perto de você.

🚗 *Novo motorista:* Pedro Santos
🚙 Veículo: Gol Prata - DEF-5678
⏱️ Tempo estimado: 4 minutos

Desculpa pelo transtorno! Ele já está a caminho 🚗`;

  await mockWhatsApp.enviarMensagem(corrida.cliente_telefone, msgCliente);
  console.log(`   ✅ Cliente notificado sobre novo motorista`);
  
  return true;
}

// ========================================
// EXECUÇÃO DO TESTE
// ========================================

async function executarTeste() {
  console.log('\n📋 ETAPA 1: Verificar corrida em andamento\n');
  
  const corrida = corridasDB[0];
  const motorista = motoristasDB[corrida.motorista_id];
  
  const minutosAtraso = await verificarCorrida(corrida);
  
  // Simular atraso de 3 minutos (passou do tempo estimado)
  console.log('\n📋 ETAPA 2: Detectar atraso (tolerância: 2 min)\n');
  
  if (minutosAtraso >= 2) {
    console.log(`   🚨 ATRASO DETECTADO: ${minutosAtraso.toFixed(1)} min`);
    
    // Avisar cliente e motorista
    await avisarClienteAtraso(corrida);
    await avisarMotoristaAtraso(corrida);
    
    // Registrar no anti-fraude
    console.log('\n📋 ETAPA 3: Registrar no Anti-Fraude\n');
    const alerta = await registrarAtrasoAntiFraude(motorista, corrida.id);
    
    // Se motorista tem 3+ atrasos, notificar ADM
    console.log('\n📋 ETAPA 4: Verificar se deve notificar ADM\n');
    
    if (motorista.qtd_atrasos >= 3) {
      console.log(`   ⚠️ Motorista com ${motorista.qtd_atrasos} atrasos - Notificando ADM`);
      await notificarADM('atrasos', motorista, corrida);
    }
    
    // Se atraso > 5 minutos, cancelar e reatribuir
    console.log('\n📋 ETAPA 5: Verificar cancelamento (limite: 5 min)\n');
    
    if (minutosAtraso >= 5) {
      console.log(`   🚨 ATRASO CRÍTICO: ${minutosAtraso.toFixed(1)} min - Cancelando corrida`);
      await cancelarPorAtrasoEReatribuir(corrida, motorista);
      
      // Notificar ADM sobre fraude
      if (motorista.qtd_atrasos >= 5) {
        console.log('\n📋 ETAPA 6: Alerta Anti-Fraude crítico\n');
        await notificarADM('antifraude', motorista, corrida);
      }
    }
  } else {
    console.log(`   ✅ Dentro do tempo: ${minutosAtraso.toFixed(1)} min de atraso`);
  }
  
  // Resumo final
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 RESUMO DO TESTE:\n');
  
  console.log(`📱 Mensagens WhatsApp enviadas: ${mensagensWhatsApp.length}`);
  for (let i = 0; i < mensagensWhatsApp.length; i++) {
    const msg = mensagensWhatsApp[i];
    const tipo = msg.telefone === configADM.telefone_adm ? 'ADM' : 
                 msg.telefone === corrida.cliente_telefone ? 'CLIENTE' : 'MOTORISTA';
    console.log(`   [${i + 1}] ${tipo}: ${msg.telefone}`);
  }
  
  console.log(`\n🚨 Alertas Anti-Fraude: ${alertasRegistrados.length}`);
  for (const alerta of alertasRegistrados) {
    console.log(`   - [${alerta.severidade.toUpperCase()}] ${alerta.titulo}`);
  }
  
  console.log(`\n⚙️ Configurações do ADM:`);
  console.log(`   Telefone: ${configADM.telefone_adm}`);
  console.log(`   Notif. Atrasos: ${configADM.notificacoes.atrasos ? '✅' : '❌'}`);
  console.log(`   Notif. Anti-Fraude: ${configADM.notificacoes.antifraude ? '✅' : '❌'}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ TESTE DE INTEGRAÇÃO COMPLETO!\n');
  
  // Validações
  const validacoes = {
    mensagens_enviadas: mensagensWhatsApp.length >= 2,
    alertas_registrados: alertasRegistrados.length >= 1,
    adm_notificado: mensagensWhatsApp.some(m => m.telefone === configADM.telefone_adm),
    cliente_avisado: mensagensWhatsApp.some(m => m.telefone === corrida.cliente_telefone),
    motorista_avisado: mensagensWhatsApp.some(m => m.telefone === corrida.motorista_telefone)
  };
  
  console.log('🔍 VALIDAÇÕES:');
  console.log(`   Mensagens enviadas: ${validacoes.mensagens_enviadas ? '✅' : '❌'}`);
  console.log(`   Alertas registrados: ${validacoes.alertas_registrados ? '✅' : '❌'}`);
  console.log(`   ADM notificado: ${validacoes.adm_notificado ? '✅' : '❌'}`);
  console.log(`   Cliente avisado: ${validacoes.cliente_avisado ? '✅' : '❌'}`);
  console.log(`   Motorista avisado: ${validacoes.motorista_avisado ? '✅' : '❌'}`);
  
  const todosPassaram = Object.values(validacoes).every(v => v);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(todosPassaram ? '\n🎉 TODOS OS TESTES PASSARAM!\n' : '\n⚠️ ALGUNS TESTES FALHARAM!\n');
  
  return {
    success: todosPassaram,
    mensagens: mensagensWhatsApp.length,
    alertas: alertasRegistrados.length,
    validacoes
  };
}

// Executar
executarTeste()
  .then(resultado => {
    console.log('Resultado:', resultado);
    process.exit(resultado.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro:', error);
    process.exit(1);
  });
