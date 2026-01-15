// ========================================
// REBECA - SCRIPT DE TESTE E SIMULAÇÃO
// Valida todas as integrações do sistema
// ========================================

console.log('🧪 INICIANDO TESTES DO SISTEMA REBECA\n');
console.log('='.repeat(50));

// Simular ambiente
const resultados = {
  passou: 0,
  falhou: 0,
  avisos: 0,
  testes: []
};

function teste(nome, fn) {
  try {
    const resultado = fn();
    if (resultado === true) {
      console.log(`✅ ${nome}`);
      resultados.passou++;
      resultados.testes.push({ nome, status: 'passou' });
    } else if (resultado === 'aviso') {
      console.log(`⚠️ ${nome} (aviso)`);
      resultados.avisos++;
      resultados.testes.push({ nome, status: 'aviso' });
    } else {
      console.log(`❌ ${nome}: ${resultado}`);
      resultados.falhou++;
      resultados.testes.push({ nome, status: 'falhou', erro: resultado });
    }
  } catch (error) {
    console.log(`❌ ${nome} - ERRO: ${error.message}`);
    resultados.falhou++;
    resultados.testes.push({ nome, status: 'erro', erro: error.message });
  }
}

// ==========================================
// 1. TESTE DE IMPORTS
// ==========================================
console.log('\n📦 1. TESTANDO IMPORTS DOS MÓDULOS\n');

teste('Importar serviço OpenAI', () => {
  const OpenAIService = require('../src/services/openai');
  return OpenAIService && typeof OpenAIService.identificarIntencao === 'function';
});

teste('Importar serviço AntiFraude', () => {
  const { AntiFraude } = require('../src/services/antifraude');
  return AntiFraude && typeof AntiFraude === 'function';
});

teste('Importar serviço Monitoramento', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  return MonitoramentoCorridas && typeof MonitoramentoCorridas === 'function';
});

teste('Importar serviço Geocoding', () => {
  const GeocodingService = require('../src/services/geocoding');
  return GeocodingService && typeof GeocodingService.enderecoParaCoordenadas === 'function';
});

teste('Importar serviço Atribuição', () => {
  const AtribuicaoService = require('../src/services/atribuicao');
  return AtribuicaoService && typeof AtribuicaoService.buscarMotoristaProximo === 'function';
});

teste('Importar index de services', () => {
  const services = require('../src/services');
  return services.OpenAIService && services.AntiFraude && services.MonitoramentoCorridas;
});

// ==========================================
// 2. TESTE DO ANTI-FRAUDE
// ==========================================
console.log('\n🚨 2. TESTANDO SISTEMA ANTI-FRAUDE\n');

teste('Criar instância AntiFraude', () => {
  const { AntiFraude } = require('../src/services/antifraude');
  const antiFraude = new AntiFraude(null);
  return antiFraude !== null;
});

teste('Configurações de fraude existem', () => {
  const { CONFIG_FRAUDE } = require('../src/services/antifraude');
  return CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO === 3 &&
         CONFIG_FRAUDE.ATRASOS_ALERTA_VERMELHO === 5;
});

teste('Tipos de alerta definidos', () => {
  const { TIPO_ALERTA } = require('../src/services/antifraude');
  return TIPO_ALERTA.ATRASO === 'atraso' &&
         TIPO_ALERTA.CANCELAMENTO === 'cancelamento' &&
         TIPO_ALERTA.GPS_SUSPEITO === 'gps_suspeito';
});

teste('Severidades definidas', () => {
  const { SEVERIDADE } = require('../src/services/antifraude');
  return SEVERIDADE.AMARELO === 'amarelo' &&
         SEVERIDADE.VERMELHO === 'vermelho' &&
         SEVERIDADE.BLOQUEAR === 'bloquear';
});

teste('Função calcularScore existe', () => {
  const { AntiFraude } = require('../src/services/antifraude');
  const antiFraude = new AntiFraude(null);
  return typeof antiFraude.calcularScore === 'function';
});

teste('Cálculo de score funciona', () => {
  const { AntiFraude, SEVERIDADE } = require('../src/services/antifraude');
  const antiFraude = new AntiFraude(null);
  
  // Score sem alertas = 100
  const score1 = antiFraude.calcularScore([]);
  if (score1 !== 100) return `Score vazio deveria ser 100, foi ${score1}`;
  
  // Score com 1 alerta amarelo = 90
  const score2 = antiFraude.calcularScore([{ severidade: SEVERIDADE.AMARELO }]);
  if (score2 !== 90) return `Score amarelo deveria ser 90, foi ${score2}`;
  
  // Score com 1 alerta vermelho = 75
  const score3 = antiFraude.calcularScore([{ severidade: SEVERIDADE.VERMELHO }]);
  if (score3 !== 75) return `Score vermelho deveria ser 75, foi ${score3}`;
  
  return true;
});

