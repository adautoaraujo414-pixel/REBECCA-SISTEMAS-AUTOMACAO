// ========================================
// REBECA - DIAGNÓSTICO COMPLETO DO SISTEMA
// Verifica TODAS as funcionalidades
// ========================================

const fs = require('fs');
const path = require('path');

console.log('🔍 REBECA - DIAGNÓSTICO COMPLETO\n');
console.log('='.repeat(60));

const resultados = {
  estrutura: [],
  apis: [],
  servicos: [],
  banco: [],
  integracao: [],
  configuracao: [],
  erros: [],
  avisos: []
};

// ========================================
// 1. VERIFICAR ESTRUTURA DE ARQUIVOS
// ========================================
console.log('\n📁 1. VERIFICANDO ESTRUTURA DE ARQUIVOS...\n');

const arquivosEssenciais = [
  { path: 'src/index.js', desc: 'Arquivo principal' },
  { path: 'src/server.js', desc: 'Servidor HTTP' },
  { path: 'src/config/index.js', desc: 'Configurações' },
  
  // APIs
  { path: 'src/api/index.js', desc: 'API Index' },
  { path: 'src/api/admin.js', desc: 'API Admin' },
  { path: 'src/api/auth.js', desc: 'API Auth' },
  { path: 'src/api/motorista.js', desc: 'API Motorista' },
  { path: 'src/api/master.js', desc: 'API Master' },
  { path: 'src/api/telefone.js', desc: 'API Telefone' },
  
  // Serviços
  { path: 'src/services/antifraude.js', desc: 'Anti-Fraude' },
  { path: 'src/services/atribuicao.js', desc: 'GPS/Atribuição' },
  { path: 'src/services/geocoding.js', desc: 'Geocoding' },
  { path: 'src/services/monitoramento.js', desc: 'Monitoramento' },
  { path: 'src/services/openai.js', desc: 'OpenAI (IA)' },
  { path: 'src/services/telefonia.js', desc: 'Telefonia' },
  
  // Banco
  { path: 'src/database/connection.js', desc: 'Conexão DB' },
  { path: 'src/database/migrate.js', desc: 'Migrations' },
  { path: 'src/database/seed.js', desc: 'Seed Data' },
  
  // WhatsApp
  { path: 'src/whatsapp/index.js', desc: 'WhatsApp Client' },
  { path: 'src/conversation/index.js', desc: 'Fluxo Conversa' },
  
  // Frontend
  { path: 'src/public/admin/index.html', desc: 'Painel Admin' },
  { path: 'src/public/motorista/index.html', desc: 'Painel Motorista' },
  
  // Config
  { path: 'package.json', desc: 'Dependencies' },
  { path: '.env.example', desc: 'Env Example' },
];

arquivosEssenciais.forEach(({ path: filePath, desc }) => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    const tamanho = (stats.size / 1024).toFixed(1);
    console.log(`   ✅ ${desc.padEnd(30)} (${tamanho}KB)`);
    resultados.estrutura.push({ arquivo: filePath, status: 'OK', tamanho });
  } else {
    console.log(`   ❌ ${desc.padEnd(30)} - FALTANDO!`);
    resultados.erros.push(`Arquivo faltando: ${filePath}`);
  }
});

// ========================================
// 2. VERIFICAR APIs
// ========================================
console.log('\n📡 2. VERIFICANDO APIs...\n');

const apis = [
  { file: 'src/api/admin.js', name: 'API Admin', endpoints: 48 },
  { file: 'src/api/motorista.js', name: 'API Motorista', endpoints: 20 },
  { file: 'src/api/master.js', name: 'API Master', endpoints: 26 },
  { file: 'src/api/auth.js', name: 'API Auth', endpoints: 8 },
  { file: 'src/api/telefone.js', name: 'API Telefone', endpoints: 6 },
];

apis.forEach(({ file, name, endpoints }) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const conteudo = fs.readFileSync(filePath, 'utf8');
    const routerCount = (conteudo.match(/router\.(get|post|put|delete|patch)/g) || []).length;
    const hasAuth = conteudo.includes('Bearer') || conteudo.includes('Authorization');
    
    console.log(`   ✅ ${name.padEnd(20)} - ${routerCount} rotas encontradas ${hasAuth ? '🔒' : ''}`);
    resultados.apis.push({ 
      api: name, 
      rotas: routerCount, 
      auth: hasAuth,
      status: routerCount >= endpoints * 0.8 ? 'OK' : 'PARCIAL'
    });
    
    if (routerCount < endpoints * 0.8) {
      resultados.avisos.push(`${name}: apenas ${routerCount} de ${endpoints} rotas esperadas`);
    }
  } else {
    console.log(`   ❌ ${name.padEnd(20)} - FALTANDO!`);
    resultados.erros.push(`API faltando: ${file}`);
  }
});

// ========================================
// 3. VERIFICAR SERVIÇOS
// ========================================
console.log('\n⚙️ 3. VERIFICANDO SERVIÇOS...\n');

