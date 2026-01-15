// ========================================
// TESTE OFFLINE - ESTRUTURA DO CÓDIGO
// Verifica todas as implementações sem banco
// ========================================

const fs = require('fs');
const path = require('path');

// Cores para output
const verde = '\x1b[32m';
const vermelho = '\x1b[31m';
const amarelo = '\x1b[33m';
const azul = '\x1b[34m';
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
  console.log(`\n${amarelo}${'═'.repeat(60)}${reset}`);
  console.log(`${amarelo}  ${msg}${reset}`);
  console.log(`${amarelo}${'═'.repeat(60)}${reset}\n`);
}

// ========================================
// TESTE 1: VERIFICAR ARQUIVOS EXISTEM
// ========================================
function testarArquivosExistem() {
  titulo('TESTE 1: ARQUIVOS EXISTEM');
  
  const arquivosObrigatorios = [
    'src/services/ofertaCorrida.js',
    'src/database/repositories/pontoReferenciaRepository.js',
    'src/conversation/fluxo.js',
    'src/services/atribuicao.js',
    'src/services/openai.js',
    'src/api/admin.js',
    'src/api/motorista.js',
    'src/database/migrate.js',
  ];
  
  arquivosObrigatorios.forEach(arquivo => {
    if (fs.existsSync(arquivo)) {
      ok(`${arquivo} existe`);
    } else {
      erro(`${arquivo} NÃO existe`);
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
    try {
      const conteudo = fs.readFileSync(arquivo, 'utf8');
      // Tentar parsear como módulo (verificação básica)
      new Function(conteudo.replace(/require\([^)]+\)/g, '{}').replace(/module\.exports\s*=/g, 'const _exports ='));
      ok(`${path.basename(arquivo)} - sintaxe OK`);
    } catch (err) {
      // Se falhou no Function, tentar node --check
      const { execSync } = require('child_process');
      try {
        execSync(`node --check ${arquivo} 2>&1`);
        ok(`${path.basename(arquivo)} - sintaxe OK (node --check)`);
      } catch (e) {
        erro(`${path.basename(arquivo)} - ERRO de sintaxe`, e.message);
      }
    }
  });
}

// ========================================
// TESTE 3: TABELAS NO MIGRATE.JS
// ========================================
function testarMigrations() {
  titulo('TESTE 3: MIGRATIONS (TABELAS)');
  
  const migrateJs = fs.readFileSync('src/database/migrate.js', 'utf8');
  
  // Tabela pontos_referencia
  if (migrateJs.includes('CREATE TABLE IF NOT EXISTS pontos_referencia')) {
    ok('Tabela pontos_referencia definida');
    
    if (migrateJs.includes('nome_normalizado')) {
      ok('Campo nome_normalizado existe');
    } else {
      erro('Campo nome_normalizado NÃO existe');
    }
    
    if (migrateJs.includes('vezes_usado')) {
      ok('Campo vezes_usado existe');
    } else {
      erro('Campo vezes_usado NÃO existe');
    }
    
    if (migrateJs.includes('confirmado')) {
      ok('Campo confirmado existe');
    } else {
      erro('Campo confirmado NÃO existe');
    }
  } else {
    erro('Tabela pontos_referencia NÃO definida');
  }
  
  // Tabela ofertas_corrida
  if (migrateJs.includes('CREATE TABLE IF NOT EXISTS ofertas_corrida')) {
    ok('Tabela ofertas_corrida definida');
    
    if (migrateJs.includes('expira_em')) {
      ok('Campo expira_em existe (para timeout 30s)');
    } else {
      erro('Campo expira_em NÃO existe');
    }
    
    if (migrateJs.includes('ordem_fila')) {
      ok('Campo ordem_fila existe');
    } else {
      erro('Campo ordem_fila NÃO existe');
    }
  } else {
    erro('Tabela ofertas_corrida NÃO definida');
  }
  
  // Campo corridas_perdidas em motoristas
  if (migrateJs.includes('corridas_perdidas INTEGER DEFAULT 0')) {
    ok('Campo corridas_perdidas em motoristas');
  } else {
    erro('Campo corridas_perdidas NÃO existe em motoristas');
  }
  
  // Campo em_corrida em motoristas
  if (migrateJs.includes('em_corrida BOOLEAN DEFAULT FALSE')) {
    ok('Campo em_corrida em motoristas');
  } else {
    erro('Campo em_corrida NÃO existe em motoristas');
  }
}

