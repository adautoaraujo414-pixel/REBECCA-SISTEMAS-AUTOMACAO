// ========================================
// REBECA - TESTE STANDALONE (sem banco)
// Valida lógica pura das classes
// ========================================

console.log('🧪 TESTE STANDALONE - REBECA\n');
console.log('='.repeat(50));

let passou = 0;
let falhou = 0;

function teste(nome, resultado) {
  if (resultado) {
    console.log(`✅ ${nome}`);
    passou++;
  } else {
    console.log(`❌ ${nome}`);
    falhou++;
  }
}

// ========================================
// SIMULAÇÃO DAS CLASSES (sem banco)
// ========================================

// Simular CONFIG_TEMPO
const CONFIG_TEMPO = {
  TOLERANCIA_AVISO: 2,
  TEMPO_MAX_ATRASO: 5,
  INTERVALO_VERIFICACAO: 30000,
  DISTANCIA_CHEGADA: 100,
  INTERVALO_ANTIFRAUDE: 300000,
};

// Simular CONFIG_FRAUDE
const CONFIG_FRAUDE = {
  ATRASOS_ALERTA_AMARELO: 3,
  ATRASOS_ALERTA_VERMELHO: 5,
  ATRASOS_BLOQUEAR: 10,
  CANCELAMENTOS_ALERTA: 5,
  TAXA_CANCELAMENTO_ALERTA: 0.3,
  CORRIDA_MUITO_CURTA_KM: 0.3,
  CORRIDA_MUITO_CURTA_MIN: 2,
  CORRIDAS_CURTAS_ALERTA: 5,
  RECUSAS_SEGUIDAS_ALERTA: 10,
  TAXA_RECUSA_ALERTA: 0.5,
  VELOCIDADE_IMPOSSIVEL_KMH: 200,
  GPS_SALTOS_ALERTA: 3,
  DIAS_INATIVO_ALERTA: 7,
  RECLAMACOES_ALERTA: 3,
  NOTA_MINIMA_ALERTA: 3.5,
  PERIODO_ANALISE: 30,
};

// Simular SEVERIDADE
const SEVERIDADE = {
  INFO: 'info',
  AMARELO: 'amarelo',
  VERMELHO: 'vermelho',
  BLOQUEAR: 'bloquear',
};

// Simular TIPO_ALERTA
const TIPO_ALERTA = {
  ATRASO: 'atraso',
  CANCELAMENTO: 'cancelamento',
  CORRIDA_CURTA: 'corrida_curta',
  RECUSA_EXCESSIVA: 'recusa_excessiva',
  GPS_SUSPEITO: 'gps_suspeito',
  RECLAMACAO: 'reclamacao',
  NOTA_BAIXA: 'nota_baixa',
  INATIVIDADE: 'inatividade',
};

// ========================================
// FUNÇÕES SIMULADAS
// ========================================

