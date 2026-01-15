#!/usr/bin/env node
// ========================================
// REBECA - TESTE COMPLETO DO SISTEMA
// Valida todas as integrações e fluxos
// ========================================

console.log('🧪 INICIANDO TESTES DO SISTEMA REBECA\n');
console.log('='.repeat(50));

// Resultados dos testes
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
      console.log(`⚠️  ${nome} (aviso)`);
      resultados.avisos++;
      resultados.testes.push({ nome, status: 'aviso' });
    } else {
      console.log(`❌ ${nome}`);
      resultados.falhou++;
      resultados.testes.push({ nome, status: 'falhou', erro: resultado });
    }
  } catch (error) {
    console.log(`❌ ${nome}: ${error.message}`);
    resultados.falhou++;
    resultados.testes.push({ nome, status: 'erro', erro: error.message });
  }
}

async function testeAsync(nome, fn) {
  try {
    const resultado = await fn();
    if (resultado === true) {
      console.log(`✅ ${nome}`);
      resultados.passou++;
    } else if (resultado === 'aviso') {
      console.log(`⚠️  ${nome} (aviso)`);
      resultados.avisos++;
    } else {
      console.log(`❌ ${nome}: ${resultado}`);
      resultados.falhou++;
    }
  } catch (error) {
    console.log(`❌ ${nome}: ${error.message}`);
    resultados.falhou++;
  }
}

// ========================================
// 1. TESTES DE ESTRUTURA DE ARQUIVOS
// ========================================
console.log('\n📁 1. ESTRUTURA DE ARQUIVOS');
console.log('-'.repeat(50));

const fs = require('fs');
const path = require('path');

const arquivosObrigatorios = [
  'src/server.js',
  'src/index.js',
  'src/api/admin.js',
  'src/api/auth.js',
  'src/api/master.js',
  'src/api/motorista.js',
  'src/api/telefone.js',
  'src/services/openai.js',
  'src/services/antifraude.js',
  'src/services/monitoramento.js',
  'src/services/geocoding.js',
  'src/services/atribuicao.js',
  'src/services/telefonia.js',
  'src/whatsapp/evolution.js',
  'src/conversation/fluxo.js',
  'src/database/migrate.js',
  'src/database/connection.js',
  'src/public/admin/index.html',
  'src/public/master/index.html',
  'src/public/motorista/index.html',
  'src/public/rastrear/index.html',
  'package.json',
  '.env',
];

arquivosObrigatorios.forEach(arquivo => {
  teste(`Arquivo ${arquivo}`, () => {
    return fs.existsSync(path.join(__dirname, '..', arquivo));
  });
});

// ========================================
// 2. TESTES DE IMPORTS/EXPORTS
// ========================================
console.log('\n📦 2. MÓDULOS E IMPORTS');
console.log('-'.repeat(50));

teste('Services exportados corretamente', () => {
  const services = require('../services');
  return services.OpenAIService && 
         services.AntiFraude && 
         services.MonitoramentoCorridas &&
         services.GeocodingService;
});

teste('Database exportado corretamente', () => {
  const db = require('../database');
  return db.query !== undefined;
});

teste('WhatsApp client exportado', () => {
  const whatsapp = require('../whatsapp');
  return whatsapp.EvolutionClient !== undefined;
});

teste('Conversation/Fluxo exportado', () => {
  const conversation = require('../conversation');
  return conversation.FluxoConversa !== undefined;
});

// ========================================
// 3. TESTES DE CONFIGURAÇÃO
// ========================================
console.log('\n⚙️  3. CONFIGURAÇÕES (.env)');
console.log('-'.repeat(50));

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const configsObrigatorias = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'PORT',
];

const configsOpcionais = [
  'EVOLUTION_API_URL',
  'EVOLUTION_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
];

configsObrigatorias.forEach(config => {
  teste(`Config obrigatória: ${config}`, () => {
    return process.env[config] ? true : `Não configurado`;
  });
});

configsOpcionais.forEach(config => {
  teste(`Config opcional: ${config}`, () => {
    return process.env[config] ? true : 'aviso';
  });
});

// ========================================
// 4. TESTES DE SERVIÇOS
// ========================================
console.log('\n🔧 4. SERVIÇOS');
console.log('-'.repeat(50));

teste('OpenAIService - Funções principais', () => {
  const { OpenAIService } = require('../services');
  return typeof OpenAIService.identificarIntencao === 'function' &&
         typeof OpenAIService.gerarResposta === 'function' &&
         typeof OpenAIService.transcreverAudio === 'function';
});

