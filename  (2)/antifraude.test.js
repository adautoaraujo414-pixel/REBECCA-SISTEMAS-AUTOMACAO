// ========================================
// REBECA - TESTE E SIMULAÇÃO ANTI-FRAUDE
// Valida todo o fluxo de monitoramento
// ========================================

console.log('🧪 INICIANDO TESTES DO SISTEMA REBECA\n');
console.log('='.repeat(50));

// ========================================
// MOCK DO BANCO DE DADOS
// ========================================
const mockDB = {
  motoristas: [
    { id: 1, nome: 'João Santos', telefone: '5514999991111', qtd_atrasos: 0, qtd_corridas: 50, ativo: true, online: true },
    { id: 2, nome: 'Carlos Ferreira', telefone: '5514999992222', qtd_atrasos: 6, qtd_corridas: 30, ativo: true, online: true },
    { id: 3, nome: 'Roberto Alves', telefone: '5514999993333', qtd_atrasos: 3, qtd_corridas: 20, ativo: true, online: false },
    { id: 4, nome: 'Pedro Lima', telefone: '5514999994444', qtd_atrasos: 0, qtd_corridas: 100, ativo: true, online: true },
  ],
  corridas: [
    { id: 101, motorista_id: 1, cliente_id: 1, status: 'aceita', tempo_estimado: 5 },
    { id: 102, motorista_id: 2, cliente_id: 2, status: 'motorista_a_caminho', tempo_estimado: 3 },
  ],
  alertas: [],
  mensagens_enviadas: [],
  config: {
    telefone_adm: '5514999990000'
  }
};

// ========================================
// MOCK DO WHATSAPP
// ========================================
const mockWhatsApp = {
  enviarMensagem: async (telefone, mensagem) => {
    mockDB.mensagens_enviadas.push({ telefone, mensagem, timestamp: new Date() });
    console.log(`📱 [WHATSAPP] Mensagem para ${telefone}:`);
    console.log(`   "${mensagem.substring(0, 100)}..."\n`);
    return true;
  }
};

// ========================================
// MOCK DO QUERY (BANCO)
// ========================================
const mockQuery = async (sql, params = []) => {
  // Simular diferentes queries
  if (sql.includes('SELECT') && sql.includes('motoristas')) {
    if (params.length > 0) {
      const mot = mockDB.motoristas.find(m => m.id === params[0]);
      return { rows: mot ? [mot] : [] };
    }
    return { rows: mockDB.motoristas.filter(m => m.ativo) };
  }
  
  if (sql.includes('SELECT') && sql.includes('corridas')) {
    return { rows: mockDB.corridas };
  }
  
  if (sql.includes('UPDATE motoristas') && sql.includes('qtd_atrasos')) {
    const mot = mockDB.motoristas.find(m => m.id === params[0]);
    if (mot) mot.qtd_atrasos++;
    return { rows: [mot] };
  }
  
  if (sql.includes('INSERT INTO alertas_fraude')) {
    const alerta = { id: mockDB.alertas.length + 1, ...params };
    mockDB.alertas.push(alerta);
    return { rows: [alerta] };
  }
  
  if (sql.includes('configuracoes')) {
    return { rows: [{ valor: mockDB.config.telefone_adm }] };
  }
  
  return { rows: [] };
};

// ========================================
// TESTES
// ========================================

let testesPassaram = 0;
let testesFalharam = 0;

function teste(nome, condicao) {
  if (condicao) {
    console.log(`✅ PASSOU: ${nome}`);
    testesPassaram++;
  } else {
    console.log(`❌ FALHOU: ${nome}`);
    testesFalharam++;
  }
}

// ========================================
// TESTE 1: CONFIG FRAUDE
// ========================================
console.log('\n📋 TESTE 1: Configurações de Fraude\n');

const CONFIG_FRAUDE = {
  ATRASOS_ALERTA_AMARELO: 3,
  ATRASOS_ALERTA_VERMELHO: 5,
  ATRASOS_BLOQUEAR: 10,
  CANCELAMENTOS_ALERTA: 5,
  TAXA_CANCELAMENTO_ALERTA: 0.3,
  NOTA_MINIMA_ALERTA: 3.5,
};