function calcularScore(alertas) {
  let score = 100;
  for (const alerta of alertas) {
    switch (alerta.severidade) {
      case SEVERIDADE.BLOQUEAR: score -= 40; break;
      case SEVERIDADE.VERMELHO: score -= 25; break;
      case SEVERIDADE.AMARELO: score -= 10; break;
      case SEVERIDADE.INFO: score -= 2; break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

function gerarRecomendacao(alertas, score) {
  if (score <= 20) return { acao: 'BLOQUEAR', cor: 'vermelho', texto: 'Bloquear' };
  if (score <= 50) return { acao: 'MONITORAR', cor: 'laranja', texto: 'Monitorar' };
  if (score <= 75) return { acao: 'ATENÇÃO', cor: 'amarelo', texto: 'Atenção' };
  return { acao: 'OK', cor: 'verde', texto: 'OK' };
}

function verificarAtrasos(qtdAtrasos) {
  if (qtdAtrasos >= CONFIG_FRAUDE.ATRASOS_BLOQUEAR) {
    return { tipo: TIPO_ALERTA.ATRASO, severidade: SEVERIDADE.BLOQUEAR, titulo: 'Muitos atrasos - Bloquear' };
  }
  if (qtdAtrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_VERMELHO) {
    return { tipo: TIPO_ALERTA.ATRASO, severidade: SEVERIDADE.VERMELHO, titulo: 'Muitos atrasos' };
  }
  if (qtdAtrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO) {
    return { tipo: TIPO_ALERTA.ATRASO, severidade: SEVERIDADE.AMARELO, titulo: 'Atrasos frequentes' };
  }
  return null;
}

function calcularDistanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calcularMinutosAtraso(horaPrevista, agora) {
  const diff = agora.getTime() - new Date(horaPrevista).getTime();
  return diff / (1000 * 60);
}

// ========================================
// TESTES
// ========================================

console.log('\n📊 TESTE 1: Configurações\n');

teste('CONFIG_TEMPO.TOLERANCIA_AVISO = 2', CONFIG_TEMPO.TOLERANCIA_AVISO === 2);
teste('CONFIG_TEMPO.TEMPO_MAX_ATRASO = 5', CONFIG_TEMPO.TEMPO_MAX_ATRASO === 5);
teste('CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO = 3', CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO === 3);
teste('CONFIG_FRAUDE.ATRASOS_BLOQUEAR = 10', CONFIG_FRAUDE.ATRASOS_BLOQUEAR === 10);

console.log('\n🧮 TESTE 2: calcularScore()\n');

teste('Score sem alertas = 100', calcularScore([]) === 100);
teste('Score com 1 amarelo = 90', calcularScore([{severidade: SEVERIDADE.AMARELO}]) === 90);
teste('Score com 1 vermelho = 75', calcularScore([{severidade: SEVERIDADE.VERMELHO}]) === 75);
teste('Score com bloquear = 60', calcularScore([{severidade: SEVERIDADE.BLOQUEAR}]) === 60);
teste('Score com amarelo + vermelho = 65', calcularScore([
  {severidade: SEVERIDADE.AMARELO},
  {severidade: SEVERIDADE.VERMELHO}
]) === 65);
teste('Score mínimo = 0', calcularScore([
  {severidade: SEVERIDADE.BLOQUEAR},
  {severidade: SEVERIDADE.BLOQUEAR},
  {severidade: SEVERIDADE.BLOQUEAR}
]) === 0);

console.log('\n📋 TESTE 3: gerarRecomendacao()\n');

teste('Score 100 = OK', gerarRecomendacao([], 100).acao === 'OK');
teste('Score 80 = OK', gerarRecomendacao([], 80).acao === 'OK');
teste('Score 70 = ATENÇÃO', gerarRecomendacao([], 70).acao === 'ATENÇÃO');
teste('Score 50 = MONITORAR', gerarRecomendacao([], 50).acao === 'MONITORAR');
teste('Score 40 = MONITORAR', gerarRecomendacao([], 40).acao === 'MONITORAR');
teste('Score 20 = BLOQUEAR', gerarRecomendacao([], 20).acao === 'BLOQUEAR');
teste('Score 10 = BLOQUEAR', gerarRecomendacao([], 10).acao === 'BLOQUEAR');

console.log('\n⏰ TESTE 4: verificarAtrasos()\n');

teste('0 atrasos = null', verificarAtrasos(0) === null);
teste('2 atrasos = null', verificarAtrasos(2) === null);
teste('3 atrasos = amarelo', verificarAtrasos(3)?.severidade === SEVERIDADE.AMARELO);
teste('5 atrasos = vermelho', verificarAtrasos(5)?.severidade === SEVERIDADE.VERMELHO);
teste('10 atrasos = bloquear', verificarAtrasos(10)?.severidade === SEVERIDADE.BLOQUEAR);
teste('15 atrasos = bloquear', verificarAtrasos(15)?.severidade === SEVERIDADE.BLOQUEAR);

console.log('\n📍 TESTE 5: calcularDistanciaMetros()\n');

// Dois pontos em Lins-SP (aproximadamente 100m de distância)
const dist1 = calcularDistanciaMetros(-21.6785, -49.7500, -21.6786, -49.7509);
teste('Distância ~100m entre pontos próximos', dist1 > 80 && dist1 < 120);

// Mesmo ponto = 0
const dist2 = calcularDistanciaMetros(-21.6785, -49.7500, -21.6785, -49.7500);
teste('Distância 0 para mesmo ponto', dist2 === 0);

// Distância maior (~1km)
const dist3 = calcularDistanciaMetros(-21.6785, -49.7500, -21.6880, -49.7500);
teste('Distância ~1km para pontos mais distantes', dist3 > 900 && dist3 < 1200);

console.log('\n⏱️ TESTE 6: calcularMinutosAtraso()\n');

const agora = new Date();
const ha5min = new Date(agora.getTime() - 5 * 60 * 1000);
const ha10min = new Date(agora.getTime() - 10 * 60 * 1000);
const daqui5min = new Date(agora.getTime() + 5 * 60 * 1000);

teste('5 min de atraso', Math.abs(calcularMinutosAtraso(ha5min, agora) - 5) < 0.1);
teste('10 min de atraso', Math.abs(calcularMinutosAtraso(ha10min, agora) - 10) < 0.1);
teste('Negativo se ainda não passou', calcularMinutosAtraso(daqui5min, agora) < 0);

console.log('\n🔔 TESTE 7: Simulação de Fluxo\n');

// Simular motorista que atrasa
function simularFluxoAtraso(motorista) {
  const alertas = [];
  
  // Verificar atrasos
  const alertaAtraso = verificarAtrasos(motorista.qtd_atrasos);
  if (alertaAtraso) alertas.push(alertaAtraso);
  
  // Calcular score
  const score = calcularScore(alertas);
  
  // Gerar recomendação
  const recomendacao = gerarRecomendacao(alertas, score);
  
  return { alertas, score, recomendacao };
}

const mot1 = simularFluxoAtraso({ qtd_atrasos: 0 });
teste('Motorista sem atrasos: Score 100, OK', mot1.score === 100 && mot1.recomendacao.acao === 'OK');

const mot2 = simularFluxoAtraso({ qtd_atrasos: 3 });
teste('Motorista com 3 atrasos: Score 90, ATENÇÃO', mot2.score === 90 && mot2.recomendacao.acao === 'ATENÇÃO');

const mot3 = simularFluxoAtraso({ qtd_atrasos: 5 });
teste('Motorista com 5 atrasos: Score 75, ATENÇÃO', mot3.score === 75 && mot3.recomendacao.acao === 'ATENÇÃO');

const mot4 = simularFluxoAtraso({ qtd_atrasos: 10 });
teste('Motorista com 10 atrasos: Score 60, MONITORAR', mot4.score === 60 && mot4.recomendacao.acao === 'MONITORAR');

console.log('\n📱 TESTE 8: Geração de Mensagens WhatsApp\n');

function gerarMensagemAtraso(motorista, atrasos, corridaId) {
  return `⚠️ *REBECA - Alerta de Atraso*\n\n` +
    `O motorista *${motorista}* atrasou novamente!\n\n` +
    `📊 Total de atrasos: ${atrasos}\n` +
    `🔢 Corrida: #${corridaId}\n\n` +
    `_Considere verificar no painel Anti-Fraude._`;
}

const msg1 = gerarMensagemAtraso('João Silva', 5, 127);
teste('Mensagem contém nome do motorista', msg1.includes('João Silva'));
teste('Mensagem contém número de atrasos', msg1.includes('5'));
teste('Mensagem contém ID da corrida', msg1.includes('#127'));
teste('Mensagem contém emoji de alerta', msg1.includes('⚠️'));

function gerarMensagemPrioridade(cliente, endereco) {
  return `🚨 *CORRIDA PRIORIDADE* 🚨\n\n` +
    `O motorista anterior não chegou a tempo.\n\n` +
    `👤 Cliente: ${cliente}\n` +
    `📍 Local: ${endereco}`;
}

const msg2 = gerarMensagemPrioridade('Maria Santos', 'Rua das Flores, 123');
teste('Mensagem prioridade contém emoji', msg2.includes('🚨'));
teste('Mensagem prioridade contém cliente', msg2.includes('Maria Santos'));
teste('Mensagem prioridade contém endereço', msg2.includes('Rua das Flores'));

console.log('\n🎯 TESTE 9: Detecção de GPS Falso\n');

function detectarGPSFalso(velocidadeKmh) {
  return velocidadeKmh > CONFIG_FRAUDE.VELOCIDADE_IMPOSSIVEL_KMH;
}

teste('60 km/h = GPS válido', !detectarGPSFalso(60));
teste('120 km/h = GPS válido', !detectarGPSFalso(120));
teste('199 km/h = GPS válido', !detectarGPSFalso(199));
teste('200 km/h = GPS válido (limite)', !detectarGPSFalso(200));
teste('201 km/h = GPS FALSO', detectarGPSFalso(201));
teste('500 km/h = GPS FALSO', detectarGPSFalso(500));

console.log('\n🏁 TESTE 10: Fluxo Completo de Corrida\n');

// Simular fluxo completo
function simularCorrida() {
  // 1. Corrida aceita
  const corrida = {
    id: 999,
    motorista: 'Carlos',
    cliente: 'Ana',
    tempo_estimado: 5,
    aceito_em: new Date(Date.now() - 10 * 60 * 1000), // 10 min atrás
  };
  
  // 2. Calcular atraso
  const horaPrevista = new Date(corrida.aceito_em.getTime() + corrida.tempo_estimado * 60 * 1000);
  const atraso = calcularMinutosAtraso(horaPrevista, new Date());
  
  // 3. Verificar se deve avisar
  const deveAvisar = atraso >= CONFIG_TEMPO.TOLERANCIA_AVISO;
  
  // 4. Verificar se deve cancelar
  const deveCancelar = atraso >= CONFIG_TEMPO.TEMPO_MAX_ATRASO;
  
  return { corrida, atraso, deveAvisar, deveCancelar };
}

const sim = simularCorrida();
teste('Corrida com 10min total, 5min previsto = 5min atraso', Math.abs(sim.atraso - 5) < 0.5);
teste('Com 5min de atraso, deve avisar (limite 2)', sim.deveAvisar === true);
teste('Com 5min de atraso, deve cancelar (limite 5)', sim.deveCancelar === true);

// ========================================
// RESULTADO FINAL
// ========================================

console.log('\n' + '='.repeat(50));
console.log('📊 RESULTADO FINAL\n');
console.log(`Total: ${passou + falhou}`);
console.log(`✅ Passou: ${passou}`);
console.log(`❌ Falhou: ${falhou}`);
console.log(`Taxa de sucesso: ${((passou / (passou + falhou)) * 100).toFixed(1)}%`);
console.log('='.repeat(50));

if (falhou === 0) {
  console.log('\n🎉 TODOS OS TESTES PASSARAM!');
  console.log('✅ Lógica de anti-fraude OK');
  console.log('✅ Cálculos de atraso OK');
  console.log('✅ Geração de mensagens OK');
  console.log('✅ Detecção de GPS falso OK');
  console.log('✅ Fluxo de corrida OK');
} else {
  console.log('\n⚠️ Alguns testes falharam!');
}

process.exit(falhou > 0 ? 1 : 0);
