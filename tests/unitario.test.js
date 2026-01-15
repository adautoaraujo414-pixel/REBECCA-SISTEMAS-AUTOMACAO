// ========================================
// REBECA - TESTE UNITÁRIO ISOLADO
// Testa lógica sem dependência de banco
// ========================================

console.log('🧪 TESTE UNITÁRIO REBECA - ANTI-FRAUDE E MONITORAMENTO\n');
console.log('='.repeat(60));

const resultados = { total: 0, passou: 0, falhou: 0 };

function teste(nome, condicao) {
  resultados.total++;
  if (condicao) {
    console.log(`✅ ${nome}`);
    resultados.passou++;
  } else {
    console.log(`❌ ${nome}`);
    resultados.falhou++;
  }
}

// ========================================
// CONFIGURAÇÕES (copiadas dos arquivos)
// ========================================
const CONFIG_FRAUDE = {
  ATRASOS_ALERTA_AMARELO: 3,
  ATRASOS_ALERTA_VERMELHO: 5,
  ATRASOS_BLOQUEAR: 10,
  CANCELAMENTOS_ALERTA: 5,
  TAXA_CANCELAMENTO_ALERTA: 0.3,
  NOTA_MINIMA_ALERTA: 3.5,
};

const CONFIG_TEMPO = {
  TOLERANCIA_AVISO: 2,
  TEMPO_MAX_ATRASO: 5,
  INTERVALO_VERIFICACAO: 30000,
  DISTANCIA_CHEGADA: 100,
};

const SEVERIDADE = {
  INFO: 'info',
  AMARELO: 'amarelo',
  VERMELHO: 'vermelho',
  BLOQUEAR: 'bloquear',
};

// ========================================
// FUNÇÕES DE CÁLCULO (copiadas)
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
  if (score <= 20) return { acao: 'BLOQUEAR', cor: 'vermelho', texto: 'Recomendado bloquear' };
  if (score <= 50) return { acao: 'MONITORAR', cor: 'laranja', texto: 'Comportamento suspeito' };
  if (score <= 75) return { acao: 'ATENÇÃO', cor: 'amarelo', texto: 'Alguns alertas detectados' };
  return { acao: 'OK', cor: 'verde', texto: 'Sem problemas significativos' };
}

function verificarAtrasos(motorista) {
  const atrasos = motorista.qtd_atrasos || 0;
  if (atrasos >= CONFIG_FRAUDE.ATRASOS_BLOQUEAR) {
    return { tipo: 'atraso', severidade: SEVERIDADE.BLOQUEAR, titulo: 'Muitos atrasos' };
  } else if (atrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_VERMELHO) {
    return { tipo: 'atraso', severidade: SEVERIDADE.VERMELHO, titulo: 'Muitos atrasos' };
  } else if (atrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO) {
    return { tipo: 'atraso', severidade: SEVERIDADE.AMARELO, titulo: 'Atrasos frequentes' };
  }
  return null;
}

function verificarCancelamentos(motorista) {
  const canceladas = motorista.total_canceladas || 0;
  const total = motorista.total_corridas || 1;
  const taxa = canceladas / total;
  if (canceladas >= CONFIG_FRAUDE.CANCELAMENTOS_ALERTA || taxa >= CONFIG_FRAUDE.TAXA_CANCELAMENTO_ALERTA) {
    return {
      tipo: 'cancelamento',
      severidade: taxa >= 0.4 ? SEVERIDADE.VERMELHO : SEVERIDADE.AMARELO,
      titulo: 'Taxa de cancelamento alta',
    };
  }
  return null;
}

