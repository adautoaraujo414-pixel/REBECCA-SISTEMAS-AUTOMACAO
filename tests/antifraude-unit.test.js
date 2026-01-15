#!/usr/bin/env node
// ========================================
// REBECA - TESTE UNITÁRIO ANTI-FRAUDE
// Testa lógica isolada sem banco de dados
// ========================================

console.log('🧪 TESTE UNITÁRIO ANTI-FRAUDE (sem banco)\n');
console.log('='.repeat(50));

let passou = 0, falhou = 0;

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
// CONFIGURAÇÕES (copiadas do módulo)
// ========================================
const CONFIG_FRAUDE = {
  ATRASOS_ALERTA_AMARELO: 3,
  ATRASOS_ALERTA_VERMELHO: 5,
  ATRASOS_BLOQUEAR: 10,
  CANCELAMENTOS_ALERTA: 5,
  TAXA_CANCELAMENTO_ALERTA: 0.3,
  CORRIDA_MUITO_CURTA_KM: 0.3,
  CORRIDAS_CURTAS_ALERTA: 5,
  TAXA_RECUSA_ALERTA: 0.5,
  VELOCIDADE_IMPOSSIVEL_KMH: 200,
  NOTA_MINIMA_ALERTA: 3.5,
};

const SEVERIDADE = {
  INFO: 'info',
  AMARELO: 'amarelo',
  VERMELHO: 'vermelho',
  BLOQUEAR: 'bloquear',
};

// ========================================
// FUNÇÕES DE CÁLCULO (copiadas do módulo)
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
  if (score <= 20) return { acao: 'BLOQUEAR', cor: 'vermelho', texto: 'Bloquear imediatamente' };
  if (score <= 50) return { acao: 'MONITORAR', cor: 'laranja', texto: 'Monitorar de perto' };
  if (score <= 75) return { acao: 'ATENÇÃO', cor: 'amarelo', texto: 'Manter atenção' };
  return { acao: 'OK', cor: 'verde', texto: 'Sem problemas' };
}

