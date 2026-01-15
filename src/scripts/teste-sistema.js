#!/usr/bin/env node
// ========================================
// REBECA - TESTE E SIMULAÇÃO DO SISTEMA
// Valida integrações e simula fluxos
// ========================================

console.log(`
╔═══════════════════════════════════════════════════════════╗
║          REBECA - TESTE DO SISTEMA                        ║
╚═══════════════════════════════════════════════════════════╝
`);

// Simular ambiente
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test';

const resultados = {
  passou: 0,
  falhou: 0,
  avisos: 0,
  detalhes: []
};

function teste(nome, fn) {
  try {
    const resultado = fn();
    if (resultado === true) {
      console.log(`  ✅ ${nome}`);
      resultados.passou++;
      resultados.detalhes.push({ nome, status: 'passou' });
    } else if (resultado === 'aviso') {
      console.log(`  ⚠️  ${nome}`);
      resultados.avisos++;
      resultados.detalhes.push({ nome, status: 'aviso' });
    } else {
      throw new Error(resultado || 'Falhou');
    }
  } catch (error) {
    console.log(`  ❌ ${nome}: ${error.message}`);
    resultados.falhou++;
    resultados.detalhes.push({ nome, status: 'falhou', erro: error.message });
  }
}

async function testeAsync(nome, fn) {
  try {
    const resultado = await fn();
    if (resultado === true) {
      console.log(`  ✅ ${nome}`);
      resultados.passou++;
    } else if (resultado === 'aviso') {
      console.log(`  ⚠️  ${nome}`);
      resultados.avisos++;
    } else {
      throw new Error(resultado || 'Falhou');
    }
  } catch (error) {
    console.log(`  ❌ ${nome}: ${error.message}`);
    resultados.falhou++;
  }
}

// ========================================
// 1. TESTE DE ESTRUTURA DE ARQUIVOS
// ========================================
console.log('\n📁 1. ESTRUTURA DE ARQUIVOS');

const fs = require('fs');
const path = require('path');
const baseDir = path.join(__dirname, '..');

teste('Arquivo server.js existe', () => {
  return fs.existsSync(path.join(baseDir, 'server.js'));
});

teste('Arquivo index.js existe', () => {
  return fs.existsSync(path.join(baseDir, 'index.js'));
});

teste('Pasta services existe', () => {
  return fs.existsSync(path.join(baseDir, 'services'));
});

teste('Pasta api existe', () => {
  return fs.existsSync(path.join(baseDir, 'api'));
});

teste('Pasta database existe', () => {
  return fs.existsSync(path.join(baseDir, 'database'));
});

teste('Pasta whatsapp existe', () => {
  return fs.existsSync(path.join(baseDir, 'whatsapp'));
});

teste('Pasta conversation existe', () => {
  return fs.existsSync(path.join(baseDir, 'conversation'));
});

teste('Pasta public existe', () => {
  return fs.existsSync(path.join(baseDir, 'public'));
});

// ========================================
// 2. TESTE DE IMPORTS/MÓDULOS
// ========================================
console.log('\n📦 2. IMPORTS E MÓDULOS');

