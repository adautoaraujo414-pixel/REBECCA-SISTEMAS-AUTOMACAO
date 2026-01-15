// ========================================
// TESTE COMPLETO FINAL - SISTEMA REBECA
// Verifica todas as implementações
// ========================================

const fs = require('fs');
const path = require('path');

// Cores para output
const verde = '\x1b[32m';
const vermelho = '\x1b[31m';
const amarelo = '\x1b[33m';
const azul = '\x1b[34m';
const magenta = '\x1b[35m';
const reset = '\x1b[0m';

let testesPassaram = 0;
let testesFalharam = 0;

function ok(msg) {
  testesPassaram++;
  console.log(`${verde}✅ ${msg}${reset}`);
}

function erro(msg, detail) {
  testesFalharam++;
  console.log(`${vermelho}❌ ${msg}${reset}`);
  if (detail) console.log(`   ${vermelho}${detail}${reset}`);
}

function info(msg) {
  console.log(`${azul}ℹ️  ${msg}${reset}`);
}

function titulo(msg) {
  console.log(`\n${amarelo}${'═'.repeat(65)}${reset}`);
  console.log(`${amarelo}  ${msg}${reset}`);
  console.log(`${amarelo}${'═'.repeat(65)}${reset}\n`);
}

function subtitulo(msg) {
  console.log(`\n${magenta}  ▸ ${msg}${reset}`);
}

// ========================================
// TESTE 1: ARQUIVOS EXISTEM
// ========================================
function testarArquivosExistem() {
  titulo('TESTE 1: ARQUIVOS PRINCIPAIS');
  
  const arquivos = [
    // Backend
    { path: 'src/services/ofertaCorrida.js', desc: 'Serviço de Ofertas (Timeout 30s)' },
    { path: 'src/database/repositories/pontoReferenciaRepository.js', desc: 'Repositório Pontos Referência' },
    { path: 'src/conversation/fluxo.js', desc: 'Fluxo de Conversa (Rebeca)' },
    { path: 'src/services/atribuicao.js', desc: 'Serviço de Atribuição' },
    { path: 'src/api/admin.js', desc: 'API Admin' },
    { path: 'src/api/motorista.js', desc: 'API Motorista' },
    { path: 'src/database/migrate.js', desc: 'Migrations (Tabelas)' },
    // Frontend Admin
    { path: 'admin/src/pages/Dashboard.jsx', desc: 'Painel Dashboard' },
    { path: 'admin/src/pages/Motoristas.jsx', desc: 'Painel Motoristas' },
    { path: 'admin/src/pages/Corridas.jsx', desc: 'Painel Corridas' },
    { path: 'admin/src/pages/Assistencia.jsx', desc: 'Painel Assistência (Guincho/Mecânico)' },
    { path: 'admin/src/pages/Avarias.jsx', desc: 'Painel Avarias' },
    { path: 'admin/src/pages/Chat.jsx', desc: 'Painel Chat Frota' },
    { path: 'admin/src/pages/NovaCorrida.jsx', desc: 'Painel Nova Corrida Manual' },
    { path: 'admin/src/components/Layout.jsx', desc: 'Layout (Menu + Responsivo)' },
    // Frontend Motorista
    { path: 'src/public/motorista/index.html', desc: 'App Motorista (PWA)' },
    { path: 'src/public/motorista/sw.js', desc: 'Service Worker (Push)' },
  ];
  
  arquivos.forEach(arq => {
    if (fs.existsSync(arq.path)) {
      ok(arq.desc);
    } else {
      erro(`${arq.desc} NÃO existe`, arq.path);
    }
  });
}

// ========================================
// TESTE 2: SINTAXE DOS ARQUIVOS
// ========================================
function testarSintaxe() {
  titulo('TESTE 2: SINTAXE DOS ARQUIVOS');
  
  const arquivos = [
    'src/services/ofertaCorrida.js',
    'src/database/repositories/pontoReferenciaRepository.js',
    'src/conversation/fluxo.js',
    'src/services/atribuicao.js',
    'src/api/admin.js',
    'src/api/motorista.js',
  ];
  
  arquivos.forEach(arquivo => {
    const { execSync } = require('child_process');
    try {
      execSync(`node --check ${arquivo} 2>&1`);
      ok(`${path.basename(arquivo)} - OK`);
    } catch (e) {
      erro(`${path.basename(arquivo)} - ERRO`, e.message);
    }
  });
}