function verificarAtrasos(motorista) {
  const atrasos = motorista.qtd_atrasos || 0;
  if (atrasos >= CONFIG_FRAUDE.ATRASOS_BLOQUEAR) {
    return { tipo: 'atraso', severidade: SEVERIDADE.BLOQUEAR, titulo: 'Muitos atrasos - Bloquear' };
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
      taxa: taxa
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
      nota: nota
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
console.log('\n📊 TESTE: Cálculo de Score\n');

teste('Score sem alertas = 100', calcularScore([]) === 100);
teste('Score com INFO = 98', calcularScore([{severidade: SEVERIDADE.INFO}]) === 98);
teste('Score com AMARELO = 90', calcularScore([{severidade: SEVERIDADE.AMARELO}]) === 90);
teste('Score com VERMELHO = 75', calcularScore([{severidade: SEVERIDADE.VERMELHO}]) === 75);
teste('Score com BLOQUEAR = 60', calcularScore([{severidade: SEVERIDADE.BLOQUEAR}]) === 60);
teste('Score múltiplos = 63', calcularScore([
  {severidade: SEVERIDADE.VERMELHO},
  {severidade: SEVERIDADE.AMARELO},
  {severidade: SEVERIDADE.INFO}
]) === 63);
teste('Score mínimo = 0', calcularScore([
  {severidade: SEVERIDADE.BLOQUEAR},
  {severidade: SEVERIDADE.BLOQUEAR},
  {severidade: SEVERIDADE.BLOQUEAR}
]) === 0);

console.log('\n💡 TESTE: Recomendações\n');

teste('Score 15 = BLOQUEAR', gerarRecomendacao([], 15).acao === 'BLOQUEAR');
teste('Score 45 = MONITORAR', gerarRecomendacao([], 45).acao === 'MONITORAR');
teste('Score 70 = ATENÇÃO', gerarRecomendacao([], 70).acao === 'ATENÇÃO');
teste('Score 85 = OK', gerarRecomendacao([], 85).acao === 'OK');

console.log('\n⏰ TESTE: Verificar Atrasos\n');

teste('0 atrasos = null', verificarAtrasos({qtd_atrasos: 0}) === null);
teste('2 atrasos = null', verificarAtrasos({qtd_atrasos: 2}) === null);
teste('3 atrasos = AMARELO', verificarAtrasos({qtd_atrasos: 3})?.severidade === SEVERIDADE.AMARELO);
teste('5 atrasos = VERMELHO', verificarAtrasos({qtd_atrasos: 5})?.severidade === SEVERIDADE.VERMELHO);
teste('10 atrasos = BLOQUEAR', verificarAtrasos({qtd_atrasos: 10})?.severidade === SEVERIDADE.BLOQUEAR);

console.log('\n❌ TESTE: Verificar Cancelamentos\n');

teste('5% cancel = null', verificarCancelamentos({total_canceladas: 5, total_corridas: 100}) === null);
teste('30% cancel = AMARELO', verificarCancelamentos({total_canceladas: 30, total_corridas: 100})?.severidade === SEVERIDADE.AMARELO);
teste('45% cancel = VERMELHO', verificarCancelamentos({total_canceladas: 45, total_corridas: 100})?.severidade === SEVERIDADE.VERMELHO);

console.log('\n⭐ TESTE: Verificar Nota\n');

teste('Nota 4.5 = null', verificarNota({nota_media: 4.5, total_corridas: 10}) === null);
teste('Nota 3.2 = AMARELO', verificarNota({nota_media: 3.2, total_corridas: 10})?.severidade === SEVERIDADE.AMARELO);
teste('Nota 2.5 = VERMELHO', verificarNota({nota_media: 2.5, total_corridas: 10})?.severidade === SEVERIDADE.VERMELHO);
teste('Nota baixa mas poucas corridas = null', verificarNota({nota_media: 2.0, total_corridas: 3}) === null);

console.log('\n📍 TESTE: Cálculos de Distância\n');

const dist = calcularDistanciaMetros(-21.6785, -49.7500, -21.6790, -49.7505);
teste('Distância ~70m entre pontos próximos', dist > 50 && dist < 100);

const dist2 = calcularDistanciaMetros(-21.6785, -49.7500, -21.6885, -49.7600);
teste('Distância ~1.5km entre pontos distantes', dist2 > 1000 && dist2 < 2000);

console.log('\n⏱️ TESTE: Cálculo de Atraso\n');

const agora = new Date();
const prevista3min = new Date(agora.getTime() - 3 * 60 * 1000);
const atraso3 = calcularMinutosAtraso(prevista3min, agora);
teste('3 minutos de atraso calculado corretamente', atraso3 >= 2.9 && atraso3 <= 3.1);

const previstoFuturo = new Date(agora.getTime() + 5 * 60 * 1000);
const atrasoFuturo = calcularMinutosAtraso(previstoFuturo, agora);
teste('Sem atraso (futuro) = negativo', atrasoFuturo < 0);

console.log('\n🔄 TESTE: Fluxo Completo - Motorista Problemático\n');

const motoristaMau = {
  qtd_atrasos: 6,
  total_canceladas: 40,
  total_corridas: 100,
  nota_media: 3.0
};

const alertas = [
  verificarAtrasos(motoristaMau),
  verificarCancelamentos(motoristaMau),
  verificarNota(motoristaMau)
].filter(a => a !== null);

const score = calcularScore(alertas);
const recomendacao = gerarRecomendacao(alertas, score);

teste('Motorista mau gera 3 alertas', alertas.length === 3);
teste('Score do motorista mau < 50', score < 50);
teste('Recomendação não é OK', recomendacao.acao !== 'OK');

console.log(`   📊 Score calculado: ${score}`);
console.log(`   📋 Alertas: ${alertas.length}`);
console.log(`   💡 Recomendação: ${recomendacao.acao}`);

console.log('\n🔄 TESTE: Fluxo Completo - Motorista Bom\n');

const motoristaBom = {
  qtd_atrasos: 1,
  total_canceladas: 5,
  total_corridas: 100,
  nota_media: 4.8
};

const alertasBom = [
  verificarAtrasos(motoristaBom),
  verificarCancelamentos(motoristaBom),
  verificarNota(motoristaBom)
].filter(a => a !== null);

const scoreBom = calcularScore(alertasBom);
const recomendacaoBom = gerarRecomendacao(alertasBom, scoreBom);

teste('Motorista bom gera 0 alertas', alertasBom.length === 0);
teste('Score do motorista bom = 100', scoreBom === 100);
teste('Recomendação é OK', recomendacaoBom.acao === 'OK');

console.log(`   📊 Score calculado: ${scoreBom}`);
console.log(`   📋 Alertas: ${alertasBom.length}`);
console.log(`   💡 Recomendação: ${recomendacaoBom.acao}`);

console.log('\n📱 TESTE: Formato de Mensagem WhatsApp\n');

function gerarMensagemAlerta(motorista, alertas, score, recomendacao) {
  let msg = `🚨 *ALERTA ANTI-FRAUDE - REBECA*\n\n`;
  msg += `Motorista: *${motorista.nome}* (Score: ${score}/100)\n`;
  msg += `Alertas: ${alertas.length}\n\n`;
  
  for (const a of alertas.slice(0, 3)) {
    msg += `• ${a.titulo}\n`;
  }
  
  msg += `\n📊 Recomendação: *${recomendacao.acao}*\n`;
  msg += `_Acesse o painel ADM > Anti-Fraude_`;
  
  return msg;
}

const msgTeste = gerarMensagemAlerta(
  { nome: 'João Silva' },
  alertas,
  score,
  recomendacao
);

teste('Mensagem contém nome', msgTeste.includes('João Silva'));
teste('Mensagem contém score', msgTeste.includes(score.toString()));
teste('Mensagem contém recomendação', msgTeste.includes(recomendacao.acao));
teste('Mensagem contém ALERTA ANTI-FRAUDE', msgTeste.includes('ALERTA ANTI-FRAUDE'));

console.log('\n📝 Exemplo de mensagem gerada:');
console.log('-'.repeat(40));
console.log(msgTeste);
console.log('-'.repeat(40));

// ========================================
// RESULTADO
// ========================================
console.log('\n' + '='.repeat(50));
console.log('📊 RESULTADO FINAL\n');
console.log(`✅ Passou: ${passou}`);
console.log(`❌ Falhou: ${falhou}`);
console.log(`📈 Taxa de sucesso: ${((passou / (passou + falhou)) * 100).toFixed(1)}%`);
console.log('='.repeat(50));

if (falhou === 0) {
  console.log('\n🎉 TODOS OS TESTES PASSARAM!');
  console.log('✅ Lógica do Anti-Fraude está funcionando corretamente!');
  console.log('✅ Cálculos de score estão corretos!');
  console.log('✅ Recomendações estão corretas!');
  console.log('✅ Detecção de problemas está funcionando!');
  console.log('✅ Mensagens de alerta estão formatadas!');
} else {
  console.log('\n⚠️ Alguns testes falharam!');
  process.exit(1);
}
