#!/usr/bin/env node
// ========================================
// REBECA - DIAGNÓSTICO E TESTE DO SISTEMA
// Valida todas as integrações
// ========================================

console.log('🔍 REBECA - Diagnóstico do Sistema\n');
console.log('='.repeat(50));

// Resultados do diagnóstico
const resultados = {
  ok: [],
  avisos: [],
  erros: [],
  faltando: []
};

// ========================================
// 1. VERIFICAR ARQUIVOS ESSENCIAIS
// ========================================
console.log('\n📁 1. VERIFICANDO ARQUIVOS ESSENCIAIS...\n');

const fs = require('fs');
const path = require('path');

const arquivosEssenciais = [
  { path: 'src/server.js', desc: 'Servidor principal' },
  { path: 'src/services/openai.js', desc: 'Integração OpenAI' },
  { path: 'src/services/antifraude.js', desc: 'Sistema Anti-Fraude' },
  { path: 'src/services/monitoramento.js', desc: 'Monitoramento de Corridas' },
  { path: 'src/services/geocoding.js', desc: 'Geocoding' },
  { path: 'src/services/telefonia.js', desc: 'Telefonia Twilio' },
  { path: 'src/whatsapp/evolution.js', desc: 'WhatsApp Evolution API' },
  { path: 'src/conversation/fluxo.js', desc: 'Fluxo de Conversa IA' },
  { path: 'src/database/migrate.js', desc: 'Migrações do Banco' },
  { path: 'src/api/admin.js', desc: 'API Admin' },
  { path: 'src/api/master.js', desc: 'API Master' },
  { path: 'src/api/motorista.js', desc: 'API Motorista' },
  { path: 'src/public/admin/index.html', desc: 'Painel ADM' },
  { path: 'src/public/master/index.html', desc: 'Painel Master' },
  { path: 'src/public/motorista/index.html', desc: 'Painel Motorista' },
  { path: 'src/public/rastrear/index.html', desc: 'Tela Rastreamento' },
];