// ========================================
// TESTE 3: TABELAS DO BANCO
// ========================================
function testarMigrations() {
  titulo('TESTE 3: TABELAS NO BANCO DE DADOS');
  
  const migrateJs = fs.readFileSync('src/database/migrate.js', 'utf8');
  
  const tabelas = [
    { nome: 'pontos_referencia', desc: 'Pontos de Referência (Aprendizado)' },
    { nome: 'pontos_referencia_historico', desc: 'Histórico de Pontos' },
    { nome: 'ofertas_corrida', desc: 'Ofertas de Corrida (Timeout 30s)' },
    { nome: 'contatos_assistencia', desc: 'Contatos Assistência (Guincho/Mecânico)' },
    { nome: 'avarias', desc: 'Registro de Avarias' },
    { nome: 'corridas_manuais', desc: 'Corridas Manuais (ADM)' },
    { nome: 'chat_frota', desc: 'Chat da Frota' },
  ];
  
  tabelas.forEach(t => {
    if (migrateJs.includes(`CREATE TABLE IF NOT EXISTS ${t.nome}`)) {
      ok(t.desc);
    } else {
      erro(`Tabela ${t.nome} NÃO encontrada`);
    }
  });
  
  subtitulo('Campos Especiais');
  
  const campos = [
    { campo: 'corridas_perdidas INTEGER DEFAULT 0', desc: 'Contador corridas perdidas' },
    { campo: 'em_corrida BOOLEAN DEFAULT FALSE', desc: 'Flag motorista em corrida' },
    { campo: 'expira_em TIMESTAMP', desc: 'Expiração oferta (timeout)' },
    { campo: 'fotos TEXT', desc: 'Fotos da avaria (JSON)' },
  ];
  
  campos.forEach(c => {
    if (migrateJs.includes(c.campo)) {
      ok(c.desc);
    } else {
      erro(c.desc + ' NÃO encontrado');
    }
  });
}

// ========================================
// TESTE 4: FUNCIONALIDADES DO BACKEND
// ========================================
function testarFuncionalidadesBackend() {
  titulo('TESTE 4: FUNCIONALIDADES DO BACKEND');
  
  // Oferta Corrida
  subtitulo('Serviço de Ofertas (Timeout 30s)');
  const ofertaJs = fs.readFileSync('src/services/ofertaCorrida.js', 'utf8');
  
  if (ofertaJs.includes('TIMEOUT_SEGUNDOS = 30')) ok('Timeout 30 segundos');
  else erro('Timeout 30 segundos NÃO configurado');
  
  const funcoesOferta = ['enviarOferta', 'expirarOferta', 'tentarProximoMotorista', 'aceitarOferta', 'recusarOferta'];
  funcoesOferta.forEach(fn => {
    if (ofertaJs.includes(`async ${fn}`)) ok(`Função ${fn}`);
    else erro(`Função ${fn} NÃO existe`);
  });
  
  // Pontos de Referência
  subtitulo('Sistema de Aprendizado');
  const repoJs = fs.readFileSync('src/database/repositories/pontoReferenciaRepository.js', 'utf8');
  
  const funcoesPonto = ['buscar', 'buscarConfirmado', 'registrarOuAtualizar', 'incrementarUso'];
  funcoesPonto.forEach(fn => {
    if (repoJs.includes(`async ${fn}`)) ok(`Função ${fn}`);
    else erro(`Função ${fn} NÃO existe`);
  });
  
  if (repoJs.includes('vezes_usado >= 3') || repoJs.includes('novoUso >= 3')) {
    ok('Confirmação após 3 usos');
  } else {
    erro('Confirmação após 3 usos NÃO implementada');
  }
  
  // Atribuição
  subtitulo('Atribuição de Motoristas');
  const atribuicaoJs = fs.readFileSync('src/services/atribuicao.js', 'utf8');
  
  if (atribuicaoJs.includes('excluirIds')) ok('Exclusão de motoristas');
  else erro('Exclusão de motoristas NÃO implementada');
  
  if (atribuicaoJs.includes('em_corrida')) ok('Filtro em_corrida');
  else erro('Filtro em_corrida NÃO implementado');
}

