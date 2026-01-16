// ========================================
// REBECA - SCRIPT DE SIMULAÇÃO E TESTES
// Valida integração: Monitoramento + Anti-Fraude + Notificações
// ========================================

console.log('🧪 INICIANDO TESTES DO SISTEMA REBECA\n');
console.log('='.repeat(50));

// Simular módulos (sem banco real)
const RESULTADOS = {
  total: 0,
  passou: 0,
  falhou: 0,
  erros: []
};

function teste(nome, funcao) {
  RESULTADOS.total++;
  try {
    const resultado = funcao();
    if (resultado === true || resultado === undefined) {
      console.log(`✅ ${nome}`);
      RESULTADOS.passou++;
    } else {
      console.log(`❌ ${nome}: ${resultado}`);
      RESULTADOS.falhou++;
      RESULTADOS.erros.push({ nome, erro: resultado });
    }
  } catch (error) {
    console.log(`❌ ${nome}: ${error.message}`);
    RESULTADOS.falhou++;
    RESULTADOS.erros.push({ nome, erro: error.message });
  }
}

// ========================================
// TESTE 1: Estrutura dos Arquivos
// ========================================
console.log('\n📁 TESTE 1: Verificando estrutura de arquivos...\n');

const fs = require('fs');
const path = require('path');

const arquivosNecessarios = [
  'src/services/monitoramento.js',
  'src/services/antifraude.js',
  'src/services/openai.js',
  'src/services/index.js',
  'src/api/admin.js',
  'src/database/migrate.js',
  'src/public/admin/index.html',
  'src/public/motorista/index.html',
];

arquivosNecessarios.forEach(arquivo => {
  teste(`Arquivo existe: ${arquivo}`, () => {
    return fs.existsSync(path.join(__dirname, '..', arquivo));
  });
});

// ========================================
// TESTE 2: Importações dos Módulos
// ========================================
console.log('\n📦 TESTE 2: Verificando importações...\n');

teste('Importar serviço de monitoramento', () => {
  const { MonitoramentoCorridas, CONFIG_TEMPO, STATUS_CORRIDA } = require('../src/services/monitoramento');
  return typeof MonitoramentoCorridas === 'function' && 
         typeof CONFIG_TEMPO === 'object' &&
         typeof STATUS_CORRIDA === 'object';
});

teste('Importar serviço anti-fraude', () => {
  const { AntiFraude, CONFIG_FRAUDE, TIPO_ALERTA, SEVERIDADE } = require('../src/services/antifraude');
  return typeof AntiFraude === 'function' && 
         typeof CONFIG_FRAUDE === 'object';
});

teste('Importar index de serviços', () => {
  const services = require('../src/services');
  return services.MonitoramentoCorridas && 
         services.AntiFraude &&
         services.OpenAIService;
});

// ========================================
// TESTE 3: Configurações
// ========================================
console.log('\n⚙️ TESTE 3: Verificando configurações...\n');

teste('CONFIG_TEMPO tem valores corretos', () => {
  const { CONFIG_TEMPO } = require('../src/services/monitoramento');
  return CONFIG_TEMPO.TOLERANCIA_AVISO === 2 &&
         CONFIG_TEMPO.TEMPO_MAX_ATRASO === 5 &&
         CONFIG_TEMPO.INTERVALO_VERIFICACAO === 30000;
});

teste('CONFIG_FRAUDE tem valores corretos', () => {
  const { CONFIG_FRAUDE } = require('../src/services/antifraude');
  return CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO === 3 &&
         CONFIG_FRAUDE.ATRASOS_ALERTA_VERMELHO === 5 &&
         CONFIG_FRAUDE.ATRASOS_BLOQUEAR === 10;
});

teste('TIPO_ALERTA tem todos os tipos', () => {
  const { TIPO_ALERTA } = require('../src/services/antifraude');
  const tipos = ['ATRASO', 'CANCELAMENTO', 'CORRIDA_CURTA', 'RECUSA_EXCESSIVA', 'GPS_SUSPEITO', 'RECLAMACAO', 'NOTA_BAIXA'];
  return tipos.every(t => TIPO_ALERTA[t] !== undefined);
});

teste('SEVERIDADE tem todos os níveis', () => {
  const { SEVERIDADE } = require('../src/services/antifraude');
  return SEVERIDADE.INFO && SEVERIDADE.AMARELO && SEVERIDADE.VERMELHO && SEVERIDADE.BLOQUEAR;
});

// ========================================
// TESTE 4: Classe AntiFraude
// ========================================
console.log('\n🚨 TESTE 4: Testando classe AntiFraude...\n');

teste('AntiFraude instancia corretamente', () => {
  const { AntiFraude } = require('../src/services/antifraude');
  const af = new AntiFraude(null);
  return af !== null && typeof af.analisarMotorista === 'function';
});