teste('AntiFraude - Funções principais', () => {
  const { AntiFraude } = require('../services');
  const af = new AntiFraude();
  return typeof af.analisarMotorista === 'function' &&
         typeof af.analisarTodos === 'function' &&
         typeof af.obterResumoDashboard === 'function';
});

teste('MonitoramentoCorridas - Funções principais', () => {
  const { MonitoramentoCorridas } = require('../services');
  const mon = new MonitoramentoCorridas(null, null);
  return typeof mon.iniciar === 'function' &&
         typeof mon.verificarAntiFraude === 'function' &&
         typeof mon.adicionarMonitoramento === 'function';
});

teste('GeocodingService - Funções principais', () => {
  const { GeocodingService } = require('../services');
  return typeof GeocodingService.enderecoParaCoordenadas === 'function' &&
         typeof GeocodingService.calcularDistancia === 'function';
});

// ========================================
// 5. TESTES DE FLUXO DE CONVERSA
// ========================================
console.log('\n💬 5. FLUXO DE CONVERSA');
console.log('-'.repeat(50));

teste('FluxoConversa - Instância', () => {
  const { FluxoConversa } = require('../conversation');
  const fluxo = new FluxoConversa(null);
  return typeof fluxo.processar === 'function';
});

teste('OpenAI - INTENCOES definidas', () => {
  const { OpenAIService } = require('../services');
  const intencoes = OpenAIService.INTENCOES;
  return intencoes && 
         intencoes.SAUDACAO &&
         intencoes.QUER_CORRIDA &&
         intencoes.CONFIRMACAO;
});

teste('OpenAI - MENSAGENS definidas', () => {
  const { OpenAIService } = require('../services');
  const msgs = OpenAIService.MENSAGENS;
  return msgs && 
         msgs.saudacao &&
         msgs.pedirLocalizacao &&
         msgs.motoristaACaminho;
});

// ========================================
// 6. TESTES DE API ENDPOINTS
// ========================================
console.log('\n🌐 6. API ENDPOINTS');
console.log('-'.repeat(50));

teste('API Admin - Router exportado', () => {
  const adminRouter = require('../api/admin');
  return adminRouter && typeof adminRouter === 'function';
});

teste('API Master - Router exportado', () => {
  const masterRouter = require('../api/master');
  return masterRouter && typeof masterRouter === 'function';
});

teste('API Motorista - Router exportado', () => {
  const motoristaRouter = require('../api/motorista');
  return motoristaRouter && typeof motoristaRouter === 'function';
});

teste('API Auth - Router exportado', () => {
  const authRouter = require('../api/auth');
  return authRouter && typeof authRouter === 'function';
});

teste('API Telefone - Router exportado', () => {
  const telefoneRouter = require('../api/telefone');
  return telefoneRouter && typeof telefoneRouter === 'function';
});

// ========================================
// 7. TESTES DE ANTI-FRAUDE
// ========================================
console.log('\n🚨 7. SISTEMA ANTI-FRAUDE');
console.log('-'.repeat(50));

teste('CONFIG_FRAUDE definido', () => {
  const { CONFIG_FRAUDE } = require('../services');
  return CONFIG_FRAUDE &&
         CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO &&
         CONFIG_FRAUDE.TEMPO_MAX_ATRASO !== undefined;
});

teste('TIPO_ALERTA definido', () => {
  const { TIPO_ALERTA } = require('../services');
  return TIPO_ALERTA &&
         TIPO_ALERTA.ATRASO &&
         TIPO_ALERTA.GPS_SUSPEITO;
});

teste('SEVERIDADE definida', () => {
  const { SEVERIDADE } = require('../services');
  return SEVERIDADE &&
         SEVERIDADE.AMARELO &&
         SEVERIDADE.VERMELHO &&
         SEVERIDADE.BLOQUEAR;
});

// ========================================
// 8. TESTES DE MONITORAMENTO
// ========================================
console.log('\n👁️  8. MONITORAMENTO DE CORRIDAS');
console.log('-'.repeat(50));

teste('CONFIG_TEMPO definido', () => {
  const { CONFIG_TEMPO } = require('../services');
  return CONFIG_TEMPO &&
         CONFIG_TEMPO.TOLERANCIA_AVISO === 2 &&
         CONFIG_TEMPO.TEMPO_MAX_ATRASO === 5;
});

teste('STATUS_CORRIDA definido', () => {
  const { STATUS_CORRIDA } = require('../services');
  return STATUS_CORRIDA &&
         STATUS_CORRIDA.CANCELADA_ATRASO &&
         STATUS_CORRIDA.MOTORISTA_CHEGOU;
});

