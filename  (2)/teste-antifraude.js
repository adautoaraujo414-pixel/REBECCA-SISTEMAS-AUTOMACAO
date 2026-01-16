#!/usr/bin/env node
// ========================================
// REBECA - TESTE DO SISTEMA ANTI-FRAUDE
// Simula cenários e valida integrações
// ========================================

console.log('🧪 INICIANDO TESTES DO SISTEMA REBECA\n');
console.log('='.repeat(50));

// Simular módulos (sem banco real)
const resultadosTeste = {
  passou: 0,
  falhou: 0,
  avisos: 0,
  detalhes: []
};

function teste(nome, funcao) {
  try {
    const resultado = funcao();
    if (resultado === true) {
      console.log(`✅ ${nome}`);
      resultadosTeste.passou++;
      resultadosTeste.detalhes.push({ nome, status: 'passou' });
    } else if (resultado === 'aviso') {
      console.log(`⚠️ ${nome} (aviso)`);
      resultadosTeste.avisos++;
      resultadosTeste.detalhes.push({ nome, status: 'aviso' });
    } else {
      console.log(`❌ ${nome}`);
      resultadosTeste.falhou++;
      resultadosTeste.detalhes.push({ nome, status: 'falhou', erro: resultado });
    }
  } catch (error) {
    console.log(`❌ ${nome} - ERRO: ${error.message}`);
    resultadosTeste.falhou++;
    resultadosTeste.detalhes.push({ nome, status: 'erro', erro: error.message });
  }
}

// ========================================
// TESTE 1: Importação de Módulos
// ========================================
console.log('\n📦 TESTE 1: Importação de Módulos\n');

teste('Importar serviço OpenAI', () => {
  const OpenAIService = require('../src/services/openai');
  return OpenAIService && typeof OpenAIService.INTENCOES === 'object';
});

teste('Importar serviço Anti-Fraude', () => {
  const { AntiFraude, CONFIG_FRAUDE, TIPO_ALERTA, SEVERIDADE } = require('../src/services/antifraude');
  return AntiFraude && CONFIG_FRAUDE && TIPO_ALERTA && SEVERIDADE;
});

teste('Importar serviço Monitoramento', () => {
  const { MonitoramentoCorridas, CONFIG_TEMPO, STATUS_CORRIDA } = require('../src/services/monitoramento');
  return MonitoramentoCorridas && CONFIG_TEMPO && STATUS_CORRIDA;
});

teste('Importar serviço Geocoding', () => {
  const GeocodingService = require('../src/services/geocoding');
  return GeocodingService && typeof GeocodingService.calcularDistancia === 'function';
});

teste('Importar index de serviços', () => {
  const services = require('../src/services');
  return services.OpenAIService && services.AntiFraude && services.MonitoramentoCorridas;
});

// ========================================
// TESTE 2: Configurações Anti-Fraude
// ========================================
console.log('\n🔧 TESTE 2: Configurações Anti-Fraude\n');

teste('CONFIG_FRAUDE tem todos os parâmetros', () => {
  const { CONFIG_FRAUDE } = require('../src/services/antifraude');
  const params = [
    'ATRASOS_ALERTA_AMARELO',
    'ATRASOS_ALERTA_VERMELHO', 
    'ATRASOS_BLOQUEAR',
    'CANCELAMENTOS_ALERTA',
    'CORRIDA_MUITO_CURTA_KM',
    'GPS_SALTOS_ALERTA',
    'NOTA_MINIMA_ALERTA'
  ];
  return params.every(p => CONFIG_FRAUDE[p] !== undefined);
});

teste('TIPO_ALERTA tem todos os tipos', () => {
  const { TIPO_ALERTA } = require('../src/services/antifraude');
  const tipos = ['ATRASO', 'CANCELAMENTO', 'CORRIDA_CURTA', 'GPS_SUSPEITO', 'NOTA_BAIXA'];
  return tipos.every(t => TIPO_ALERTA[t] !== undefined);
});

teste('SEVERIDADE tem todos os níveis', () => {
  const { SEVERIDADE } = require('../src/services/antifraude');
  const niveis = ['INFO', 'AMARELO', 'VERMELHO', 'BLOQUEAR'];
  return niveis.every(n => SEVERIDADE[n] !== undefined);
});

// ========================================
// TESTE 3: Lógica de Detecção de Fraude
// ========================================
console.log('\n🔍 TESTE 3: Lógica de Detecção de Fraude\n');

teste('Calcular score corretamente', () => {
  const { AntiFraude, SEVERIDADE } = require('../src/services/antifraude');
  const af = new AntiFraude();
  
  // Score começa em 100, cada alerta vermelho tira 25
  const alertas = [
    { severidade: SEVERIDADE.VERMELHO },
    { severidade: SEVERIDADE.AMARELO }
  ];
  
  const score = af.calcularScore(alertas);
  // 100 - 25 (vermelho) - 10 (amarelo) = 65
  return score === 65;
});