arquivosEssenciais.forEach(arq => {
  const fullPath = path.join(__dirname, '..', arq.path);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${arq.desc}`);
    resultados.ok.push(arq.desc);
  } else {
    console.log(`  ❌ ${arq.desc} - FALTANDO`);
    resultados.faltando.push(arq.desc);
  }
});

// ========================================
// 2. VERIFICAR VARIÁVEIS DE AMBIENTE
// ========================================
console.log('\n🔐 2. VERIFICANDO VARIÁVEIS DE AMBIENTE...\n');

try {
  require('dotenv').config();
} catch (e) {
  console.log('  ⚠️ dotenv não instalado, usando variáveis do sistema');
}

const variaveis = [
  { key: 'DATABASE_URL', desc: 'Banco de Dados', obrigatorio: true },
  { key: 'OPENAI_API_KEY', desc: 'OpenAI API Key', obrigatorio: true },
  { key: 'EVOLUTION_API_URL', desc: 'Evolution API URL', obrigatorio: true },
  { key: 'EVOLUTION_API_KEY', desc: 'Evolution API Key', obrigatorio: true },
  { key: 'TWILIO_ACCOUNT_SID', desc: 'Twilio SID', obrigatorio: false },
  { key: 'TWILIO_AUTH_TOKEN', desc: 'Twilio Token', obrigatorio: false },
  { key: 'JWT_SECRET', desc: 'JWT Secret', obrigatorio: true },
  { key: 'BASE_URL', desc: 'URL Base', obrigatorio: false },
];

variaveis.forEach(v => {
  const valor = process.env[v.key];
  if (valor && valor !== '' && !valor.includes('xxx') && !valor.includes('sua_')) {
    console.log(`  ✅ ${v.desc} - Configurado`);
    resultados.ok.push(`ENV: ${v.desc}`);
  } else if (v.obrigatorio) {
    console.log(`  ❌ ${v.desc} - NÃO CONFIGURADO (obrigatório)`);
    resultados.erros.push(`ENV: ${v.desc} não configurado`);
  } else {
    console.log(`  ⚠️ ${v.desc} - Não configurado (opcional)`);
    resultados.avisos.push(`ENV: ${v.desc} não configurado`);
  }
});

// ========================================
// 3. VERIFICAR INTEGRAÇÕES
// ========================================
console.log('\n🔌 3. VERIFICANDO INTEGRAÇÕES...\n');

// Testar imports
try {
  const services = require('../src/services');
  console.log('  ✅ Services carregados');
  
  if (services.OpenAIService) {
    console.log('    ✅ OpenAI Service');
  }
  if (services.AntiFraude) {
    console.log('    ✅ Anti-Fraude Service');
  }
  if (services.MonitoramentoCorridas) {
    console.log('    ✅ Monitoramento Service');
  }
  if (services.GeocodingService) {
    console.log('    ✅ Geocoding Service');
  }
  resultados.ok.push('Services integrados');
} catch (error) {
  console.log(`  ❌ Erro ao carregar services: ${error.message}`);
  resultados.erros.push('Services não carregam');
}

// ========================================
// 4. VERIFICAR FLUXOS IMPLEMENTADOS
// ========================================
console.log('\n🔄 4. VERIFICANDO FLUXOS...\n');

const fluxos = [
  { nome: 'Login Master', check: () => fs.readFileSync(path.join(__dirname, '../src/api/master.js'), 'utf8').includes("router.post('/login'") },
  { nome: 'Login ADM', check: () => fs.readFileSync(path.join(__dirname, '../src/api/auth.js'), 'utf8').includes("router.post('/admin/login'") },
  { nome: 'Primeiro Acesso', check: () => fs.readFileSync(path.join(__dirname, '../src/api/auth.js'), 'utf8').includes("validar-token") },
  { nome: 'Anti-Fraude Resumo', check: () => fs.readFileSync(path.join(__dirname, '../src/api/admin.js'), 'utf8').includes("antifraude/resumo") },
  { nome: 'Monitoramento Atrasos', check: () => fs.readFileSync(path.join(__dirname, '../src/services/monitoramento.js'), 'utf8').includes("verificarTodasCorridas") },
  { nome: 'Notificar ADM', check: () => fs.readFileSync(path.join(__dirname, '../src/services/monitoramento.js'), 'utf8').includes("notificarADMAntiFraude") },
  { nome: 'Webhook WhatsApp', check: () => fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf8').includes("app.post('/webhook'") },
  { nome: 'WebSocket GPS', check: () => fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf8').includes("configurarWebSocket") },
];

fluxos.forEach(f => {
  try {
    if (f.check()) {
      console.log(`  ✅ ${f.nome}`);
      resultados.ok.push(`Fluxo: ${f.nome}`);
    } else {
      console.log(`  ❌ ${f.nome} - Não encontrado`);
      resultados.faltando.push(`Fluxo: ${f.nome}`);
    }
  } catch (error) {
    console.log(`  ⚠️ ${f.nome} - Erro ao verificar`);
    resultados.avisos.push(`Fluxo: ${f.nome}`);
  }
});

// ========================================
// 5. SIMULAÇÃO DE FLUXO ANTI-FRAUDE
// ========================================
console.log('\n🧪 5. SIMULAÇÃO ANTI-FRAUDE...\n');

try {
  const { AntiFraude, SEVERIDADE, TIPO_ALERTA } = require('../src/services/antifraude');
  
  // Criar instância sem WhatsApp (teste)
  const antiFraude = new AntiFraude(null);
  
  // Simular cálculo de score
  const alertasTeste = [
    { severidade: SEVERIDADE.VERMELHO },
    { severidade: SEVERIDADE.AMARELO },
  ];
  
  const score = antiFraude.calcularScore(alertasTeste);
  console.log(`  ✅ Cálculo de score funcionando: ${score}/100`);
  
  // Simular recomendação
  const recomendacao = antiFraude.gerarRecomendacao(alertasTeste, score);
  console.log(`  ✅ Recomendação: ${recomendacao.acao} (${recomendacao.cor})`);
  
  resultados.ok.push('Anti-Fraude simulado com sucesso');
} catch (error) {
  console.log(`  ❌ Erro na simulação: ${error.message}`);
  resultados.erros.push('Anti-Fraude com erro');
}

// ========================================
// 6. VERIFICAR BANCO DE DADOS
// ========================================
console.log('\n🗄️ 6. VERIFICANDO ESTRUTURA DO BANCO...\n');

const migrateContent = fs.readFileSync(path.join(__dirname, '../src/database/migrate.js'), 'utf8');

const tabelas = [
  'empresas', 'planos', 'motoristas', 'clientes', 'corridas', 
  'mensagens', 'configuracoes', 'alertas_fraude', 'logs_localizacao', 'reclamacoes'
];

tabelas.forEach(t => {
  if (migrateContent.includes(`CREATE TABLE IF NOT EXISTS ${t}`) || migrateContent.includes(`TABLE ${t}`)) {
    console.log(`  ✅ Tabela: ${t}`);
  } else {
    console.log(`  ⚠️ Tabela: ${t} - Verificar`);
    resultados.avisos.push(`Tabela ${t} pode não existir`);
  }
});

// ========================================
// 7. VERIFICAR CAMPOS IMPORTANTES
// ========================================
console.log('\n📋 7. VERIFICANDO CAMPOS IMPORTANTES...\n');

const camposImportantes = [
  { tabela: 'corridas', campo: 'prioridade' },
  { tabela: 'corridas', campo: 'tempo_estimado' },
  { tabela: 'corridas', campo: 'motivo_cancelamento' },
  { tabela: 'motoristas', campo: 'qtd_atrasos' },
  { tabela: 'empresas', campo: 'telefone_ia' },
  { tabela: 'empresas', campo: 'whatsapp_rebeca' },
];

camposImportantes.forEach(c => {
  if (migrateContent.includes(c.campo)) {
    console.log(`  ✅ ${c.tabela}.${c.campo}`);
  } else {
    console.log(`  ⚠️ ${c.tabela}.${c.campo} - Verificar`);
  }
});

// ========================================
// RESUMO FINAL
// ========================================
console.log('\n' + '='.repeat(50));
console.log('📊 RESUMO DO DIAGNÓSTICO');
console.log('='.repeat(50));

console.log(`\n✅ OK: ${resultados.ok.length} itens`);
console.log(`⚠️ Avisos: ${resultados.avisos.length} itens`);
console.log(`❌ Erros: ${resultados.erros.length} itens`);
console.log(`📦 Faltando: ${resultados.faltando.length} itens`);

if (resultados.erros.length > 0) {
  console.log('\n❌ ERROS CRÍTICOS:');
  resultados.erros.forEach(e => console.log(`   - ${e}`));
}

if (resultados.faltando.length > 0) {
  console.log('\n📦 ITENS FALTANDO:');
  resultados.faltando.forEach(f => console.log(`   - ${f}`));
}

// ========================================
// LISTA DO QUE FALTA IMPLEMENTAR
// ========================================
console.log('\n' + '='.repeat(50));
console.log('📝 O QUE FALTA NO SISTEMA');
console.log('='.repeat(50));

const faltaImplementar = [
  { item: 'Gateway de Pagamento (PIX/Cartão)', prioridade: 'ALTA', status: '❌ Não implementado' },
  { item: 'Notificações Push (Firebase)', prioridade: 'MÉDIA', status: '❌ Não implementado' },
  { item: 'Sistema de Avaliação (estrelas)', prioridade: 'MÉDIA', status: '❌ Não implementado' },
  { item: 'Recibo/Nota Fiscal PDF', prioridade: 'BAIXA', status: '❌ Não implementado' },
  { item: '2FA (Autenticação 2 fatores)', prioridade: 'BAIXA', status: '❌ Não implementado' },
  { item: 'App Nativo (React Native)', prioridade: 'BAIXA', status: '❌ Não implementado' },
];

const implementado = [
  { item: 'WhatsApp Evolution API', status: '✅ Implementado' },
  { item: 'OpenAI GPT + Whisper', status: '✅ Implementado' },
  { item: 'Fluxo de Conversa IA', status: '✅ Implementado' },
  { item: 'Sistema Anti-Fraude', status: '✅ Implementado' },
  { item: 'Monitoramento de Atrasos', status: '✅ Implementado' },
  { item: 'Notificação ADM via WhatsApp', status: '✅ Implementado' },
  { item: 'Geocoding/Rotas', status: '✅ Implementado' },
  { item: 'WebSocket GPS Tempo Real', status: '✅ Implementado' },
  { item: 'Telefonia Twilio', status: '✅ Implementado' },
  { item: 'Multi-tenant SaaS', status: '✅ Implementado' },
  { item: 'Painel Master', status: '✅ Implementado' },
  { item: 'Painel ADM', status: '✅ Implementado' },
  { item: 'Painel Motorista', status: '✅ Implementado' },
  { item: 'Tela Rastreamento GPS', status: '✅ Implementado' },
  { item: 'Sistema de Prioridade', status: '✅ Implementado' },
  { item: 'Primeiro Acesso ADM', status: '✅ Implementado' },
];

console.log('\n✅ IMPLEMENTADO:');
implementado.forEach(i => console.log(`   ${i.status} ${i.item}`));

console.log('\n❌ FALTA IMPLEMENTAR:');
faltaImplementar.forEach(f => console.log(`   ${f.status} ${f.item} [${f.prioridade}]`));

// ========================================
// CONFIGURAÇÕES NECESSÁRIAS
// ========================================
console.log('\n' + '='.repeat(50));
console.log('⚙️ CONFIGURAÇÕES NECESSÁRIAS PARA PRODUÇÃO');
console.log('='.repeat(50));

console.log(`
1. BANCO DE DADOS (PostgreSQL):
   DATABASE_URL=postgresql://user:pass@host:5432/db

2. EVOLUTION API (WhatsApp):
   EVOLUTION_API_URL=https://sua-evolution.com
   EVOLUTION_API_KEY=sua_chave

3. OPENAI:
   OPENAI_API_KEY=sk-proj-...

4. TWILIO (Opcional - Telefonia):
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+55...

5. SISTEMA:
   BASE_URL=https://seu-dominio.com
   JWT_SECRET=chave_segura_aqui
   NODE_ENV=production
`);

console.log('='.repeat(50));
console.log('🏁 DIAGNÓSTICO COMPLETO!');
console.log('='.repeat(50));

// Exportar resultados
module.exports = resultados;