// ========================================
// 9. SIMULAÇÃO DE FLUXOS
// ========================================
console.log('\n🎭 9. SIMULAÇÃO DE FLUXOS');
console.log('-'.repeat(50));

teste('Simular identificação de intenção SAUDACAO', () => {
  const { OpenAIService } = require('../services');
  // Teste local sem chamar API
  const intencoes = OpenAIService.INTENCOES;
  return intencoes.SAUDACAO === 'SAUDACAO';
});

teste('Simular análise anti-fraude (mock)', () => {
  const { AntiFraude } = require('../services');
  const af = new AntiFraude();
  // Teste da função calcularScore
  const alertas = [
    { severidade: 'amarelo' },
    { severidade: 'vermelho' }
  ];
  const score = af.calcularScore(alertas);
  return score === 65; // 100 - 10 - 25 = 65
});

teste('Simular recomendação anti-fraude', () => {
  const { AntiFraude } = require('../services');
  const af = new AntiFraude();
  const rec = af.gerarRecomendacao([], 85);
  return rec.acao === 'OK';
});

teste('Simular recomendação MONITORAR', () => {
  const { AntiFraude } = require('../services');
  const af = new AntiFraude();
  const rec = af.gerarRecomendacao([], 40);
  return rec.acao === 'MONITORAR';
});

// ========================================
// 10. TESTES DE INTEGRAÇÃO (sem conexão real)
// ========================================
console.log('\n🔗 10. INTEGRAÇÕES (estrutura)');
console.log('-'.repeat(50));

teste('WhatsApp Evolution - Métodos', () => {
  const { EvolutionClient } = require('../whatsapp');
  const client = new EvolutionClient('http://test', 'key', 'instance');
  return typeof client.enviarMensagem === 'function' &&
         typeof client.enviarLocalizacao === 'function';
});

teste('Geocoding - Estrutura', () => {
  const { GeocodingService } = require('../services');
  return typeof GeocodingService.buscarCoordenadas === 'function' ||
         typeof GeocodingService.enderecoParaCoordenadas === 'function';
});

// ========================================
// RESUMO FINAL
// ========================================
console.log('\n' + '='.repeat(50));
console.log('📊 RESUMO DOS TESTES');
console.log('='.repeat(50));
console.log(`✅ Passou: ${resultados.passou}`);
console.log(`⚠️  Avisos: ${resultados.avisos}`);
console.log(`❌ Falhou: ${resultados.falhou}`);
console.log(`📝 Total:  ${resultados.passou + resultados.avisos + resultados.falhou}`);

const percentual = ((resultados.passou / (resultados.passou + resultados.falhou)) * 100).toFixed(1);
console.log(`\n🎯 Taxa de sucesso: ${percentual}%`);

if (resultados.falhou === 0) {
  console.log('\n🎉 TODOS OS TESTES PASSARAM! Sistema pronto para deploy.');
} else if (resultados.falhou <= 3) {
  console.log('\n⚠️  Sistema funcional com pequenos ajustes necessários.');
} else {
  console.log('\n❌ Sistema precisa de correções antes do deploy.');
}

// ========================================
// CHECKLIST DO QUE FALTA
// ========================================
console.log('\n' + '='.repeat(50));
console.log('📋 CHECKLIST - O QUE FALTA CONFIGURAR');
console.log('='.repeat(50));

const checklist = [
  { item: 'PostgreSQL (banco de dados)', env: 'DATABASE_URL', obrigatorio: true },
  { item: 'OpenAI API Key', env: 'OPENAI_API_KEY', obrigatorio: true },
  { item: 'Evolution API (WhatsApp)', env: 'EVOLUTION_API_URL', obrigatorio: true },
  { item: 'Twilio (Telefonia IA)', env: 'TWILIO_ACCOUNT_SID', obrigatorio: false },
  { item: 'URL Base (para links)', env: 'BASE_URL', obrigatorio: true },
];

console.log('\nConfigurações:');
checklist.forEach(c => {
  const configurado = process.env[c.env] && process.env[c.env] !== '' && !process.env[c.env].includes('xxx');
  const status = configurado ? '✅' : (c.obrigatorio ? '❌' : '⚠️');
  const tipo = c.obrigatorio ? '[OBRIGATÓRIO]' : '[OPCIONAL]';
  console.log(`${status} ${c.item} ${tipo}`);
});

console.log('\nPróximos passos:');
console.log('1. Criar PostgreSQL no Railway/Supabase/Neon');
console.log('2. Configurar Evolution API para WhatsApp');
console.log('3. Obter API Key da OpenAI');
console.log('4. Configurar telefone do ADM para notificações');
console.log('5. Fazer deploy no Railway');

console.log('\n✨ Teste concluído!');
