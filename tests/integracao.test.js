#!/usr/bin/env node
// ========================================
// REBECA - TESTE DE INTEGRAÇÃO
// Valida Anti-Fraude, Monitoramento e Notificações
// ========================================

console.log('🧪 INICIANDO TESTES DE INTEGRAÇÃO REBECA\n');
console.log('='.repeat(50));

// Simular módulos
const resultados = {
  total: 0,
  passou: 0,
  falhou: 0,
  erros: []
};

function teste(nome, fn) {
  resultados.total++;
  try {
    const resultado = fn();
    if (resultado === true || resultado === undefined) {
      resultados.passou++;
      console.log(`✅ ${nome}`);
      return true;
    } else {
      resultados.falhou++;
      resultados.erros.push({ nome, erro: 'Retornou false' });
      console.log(`❌ ${nome}`);
      return false;
    }
  } catch (error) {
    resultados.falhou++;
    resultados.erros.push({ nome, erro: error.message });
    console.log(`❌ ${nome}: ${error.message}`);
    return false;
  }
}

// ========================================
// TESTE 1: IMPORTAÇÃO DOS MÓDULOS
// ========================================
console.log('\n📦 TESTE 1: Importação dos Módulos\n');

let AntiFraude, MonitoramentoCorridas, CONFIG_FRAUDE, TIPO_ALERTA, SEVERIDADE;

teste('Importar serviço AntiFraude', () => {
  const mod = require('../src/services/antifraude');
  AntiFraude = mod.AntiFraude;
  CONFIG_FRAUDE = mod.CONFIG_FRAUDE;
  TIPO_ALERTA = mod.TIPO_ALERTA;
  SEVERIDADE = mod.SEVERIDADE;
  return AntiFraude !== undefined;
});

teste('Importar serviço Monitoramento', () => {
  const mod = require('../src/services/monitoramento');
  MonitoramentoCorridas = mod.MonitoramentoCorridas;
  return MonitoramentoCorridas !== undefined;
});

teste('Importar serviço OpenAI', () => {
  const mod = require('../src/services/openai');
  return mod.INTENCOES !== undefined;
});

teste('Importar index de services', () => {
  const services = require('../src/services');
  return services.AntiFraude !== undefined && 
         services.MonitoramentoCorridas !== undefined &&
         services.OpenAIService !== undefined;
});

// ========================================
// TESTE 2: CONFIGURAÇÕES ANTI-FRAUDE
// ========================================
console.log('\n⚙️ TESTE 2: Configurações Anti-Fraude\n');

teste('CONFIG_FRAUDE tem valores corretos', () => {
  return CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO === 3 &&
         CONFIG_FRAUDE.ATRASOS_ALERTA_VERMELHO === 5 &&
         CONFIG_FRAUDE.ATRASOS_BLOQUEAR === 10;
});

teste('TIPO_ALERTA contém todos os tipos', () => {
  return TIPO_ALERTA.ATRASO === 'atraso' &&
         TIPO_ALERTA.CANCELAMENTO === 'cancelamento' &&
         TIPO_ALERTA.GPS_SUSPEITO === 'gps_suspeito' &&
         TIPO_ALERTA.NOTA_BAIXA === 'nota_baixa';
});

teste('SEVERIDADE contém todos os níveis', () => {
  return SEVERIDADE.INFO === 'info' &&
         SEVERIDADE.AMARELO === 'amarelo' &&
         SEVERIDADE.VERMELHO === 'vermelho' &&
         SEVERIDADE.BLOQUEAR === 'bloquear';
});

// ========================================
// TESTE 3: INSTANCIAÇÃO DAS CLASSES
// ========================================
console.log('\n🔧 TESTE 3: Instanciação das Classes\n');

let antiFraude, monitoramento;

teste('Criar instância AntiFraude', () => {
  antiFraude = new AntiFraude(null);
  return antiFraude !== undefined;
});

teste('Criar instância MonitoramentoCorridas', () => {
  monitoramento = new MonitoramentoCorridas(null, null);
  return monitoramento !== undefined;
});