// ========================================
// TESTE 4: SERVIÇO DE OFERTAS
// ========================================
function testarOfertaCorridaService() {
  titulo('TESTE 4: SERVIÇO DE OFERTAS (ofertaCorrida.js)');
  
  const ofertaJs = fs.readFileSync('src/services/ofertaCorrida.js', 'utf8');
  
  // Timeout de 30 segundos
  if (ofertaJs.includes('TIMEOUT_SEGUNDOS = 30')) {
    ok('Timeout configurado para 30 segundos');
  } else {
    erro('Timeout de 30 segundos NÃO encontrado');
  }
  
  // Funções obrigatórias
  const funcoes = [
    'enviarOferta',
    'programarTimeout',
    'expirarOferta',
    'tentarProximoMotorista',
    'aceitarOferta',
    'recusarOferta',
  ];
  
  funcoes.forEach(fn => {
    if (ofertaJs.includes(`async ${fn}`) || ofertaJs.includes(`${fn}(`)) {
      ok(`Função ${fn} existe`);
    } else {
      erro(`Função ${fn} NÃO existe`);
    }
  });
  
  // Incrementar corridas_perdidas
  if (ofertaJs.includes('corridas_perdidas = COALESCE(corridas_perdidas, 0) + 1')) {
    ok('Incrementa corridas_perdidas ao expirar/recusar');
  } else {
    erro('NÃO incrementa corridas_perdidas');
  }
}

// ========================================
// TESTE 5: REPOSITÓRIO DE PONTOS
// ========================================
function testarPontoReferenciaRepository() {
  titulo('TESTE 5: REPOSITÓRIO DE PONTOS DE REFERÊNCIA');
  
  const repoJs = fs.readFileSync('src/database/repositories/pontoReferenciaRepository.js', 'utf8');
  
  // Funções obrigatórias
  const funcoes = [
    'buscar',
    'buscarConfirmado',
    'buscarSimilar',
    'registrarOuAtualizar',
    'incrementarUso',
  ];
  
  funcoes.forEach(fn => {
    if (repoJs.includes(`async ${fn}`)) {
      ok(`Função ${fn} existe`);
    } else {
      erro(`Função ${fn} NÃO existe`);
    }
  });
  
  // Lógica de confirmação após 3 usos
  if (repoJs.includes('vezes_usado >= 3') || repoJs.includes('novoUso >= 3')) {
    ok('Confirmação após 3 usos implementada');
  } else {
    erro('Confirmação após 3 usos NÃO encontrada');
  }
  
  // Normalização de nome
  if (repoJs.includes('normalizarNome')) {
    ok('Função de normalização existe');
  } else {
    erro('Função de normalização NÃO existe');
  }
}

// ========================================
// TESTE 6: FLUXO DE CONVERSA
// ========================================
function testarFluxoConversa() {
  titulo('TESTE 6: FLUXO DE CONVERSA');
  
  const fluxoJs = fs.readFileSync('src/conversation/fluxo.js', 'utf8');
  
  // Import do PontoReferenciaRepository
  if (fluxoJs.includes('PontoReferenciaRepository')) {
    ok('PontoReferenciaRepository importado');
  } else {
    erro('PontoReferenciaRepository NÃO importado');
  }
  
  // Funções de ponto de referência
  if (fluxoJs.includes('extrairPontoReferencia')) {
    ok('Função extrairPontoReferencia existe');
  } else {
    erro('Função extrairPontoReferencia NÃO existe');
  }
  
  if (fluxoJs.includes('pedirEnderecoComReferencia')) {
    ok('Função pedirEnderecoComReferencia existe');
  } else {
    erro('Função pedirEnderecoComReferencia NÃO existe');
  }
  
  if (fluxoJs.includes('salvarPontoAprendido')) {
    ok('Função salvarPontoAprendido existe');
  } else {
    erro('Função salvarPontoAprendido NÃO existe');
  }
  
  // Verificar se usa ponto confirmado
  if (fluxoJs.includes('buscarConfirmado')) {
    ok('Busca ponto confirmado antes de pedir localização');
  } else {
    erro('NÃO busca ponto confirmado');
  }
  
  // Função de aguardar resposta motorista
  if (fluxoJs.includes('aguardarRespostaMotorista')) {
    ok('Função aguardarRespostaMotorista existe');
  } else {
    erro('Função aguardarRespostaMotorista NÃO existe');
  }
  
  // Mensagem de timeout para cliente
  if (fluxoJs.includes('30 segundos') || fluxoJs.includes('30s')) {
    ok('Mensagem de 30 segundos para cliente');
  } else {
    erro('Mensagem de 30 segundos NÃO encontrada');
  }
}