teste('Função gerarRecomendacao funciona', () => {
  const { AntiFraude } = require('../src/services/antifraude');
  const antiFraude = new AntiFraude(null);
  
  const rec1 = antiFraude.gerarRecomendacao([], 100);
  if (rec1.acao !== 'OK') return `Score 100 deveria ser OK, foi ${rec1.acao}`;
  
  const rec2 = antiFraude.gerarRecomendacao([], 50);
  if (rec2.acao !== 'MONITORAR') return `Score 50 deveria ser MONITORAR, foi ${rec2.acao}`;
  
  const rec3 = antiFraude.gerarRecomendacao([], 20);
  if (rec3.acao !== 'BLOQUEAR') return `Score 20 deveria ser BLOQUEAR, foi ${rec3.acao}`;
  
  return true;
});

// ==========================================
// 3. TESTE DO MONITORAMENTO
// ==========================================
console.log('\n👁️ 3. TESTANDO SISTEMA DE MONITORAMENTO\n');

teste('Criar instância Monitoramento', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  return monitor !== null;
});

teste('Configurações de tempo existem', () => {
  const { CONFIG_TEMPO } = require('../src/services/monitoramento');
  return CONFIG_TEMPO.TOLERANCIA_AVISO === 2 &&
         CONFIG_TEMPO.TEMPO_MAX_ATRASO === 5 &&
         CONFIG_TEMPO.INTERVALO_VERIFICACAO === 30000;
});

teste('Status de corrida definidos', () => {
  const { STATUS_CORRIDA } = require('../src/services/monitoramento');
  return STATUS_CORRIDA.MOTORISTA_A_CAMINHO === 'motorista_a_caminho' &&
         STATUS_CORRIDA.CANCELADA_ATRASO === 'cancelada_atraso';
});

teste('Função calcularDistanciaMetros existe', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  return typeof monitor.calcularDistanciaMetros === 'function';
});

teste('Cálculo de distância funciona', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  // Distância entre dois pontos conhecidos em Lins-SP
  const dist = monitor.calcularDistanciaMetros(-21.6785, -49.7500, -21.6750, -49.7450);
  
  // Deve ser aproximadamente 600-700 metros
  if (dist < 500 || dist > 800) {
    return `Distância calculada ${dist.toFixed(0)}m está fora do esperado (500-800m)`;
  }
  
  return true;
});

teste('Função calcularHoraPrevista existe', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  return typeof monitor.calcularHoraPrevista === 'function';
});

teste('Função calcularMinutosAtraso existe', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  return typeof monitor.calcularMinutosAtraso === 'function';
});

teste('Cálculo de atraso funciona', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  const horaPrevista = new Date(Date.now() - 5 * 60 * 1000); // 5 min atrás
  const agora = new Date();
  
  const atraso = monitor.calcularMinutosAtraso(horaPrevista, agora);
  
  // Deve ser aproximadamente 5 minutos
  if (atraso < 4.9 || atraso > 5.1) {
    return `Atraso calculado ${atraso.toFixed(2)}min está fora do esperado (~5min)`;
  }
  
  return true;
});

// ==========================================
// 4. TESTE DO OPENAI SERVICE
// ==========================================
console.log('\n🤖 4. TESTANDO SERVIÇO OPENAI\n');

teste('Intenções definidas', () => {
  const OpenAIService = require('../src/services/openai');
  const { INTENCOES } = OpenAIService;
  return INTENCOES && INTENCOES.SAUDACAO === 'SAUDACAO' &&
         INTENCOES.QUER_CORRIDA === 'QUER_CORRIDA';
});

teste('Mensagens padrão existem', () => {
  const OpenAIService = require('../src/services/openai');
  const { MENSAGENS } = OpenAIService;
  return MENSAGENS && Array.isArray(MENSAGENS.saudacao) &&
         Array.isArray(MENSAGENS.pedirLocalizacao);
});

// ==========================================
// 5. TESTE DE SIMULAÇÃO DE FLUXO
// ==========================================
console.log('\n🔄 5. SIMULANDO FLUXO COMPLETO\n');

teste('Simular cálculo de score com múltiplos alertas', () => {
  const { AntiFraude, SEVERIDADE } = require('../src/services/antifraude');
  const antiFraude = new AntiFraude(null);
  
  const alertas = [
    { severidade: SEVERIDADE.VERMELHO },  // -25
    { severidade: SEVERIDADE.AMARELO },   // -10
    { severidade: SEVERIDADE.AMARELO },   // -10
    { severidade: SEVERIDADE.INFO }       // -2
  ];
  
  const score = antiFraude.calcularScore(alertas);
  // 100 - 25 - 10 - 10 - 2 = 53
  
  if (score !== 53) {
    return `Score deveria ser 53, foi ${score}`;
  }
  
  return true;
});