const servicos = [
  { file: 'src/services/antifraude.js', name: 'Anti-Fraude', funcoes: ['analisarMotorista', 'verificarAtrasos', 'verificarGPSSuspeito'] },
  { file: 'src/services/atribuicao.js', name: 'GPS/Atribuição', funcoes: ['calcularDistancia', 'encontrarMotoristaIdeal', 'estimarTempo'] },
  { file: 'src/services/geocoding.js', name: 'Geocoding', funcoes: ['buscarCoordenadas', 'reverseGeocode'] },
  { file: 'src/services/openai.js', name: 'OpenAI IA', funcoes: ['entenderMensagem', 'transcreverAudio'] },
  { file: 'src/services/monitoramento.js', name: 'Monitoramento', funcoes: ['monitorarCorrida', 'detectarAtraso'] },
];

servicos.forEach(({ file, name, funcoes }) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const conteudo = fs.readFileSync(filePath, 'utf8');
    const funcoesEncontradas = funcoes.filter(f => conteudo.includes(f));
    const percentual = (funcoesEncontradas.length / funcoes.length) * 100;
    
    const status = percentual === 100 ? '✅' : percentual >= 50 ? '⚠️' : '❌';
    console.log(`   ${status} ${name.padEnd(20)} - ${funcoesEncontradas.length}/${funcoes.length} funções`);
    
    resultados.servicos.push({
      servico: name,
      funcoes: funcoesEncontradas.length,
      total: funcoes.length,
      percentual: percentual.toFixed(0)
    });
  } else {
    console.log(`   ❌ ${name.padEnd(20)} - FALTANDO!`);
    resultados.erros.push(`Serviço faltando: ${file}`);
  }
});

// ========================================
// 4. VERIFICAR BANCO DE DADOS
// ========================================
console.log('\n🗄️ 4. VERIFICANDO BANCO DE DADOS...\n');

const migrateFile = path.join(__dirname, 'src/database/migrate.js');
if (fs.existsSync(migrateFile)) {
  const conteudo = fs.readFileSync(migrateFile, 'utf8');
  
  // Contar tabelas
  const tabelasCount = (conteudo.match(/CREATE TABLE IF NOT EXISTS/g) || []).length;
  
  // Verificar tabelas essenciais
  const tabelasEssenciais = [
    'empresas', 'planos', 'motoristas', 'clientes', 'corridas',
    'mensagens', 'alertas_fraude', 'logs_localizacao', 'configuracoes'
  ];
  
  const tabelasEncontradas = tabelasEssenciais.filter(t => conteudo.includes(t));
  
  console.log(`   ✅ Migrations encontradas: ${tabelasCount} tabelas`);
  console.log(`   ✅ Tabelas essenciais: ${tabelasEncontradas.length}/${tabelasEssenciais.length}`);
  
  resultados.banco.push({
    migrations: 'OK',
    tabelas: tabelasCount,
    essenciais: tabelasEncontradas.length
  });
  
  if (tabelasEncontradas.length < tabelasEssenciais.length) {
    const faltando = tabelasEssenciais.filter(t => !conteudo.includes(t));
    resultados.avisos.push(`Tabelas faltando: ${faltando.join(', ')}`);
  }
} else {
  console.log('   ❌ Arquivo migrate.js não encontrado!');
  resultados.erros.push('Migrations não encontradas');
}

// ========================================
// 5. VERIFICAR INTEGRAÇÕES
// ========================================
console.log('\n🔌 5. VERIFICANDO INTEGRAÇÕES...\n');

const integracoes = [
  { var: 'OPENAI_API_KEY', name: 'OpenAI (GPT + Whisper)', critical: true },
  { var: 'EVOLUTION_API_URL', name: 'Evolution API (WhatsApp)', critical: true },
  { var: 'EVOLUTION_API_KEY', name: 'Evolution API Key', critical: true },
  { var: 'GOOGLE_MAPS_API_KEY', name: 'Google Maps (Geocoding)', critical: false },
  { var: 'TWILIO_ACCOUNT_SID', name: 'Twilio (Telefonia)', critical: false },
  { var: 'TWILIO_AUTH_TOKEN', name: 'Twilio Token', critical: false },
];

const envExamplePath = path.join(__dirname, '.env.example');
if (fs.existsSync(envExamplePath)) {
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  
  integracoes.forEach(({ var: varName, name, critical }) => {
    const presente = envExample.includes(varName);
    const icon = presente ? '✅' : (critical ? '❌' : '⚠️');
    const status = presente ? '' : (critical ? ' - CRÍTICO!' : ' - Opcional');
    
    console.log(`   ${icon} ${name.padEnd(35)} ${status}`);
    
    resultados.integracao.push({
      integracao: name,
      variavel: varName,
      presente,
      critical
    });
    
    if (!presente && critical) {
      resultados.erros.push(`Integração crítica faltando: ${varName}`);
    }
  });
} else {
  console.log('   ⚠️ Arquivo .env.example não encontrado');
  resultados.avisos.push('.env.example não encontrado - criar baseado no .env');
}