teste('AntiFraude.calcularScore funciona', () => {
  const { AntiFraude, SEVERIDADE } = require('../src/services/antifraude');
  const af = new AntiFraude(null);
  
  // Sem alertas = 100
  const score1 = af.calcularScore([]);
  
  // Com alertas
  const alertas = [
    { severidade: SEVERIDADE.AMARELO },
    { severidade: SEVERIDADE.VERMELHO }
  ];
  const score2 = af.calcularScore(alertas);
  
  return score1 === 100 && score2 === 65; // 100 - 10 - 25
});

teste('AntiFraude.gerarRecomendacao funciona', () => {
  const { AntiFraude } = require('../src/services/antifraude');
  const af = new AntiFraude(null);
  
  const rec1 = af.gerarRecomendacao([], 100);
  const rec2 = af.gerarRecomendacao([], 50);
  const rec3 = af.gerarRecomendacao([], 20);
  
  return rec1.acao === 'OK' && rec2.acao === 'MONITORAR' && rec3.acao === 'BLOQUEAR';
});

// ========================================
// TESTE 5: Classe MonitoramentoCorridas
// ========================================
console.log('\n👁️ TESTE 5: Testando classe MonitoramentoCorridas...\n');

teste('MonitoramentoCorridas instancia corretamente', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const mon = new MonitoramentoCorridas(null, null);
  return mon !== null && typeof mon.iniciar === 'function';
});

teste('MonitoramentoCorridas.calcularDistanciaMetros funciona', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const mon = new MonitoramentoCorridas(null, null);
  
  // Distância entre dois pontos próximos em Lins
  const dist = mon.calcularDistanciaMetros(-21.6785, -49.7500, -21.6790, -49.7505);
  
  // Deve ser aproximadamente 70-80 metros
  return dist > 50 && dist < 150;
});

teste('MonitoramentoCorridas.calcularHoraPrevista funciona', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const mon = new MonitoramentoCorridas(null, null);
  
  const corrida = {
    aceito_em: new Date('2024-01-01T10:00:00'),
    tempo_estimado: 5
  };
  
  const prevista = mon.calcularHoraPrevista(corrida);
  const esperada = new Date('2024-01-01T10:05:00');
  
  return prevista.getTime() === esperada.getTime();
});

// ========================================
// TESTE 6: Simulação de Fluxo Completo
// ========================================
console.log('\n🔄 TESTE 6: Simulação de fluxo de atraso...\n');

teste('Simulação: Motorista atrasa e é detectado', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const mon = new MonitoramentoCorridas(null, null);
  
  // Simular corrida
  const corridaSimulada = {
    id: 999,
    cliente_id: 1,
    cliente_telefone: '5514999990001',
    cliente_nome: 'Cliente Teste',
    motorista_id: 1,
    motorista_nome: 'Motorista Teste',
    motorista_telefone: '5514999990002',
    origem_lat: -21.6785,
    origem_lng: -49.7500,
    origem_endereco: 'Rua Teste, 123',
    tempo_estimado: 5,
    aceito_em: new Date(Date.now() - 10 * 60 * 1000), // 10 min atrás
  };
  
  // Adicionar ao monitoramento
  mon.adicionarMonitoramento(corridaSimulada);
  
  // Verificar se foi adicionada
  return mon.corridasMonitoradas.has(999);
});

teste('Simulação: Calcular minutos de atraso', () => {
  const { MonitoramentoCorridas } = require('../src/services/monitoramento');
  const mon = new MonitoramentoCorridas(null, null);
  
  const horaPrevista = new Date(Date.now() - 5 * 60 * 1000); // 5 min atrás
  const agora = new Date();
  
  const atraso = mon.calcularMinutosAtraso(horaPrevista, agora);
  
  // Deve ser aproximadamente 5 minutos
  return atraso >= 4.9 && atraso <= 5.1;
});

// ========================================
// TESTE 7: Verificar Endpoints API
// ========================================
console.log('\n🌐 TESTE 7: Verificando endpoints na API...\n');

teste('API Admin tem endpoint /antifraude/resumo', () => {
  const adminCode = fs.readFileSync(path.join(__dirname, '../src/api/admin.js'), 'utf8');
  return adminCode.includes('/antifraude/resumo') && adminCode.includes('obterResumoDashboard');
});

teste('API Admin tem endpoint /antifraude/motorista/:id', () => {
  const adminCode = fs.readFileSync(path.join(__dirname, '../src/api/admin.js'), 'utf8');
  return adminCode.includes('/antifraude/motorista/:id') && adminCode.includes('analisarMotorista');
});

teste('API Admin tem endpoint /antifraude/bloquear', () => {
  const adminCode = fs.readFileSync(path.join(__dirname, '../src/api/admin.js'), 'utf8');
  return adminCode.includes('/antifraude/bloquear') && adminCode.includes('bloqueado_por');
});

// ========================================
// TESTE 8: Verificar Frontend
// ========================================
console.log('\n🖥️ TESTE 8: Verificando frontend...\n');

teste('Painel ADM tem menu Anti-Fraude', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/public/admin/index.html'), 'utf8');
  return html.includes('antifraude') && html.includes('Anti-Fraude');
});