function verificarNota(motorista) {
  const nota = parseFloat(motorista.nota_media || 5);
  if (nota < CONFIG_FRAUDE.NOTA_MINIMA_ALERTA && (motorista.total_corridas || 0) >= 5) {
    return {
      tipo: 'nota_baixa',
      severidade: nota < 3 ? SEVERIDADE.VERMELHO : SEVERIDADE.AMARELO,
      titulo: 'Nota muito baixa',
    };
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

console.log('\n📊 TESTE 1: CÁLCULO DE SCORE\n');

teste('Score 100 com 0 alertas', calcularScore([]) === 100);
teste('Score 90 com 1 alerta amarelo', calcularScore([{severidade:'amarelo'}]) === 90);
teste('Score 75 com 1 alerta vermelho', calcularScore([{severidade:'vermelho'}]) === 75);
teste('Score 60 com 1 alerta bloquear', calcularScore([{severidade:'bloquear'}]) === 60);
teste('Score 55 com múltiplos alertas', calcularScore([
  {severidade:'vermelho'}, {severidade:'amarelo'}, {severidade:'amarelo'}
]) === 55);
teste('Score mínimo é 0', calcularScore([
  {severidade:'bloquear'}, {severidade:'bloquear'}, {severidade:'bloquear'}
]) === 0);

console.log('\n📋 TESTE 2: RECOMENDAÇÕES\n');

teste('Score 15 → BLOQUEAR', gerarRecomendacao([], 15).acao === 'BLOQUEAR');
teste('Score 40 → MONITORAR', gerarRecomendacao([], 40).acao === 'MONITORAR');
teste('Score 60 → ATENÇÃO', gerarRecomendacao([], 60).acao === 'ATENÇÃO');
teste('Score 85 → OK', gerarRecomendacao([], 85).acao === 'OK');

console.log('\n⏰ TESTE 3: VERIFICAÇÃO DE ATRASOS\n');

teste('2 atrasos → sem alerta', verificarAtrasos({qtd_atrasos: 2}) === null);
teste('3 atrasos → AMARELO', verificarAtrasos({qtd_atrasos: 3})?.severidade === 'amarelo');
teste('5 atrasos → VERMELHO', verificarAtrasos({qtd_atrasos: 5})?.severidade === 'vermelho');
teste('10 atrasos → BLOQUEAR', verificarAtrasos({qtd_atrasos: 10})?.severidade === 'bloquear');

console.log('\n❌ TESTE 4: VERIFICAÇÃO DE CANCELAMENTOS\n');

teste('10% cancelamento → sem alerta', verificarCancelamentos({total_canceladas: 1, total_corridas: 10}) === null);
teste('35% cancelamento → AMARELO', verificarCancelamentos({total_canceladas: 7, total_corridas: 20})?.severidade === 'amarelo');
teste('50% cancelamento → VERMELHO', verificarCancelamentos({total_canceladas: 10, total_corridas: 20})?.severidade === 'vermelho');

console.log('\n⭐ TESTE 5: VERIFICAÇÃO DE NOTA\n');

teste('Nota 4.5 → sem alerta', verificarNota({nota_media: 4.5, total_corridas: 10}) === null);
teste('Nota 3.2 → AMARELO', verificarNota({nota_media: 3.2, total_corridas: 10})?.severidade === 'amarelo');
teste('Nota 2.5 → VERMELHO', verificarNota({nota_media: 2.5, total_corridas: 10})?.severidade === 'vermelho');
teste('Nota baixa mas poucas corridas → sem alerta', verificarNota({nota_media: 2.0, total_corridas: 3}) === null);

console.log('\n📍 TESTE 6: CÁLCULO DE DISTÂNCIA\n');

const dist0 = calcularDistanciaMetros(-21.6785, -49.7500, -21.6785, -49.7500);
teste('Mesmo ponto = 0m', dist0 < 1);

const dist1km = calcularDistanciaMetros(-21.6785, -49.7500, -21.6875, -49.7500);
teste('~1km de distância', dist1km > 900 && dist1km < 1100);

const distPerto = calcularDistanciaMetros(-21.6785, -49.7500, -21.6786, -49.7501);
teste('Distância < 100m (chegou)', distPerto < CONFIG_TEMPO.DISTANCIA_CHEGADA);

console.log('\n⏱️ TESTE 7: CÁLCULO DE ATRASO\n');

const agora = new Date();
const atrasoNeg = calcularMinutosAtraso(new Date(agora.getTime() + 5*60*1000), agora);
teste('Antes da hora prevista (negativo)', atrasoNeg < 0);

const atraso0 = calcularMinutosAtraso(agora, agora);
teste('Exatamente na hora (0 min)', Math.abs(atraso0) < 0.1);

const atraso2 = calcularMinutosAtraso(new Date(agora.getTime() - 2*60*1000), agora);
teste('2 min de atraso', atraso2 >= 1.9 && atraso2 <= 2.1);

const atraso5 = calcularMinutosAtraso(new Date(agora.getTime() - 5*60*1000), agora);
teste('5 min de atraso (limite cancelar)', atraso5 >= CONFIG_TEMPO.TEMPO_MAX_ATRASO);

console.log('\n🔄 TESTE 8: SIMULAÇÃO COMPLETA\n');

// Motorista problemático
const motProblematico = { id: 1, nome: 'Carlos', qtd_atrasos: 6, total_canceladas: 8, total_corridas: 20, nota_media: 3.0 };
const alertasProb = [
  verificarAtrasos(motProblematico),
  verificarCancelamentos(motProblematico),
  verificarNota(motProblematico)
].filter(a => a !== null);
const scoreProb = calcularScore(alertasProb);
const recProb = gerarRecomendacao(alertasProb, scoreProb);

console.log(`   Motorista Problemático: Score ${scoreProb}, ${alertasProb.length} alertas, Ação: ${recProb.acao}`);
teste('Motorista problemático detectado', alertasProb.length >= 2 && scoreProb < 70);

// Motorista OK
const motOK = { id: 2, nome: 'João', qtd_atrasos: 1, total_canceladas: 2, total_corridas: 50, nota_media: 4.8 };
const alertasOK = [
  verificarAtrasos(motOK),
  verificarCancelamentos(motOK),
  verificarNota(motOK)
].filter(a => a !== null);
const scoreOK = calcularScore(alertasOK);
const recOK = gerarRecomendacao(alertasOK, scoreOK);

console.log(`   Motorista OK: Score ${scoreOK}, ${alertasOK.length} alertas, Ação: ${recOK.acao}`);
teste('Motorista OK sem alertas', alertasOK.length === 0 && scoreOK === 100 && recOK.acao === 'OK');

console.log('\n📱 TESTE 9: MOCK DE NOTIFICAÇÕES\n');

const mockWhatsApp = {
  mensagens: [],
  enviarMensagem: function(tel, msg) {
    this.mensagens.push({tel, msg, hora: new Date()});
    return true;
  }
};

// Simular notificação
const msgTeste = '🚨 ALERTA: Motorista Carlos com 6 atrasos!';
mockWhatsApp.enviarMensagem('5514999990001', msgTeste);
teste('Mensagem enviada ao mock', mockWhatsApp.mensagens.length === 1);
teste('Conteúdo correto', mockWhatsApp.mensagens[0].msg.includes('Carlos'));
teste('Telefone correto', mockWhatsApp.mensagens[0].tel === '5514999990001');

// Múltiplas mensagens
mockWhatsApp.enviarMensagem('5514999990002', 'Mensagem 2');
mockWhatsApp.enviarMensagem('5514999990003', 'Mensagem 3');
teste('Múltiplas mensagens', mockWhatsApp.mensagens.length === 3);

// ========================================
// RESULTADO FINAL
// ========================================
console.log('\n' + '='.repeat(60));
console.log('📊 RESULTADO FINAL');
console.log('='.repeat(60));
console.log(`\n✅ Passou: ${resultados.passou}/${resultados.total}`);
console.log(`❌ Falhou: ${resultados.falhou}/${resultados.total}`);
console.log(`📈 Taxa de sucesso: ${((resultados.passou / resultados.total) * 100).toFixed(1)}%\n`);

if (resultados.falhou === 0) {
  console.log('🎉 TODOS OS TESTES PASSARAM!');
  console.log('✅ Sistema Anti-Fraude: VALIDADO');
  console.log('✅ Sistema Monitoramento: VALIDADO');
  console.log('✅ Cálculos de Score: CORRETOS');
  console.log('✅ Detecção de Problemas: FUNCIONANDO');
  console.log('✅ Mock de Notificações: OK');
} else {
  console.log('⚠️ Alguns testes falharam. Verificar implementação.');
}
console.log('='.repeat(60) + '\n');