teste('AntiFraude tem método analisarMotorista', () => {
  return typeof antiFraude.analisarMotorista === 'function';
});

teste('AntiFraude tem método obterResumoDashboard', () => {
  return typeof antiFraude.obterResumoDashboard === 'function';
});

teste('AntiFraude tem método notificarADM', () => {
  return typeof antiFraude.notificarADM === 'function';
});

teste('Monitoramento tem método verificarAntiFraude', () => {
  return typeof monitoramento.verificarAntiFraude === 'function';
});

teste('Monitoramento tem método registrarAtrasoAntiFraude', () => {
  return typeof monitoramento.registrarAtrasoAntiFraude === 'function';
});

// ========================================
// TESTE 4: LÓGICA DE CÁLCULO DE SCORE
// ========================================
console.log('\n📊 TESTE 4: Cálculo de Score\n');

teste('calcularScore retorna 100 sem alertas', () => {
  const score = antiFraude.calcularScore([]);
  return score === 100;
});

teste('calcularScore reduz 25 para alerta VERMELHO', () => {
  const alertas = [{ severidade: SEVERIDADE.VERMELHO }];
  const score = antiFraude.calcularScore(alertas);
  return score === 75;
});

teste('calcularScore reduz 40 para BLOQUEAR', () => {
  const alertas = [{ severidade: SEVERIDADE.BLOQUEAR }];
  const score = antiFraude.calcularScore(alertas);
  return score === 60;
});

teste('calcularScore reduz 10 para AMARELO', () => {
  const alertas = [{ severidade: SEVERIDADE.AMARELO }];
  const score = antiFraude.calcularScore(alertas);
  return score === 90;
});

teste('calcularScore múltiplos alertas', () => {
  const alertas = [
    { severidade: SEVERIDADE.VERMELHO }, // -25
    { severidade: SEVERIDADE.AMARELO },  // -10
    { severidade: SEVERIDADE.AMARELO },  // -10
  ];
  const score = antiFraude.calcularScore(alertas);
  return score === 55; // 100 - 25 - 10 - 10
});

teste('calcularScore não fica negativo', () => {
  const alertas = [
    { severidade: SEVERIDADE.BLOQUEAR }, // -40
    { severidade: SEVERIDADE.BLOQUEAR }, // -40
    { severidade: SEVERIDADE.BLOQUEAR }, // -40
  ];
  const score = antiFraude.calcularScore(alertas);
  return score === 0;
});

// ========================================
// TESTE 5: RECOMENDAÇÕES
// ========================================
console.log('\n💡 TESTE 5: Recomendações\n');

teste('Score <= 20 recomenda BLOQUEAR', () => {
  const rec = antiFraude.gerarRecomendacao([], 15);
  return rec.acao === 'BLOQUEAR' && rec.cor === 'vermelho';
});

teste('Score 21-50 recomenda MONITORAR', () => {
  const rec = antiFraude.gerarRecomendacao([], 40);
  return rec.acao === 'MONITORAR' && rec.cor === 'laranja';
});

teste('Score 51-75 recomenda ATENÇÃO', () => {
  const rec = antiFraude.gerarRecomendacao([], 60);
  return rec.acao === 'ATENÇÃO' && rec.cor === 'amarelo';
});

teste('Score > 75 recomenda OK', () => {
  const rec = antiFraude.gerarRecomendacao([], 85);
  return rec.acao === 'OK' && rec.cor === 'verde';
});

// ========================================
// TESTE 6: VERIFICAÇÕES INDIVIDUAIS
// ========================================
console.log('\n🔍 TESTE 6: Verificações de Alertas\n');

teste('verificarAtrasos - sem atrasos retorna null', async () => {
  const motorista = { id: 1, qtd_atrasos: 0 };
  const alerta = await antiFraude.verificarAtrasos(motorista);
  return alerta === null;
});

teste('verificarAtrasos - 3 atrasos = AMARELO', async () => {
  const motorista = { id: 1, qtd_atrasos: 3 };
  const alerta = await antiFraude.verificarAtrasos(motorista);
  return alerta !== null && alerta.severidade === SEVERIDADE.AMARELO;
});