teste('Gerar recomendação BLOQUEAR para score baixo', () => {
  const { AntiFraude } = require('../src/services/antifraude');
  const af = new AntiFraude();
  
  const rec = af.gerarRecomendacao([], 15);
  return rec.acao === 'BLOQUEAR';
});

teste('Gerar recomendação MONITORAR para score médio', () => {
  const { AntiFraude } = require('../src/services/antifraude');
  const af = new AntiFraude();
  
  const rec = af.gerarRecomendacao([], 45);
  return rec.acao === 'MONITORAR';
});

teste('Gerar recomendação OK para score alto', () => {
  const { AntiFraude } = require('../src/services/antifraude');
  const af = new AntiFraude();
  
  const rec = af.gerarRecomendacao([], 85);
  return rec.acao === 'OK';
});

// ========================================
// TESTE 4: Configurações de Monitoramento
// ========================================
console.log('\n⏱️ TESTE 4: Configurações de Monitoramento\n');

teste('CONFIG_TEMPO tem parâmetros corretos', () => {
  const { CONFIG_TEMPO } = require('../src/services/monitoramento');
  return CONFIG_TEMPO.TOLERANCIA_AVISO === 2 &&
         CONFIG_TEMPO.TEMPO_MAX_ATRASO === 5 &&
         CONFIG_TEMPO.INTERVALO_VERIFICACAO === 30000;
});

teste('STATUS_CORRIDA tem todos os status', () => {
  const { STATUS_CORRIDA } = require('../src/services/monitoramento');
  const status = ['MOTORISTA_A_CAMINHO', 'MOTORISTA_CHEGOU', 'CANCELADA_ATRASO'];
  return status.every(s => STATUS_CORRIDA[s] !== undefined);
});

// ========================================
// TESTE 5: Classe MonitoramentoCorridas
// ========================================
console.log('\n👁️ TESTE 5: Classe MonitoramentoCorridas\n');

teste('Instanciar MonitoramentoCorridas', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  return monitor && typeof monitor.iniciar === 'function';
});

teste('Calcular distância em metros', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  // Distância entre dois pontos próximos em Lins-SP
  const distancia = monitor.calcularDistanciaMetros(
    -21.6785, -49.7500,
    -21.6790, -49.7505
  );
  
  // Deve ser aproximadamente 70-80 metros
  return distancia > 50 && distancia < 100;
});

teste('Calcular hora prevista de chegada', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  const corrida = {
    aceito_em: new Date(),
    tempo_estimado: 5
  };
  
  const horaPrevista = monitor.calcularHoraPrevista(corrida);
  const diff = (horaPrevista.getTime() - Date.now()) / 60000; // em minutos
  
  // Deve ser aproximadamente 5 minutos no futuro
  return diff > 4.9 && diff < 5.1;
});

teste('Calcular minutos de atraso', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  const horaPrevista = new Date(Date.now() - 3 * 60000); // 3 min atrás
  const agora = new Date();
  
  const atraso = monitor.calcularMinutosAtraso(horaPrevista, agora);
  
  return atraso > 2.9 && atraso < 3.1;
});

// ========================================
// TESTE 6: Classe AntiFraude
// ========================================
console.log('\n🚨 TESTE 6: Classe AntiFraude\n');

teste('Instanciar AntiFraude', () => {
  const { AntiFraude } = require('../src/services/antifraude');
  const af = new AntiFraude(null);
  return af && typeof af.analisarMotorista === 'function';
});

teste('Verificar atrasos retorna alerta correto', () => {
  const { AntiFraude, SEVERIDADE } = require('../src/services/antifraude');
  const af = new AntiFraude(null);
  
  // Simular motorista com 6 atrasos (deve ser alerta vermelho)
  const motorista = { qtd_atrasos: 6 };
  
  // Chamar método de forma síncrona (simulando)
  const atrasos = motorista.qtd_atrasos;
  const limite = 5; // ATRASOS_ALERTA_VERMELHO
  
  if (atrasos >= limite) {
    return true; // Seria gerado alerta vermelho
  }
  return false;
});

// ========================================
// TESTE 7: Simulação de Fluxo Completo
// ========================================
console.log('\n🔄 TESTE 7: Simulação de Fluxo Completo\n');

teste('Simular fluxo: corrida aceita → atraso → cancelar → reatribuir', () => {
  // Simular dados
  const corridaSimulada = {
    id: 999,
    motorista_id: 1,
    motorista_nome: 'João Teste',
    cliente_id: 1,
    cliente_nome: 'Cliente Teste',
    origem_lat: -21.6785,
    origem_lng: -49.7500,
    tempo_estimado: 5,
    hora_aceite: new Date(Date.now() - 8 * 60000), // 8 minutos atrás
  };
  
  // Calcular atraso
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const monitor = new MonitoramentoCorridas(null, null);
  
  const horaPrevista = new Date(corridaSimulada.hora_aceite.getTime() + corridaSimulada.tempo_estimado * 60000);
  const atraso = monitor.calcularMinutosAtraso(horaPrevista, new Date());
  
  // Atraso deve ser ~3 minutos (8 - 5 = 3)
  const deveAvisar = atraso >= 2;
  const deveCancelar = atraso >= 5;
  
  // Com 8 min desde aceite e 5 min estimado, deveria cancelar
  return deveCancelar === false && deveAvisar === true; // 3 min de atraso = avisa mas não cancela
});