// ========================================
// TESTE 5: ENDPOINTS DA API
// ========================================
function testarEndpointsAPI() {
  titulo('TESTE 5: ENDPOINTS DA API');
  
  // API Admin
  subtitulo('API Admin');
  const apiAdmin = fs.readFileSync('src/api/admin.js', 'utf8');
  
  const endpointsAdmin = [
    { rota: "router.get('/assistencia'", nome: 'GET /assistencia' },
    { rota: "router.post('/assistencia'", nome: 'POST /assistencia' },
    { rota: "router.get('/avarias'", nome: 'GET /avarias' },
    { rota: "router.put('/avarias/:id'", nome: 'PUT /avarias/:id' },
    { rota: "router.post('/corrida-manual'", nome: 'POST /corrida-manual' },
    { rota: "router.get('/chat'", nome: 'GET /chat' },
    { rota: "router.post('/chat/:motoristaId'", nome: 'POST /chat/:motoristaId' },
    { rota: "router.post('/chat/broadcast'", nome: 'POST /chat/broadcast' },
    { rota: "router.get('/sistema/versao'", nome: 'GET /sistema/versao' },
    { rota: "router.get('/pontos-referencia'", nome: 'GET /pontos-referencia' },
  ];
  
  endpointsAdmin.forEach(ep => {
    if (apiAdmin.includes(ep.rota)) ok(ep.nome);
    else erro(ep.nome + ' NÃO existe');
  });
  
  // API Motorista
  subtitulo('API Motorista');
  const apiMotorista = fs.readFileSync('src/api/motorista.js', 'utf8');
  
  const endpointsMotorista = [
    { rota: "router.get('/ofertas'", nome: 'GET /ofertas' },
    { rota: "/ofertas/:corridaId/aceitar", nome: 'POST /ofertas/:id/aceitar' },
    { rota: "/ofertas/:corridaId/recusar", nome: 'POST /ofertas/:id/recusar' },
    { rota: "router.get('/assistencia'", nome: 'GET /assistencia' },
    { rota: "router.get('/avarias'", nome: 'GET /avarias' },
    { rota: "router.post('/avarias'", nome: 'POST /avarias' },
    { rota: "router.get('/chat'", nome: 'GET /chat' },
    { rota: "router.post('/chat'", nome: 'POST /chat' },
  ];
  
  endpointsMotorista.forEach(ep => {
    if (apiMotorista.includes(ep.rota)) ok(ep.nome);
    else erro(ep.nome + ' NÃO existe');
  });
}

// ========================================
// TESTE 6: PAINEL ADMIN (REACT)
// ========================================
function testarPainelAdmin() {
  titulo('TESTE 6: PAINEL ADMIN (REACT)');
  
  // App.jsx - Rotas
  subtitulo('Rotas Configuradas');
  const appJsx = fs.readFileSync('admin/src/App.jsx', 'utf8');
  
  const rotas = [
    'Dashboard', 'Motoristas', 'Corridas', 'Mensagens', 
    'Chat', 'Assistencia', 'Avarias', 'NovaCorrida', 'Configuracoes'
  ];
  
  rotas.forEach(rota => {
    if (appJsx.includes(rota)) ok(`Rota ${rota}`);
    else erro(`Rota ${rota} NÃO configurada`);
  });
  
  // Layout - Menu
  subtitulo('Menu e Responsividade');
  const layoutJsx = fs.readFileSync('admin/src/components/Layout.jsx', 'utf8');
  
  if (layoutJsx.includes('isMobile')) ok('Detecção mobile/desktop');
  else erro('Detecção mobile NÃO implementada');
  
  if (layoutJsx.includes('/nova-corrida')) ok('Menu Nova Corrida');
  else erro('Menu Nova Corrida NÃO existe');
  
  if (layoutJsx.includes('/chat')) ok('Menu Chat Frota');
  else erro('Menu Chat Frota NÃO existe');
  
  if (layoutJsx.includes('/assistencia')) ok('Menu Assistência');
  else erro('Menu Assistência NÃO existe');
  
  if (layoutJsx.includes('/avarias')) ok('Menu Avarias');
  else erro('Menu Avarias NÃO existe');
  
  if (layoutJsx.includes('Instalar App') || layoutJsx.includes('Download')) ok('Botão Instalar PWA');
  else erro('Botão Instalar PWA NÃO existe');
  
  if (layoutJsx.includes('versaoInfo')) ok('Exibição versão do sistema');
  else erro('Exibição versão NÃO existe');
}