teste('verificarAtrasos - 5 atrasos = VERMELHO', async () => {
  const motorista = { id: 1, qtd_atrasos: 5 };
  const alerta = await antiFraude.verificarAtrasos(motorista);
  return alerta !== null && alerta.severidade === SEVERIDADE.VERMELHO;
});

teste('verificarAtrasos - 10 atrasos = BLOQUEAR', async () => {
  const motorista = { id: 1, qtd_atrasos: 10 };
  const alerta = await antiFraude.verificarAtrasos(motorista);
  return alerta !== null && alerta.severidade === SEVERIDADE.BLOQUEAR;
});

teste('verificarNota - nota 4.5 retorna null', async () => {
  const motorista = { id: 1, nota_media: 4.5, total_corridas: 10 };
  const alerta = await antiFraude.verificarNota(motorista);
  return alerta === null;
});

teste('verificarNota - nota 3.0 = alerta', async () => {
  const motorista = { id: 1, nota_media: 3.0, total_corridas: 10 };
  const alerta = await antiFraude.verificarNota(motorista);
  return alerta !== null && alerta.tipo === TIPO_ALERTA.NOTA_BAIXA;
});

teste('verificarCancelamentos - 30% = alerta', async () => {
  const motorista = { id: 1, total_canceladas: 30, total_corridas: 100 };
  const alerta = await antiFraude.verificarCancelamentos(motorista);
  return alerta !== null && alerta.tipo === TIPO_ALERTA.CANCELAMENTO;
});

teste('verificarRecusas - 50% = alerta', async () => {
  const motorista = { id: 1, total_recusadas: 50, total_corridas: 50 };
  const alerta = await antiFraude.verificarRecusas(motorista);
  return alerta !== null && alerta.tipo === TIPO_ALERTA.RECUSA_EXCESSIVA;
});

// ========================================
// TESTE 7: MONITORAMENTO DE CORRIDAS
// ========================================
console.log('\n🚗 TESTE 7: Monitoramento de Corridas\n');

teste('calcularDistanciaMetros funciona', () => {
  // Distância aproximada entre dois pontos conhecidos
  const distancia = monitoramento.calcularDistanciaMetros(
    -21.6785, -49.7500,  // Ponto 1
    -21.6800, -49.7510   // Ponto 2 (~200m)
  );
  return distancia > 100 && distancia < 300;
});

teste('calcularMinutosAtraso positivo quando atrasado', () => {
  const horaPrevista = new Date(Date.now() - 5 * 60 * 1000); // 5 min atrás
  const agora = new Date();
  const atraso = monitoramento.calcularMinutosAtraso(horaPrevista, agora);
  return atraso >= 4.9 && atraso <= 5.1;
});

teste('calcularMinutosAtraso negativo quando adiantado', () => {
  const horaPrevista = new Date(Date.now() + 5 * 60 * 1000); // 5 min no futuro
  const agora = new Date();
  const atraso = monitoramento.calcularMinutosAtraso(horaPrevista, agora);
  return atraso >= -5.1 && atraso <= -4.9;
});

teste('adicionarMonitoramento adiciona ao Map', () => {
  const corrida = {
    id: 999,
    cliente_id: 1,
    cliente_telefone: '14999991111',
    cliente_nome: 'Teste',
    motorista_id: 1,
    motorista_nome: 'João',
    motorista_telefone: '14999992222',
    origem_lat: -21.6785,
    origem_lng: -49.7500,
    tempo_estimado: 5,
    aceito_em: new Date(),
  };
  
  monitoramento.adicionarMonitoramento(corrida);
  return monitoramento.corridasMonitoradas.has(999);
});

teste('removerMonitoramento remove do Map', () => {
  monitoramento.removerMonitoramento(999);
  return !monitoramento.corridasMonitoradas.has(999);
});

// ========================================
// TESTE 8: SIMULAÇÃO DE FLUXO COMPLETO
// ========================================
console.log('\n🔄 TESTE 8: Simulação de Fluxo Completo\n');