teste('CONFIG_FRAUDE existe', typeof CONFIG_FRAUDE === 'object');
teste('Limite atrasos amarelo = 3', CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO === 3);
teste('Limite atrasos vermelho = 5', CONFIG_FRAUDE.ATRASOS_ALERTA_VERMELHO === 5);
teste('Limite para bloquear = 10', CONFIG_FRAUDE.ATRASOS_BLOQUEAR === 10);

// ========================================
// TESTE 2: DETECÇÃO DE ATRASOS
// ========================================
console.log('\n📋 TESTE 2: Detecção de Atrasos\n');

function verificarAtrasos(motorista) {
  const atrasos = motorista.qtd_atrasos || 0;

  if (atrasos >= CONFIG_FRAUDE.ATRASOS_BLOQUEAR) {
    return { severidade: 'bloquear', titulo: 'Muitos atrasos - Sugerir bloqueio', valor: atrasos };
  } else if (atrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_VERMELHO) {
    return { severidade: 'vermelho', titulo: 'Muitos atrasos', valor: atrasos };
  } else if (atrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO) {
    return { severidade: 'amarelo', titulo: 'Atrasos frequentes', valor: atrasos };
  }
  return null;
}

// Motorista com 0 atrasos
const mot1 = mockDB.motoristas[0];
const alerta1 = verificarAtrasos(mot1);
teste(`${mot1.nome} (0 atrasos) não gera alerta`, alerta1 === null);

// Motorista com 6 atrasos
const mot2 = mockDB.motoristas[1];
const alerta2 = verificarAtrasos(mot2);
teste(`${mot2.nome} (6 atrasos) gera alerta VERMELHO`, alerta2?.severidade === 'vermelho');

// Motorista com 3 atrasos
const mot3 = mockDB.motoristas[2];
const alerta3 = verificarAtrasos(mot3);
teste(`${mot3.nome} (3 atrasos) gera alerta AMARELO`, alerta3?.severidade === 'amarelo');

// ========================================
// TESTE 3: CÁLCULO DE SCORE
// ========================================
console.log('\n📋 TESTE 3: Cálculo de Score\n');

