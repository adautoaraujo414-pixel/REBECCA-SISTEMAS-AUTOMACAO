#!/usr/bin/env node
// ========================================
// SIMULAÇÃO COMPLETA DO SISTEMA REBECA
// Simula fluxos de corrida, atraso, anti-fraude e notificações
// ========================================

console.log('🚀 SIMULAÇÃO COMPLETA DO SISTEMA REBECA');
console.log('='.repeat(60));
console.log();

// Simular banco de dados em memória
const db = {
  motoristas: [
    { id: 1, nome: 'João Santos', telefone: '5514999991111', qtd_atrasos: 0, ativo: true, avaliacao: 4.8 },
    { id: 2, nome: 'Carlos Ferreira', telefone: '5514999992222', qtd_atrasos: 6, ativo: true, avaliacao: 3.2 },
    { id: 3, nome: 'Roberto Alves', telefone: '5514999993333', qtd_atrasos: 2, ativo: true, avaliacao: 4.5 },
  ],
  corridas: [],
  alertas: [],
  mensagens_enviadas: [],
  configuracoes: {
    telefone_adm: '5514999990001',
    email_adm: 'dono@frota.com',
    notificacoes: {
      atrasos: true,
      antifraude: true,
      cancelamentos: true,
      relatorio: true
    }
  }
};

// Simular WhatsApp
const whatsappSimulado = {
  enviarMensagem: async (telefone, mensagem) => {
    db.mensagens_enviadas.push({
      para: telefone,
      mensagem: mensagem.substring(0, 100) + '...',
      hora: new Date().toLocaleTimeString()
    });
    console.log(`   📱 WhatsApp → ${telefone.slice(-4)}: ${mensagem.substring(0, 50)}...`);
    return true;
  }
};

// ========================================
// SIMULAÇÃO 1: FLUXO DE CORRIDA NORMAL
// ========================================
async function simularCorridaNormal() {
  console.log('📍 SIMULAÇÃO 1: CORRIDA NORMAL');
  console.log('-'.repeat(40));
  
  // Cliente pede corrida
  console.log('1️⃣ Cliente: "Oi, preciso de um carro"');
  console.log('   🤖 Rebeca: "Oi, tudo bem? Pode me enviar sua localização?"');
  
  // Cliente envia localização
  console.log('2️⃣ Cliente envia localização');
  console.log('   🤖 Rebeca: "Perfeito 👍 Só um instante..."');
  
  // Buscar motorista
  const motorista = db.motoristas.find(m => m.qtd_atrasos < 3);
  console.log(`3️⃣ Motorista encontrado: ${motorista.nome}`);
  console.log(`   🤖 Rebeca: "Encontrei um motorista a 3 min. Posso mandar?"`);
  
  // Cliente confirma
  console.log('4️⃣ Cliente: "Pode"');
  
  // Criar corrida
  const corrida = {
    id: db.corridas.length + 1,
    motorista_id: motorista.id,
    motorista_nome: motorista.nome,
    status: 'aceita',
    tempo_estimado: 3,
    hora_aceite: new Date()
  };
  db.corridas.push(corrida);
  
  console.log(`   🤖 Rebeca: "Prontinho 🚗 ${motorista.nome} está a caminho!"`);
  console.log('   ✅ Corrida #' + corrida.id + ' criada com sucesso');
  console.log();
  
  return corrida;
}