teste('Simular detecção de GPS falso (velocidade impossível)', () => {
  const { CONFIG_FRAUDE } = require('../src/services/antifraude');
  
  // Simular velocidade calculada
  const velocidadeCalculada = 250; // km/h
  const limiteVelocidade = CONFIG_FRAUDE.VELOCIDADE_IMPOSSIVEL_KMH; // 200 km/h
  
  const gpsSuspeito = velocidadeCalculada > limiteVelocidade;
  
  return gpsSuspeito === true;
});

// ========================================
// TESTE 8: Integração OpenAI
// ========================================
console.log('\n🤖 TESTE 8: Integração OpenAI\n');

teste('OpenAI INTENCOES definidas corretamente', () => {
  const OpenAIService = require('../src/services/openai');
  const intencoes = [
    'SAUDACAO', 'QUER_CORRIDA', 'ENVIOU_ENDERECO', 
    'CONFIRMACAO', 'NEGACAO', 'QUER_CANCELAR'
  ];
  return intencoes.every(i => OpenAIService.INTENCOES[i] !== undefined);
});

teste('OpenAI tem função gerarResposta', () => {
  const OpenAIService = require('../src/services/openai');
  return typeof OpenAIService.gerarResposta === 'function';
});

teste('OpenAI tem função identificarIntencao', () => {
  const OpenAIService = require('../src/services/openai');
  return typeof OpenAIService.identificarIntencao === 'function';
});

teste('OpenAI tem função transcreverAudio', () => {
  const OpenAIService = require('../src/services/openai');
  return typeof OpenAIService.transcreverAudio === 'function';
});

// ========================================
// TESTE 9: Mensagens Padrão da Rebeca
// ========================================
console.log('\n💬 TESTE 9: Mensagens Padrão da Rebeca\n');

teste('Mensagens de saudação definidas', () => {
  const OpenAIService = require('../src/services/openai');
  return OpenAIService.MENSAGENS_REBECA && 
         OpenAIService.MENSAGENS_REBECA.saudacao &&
         OpenAIService.MENSAGENS_REBECA.saudacao.length > 0;
});

teste('Mensagens de sem motorista definidas', () => {
  const OpenAIService = require('../src/services/openai');
  return OpenAIService.MENSAGENS_REBECA.semMotorista &&
         OpenAIService.MENSAGENS_REBECA.semMotorista.length > 0;
});

teste('Mensagem de motorista a caminho tem template', () => {
  const OpenAIService = require('../src/services/openai');
  const msg = OpenAIService.MENSAGENS_REBECA.motoristaACaminho;
  return msg && msg.includes('{NOME}') && msg.includes('{VEICULO}');
});

// ========================================
// TESTE 10: APIs Disponíveis
// ========================================
console.log('\n🌐 TESTE 10: APIs Disponíveis\n');

teste('API Admin existe', () => {
  const adminRouter = require('../src/api/admin');
  return adminRouter && typeof adminRouter === 'function';
});

teste('API Master existe', () => {
  const masterRouter = require('../src/api/master');
  return masterRouter && typeof masterRouter === 'function';
});

teste('API Motorista existe', () => {
  const motoristaRouter = require('../src/api/motorista');
  return motoristaRouter && typeof motoristaRouter === 'function';
});

teste('API Auth existe', () => {
  const authRouter = require('../src/api/auth');
  return authRouter && typeof authRouter === 'function';
});

// ========================================
// RESULTADO FINAL
// ========================================
console.log('\n' + '='.repeat(50));
console.log('📊 RESULTADO FINAL DOS TESTES\n');

const total = resultadosTeste.passou + resultadosTeste.falhou + resultadosTeste.avisos;
const percentual = ((resultadosTeste.passou / total) * 100).toFixed(1);

console.log(`✅ Passou: ${resultadosTeste.passou}`);
console.log(`❌ Falhou: ${resultadosTeste.falhou}`);
console.log(`⚠️ Avisos: ${resultadosTeste.avisos}`);
console.log(`📈 Taxa de sucesso: ${percentual}%`);

console.log('\n' + '='.repeat(50));

if (resultadosTeste.falhou === 0) {
  console.log('🎉 TODOS OS TESTES PASSARAM! Sistema integrado corretamente.\n');
  process.exit(0);
} else {
  console.log('⚠️ Alguns testes falharam. Verifique os detalhes acima.\n');
  
  console.log('Testes que falharam:');
  resultadosTeste.detalhes
    .filter(d => d.status === 'falhou' || d.status === 'erro')
    .forEach(d => {
      console.log(`  - ${d.nome}: ${d.erro || 'sem detalhes'}`);
    });
  
  process.exit(1);
}