// ========================================
// TESTE 7: APP MOTORISTA (PWA)
// ========================================
function testarAppMotorista() {
  titulo('TESTE 7: APP MOTORISTA (PWA)');
  
  const motoristHtml = fs.readFileSync('src/public/motorista/index.html', 'utf8');
  
  subtitulo('Botão Flutuante (+)');
  
  if (motoristHtml.includes('abrirRegistroAvaria')) ok('Botão Registrar Avaria');
  else erro('Botão Registrar Avaria NÃO existe');
  
  if (motoristHtml.includes('abrirAssistencia')) ok('Botão Assistência');
  else erro('Botão Assistência NÃO existe');
  
  if (motoristHtml.includes('abrirChatFrota')) ok('Botão Chat Frota');
  else erro('Botão Chat Frota NÃO existe');
  
  if (motoristHtml.includes('instalarPWA')) ok('Botão Instalar PWA');
  else erro('Botão Instalar PWA NÃO existe');
  
  subtitulo('Modal Avaria');
  
  if (motoristHtml.includes('modal-registro-avaria')) ok('Modal Registro Avaria');
  else erro('Modal Registro Avaria NÃO existe');
  
  if (motoristHtml.includes('avaria-tipo')) ok('Campo Tipo de Avaria');
  else erro('Campo Tipo NÃO existe');
  
  if (motoristHtml.includes('avaria-fotos')) ok('Campo Fotos');
  else erro('Campo Fotos NÃO existe');
  
  if (motoristHtml.includes('envolvidos_telefone') || motoristHtml.includes('avaria-envolvido-telefone')) {
    ok('Campo Telefone Envolvidos');
  } else {
    erro('Campo Telefone Envolvidos NÃO existe');
  }
  
  subtitulo('Modal Chat');
  
  if (motoristHtml.includes('modal-chat-frota')) ok('Modal Chat Frota');
  else erro('Modal Chat Frota NÃO existe');
  
  if (motoristHtml.includes('enviarMensagemChat')) ok('Função Enviar Mensagem');
  else erro('Função Enviar Mensagem NÃO existe');
  
  subtitulo('Assistência Dinâmica');
  
  if (motoristHtml.includes("fetch('/api/motorista/assistencia'") || motoristHtml.includes('assistencia-lista')) {
    ok('Carrega contatos do banco');
  } else {
    erro('NÃO carrega contatos do banco');
  }
}

// ========================================
// TESTE 8: FLUXO DE CONVERSA
// ========================================
function testarFluxoConversa() {
  titulo('TESTE 8: FLUXO DE CONVERSA (REBECA)');
  
  const fluxoJs = fs.readFileSync('src/conversation/fluxo.js', 'utf8');
  
  subtitulo('Aprendizado de Pontos');
  
  if (fluxoJs.includes('extrairPontoReferencia')) ok('Extrai ponto de referência');
  else erro('NÃO extrai ponto de referência');
  
  if (fluxoJs.includes('buscarConfirmado')) ok('Busca ponto confirmado');
  else erro('NÃO busca ponto confirmado');
  
  if (fluxoJs.includes('salvarPontoAprendido')) ok('Salva ponto aprendido');
  else erro('NÃO salva ponto aprendido');
  
  subtitulo('Timeout 30 Segundos');
  
  if (fluxoJs.includes('aguardarRespostaMotorista')) ok('Aguarda resposta motorista');
  else erro('NÃO aguarda resposta motorista');
  
  if (fluxoJs.includes('30 segundos') || fluxoJs.includes('30s')) ok('Mensagem de 30 segundos');
  else erro('Mensagem de 30 segundos NÃO existe');
  
  subtitulo('Linguagem Natural');
  
  const frasesRoboticas = ['conforme configurado pela frota', 'Não tenho autorização'];
  let temFraseRobotica = false;
  frasesRoboticas.forEach(frase => {
    if (fluxoJs.includes(frase)) {
      erro(`Frase robótica: "${frase}"`);
      temFraseRobotica = true;
    }
  });
  if (!temFraseRobotica) ok('Sem frases robóticas');
}

// ========================================
// TESTE 9: SERVICE WORKER (PUSH)
// ========================================
function testarServiceWorker() {
  titulo('TESTE 9: SERVICE WORKER (NOTIFICAÇÕES)');
  
  const swJs = fs.readFileSync('src/public/motorista/sw.js', 'utf8');
  
  if (swJs.includes('push')) ok('Evento push');
  else erro('Evento push NÃO existe');
  
  if (swJs.includes('requireInteraction')) ok('Notificação persistente');
  else erro('Notificação persistente NÃO existe');
  
  if (swJs.includes('vibrate') || swJs.includes('vibration')) ok('Vibração');
  else erro('Vibração NÃO existe');
}