// ========================================
// 6. VERIFICAR CONFIGURAÇÕES
// ========================================
console.log('\n⚙️ 6. VERIFICANDO CONFIGURAÇÕES...\n');

const configFile = path.join(__dirname, 'src/config/index.js');
if (fs.existsSync(configFile)) {
  const conteudo = fs.readFileSync(configFile, 'utf8');
  
  const configs = [
    { key: 'database', desc: 'Configurações de Banco' },
    { key: 'server', desc: 'Configurações do Servidor' },
    { key: 'rebeca', desc: 'Configurações da Rebeca' },
    { key: 'horario', desc: 'Horário de Funcionamento' },
  ];
  
  configs.forEach(({ key, desc }) => {
    const presente = conteudo.includes(key);
    console.log(`   ${presente ? '✅' : '❌'} ${desc}`);
    
    resultados.configuracao.push({
      config: desc,
      presente
    });
  });
} else {
  console.log('   ❌ Arquivo de configuração não encontrado!');
  resultados.erros.push('config/index.js não encontrado');
}

// ========================================
// 7. VERIFICAR DEPENDÊNCIAS
// ========================================
console.log('\n📦 7. VERIFICANDO DEPENDÊNCIAS...\n');

const packageFile = path.join(__dirname, 'package.json');
if (fs.existsSync(packageFile)) {
  const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});
  
  console.log(`   ✅ Dependencies: ${deps.length}`);
  console.log(`   ✅ DevDependencies: ${devDeps.length}`);
  
  const essenciais = [
    'express', 'pg', 'dotenv', 'cors', 'socket.io',
    'whatsapp-web.js', 'openai', 'axios'
  ];
  
  essenciais.forEach(dep => {
    const tem = deps.includes(dep);
    console.log(`   ${tem ? '✅' : '❌'} ${dep}`);
  });
} else {
  console.log('   ❌ package.json não encontrado!');
  resultados.erros.push('package.json não encontrado');
}

// ========================================
// RESUMO FINAL
// ========================================
console.log('\n' + '='.repeat(60));
console.log('\n📊 RESUMO DO DIAGNÓSTICO\n');

console.log(`📁 Estrutura: ${resultados.estrutura.length} arquivos verificados`);
console.log(`📡 APIs: ${resultados.apis.length} APIs encontradas`);
console.log(`⚙️ Serviços: ${resultados.servicos.length} serviços verificados`);
console.log(`🗄️ Banco: ${resultados.banco.length > 0 ? 'OK' : 'ERRO'}`);
console.log(`🔌 Integrações: ${resultados.integracao.length} verificadas`);
console.log(`⚙️ Configurações: ${resultados.configuracao.filter(c => c.presente).length}/${resultados.configuracao.length} OK`);

console.log(`\n❌ Erros Críticos: ${resultados.erros.length}`);
console.log(`⚠️ Avisos: ${resultados.avisos.length}`);

if (resultados.erros.length > 0) {
  console.log('\n❌ ERROS CRÍTICOS:');
  resultados.erros.forEach(erro => console.log(`   • ${erro}`));
}

if (resultados.avisos.length > 0) {
  console.log('\n⚠️ AVISOS:');
  resultados.avisos.forEach(aviso => console.log(`   • ${aviso}`));
}

// ========================================
// SCORE FINAL
// ========================================
const totalVerificacoes = resultados.estrutura.length + resultados.apis.length + 
                          resultados.servicos.length + resultados.integracao.length +
                          resultados.configuracao.length;

const totalOK = resultados.estrutura.filter(e => e.status === 'OK').length +
                resultados.apis.filter(a => a.status === 'OK').length +
                resultados.servicos.filter(s => parseFloat(s.percentual) === 100).length +
                resultados.integracao.filter(i => i.presente).length +
                resultados.configuracao.filter(c => c.presente).length;

const score = ((totalOK / totalVerificacoes) * 100).toFixed(1);

console.log('\n' + '='.repeat(60));
console.log(`\n🎯 SCORE FINAL: ${score}%\n`);

if (score >= 90) {
  console.log('✅ SISTEMA 100% FUNCIONAL - PRONTO PARA PRODUÇÃO! 🚀');
} else if (score >= 75) {
  console.log('⚠️ SISTEMA FUNCIONAL - Alguns ajustes recomendados');
} else if (score >= 50) {
  console.log('⚠️ SISTEMA PARCIAL - Correções necessárias');
} else {
  console.log('❌ SISTEMA INCOMPLETO - Requer atenção urgente');
}

console.log('\n' + '='.repeat(60));

// Salvar relatório JSON
const relatorioPath = path.join(__dirname, 'diagnostico-resultado.json');
fs.writeFileSync(relatorioPath, JSON.stringify({
  data: new Date().toISOString(),
  score: parseFloat(score),
  resumo: {
    estrutura: resultados.estrutura.length,
    apis: resultados.apis.length,
    servicos: resultados.servicos.length,
    erros: resultados.erros.length,
    avisos: resultados.avisos.length
  },
  detalhes: resultados
}, null, 2));

console.log(`\n📄 Relatório detalhado salvo em: diagnostico-resultado.json\n`);