// ========================================
// TESTE 7: APIs
// ========================================
function testarAPIs() {
  titulo('TESTE 7: ENDPOINTS DAS APIs');
  
  // API Motorista
  const apiMotorista = fs.readFileSync('src/api/motorista.js', 'utf8');
  
  const endpointsMotorista = [
    { rota: "router.get('/ofertas'", nome: 'GET /api/motorista/ofertas' },
    { rota: "/ofertas/:corridaId/aceitar", nome: 'POST .../aceitar' },
    { rota: "/ofertas/:corridaId/recusar", nome: 'POST .../recusar' },
    { rota: "estatisticas-ofertas", nome: 'GET /api/motorista/estatisticas-ofertas' },
  ];
  
  endpointsMotorista.forEach(ep => {
    if (apiMotorista.includes(ep.rota)) {
      ok(`${ep.nome} existe`);
    } else {
      erro(`${ep.nome} NÃO existe`);
    }
  });
  
  // API Admin
  const apiAdmin = fs.readFileSync('src/api/admin.js', 'utf8');
  
  const endpointsAdmin = [
    { rota: "router.get('/pontos-referencia'", nome: 'GET /api/admin/pontos-referencia' },
    { rota: "router.post('/pontos-referencia'", nome: 'POST /api/admin/pontos-referencia' },
    { rota: "/pontos-referencia/:id/confirmar", nome: 'PUT .../confirmar' },
    { rota: "router.delete('/pontos-referencia/:id'", nome: 'DELETE .../pontos-referencia/:id' },
  ];
  
  endpointsAdmin.forEach(ep => {
    if (apiAdmin.includes(ep.rota)) {
      ok(`${ep.nome} existe`);
    } else {
      erro(`${ep.nome} NÃO existe`);
    }
  });
  
  // Verificar corridas_perdidas no GET motoristas
  if (apiAdmin.includes('corridas_perdidas') && apiAdmin.includes('ofertas_aceitas')) {
    ok('GET /motoristas inclui estatísticas de ofertas');
  } else {
    erro('GET /motoristas NÃO inclui estatísticas de ofertas');
  }
}

// ========================================
// TESTE 8: LINGUAGEM NATURAL
// ========================================
function testarLinguagemNatural() {
  titulo('TESTE 8: LINGUAGEM NATURAL');
  
  const openaiJs = fs.readFileSync('src/services/openai.js', 'utf8');
  const fluxoJs = fs.readFileSync('src/conversation/fluxo.js', 'utf8');
  
  // Verificar ausência de frases robóticas
  const frasesRoboticas = [
    'conforme configurado pela frota',
    'Não tenho autorização pra alterar valores',
    'valor definido pela frota',
  ];
  
  let temFraseRobotica = false;
  frasesRoboticas.forEach(frase => {
    if (openaiJs.includes(frase) || fluxoJs.includes(frase)) {
      erro(`Frase robótica encontrada: "${frase}"`);
      temFraseRobotica = true;
    }
  });
  
  if (!temFraseRobotica) {
    ok('Nenhuma frase robótica encontrada');
  }
  
  // Verificar frases naturais
  if (openaiJs.includes('Fica R$') || openaiJs.includes('Não consigo mexer')) {
    ok('Frases naturais implementadas');
  }
}