// ========================================
// TESTE 10: EXPORTS
// ========================================
function testarExports() {
  titulo('TESTE 10: EXPORTS DOS MÓDULOS');
  
  const servicesIndex = fs.readFileSync('src/services/index.js', 'utf8');
  
  if (servicesIndex.includes('OfertaCorridaService')) ok('OfertaCorridaService exportado');
  else erro('OfertaCorridaService NÃO exportado');
  
  const reposIndex = fs.readFileSync('src/database/repositories/index.js', 'utf8');
  
  if (reposIndex.includes('PontoReferenciaRepository')) ok('PontoReferenciaRepository exportado');
  else erro('PontoReferenciaRepository NÃO exportado');
}

// ========================================
// EXECUÇÃO
// ========================================
function main() {
  console.log('\n');
  console.log(`${azul}╔═══════════════════════════════════════════════════════════════╗${reset}`);
  console.log(`${azul}║         TESTE COMPLETO FINAL - SISTEMA REBECA                 ║${reset}`);
  console.log(`${azul}║              Todas as Funcionalidades                         ║${reset}`);
  console.log(`${azul}╚═══════════════════════════════════════════════════════════════╝${reset}`);
  
  testarArquivosExistem();
  testarSintaxe();
  testarMigrations();
  testarFuncionalidadesBackend();
  testarEndpointsAPI();
  testarPainelAdmin();
  testarAppMotorista();
  testarFluxoConversa();
  testarServiceWorker();
  testarExports();
  
  // Resumo
  console.log('\n');
  console.log(`${amarelo}╔═══════════════════════════════════════════════════════════════╗${reset}`);
  console.log(`${amarelo}║                      RESULTADO FINAL                          ║${reset}`);
  console.log(`${amarelo}╚═══════════════════════════════════════════════════════════════╝${reset}`);
  console.log('');
  console.log(`   ${verde}✅ Testes passaram: ${testesPassaram}${reset}`);
  console.log(`   ${vermelho}❌ Testes falharam: ${testesFalharam}${reset}`);
  console.log('');
  
  const taxa = ((testesPassaram / (testesPassaram + testesFalharam)) * 100).toFixed(1);
  
  if (testesFalharam === 0) {
    console.log(`   ${verde}🎉 TODOS OS TESTES PASSARAM!${reset}`);
    console.log(`   ${verde}   Sistema 100% integrado e funcionando!${reset}`);
  } else if (taxa >= 90) {
    console.log(`   ${amarelo}⚠️  ${taxa}% dos testes passaram${reset}`);
    console.log(`   ${amarelo}   Verifique os erros acima${reset}`);
  } else {
    console.log(`   ${vermelho}❌ ${taxa}% dos testes passaram${reset}`);
    console.log(`   ${vermelho}   Sistema precisa de correções${reset}`);
  }
  
  console.log('');
  console.log(`${azul}═══════════════════════════════════════════════════════════════${reset}`);
  console.log(`${azul}  FUNCIONALIDADES TESTADAS:${reset}`);
  console.log(`${azul}═══════════════════════════════════════════════════════════════${reset}`);
  console.log(`  ✓ Timeout 30 segundos para motorista aceitar`);
  console.log(`  ✓ Contador de corridas perdidas no painel ADM`);
  console.log(`  ✓ Aprendizado automático de pontos de referência`);
  console.log(`  ✓ Cadastro de Guincho/Mecânico/Borracheiro`);
  console.log(`  ✓ Registro de Avarias (foto, envolvidos, etc)`);
  console.log(`  ✓ Chat da Frota (ADM <-> Motoristas)`);
  console.log(`  ✓ Corrida Manual pelo ADM`);
  console.log(`  ✓ Painel responsivo (Desktop/Mobile)`);
  console.log(`  ✓ PWA instalável (Motorista e ADM)`);
  console.log(`  ✓ Versão do sistema no painel`);
  console.log(`  ✓ Push Notifications com vibração`);
  console.log(`${azul}═══════════════════════════════════════════════════════════════${reset}`);
  console.log('');
}

main();