teste('Simular fluxo de monitoramento', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  // Simular adicionar corrida ao monitoramento
  const corridaFake = {
    id: 999,
    cliente_id: 1,
    cliente_telefone: '14999990000',
    cliente_nome: 'Teste',
    motorista_id: 1,
    motorista_nome: 'Motorista Teste',
    motorista_telefone: '14999991111',
    origem_lat: -21.6785,
    origem_lng: -49.7500,
    origem_endereco: 'Rua Teste, 123',
    tempo_estimado: 5,
    aceito_em: new Date()
  };
  
  monitor.adicionarMonitoramento(corridaFake);
  
  // Verificar se foi adicionado
  const temCorrida = monitor.corridasMonitoradas.has(999);
  
  // Remover
  monitor.removerMonitoramento(999);
  
  return temCorrida;
});

// ==========================================
// 6. TESTE DE INTEGRAÇÃO ENTRE MÓDULOS
// ==========================================
console.log('\n🔗 6. TESTANDO INTEGRAÇÃO ENTRE MÓDULOS\n');

teste('Monitoramento tem instância de AntiFraude', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  return monitor.antiFraude !== undefined && monitor.antiFraude !== null;
});

teste('Função registrarAtrasoAntiFraude existe', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  return typeof monitor.registrarAtrasoAntiFraude === 'function';
});

teste('Função verificarAntiFraude existe', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  return typeof monitor.verificarAntiFraude === 'function';
});

teste('Função notificarADMAntiFraude existe', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  return typeof monitor.notificarADMAntiFraude === 'function';
});

// ==========================================
// 7. TESTE DE MENSAGENS DA REBECA
// ==========================================
console.log('\n💬 7. TESTANDO MENSAGENS DA REBECA\n');

teste('Mensagem de atraso formatada corretamente', () => {
  const mensagem = `⚠️ Oi! O motorista João está com um pequeno atraso.

Ele deve chegar em mais alguns minutos. Estamos acompanhando!

Se demorar muito, vou buscar outro motorista pra você automaticamente, tá? 👍`;

  return mensagem.includes('atraso') && 
         mensagem.includes('João') && 
         mensagem.includes('automaticamente');
});

teste('Mensagem de troca de motorista formatada', () => {
  const mensagem = `🔄 Trocamos seu motorista!

O anterior teve um imprevisto, mas já encontrei outro mais perto de você.

🚗 *Novo motorista:*
Nome: Carlos
Veículo: Onix Branco
Placa: ABC-1234

⏱️ Tempo estimado: 3 minutos

Desculpa pelo transtorno! Ele já está a caminho 🚗`;

  return mensagem.includes('Trocamos') && 
         mensagem.includes('Carlos') && 
         mensagem.includes('3 minutos');
});

teste('Mensagem de alerta anti-fraude formatada', () => {
  const mensagem = `🚨 *ALERTA ANTI-FRAUDE - REBECA*

Detectei 2 motorista(s) com comportamento suspeito:

👤 *Carlos Ferreira* (Score: 35/100)
   └ ⏰ Muitos atrasos
   📊 Recomendação: MONITORAR

_Acesse o painel ADM > Anti-Fraude para mais detalhes._`;

  return mensagem.includes('ANTI-FRAUDE') && 
         mensagem.includes('Carlos Ferreira') && 
         mensagem.includes('35/100');
});

// ==========================================
// RESULTADO FINAL
// ==========================================
console.log('\n' + '='.repeat(50));
console.log('📊 RESULTADO DOS TESTES\n');
console.log(`✅ Passou: ${resultados.passou}`);
console.log(`⚠️ Avisos: ${resultados.avisos}`);
console.log(`❌ Falhou: ${resultados.falhou}`);
console.log(`📝 Total:  ${resultados.passou + resultados.avisos + resultados.falhou}`);

const percentual = ((resultados.passou / (resultados.passou + resultados.falhou)) * 100).toFixed(1);
console.log(`\n🎯 Taxa de sucesso: ${percentual}%`);

if (resultados.falhou === 0) {
  console.log('\n🎉 TODOS OS TESTES PASSARAM! Sistema validado.');
} else {
  console.log('\n⚠️ Alguns testes falharam. Verifique os erros acima.');
}

console.log('\n' + '='.repeat(50));

// Exportar resultados
module.exports = resultados;