teste('Simular motorista com múltiplos problemas', async () => {
  // Motorista fictício com vários problemas
  const motoristaProblematico = {
    id: 100,
    nome: 'Motorista Teste',
    telefone: '14999990000',
    qtd_atrasos: 6,
    total_corridas: 50,
    total_canceladas: 20, // 40% cancelamento
    total_recusadas: 30,  // 37.5% recusa
    nota_media: 3.2,
    ultima_corrida: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
  };

  // Verificar atrasos
  const alertaAtraso = await antiFraude.verificarAtrasos(motoristaProblematico);
  if (!alertaAtraso || alertaAtraso.severidade !== SEVERIDADE.VERMELHO) {
    throw new Error('Atraso deveria ser VERMELHO');
  }

  // Verificar cancelamentos
  const alertaCancelamento = await antiFraude.verificarCancelamentos(motoristaProblematico);
  if (!alertaCancelamento) {
    throw new Error('Deveria ter alerta de cancelamento');
  }

  // Verificar nota
  const alertaNota = await antiFraude.verificarNota(motoristaProblematico);
  if (!alertaNota) {
    throw new Error('Deveria ter alerta de nota baixa');
  }

  // Calcular score com todos os alertas
  const alertas = [alertaAtraso, alertaCancelamento, alertaNota].filter(a => a);
  const score = antiFraude.calcularScore(alertas);
  
  // Score deve ser baixo (< 60)
  if (score >= 60) {
    throw new Error(`Score deveria ser < 60, mas foi ${score}`);
  }

  // Recomendação deve ser MONITORAR ou pior
  const rec = antiFraude.gerarRecomendacao(alertas, score);
  if (rec.acao === 'OK') {
    throw new Error('Recomendação não deveria ser OK');
  }

  return true;
});

teste('Simular notificação ADM (mock)', () => {
  // Simular mensagens enviadas
  const mensagensEnviadas = [];
  
  // Mock do WhatsApp
  const whatsappMock = {
    enviarMensagem: (telefone, msg) => {
      mensagensEnviadas.push({ telefone, msg });
      return Promise.resolve();
    }
  };

  // Criar anti-fraude com mock
  const afMock = new AntiFraude(whatsappMock);
  
  // Simular notificação
  const motorista = { id: 1, nome: 'João Teste', telefone: '14999991111' };
  const alertas = [
    { tipo: 'atraso', severidade: 'vermelho', titulo: '⏰ Muitos atrasos', descricao: '6 atrasos' }
  ];
  
  afMock.notificarADM('14999990001', alertas, motorista);
  
  // Verificar se mensagem foi "enviada"
  return mensagensEnviadas.length === 1 && 
         mensagensEnviadas[0].telefone === '14999990001' &&
         mensagensEnviadas[0].msg.includes('ANTI-FRAUDE');
});

// ========================================
// RESULTADO FINAL
// ========================================
console.log('\n' + '='.repeat(50));
console.log('📊 RESULTADO DOS TESTES\n');

console.log(`Total de testes: ${resultados.total}`);
console.log(`✅ Passou: ${resultados.passou}`);
console.log(`❌ Falhou: ${resultados.falhou}`);
console.log(`📈 Taxa de sucesso: ${((resultados.passou / resultados.total) * 100).toFixed(1)}%`);

if (resultados.erros.length > 0) {
  console.log('\n❌ Erros encontrados:');
  resultados.erros.forEach(e => {
    console.log(`   - ${e.nome}: ${e.erro}`);
  });
}

console.log('\n' + '='.repeat(50));

if (resultados.falhou === 0) {
  console.log('🎉 TODOS OS TESTES PASSARAM!\n');
  console.log('✅ Sistema Anti-Fraude: OK');
  console.log('✅ Monitoramento de Corridas: OK');
  console.log('✅ Cálculo de Score: OK');
  console.log('✅ Recomendações: OK');
  console.log('✅ Notificações: OK');
  process.exit(0);
} else {
  console.log('⚠️ ALGUNS TESTES FALHARAM\n');
  process.exit(1);
}