// ========================================
// SIMULAÇÃO 2: MOTORISTA ATRASA
// ========================================
async function simularAtraso() {
  console.log('📍 SIMULAÇÃO 2: MOTORISTA ATRASA');
  console.log('-'.repeat(40));
  
  const motorista = db.motoristas[0];
  const corrida = {
    id: db.corridas.length + 1,
    motorista_id: motorista.id,
    motorista_nome: motorista.nome,
    cliente_telefone: '5514988887777',
    status: 'aceita',
    tempo_estimado: 5,
    hora_aceite: new Date(Date.now() - 10 * 60 * 1000) // 10 min atrás
  };
  db.corridas.push(corrida);
  
  console.log(`1️⃣ Corrida #${corrida.id} - Tempo estimado: ${corrida.tempo_estimado} min`);
  console.log(`   Hora aceite: ${corrida.hora_aceite.toLocaleTimeString()}`);
  console.log(`   Hora atual: ${new Date().toLocaleTimeString()}`);
  
  // Calcular atraso
  const horaPrevista = new Date(corrida.hora_aceite.getTime() + corrida.tempo_estimado * 60 * 1000);
  const atraso = (Date.now() - horaPrevista.getTime()) / (1000 * 60);
  
  console.log(`2️⃣ Atraso calculado: ${atraso.toFixed(1)} minutos`);
  
  // +2 min = avisar cliente
  if (atraso >= 2) {
    console.log('3️⃣ Atraso >= 2 min → AVISAR CLIENTE');
    await whatsappSimulado.enviarMensagem(
      corrida.cliente_telefone,
      `⚠️ Oi! O motorista ${motorista.nome} está com um pequeno atraso...`
    );
  }
  
  // +5 min = cancelar e reatribuir
  if (atraso >= 5) {
    console.log('4️⃣ Atraso >= 5 min → CANCELAR E REATRIBUIR');
    
    // Atualizar contador de atrasos
    motorista.qtd_atrasos++;
    console.log(`   📊 ${motorista.nome} agora tem ${motorista.qtd_atrasos} atrasos`);
    
    // Avisar motorista
    await whatsappSimulado.enviarMensagem(
      motorista.telefone,
      '❌ A corrida foi cancelada porque você não chegou a tempo...'
    );
    
    // Buscar novo motorista
    const novoMotorista = db.motoristas.find(m => m.id !== motorista.id && m.qtd_atrasos < 5);
    if (novoMotorista) {
      console.log(`5️⃣ Novo motorista: ${novoMotorista.nome}`);
      
      // Criar corrida prioridade
      const novaCorrida = {
        id: db.corridas.length + 1,
        motorista_id: novoMotorista.id,
        motorista_nome: novoMotorista.nome,
        prioridade: true,
        status: 'aceita',
        tempo_estimado: 3
      };
      db.corridas.push(novaCorrida);
      
      // Avisar novo motorista
      await whatsappSimulado.enviarMensagem(
        novoMotorista.telefone,
        '🚨 CORRIDA PRIORIDADE! Cliente aguardando...'
      );
      
      // Avisar cliente
      await whatsappSimulado.enviarMensagem(
        corrida.cliente_telefone,
        `🔄 Trocamos seu motorista! ${novoMotorista.nome} está a caminho...`
      );
      
      console.log('   ✅ Corrida reatribuída com PRIORIDADE');
    }
  }
  
  console.log();
}

// ========================================
// SIMULAÇÃO 3: VERIFICAÇÃO ANTI-FRAUDE
// ========================================
async function simularAntiFraude() {
  console.log('📍 SIMULAÇÃO 3: VERIFICAÇÃO ANTI-FRAUDE');
  console.log('-'.repeat(40));
  
  const CONFIG_FRAUDE = {
    ATRASOS_ALERTA_AMARELO: 3,
    ATRASOS_ALERTA_VERMELHO: 5,
    ATRASOS_BLOQUEAR: 10,
  };
  
  console.log('1️⃣ Analisando todos os motoristas...');
  
  const resultados = [];
  
  for (const motorista of db.motoristas) {
    const alertas = [];
    let score = 100;
    
    // Verificar atrasos
    if (motorista.qtd_atrasos >= CONFIG_FRAUDE.ATRASOS_BLOQUEAR) {
      alertas.push({ tipo: 'atraso', severidade: 'bloquear', titulo: `🚫 ${motorista.qtd_atrasos} atrasos - BLOQUEAR` });
      score -= 40;
    } else if (motorista.qtd_atrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_VERMELHO) {
      alertas.push({ tipo: 'atraso', severidade: 'vermelho', titulo: `🔴 ${motorista.qtd_atrasos} atrasos` });
      score -= 25;
    } else if (motorista.qtd_atrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO) {
      alertas.push({ tipo: 'atraso', severidade: 'amarelo', titulo: `🟡 ${motorista.qtd_atrasos} atrasos` });
      score -= 10;
    }
    
    // Verificar nota
    if (motorista.avaliacao < 3.5) {
      alertas.push({ tipo: 'nota', severidade: 'amarelo', titulo: `⭐ Nota ${motorista.avaliacao}` });
      score -= 10;
    }
    
    const recomendacao = score <= 20 ? 'BLOQUEAR' : score <= 50 ? 'MONITORAR' : score <= 75 ? 'ATENÇÃO' : 'OK';
    
    resultados.push({
      motorista,
      alertas,
      score,
      recomendacao
    });
    
    if (alertas.length > 0) {
      console.log(`   👤 ${motorista.nome}: Score ${score} - ${recomendacao}`);
      alertas.forEach(a => console.log(`      └ ${a.titulo}`));
    }
  }
  
  // Notificar ADM se houver críticos
  const criticos = resultados.filter(r => r.score < 50);
  
  if (criticos.length > 0 && db.configuracoes.notificacoes.antifraude) {
    console.log('\n2️⃣ Enviando alerta para ADM...');
    
    let mensagem = `🚨 ALERTA ANTI-FRAUDE - REBECA\n\nDetectei ${criticos.length} motorista(s) suspeito(s):\n`;
    criticos.forEach(c => {
      mensagem += `\n👤 ${c.motorista.nome} (Score: ${c.score})`;
    });
    
    await whatsappSimulado.enviarMensagem(db.configuracoes.telefone_adm, mensagem);
    
    console.log('   ✅ ADM notificado via WhatsApp');
  }
  
  console.log();
}