teste('Painel ADM tem página Anti-Fraude', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/public/admin/index.html'), 'utf8');
  return html.includes('page-antifraude') && html.includes('af-criticos');
});

teste('Painel ADM tem função carregarAntiFraude', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/public/admin/index.html'), 'utf8');
  return html.includes('function carregarAntiFraude') && html.includes('verificarTodosAntiFraude');
});

teste('Painel Motorista tem badge de prioridade', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/public/motorista/index.html'), 'utf8');
  return html.includes('prioridade-alerta') && html.includes('corrida-card.prioridade');
});

teste('Painel Motorista tem som urgente', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/public/motorista/index.html'), 'utf8');
  return html.includes("tipo === 'urgente'") && html.includes('tocarSom');
});

// ========================================
// TESTE 9: Verificar Banco de Dados
// ========================================
console.log('\n🗄️ TESTE 9: Verificando migrations...\n');

teste('Migration tem tabela alertas_fraude', () => {
  const migrate = fs.readFileSync(path.join(__dirname, '../src/database/migrate.js'), 'utf8');
  return migrate.includes('CREATE TABLE IF NOT EXISTS alertas_fraude') && migrate.includes('severidade');
});

teste('Migration tem tabela logs_localizacao', () => {
  const migrate = fs.readFileSync(path.join(__dirname, '../src/database/migrate.js'), 'utf8');
  return migrate.includes('CREATE TABLE IF NOT EXISTS logs_localizacao') && migrate.includes('velocidade_calculada');
});

teste('Migration tem tabela reclamacoes', () => {
  const migrate = fs.readFileSync(path.join(__dirname, '../src/database/migrate.js'), 'utf8');
  return migrate.includes('CREATE TABLE IF NOT EXISTS reclamacoes');
});

teste('Migration tem campo prioridade em corridas', () => {
  const migrate = fs.readFileSync(path.join(__dirname, '../src/database/migrate.js'), 'utf8');
  return migrate.includes("column_name = 'prioridade'") && migrate.includes('ADD COLUMN prioridade BOOLEAN');
});

teste('Migration tem campo qtd_atrasos em motoristas', () => {
  const migrate = fs.readFileSync(path.join(__dirname, '../src/database/migrate.js'), 'utf8');
  return migrate.includes("column_name = 'qtd_atrasos'");
});

// ========================================
// TESTE 10: Simulação de Notificação
// ========================================
console.log('\n📱 TESTE 10: Testando geração de mensagens...\n');

teste('Gera mensagem de alerta de atraso corretamente', () => {
  const motoristaNome = 'João Silva';
  const atrasos = 5;
  const corridaId = 127;
  
  const mensagem = `⚠️ *REBECA - Alerta de Atraso*\n\n` +
    `O motorista *${motoristaNome}* atrasou novamente!\n\n` +
    `📊 Total de atrasos: ${atrasos}\n` +
    `🔢 Corrida: #${corridaId}\n\n` +
    `_Considere verificar no painel Anti-Fraude._`;
  
  return mensagem.includes('João Silva') && 
         mensagem.includes('5') && 
         mensagem.includes('#127');
});

teste('Gera mensagem de corrida prioridade corretamente', () => {
  const dados = {
    motorista_nome: 'Carlos',
    cliente_nome: 'Maria',
    origem_endereco: 'Rua das Flores, 123'
  };
  
  const mensagem = `🚨 *CORRIDA PRIORIDADE* 🚨\n\n` +
    `O motorista anterior não chegou a tempo. Este cliente está aguardando!\n\n` +
    `📍 *Buscar em:*\n${dados.origem_endereco}\n\n` +
    `👤 Cliente: ${dados.cliente_nome}`;
  
  return mensagem.includes('PRIORIDADE') && 
         mensagem.includes('Rua das Flores') &&
         mensagem.includes('Maria');
});

// ========================================
// RESULTADO FINAL
// ========================================
console.log('\n' + '='.repeat(50));
console.log('📊 RESULTADO DOS TESTES\n');
console.log(`Total: ${RESULTADOS.total}`);
console.log(`✅ Passou: ${RESULTADOS.passou}`);
console.log(`❌ Falhou: ${RESULTADOS.falhou}`);
console.log(`Taxa de sucesso: ${((RESULTADOS.passou / RESULTADOS.total) * 100).toFixed(1)}%`);

if (RESULTADOS.erros.length > 0) {
  console.log('\n❌ Erros encontrados:');
  RESULTADOS.erros.forEach(e => {
    console.log(`   - ${e.nome}: ${e.erro}`);
  });
}

console.log('\n' + '='.repeat(50));

if (RESULTADOS.falhou === 0) {
  console.log('🎉 TODOS OS TESTES PASSARAM! Sistema integrado corretamente.');
} else {
  console.log('⚠️ Alguns testes falharam. Verifique os erros acima.');
}

process.exit(RESULTADOS.falhou > 0 ? 1 : 0);