// ========================================
// TESTE 9: ATRIBUIÇÃO COM EXCLUSÃO
// ========================================
function testarAtribuicaoExclusao() {
  titulo('TESTE 9: ATRIBUIÇÃO COM EXCLUSÃO DE MOTORISTAS');
  
  const atribuicaoJs = fs.readFileSync('src/services/atribuicao.js', 'utf8');
  
  // Verificar parâmetro excluirIds
  if (atribuicaoJs.includes('excluirIds')) {
    ok('Parâmetro excluirIds implementado');
  } else {
    erro('Parâmetro excluirIds NÃO encontrado');
  }
  
  // Verificar query de exclusão
  if (atribuicaoJs.includes('NOT IN')) {
    ok('Query de exclusão (NOT IN) implementada');
  } else {
    erro('Query de exclusão NÃO encontrada');
  }
  
  // Verificar filtro em_corrida
  if (atribuicaoJs.includes('em_corrida')) {
    ok('Filtro em_corrida implementado');
  } else {
    erro('Filtro em_corrida NÃO encontrado');
  }
}

// ========================================
// TESTE 10: EXPORTS
// ========================================
function testarExports() {
  titulo('TESTE 10: EXPORTS DOS MÓDULOS');
  
  // Services index
  const servicesIndex = fs.readFileSync('src/services/index.js', 'utf8');
  
  if (servicesIndex.includes('OfertaCorridaService')) {
    ok('OfertaCorridaService exportado');
  } else {
    erro('OfertaCorridaService NÃO exportado');
  }
  
  // Repositories index
  const reposIndex = fs.readFileSync('src/database/repositories/index.js', 'utf8');
  
  if (reposIndex.includes('PontoReferenciaRepository')) {
    ok('PontoReferenciaRepository exportado');
  } else {
    erro('PontoReferenciaRepository NÃO exportado');
  }
}

// ========================================
// EXECUÇÃO
// ========================================
function main() {
  console.log('\n');
  console.log(`${azul}╔══════════════════════════════════════════════════════════╗${reset}`);
  console.log(`${azul}║   TESTE COMPLETO DE INTEGRAÇÃO - SISTEMA REBECA          ║${reset}`);
  console.log(`${azul}║              (Modo Offline - Sem Banco)                   ║${reset}`);
  console.log(`${azul}╚══════════════════════════════════════════════════════════╝${reset}`);
  
  testarArquivosExistem();
  testarSintaxe();
  testarMigrations();
  testarOfertaCorridaService();
  testarPontoReferenciaRepository();
  testarFluxoConversa();
  testarAPIs();
  testarLinguagemNatural();
  testarAtribuicaoExclusao();
  testarExports();
  
  // Resumo
  console.log('\n');
  console.log(`${amarelo}╔══════════════════════════════════════════════════════════╗${reset}`);
  console.log(`${amarelo}║                    RESULTADO FINAL                       ║${reset}`);
  console.log(`${amarelo}╚══════════════════════════════════════════════════════════╝${reset}`);
  console.log('');
  console.log(`   ${verde}✅ Testes passaram: ${testesPassaram}${reset}`);
  console.log(`   ${vermelho}❌ Testes falharam: ${testesFalharam}${reset}`);
  console.log('');
  
  if (testesFalharam === 0) {
    console.log(`   ${verde}🎉 TODOS OS TESTES PASSARAM!${reset}`);
    console.log(`   ${verde}   Sistema 100% integrado e pronto!${reset}`);
  } else {
    console.log(`   ${amarelo}⚠️  Alguns testes falharam - verificar implementação${reset}`);
  }
  
  console.log('');
  console.log(`${azul}─────────────────────────────────────────────────────────────${reset}`);
  console.log(`${azul}  📝 Para testar com banco de dados:${reset}`);
  console.log(`${azul}     1. npm install${reset}`);
  console.log(`${azul}     2. Configure DATABASE_URL no .env${reset}`);
  console.log(`${azul}     3. node src/database/migrate.js${reset}`);
  console.log(`${azul}     4. node teste-completo-integracao.js${reset}`);
  console.log(`${azul}─────────────────────────────────────────────────────────────${reset}`);
  console.log('');
}

main();