teste('Serviço OpenAI carrega', () => {
  try {
    require(path.join(baseDir, 'services/openai'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('Serviço Geocoding carrega', () => {
  try {
    require(path.join(baseDir, 'services/geocoding'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('Serviço Atribuição carrega', () => {
  try {
    require(path.join(baseDir, 'services/atribuicao'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('Serviço Monitoramento carrega', () => {
  try {
    require(path.join(baseDir, 'services/monitoramento'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('Serviço AntiFraude carrega', () => {
  try {
    require(path.join(baseDir, 'services/antifraude'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('Serviço Telefonia carrega', () => {
  try {
    require(path.join(baseDir, 'services/telefonia'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('Index de Services exporta tudo', () => {
  try {
    const services = require(path.join(baseDir, 'services'));
    const esperados = ['OpenAIService', 'AtribuicaoService', 'GeocodingService', 'MonitoramentoCorridas', 'AntiFraude'];
    for (const s of esperados) {
      if (!services[s]) return `Falta: ${s}`;
    }
    return true;
  } catch (e) {
    return e.message;
  }
});

// ========================================
// 3. TESTE DAS APIS
// ========================================
console.log('\n🌐 3. ROTAS API');

teste('API Admin carrega', () => {
  try {
    require(path.join(baseDir, 'api/admin'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('API Master carrega', () => {
  try {
    require(path.join(baseDir, 'api/master'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('API Motorista carrega', () => {
  try {
    require(path.join(baseDir, 'api/motorista'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('API Auth carrega', () => {
  try {
    require(path.join(baseDir, 'api/auth'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('API Telefone carrega', () => {
  try {
    require(path.join(baseDir, 'api/telefone'));
    return true;
  } catch (e) {
    return e.message;
  }
});

// ========================================
// 4. TESTE DA CLASSE ANTIFRAUDE
// ========================================
console.log('\n🚨 4. SISTEMA ANTI-FRAUDE');

teste('AntiFraude instancia corretamente', () => {
  try {
    const { AntiFraude } = require(path.join(baseDir, 'services/antifraude'));
    const af = new AntiFraude(null);
    return af !== null;
  } catch (e) {
    return e.message;
  }
});

teste('AntiFraude tem método analisarMotorista', () => {
  const { AntiFraude } = require(path.join(baseDir, 'services/antifraude'));
  const af = new AntiFraude(null);
  return typeof af.analisarMotorista === 'function';
});

teste('AntiFraude tem método analisarTodos', () => {
  const { AntiFraude } = require(path.join(baseDir, 'services/antifraude'));
  const af = new AntiFraude(null);
  return typeof af.analisarTodos === 'function';
});

teste('AntiFraude tem método notificarADM', () => {
  const { AntiFraude } = require(path.join(baseDir, 'services/antifraude'));
  const af = new AntiFraude(null);
  return typeof af.notificarADM === 'function';
});

teste('CONFIG_FRAUDE está definido', () => {
  const { CONFIG_FRAUDE } = require(path.join(baseDir, 'services/antifraude'));
  return CONFIG_FRAUDE && CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO === 3;
});

// ========================================
// 5. TESTE DO MONITORAMENTO
// ========================================
console.log('\n👁️ 5. MONITORAMENTO DE CORRIDAS');

teste('MonitoramentoCorridas instancia corretamente', () => {
  try {
    const { MonitoramentoCorridas } = require(path.join(baseDir, 'services/monitoramento'));
    const mon = new MonitoramentoCorridas(null, null);
    return mon !== null;
  } catch (e) {
    return e.message;
  }
});

teste('MonitoramentoCorridas tem método iniciar', () => {
  const { MonitoramentoCorridas } = require(path.join(baseDir, 'services/monitoramento'));
  const mon = new MonitoramentoCorridas(null, null);
  return typeof mon.iniciar === 'function';
});

teste('MonitoramentoCorridas tem método verificarAntiFraude', () => {
  const { MonitoramentoCorridas } = require(path.join(baseDir, 'services/monitoramento'));
  const mon = new MonitoramentoCorridas(null, null);
  return typeof mon.verificarAntiFraude === 'function';
});

teste('MonitoramentoCorridas tem método registrarAtrasoAntiFraude', () => {
  const { MonitoramentoCorridas } = require(path.join(baseDir, 'services/monitoramento'));
  const mon = new MonitoramentoCorridas(null, null);
  return typeof mon.registrarAtrasoAntiFraude === 'function';
});

teste('CONFIG_TEMPO está definido', () => {
  const { CONFIG_TEMPO } = require(path.join(baseDir, 'services/monitoramento'));
  return CONFIG_TEMPO && CONFIG_TEMPO.TOLERANCIA_AVISO === 2;
});

// ========================================
// 6. TESTE DO SERVIDOR
// ========================================
console.log('\n🌐 6. SERVIDOR');

teste('Server carrega corretamente', () => {
  try {
    require(path.join(baseDir, 'server'));
    return true;
  } catch (e) {
    return e.message;
  }
});

// ========================================
// 7. TESTE DO WHATSAPP
// ========================================
console.log('\n📱 7. WHATSAPP');

teste('WhatsAppClient carrega', () => {
  try {
    require(path.join(baseDir, 'whatsapp/client'));
    return true;
  } catch (e) {
    return e.message;
  }
});

teste('Evolution API carrega', () => {
  try {
    require(path.join(baseDir, 'whatsapp/evolution'));
    return true;
  } catch (e) {
    return e.message;
  }
});

// ========================================
// 8. TESTE DO FLUXO DE CONVERSA
// ========================================
console.log('\n💬 8. FLUXO DE CONVERSA');

teste('FluxoConversa carrega', () => {
  try {
    require(path.join(baseDir, 'conversation/fluxo'));
    return true;
  } catch (e) {
    return e.message;
  }
});

// ========================================
// 9. SIMULAÇÃO DE FLUXO
// ========================================
console.log('\n🎮 9. SIMULAÇÃO DE FLUXOS');

teste('Simular cálculo de score anti-fraude', () => {
  const { AntiFraude } = require(path.join(baseDir, 'services/antifraude'));
  const af = new AntiFraude(null);
  
  // Simular alertas
  const alertas = [
    { severidade: 'amarelo' },
    { severidade: 'amarelo' },
    { severidade: 'vermelho' },
  ];
  
  const score = af.calcularScore(alertas);
  // 100 - 10 - 10 - 25 = 55
  return score === 55;
});

teste('Simular recomendação anti-fraude', () => {
  const { AntiFraude } = require(path.join(baseDir, 'services/antifraude'));
  const af = new AntiFraude(null);
  
  const rec1 = af.gerarRecomendacao([], 90);
  const rec2 = af.gerarRecomendacao([], 40);
  const rec3 = af.gerarRecomendacao([], 15);
  
  return rec1.acao === 'OK' && rec2.acao === 'MONITORAR' && rec3.acao === 'BLOQUEAR';
});

teste('Simular cálculo de distância', () => {
  const { MonitoramentoCorridas } = require(path.join(baseDir, 'services/monitoramento'));
  const mon = new MonitoramentoCorridas(null, null);
  
  // Calcular distância entre dois pontos em Lins
  const dist = mon.calcularDistanciaMetros(-21.6785, -49.7500, -21.6750, -49.7450);
  
  // Deve ser aproximadamente 500-600 metros
  return dist > 400 && dist < 800;
});

// ========================================
// 10. ARQUIVOS PÚBLICOS
// ========================================
console.log('\n📄 10. ARQUIVOS PÚBLICOS');

teste('Painel Admin existe', () => {
  return fs.existsSync(path.join(baseDir, 'public/admin/index.html'));
});

teste('Painel Master existe', () => {
  return fs.existsSync(path.join(baseDir, 'public/master/index.html'));
});

teste('Painel Motorista existe', () => {
  return fs.existsSync(path.join(baseDir, 'public/motorista/index.html'));
});

teste('Página Rastreamento existe', () => {
  return fs.existsSync(path.join(baseDir, 'public/rastrear/index.html'));
});

teste('Página Primeiro Acesso existe', () => {
  return fs.existsSync(path.join(baseDir, 'public/admin/primeiro-acesso.html'));
});

// ========================================
// RESUMO
// ========================================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DOS TESTES');
console.log('='.repeat(60));
console.log(`  ✅ Passou: ${resultados.passou}`);
console.log(`  ⚠️  Avisos: ${resultados.avisos}`);
console.log(`  ❌ Falhou: ${resultados.falhou}`);
console.log('='.repeat(60));

const total = resultados.passou + resultados.falhou + resultados.avisos;
const percentual = ((resultados.passou / total) * 100).toFixed(1);

if (resultados.falhou === 0) {
  console.log(`\n🎉 TODOS OS TESTES PASSARAM! (${percentual}%)\n`);
} else {
  console.log(`\n⚠️  ${resultados.falhou} teste(s) falharam. Verifique os erros acima.\n`);
}

// ========================================
// O QUE FALTA NO SISTEMA
// ========================================
console.log('='.repeat(60));
console.log('📋 O QUE FALTA NO SISTEMA');
console.log('='.repeat(60));

const faltando = [
  { item: '💳 Gateway de Pagamento (PIX/Cartão)', status: '❌ Não implementado', prioridade: 'ALTA' },
  { item: '🔔 Notificações Push (Firebase)', status: '❌ Não implementado', prioridade: 'MÉDIA' },
  { item: '⭐ Sistema de Avaliação completo', status: '⚠️ Parcial', prioridade: 'MÉDIA' },
  { item: '🧾 Geração de Recibos PDF', status: '❌ Não implementado', prioridade: 'BAIXA' },
  { item: '📱 App Nativo (React Native)', status: '❌ Não implementado', prioridade: 'BAIXA' },
  { item: '🔐 2FA (Autenticação 2 fatores)', status: '❌ Não implementado', prioridade: 'BAIXA' },
];

console.log('\n  FUNCIONALIDADES FALTANTES:');
faltando.forEach(f => {
  console.log(`    ${f.item}`);
  console.log(`      Status: ${f.status} | Prioridade: ${f.prioridade}`);
});

const configurar = [
  { item: '📱 Evolution API (WhatsApp)', status: '⚙️ Precisa configurar URL e Key' },
  { item: '🤖 OpenAI API', status: '⚙️ Precisa de API Key válida' },
  { item: '🗄️ PostgreSQL', status: '⚙️ Precisa criar banco' },
  { item: '📞 Twilio (Telefonia)', status: '⚙️ Opcional - Precisa conta' },
  { item: '🌐 Domínio/SSL', status: '⚙️ Precisa para produção' },
];

console.log('\n  CONFIGURAÇÕES NECESSÁRIAS:');
configurar.forEach(c => {
  console.log(`    ${c.item}`);
  console.log(`      ${c.status}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ Teste finalizado!');
console.log('='.repeat(60) + '\n');

// Exportar resultados
module.exports = resultados;