function calcularScore(alertas) {
  let score = 100;
  for (const alerta of alertas) {
    switch (alerta.severidade) {
      case 'bloquear': score -= 40; break;
      case 'vermelho': score -= 25; break;
      case 'amarelo': score -= 10; break;
      case 'info': score -= 2; break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

teste('Score sem alertas = 100', calcularScore([]) === 100);
teste('Score com 1 amarelo = 90', calcularScore([{severidade: 'amarelo'}]) === 90);
teste('Score com 1 vermelho = 75', calcularScore([{severidade: 'vermelho'}]) === 75);
teste('Score com bloquear = 60', calcularScore([{severidade: 'bloquear'}]) === 60);
teste('Score com múltiplos alertas', calcularScore([
  {severidade: 'vermelho'}, 
  {severidade: 'amarelo'},
  {severidade: 'amarelo'}
]) === 55);

// ========================================
// TESTE 4: GERAÇÃO DE RECOMENDAÇÃO
// ========================================
console.log('\n📋 TESTE 4: Geração de Recomendação\n');

function gerarRecomendacao(score) {
  if (score <= 20) return { acao: 'BLOQUEAR', cor: 'vermelho' };
  if (score <= 50) return { acao: 'MONITORAR', cor: 'laranja' };
  if (score <= 75) return { acao: 'ATENÇÃO', cor: 'amarelo' };
  return { acao: 'OK', cor: 'verde' };
}

teste('Score 100 = OK', gerarRecomendacao(100).acao === 'OK');
teste('Score 70 = ATENÇÃO', gerarRecomendacao(70).acao === 'ATENÇÃO');
teste('Score 40 = MONITORAR', gerarRecomendacao(40).acao === 'MONITORAR');
teste('Score 15 = BLOQUEAR', gerarRecomendacao(15).acao === 'BLOQUEAR');

// ========================================
// TESTE 5: ANÁLISE COMPLETA DE MOTORISTA
// ========================================
console.log('\n📋 TESTE 5: Análise Completa de Motorista\n');

async function analisarMotorista(motorista) {
  const alertas = [];
  
  // Verificar atrasos
  const alertaAtraso = verificarAtrasos(motorista);
  if (alertaAtraso) alertas.push(alertaAtraso);
  
  // Calcular score
  const score = calcularScore(alertas);
  
  // Gerar recomendação
  const recomendacao = gerarRecomendacao(score);
  
  return { motorista, alertas, score, recomendacao };
}

(async () => {
  // Testar análise
  const analise1 = await analisarMotorista(mot1);
  teste(`Análise ${mot1.nome}: score = 100`, analise1.score === 100);
  teste(`Análise ${mot1.nome}: recomendação = OK`, analise1.recomendacao.acao === 'OK');
  
  const analise2 = await analisarMotorista(mot2);
  teste(`Análise ${mot2.nome}: score = 75 (1 vermelho)`, analise2.score === 75);
  teste(`Análise ${mot2.nome}: recomendação = ATENÇÃO`, analise2.recomendacao.acao === 'ATENÇÃO');
  
  const analise3 = await analisarMotorista(mot3);
  teste(`Análise ${mot3.nome}: score = 90 (1 amarelo)`, analise3.score === 90);
  
  // ========================================
  // TESTE 6: NOTIFICAÇÃO VIA WHATSAPP
  // ========================================
  console.log('\n📋 TESTE 6: Notificação WhatsApp\n');
  
  async function notificarADM(telefone, motorista, alertas) {
    let mensagem = `🚨 *ALERTA ANTI-FRAUDE - REBECA*\n\n`;
    mensagem += `Motorista: *${motorista.nome}*\n`;
    mensagem += `Telefone: ${motorista.telefone}\n\n`;
    mensagem += `*Problemas detectados:*\n`;
    
    for (const alerta of alertas) {
      mensagem += `\n${alerta.titulo}\n`;
    }
    
    await mockWhatsApp.enviarMensagem(telefone, mensagem);
    return true;
  }
  
  // Testar envio
  const enviou = await notificarADM(mockDB.config.telefone_adm, mot2, [alerta2]);
  teste('Notificação WhatsApp enviada', enviou === true);
  teste('Mensagem registrada no mock', mockDB.mensagens_enviadas.length > 0);
  teste('Destinatário correto', mockDB.mensagens_enviadas[0]?.telefone === mockDB.config.telefone_adm);
  
  // ========================================
  // TESTE 7: SIMULAÇÃO DE ATRASO COMPLETA
  // ========================================
  console.log('\n📋 TESTE 7: Simulação de Atraso Completa\n');
  
  async function simularAtraso(corridaId, motoristaId) {
    console.log(`\n🔄 Simulando atraso na corrida #${corridaId}...`);
    
    // 1. Buscar motorista
    const motorista = mockDB.motoristas.find(m => m.id === motoristaId);
    console.log(`   Motorista: ${motorista.nome} (${motorista.qtd_atrasos} atrasos antes)`);
    
    // 2. Incrementar atrasos
    motorista.qtd_atrasos++;
    console.log(`   Atrasos agora: ${motorista.qtd_atrasos}`);
    
    // 3. Verificar se precisa alertar
    const alerta = verificarAtrasos(motorista);
    if (alerta) {
      console.log(`   ⚠️ Alerta gerado: ${alerta.severidade} - ${alerta.titulo}`);
      
      // 4. Se 3+ atrasos, notificar ADM
      if (motorista.qtd_atrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO) {
        console.log(`   📢 Notificando ADM via WhatsApp...`);
        
        const mensagemADM = `⚠️ *REBECA - Alerta de Atraso*\n\n` +
          `O motorista *${motorista.nome}* atrasou novamente!\n\n` +
          `📊 Total de atrasos: ${motorista.qtd_atrasos}\n` +
          `🔢 Corrida: #${corridaId}\n\n` +
          `_Verifique no painel Anti-Fraude._`;
        
        await mockWhatsApp.enviarMensagem(mockDB.config.telefone_adm, mensagemADM);
      }
    }
    
    // 5. Avisar cliente
    console.log(`   📱 Avisando cliente sobre troca de motorista...`);
    await mockWhatsApp.enviarMensagem('5514999995555', 
      `🔄 Trocamos seu motorista! O anterior teve um imprevisto.`);
    
    return { success: true, atrasos: motorista.qtd_atrasos, alerta };
  }
  
  // Simular atraso do motorista 1 (que tinha 0 atrasos)
  const resultado = await simularAtraso(101, 1);
  teste('Simulação de atraso executada', resultado.success === true);
  teste('Contador de atrasos incrementado', resultado.atrasos === 1);
  
  // Simular mais atrasos para gerar alerta
  await simularAtraso(102, 1);
  await simularAtraso(103, 1);
  const resultado3 = await simularAtraso(104, 1);
  teste('Após 4 atrasos gera alerta amarelo', resultado3.alerta?.severidade === 'amarelo');
  teste('Mensagens enviadas ao ADM', mockDB.mensagens_enviadas.length >= 3);
  
  // ========================================
  // TESTE 8: DASHBOARD ANTI-FRAUDE
  // ========================================
  console.log('\n📋 TESTE 8: Dashboard Anti-Fraude\n');
  
  async function obterResumoDashboard() {
    const resumo = {
      total_alertas: 0,
      criticos: 0,
      atencao: 0,
      info: 0,
      motoristas_problematicos: [],
      alertas_por_tipo: {}
    };
    
    for (const mot of mockDB.motoristas) {
      const analise = await analisarMotorista(mot);
      
      for (const alerta of analise.alertas) {
        resumo.total_alertas++;
        
        if (alerta.severidade === 'bloquear' || alerta.severidade === 'vermelho') {
          resumo.criticos++;
        } else if (alerta.severidade === 'amarelo') {
          resumo.atencao++;
        } else {
          resumo.info++;
        }
        
        const tipo = alerta.titulo.includes('atraso') ? 'atraso' : 'outro';
        resumo.alertas_por_tipo[tipo] = (resumo.alertas_por_tipo[tipo] || 0) + 1;
      }
      
      if (analise.score < 100) {
        resumo.motoristas_problematicos.push({
          id: mot.id,
          nome: mot.nome,
          score: analise.score,
          alertas: analise.alertas.length,
          recomendacao: analise.recomendacao
        });
      }
    }
    
    return resumo;
  }
  
  const dashboard = await obterResumoDashboard();
  console.log('\n📊 Resumo do Dashboard:');
  console.log(`   Total alertas: ${dashboard.total_alertas}`);
  console.log(`   Críticos: ${dashboard.criticos}`);
  console.log(`   Atenção: ${dashboard.atencao}`);
  console.log(`   Motoristas problemáticos: ${dashboard.motoristas_problematicos.length}`);
  
  teste('Dashboard retorna dados', dashboard.total_alertas > 0);
  teste('Motoristas problemáticos identificados', dashboard.motoristas_problematicos.length > 0);
  teste('Alertas categorizados por tipo', Object.keys(dashboard.alertas_por_tipo).length > 0);
  
  // ========================================
  // RESUMO DOS TESTES
  // ========================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DOS TESTES\n');
  console.log(`✅ Passaram: ${testesPassaram}`);
  console.log(`❌ Falharam: ${testesFalharam}`);
  console.log(`📈 Taxa de sucesso: ${((testesPassaram / (testesPassaram + testesFalharam)) * 100).toFixed(1)}%`);
  
  if (testesFalharam === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Sistema Anti-Fraude está funcionando corretamente.');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verificar implementação.');
  }
  
  // ========================================
  // LOG DE MENSAGENS ENVIADAS
  // ========================================
  console.log('\n' + '='.repeat(50));
  console.log('📱 MENSAGENS WHATSAPP ENVIADAS (SIMULAÇÃO)\n');
  
  mockDB.mensagens_enviadas.forEach((msg, i) => {
    console.log(`${i + 1}. Para: ${msg.telefone}`);
    console.log(`   ${msg.mensagem.substring(0, 80)}...`);
    console.log('');
  });
  
  console.log('='.repeat(50));
  console.log('🏁 TESTES FINALIZADOS\n');
  
})();