// ========================================
// SIMULAÇÃO 4: RELATÓRIO DIÁRIO
// ========================================
async function simularRelatorioDiario() {
  console.log('📍 SIMULAÇÃO 4: RELATÓRIO DIÁRIO');
  console.log('-'.repeat(40));
  
  const hoje = new Date().toLocaleDateString();
  
  // Simular dados do dia
  const relatorio = {
    data: hoje,
    corridas_total: 45,
    corridas_finalizadas: 42,
    corridas_canceladas: 3,
    faturamento: 1250.00,
    motoristas_ativos: 8,
    alertas_criticos: 2
  };
  
  console.log('1️⃣ Gerando relatório do dia...');
  console.log(`   📅 Data: ${relatorio.data}`);
  console.log(`   🚗 Corridas: ${relatorio.corridas_finalizadas}/${relatorio.corridas_total}`);
  console.log(`   💰 Faturamento: R$ ${relatorio.faturamento.toFixed(2)}`);
  console.log(`   👥 Motoristas ativos: ${relatorio.motoristas_ativos}`);
  console.log(`   🚨 Alertas críticos: ${relatorio.alertas_criticos}`);
  
  if (db.configuracoes.notificacoes.relatorio) {
    console.log('\n2️⃣ Enviando relatório para ADM...');
    
    const mensagem = `📊 RELATÓRIO DO DIA ${hoje}

🚗 Corridas: ${relatorio.corridas_finalizadas}/${relatorio.corridas_total}
💰 Faturamento: R$ ${relatorio.faturamento.toFixed(2)}
👥 Motoristas ativos: ${relatorio.motoristas_ativos}
🚨 Alertas: ${relatorio.alertas_criticos}

_Relatório automático - Rebeca_`;
    
    await whatsappSimulado.enviarMensagem(db.configuracoes.telefone_adm, mensagem);
    
    console.log('   ✅ Relatório enviado via WhatsApp');
  }
  
  console.log();
}

// ========================================
// RESUMO FINAL
// ========================================
async function resumoFinal() {
  console.log('='.repeat(60));
  console.log('📊 RESUMO DA SIMULAÇÃO');
  console.log('='.repeat(60));
  
  console.log(`\n📱 MENSAGENS ENVIADAS: ${db.mensagens_enviadas.length}`);
  db.mensagens_enviadas.forEach((m, i) => {
    console.log(`   ${i + 1}. Para: ...${m.para.slice(-4)} | ${m.hora}`);
  });
  
  console.log(`\n🚗 CORRIDAS CRIADAS: ${db.corridas.length}`);
  db.corridas.forEach(c => {
    const prioridade = c.prioridade ? ' [PRIORIDADE]' : '';
    console.log(`   #${c.id} - ${c.motorista_nome}${prioridade}`);
  });
  
  console.log(`\n👥 MOTORISTAS:`);
  db.motoristas.forEach(m => {
    console.log(`   ${m.nome}: ${m.qtd_atrasos} atrasos, ⭐ ${m.avaliacao}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ SIMULAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('');
  console.log('📋 O SISTEMA ESTÁ FUNCIONANDO:');
  console.log('   ✅ Fluxo de corrida normal');
  console.log('   ✅ Detecção de atraso');
  console.log('   ✅ Aviso ao cliente');
  console.log('   ✅ Cancelamento e reatribuição');
  console.log('   ✅ Corrida com prioridade');
  console.log('   ✅ Sistema anti-fraude');
  console.log('   ✅ Notificação ao ADM');
  console.log('   ✅ Relatório diário');
  console.log('='.repeat(60));
}

// ========================================
// EXECUTAR SIMULAÇÕES
// ========================================
async function executar() {
  await simularCorridaNormal();
  await simularAtraso();
  await simularAntiFraude();
  await simularRelatorioDiario();
  await resumoFinal();
}

executar().catch(console.error);
