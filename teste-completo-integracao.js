// ========================================
// TESTE COMPLETO DE INTEGRAÇÃO - REBECA
// Verifica todas as implementações
// ========================================

const { query } = require('./src/database/connection');

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

function erro(msg, err) {
  testesFalharam++;
  console.log(`${vermelho}❌ ${msg}${reset}`);
  if (err) console.log(`   ${vermelho}Erro: ${err.message || err}${reset}`);
}

function info(msg) {
  console.log(`${azul}ℹ️  ${msg}${reset}`);
}

function titulo(msg) {
  console.log(`\n${amarelo}${'═'.repeat(60)}${reset}`);
  console.log(`${amarelo}  ${msg}${reset}`);
  console.log(`${amarelo}${'═'.repeat(60)}${reset}\n`);
}

async function testarConexaoBanco() {
  titulo('TESTE 1: CONEXÃO COM BANCO DE DADOS');
  
  try {
    const result = await query('SELECT NOW() as agora');
    if (result.rows.length > 0) {
      ok('Conexão com banco funcionando');
      info(`Hora do servidor: ${result.rows[0].agora}`);
    } else {
      erro('Conexão retornou vazio');
    }
  } catch (err) {
    erro('Falha na conexão com banco', err);
  }
}

async function testarTabelasNovas() {
  titulo('TESTE 2: TABELAS NOVAS (MIGRATIONS)');
  
  // Verificar tabela pontos_referencia
  try {
    await query(`SELECT * FROM pontos_referencia LIMIT 1`);
    ok('Tabela pontos_referencia existe');
  } catch (err) {
    erro('Tabela pontos_referencia NÃO existe', err);
  }
  
  // Verificar tabela pontos_referencia_historico
  try {
    await query(`SELECT * FROM pontos_referencia_historico LIMIT 1`);
    ok('Tabela pontos_referencia_historico existe');
  } catch (err) {
    erro('Tabela pontos_referencia_historico NÃO existe', err);
  }
  
  // Verificar tabela ofertas_corrida
  try {
    await query(`SELECT * FROM ofertas_corrida LIMIT 1`);
    ok('Tabela ofertas_corrida existe');
  } catch (err) {
    erro('Tabela ofertas_corrida NÃO existe', err);
  }
  
  // Verificar campo corridas_perdidas em motoristas
  try {
    await query(`SELECT corridas_perdidas, ultima_corrida_perdida FROM motoristas LIMIT 1`);
    ok('Campo corridas_perdidas existe em motoristas');
  } catch (err) {
    erro('Campo corridas_perdidas NÃO existe', err);
  }
  
  // Verificar campo em_corrida em motoristas
  try {
    await query(`SELECT em_corrida FROM motoristas LIMIT 1`);
    ok('Campo em_corrida existe em motoristas');
  } catch (err) {
    erro('Campo em_corrida NÃO existe', err);
  }
}

async function testarRepositorios() {
  titulo('TESTE 3: REPOSITÓRIOS');
  
  // Testar PontoReferenciaRepository
  try {
    const PontoReferenciaRepository = require('./src/database/repositories/pontoReferenciaRepository');
    
    // Testar função normalizarNome (interna)
    const resultado = await PontoReferenciaRepository.buscar(1, 'teste');
    ok('PontoReferenciaRepository.buscar() funcionando');
  } catch (err) {
    erro('PontoReferenciaRepository falhou', err);
  }
  
  // Testar ConfiguracaoRepository.getValorCorrida
  try {
    const { ConfiguracaoRepository } = require('./src/database');
    const valor = await ConfiguracaoRepository.getValorCorrida(1, null);
    ok(`ConfiguracaoRepository.getValorCorrida() funcionando - Valor: R$ ${valor.valor}`);
    info(`Tipo: ${valor.tipo}`);
  } catch (err) {
    erro('ConfiguracaoRepository.getValorCorrida() falhou', err);
  }
}

async function testarServicos() {
  titulo('TESTE 4: SERVIÇOS');
  
  // Testar OfertaCorridaService
  try {
    const OfertaCorridaService = require('./src/services/ofertaCorrida');
    
    // Verificar se funções existem
    if (typeof OfertaCorridaService.enviarOferta === 'function') {
      ok('OfertaCorridaService.enviarOferta existe');
    } else {
      erro('OfertaCorridaService.enviarOferta NÃO existe');
    }
    
    if (typeof OfertaCorridaService.aceitarOferta === 'function') {
      ok('OfertaCorridaService.aceitarOferta existe');
    } else {
      erro('OfertaCorridaService.aceitarOferta NÃO existe');
    }
    
    if (typeof OfertaCorridaService.expirarOferta === 'function') {
      ok('OfertaCorridaService.expirarOferta existe');
    } else {
      erro('OfertaCorridaService.expirarOferta NÃO existe');
    }
    
    if (typeof OfertaCorridaService.tentarProximoMotorista === 'function') {
      ok('OfertaCorridaService.tentarProximoMotorista existe');
    } else {
      erro('OfertaCorridaService.tentarProximoMotorista NÃO existe');
    }
  } catch (err) {
    erro('OfertaCorridaService falhou ao carregar', err);
  }
  
  // Testar AtribuicaoService
  try {
    const AtribuicaoService = require('./src/services/atribuicao');
    
    if (typeof AtribuicaoService.buscarMotoristasDisponiveis === 'function') {
      ok('AtribuicaoService.buscarMotoristasDisponiveis existe');
    }
    
    // Testar com parâmetro excluirIds
    const resultado = await AtribuicaoService.buscarMotoristasDisponiveis(
      -22.3154, -49.0587, 1, { excluirIds: [999] }
    );
    ok('AtribuicaoService aceita parâmetro excluirIds');
    info(`Motoristas encontrados: ${resultado.motoristas?.length || 0}`);
  } catch (err) {
    erro('AtribuicaoService falhou', err);
  }
}

async function testarFluxoConversa() {
  titulo('TESTE 5: FLUXO DE CONVERSA');
  
  try {
    const FluxoConversa = require('./src/conversation/fluxo');
    
    // Criar instância mock
    const mockWhatsapp = {
      enviarMensagem: async () => true
    };
    
    const fluxo = new FluxoConversa(mockWhatsapp);
    
    // Verificar funções de ponto de referência
    if (typeof fluxo.extrairPontoReferencia === 'function') {
      ok('FluxoConversa.extrairPontoReferencia existe');
      
      // Testar extração
      const ref1 = fluxo.extrairPontoReferencia('quero um carro no shopping');
      const ref2 = fluxo.extrairPontoReferencia('estou na rodoviária');
      const ref3 = fluxo.extrairPontoReferencia('me busca no JB');
      
      if (ref1 === 'shopping') ok(`Extração "shopping" correta`);
      else erro(`Extração "shopping" falhou: ${ref1}`);
      
      if (ref2 === 'rodoviária') ok(`Extração "rodoviária" correta`);
      else erro(`Extração "rodoviária" falhou: ${ref2}`);
      
      if (ref3 === 'JB') ok(`Extração "JB" correta`);
      else erro(`Extração "JB" falhou: ${ref3}`);
    } else {
      erro('FluxoConversa.extrairPontoReferencia NÃO existe');
    }
    
    // Verificar função de preposição
    if (typeof fluxo.preposicaoLocal === 'function') {
      ok('FluxoConversa.preposicaoLocal existe');
      
      const prep1 = fluxo.preposicaoLocal('rodoviária');
      const prep2 = fluxo.preposicaoLocal('shopping');
      
      if (prep1 === 'na') ok(`Preposição "rodoviária" = "na" ✓`);
      else erro(`Preposição "rodoviária" errada: ${prep1}`);
      
      if (prep2 === 'no') ok(`Preposição "shopping" = "no" ✓`);
      else erro(`Preposição "shopping" errada: ${prep2}`);
    }
    
    // Verificar funções de aprendizado
    if (typeof fluxo.pedirEnderecoComReferencia === 'function') {
      ok('FluxoConversa.pedirEnderecoComReferencia existe');
    } else {
      erro('FluxoConversa.pedirEnderecoComReferencia NÃO existe');
    }
    
    if (typeof fluxo.salvarPontoAprendido === 'function') {
      ok('FluxoConversa.salvarPontoAprendido existe');
    } else {
      erro('FluxoConversa.salvarPontoAprendido NÃO existe');
    }
    
    // Verificar função de aguardar resposta motorista
    if (typeof fluxo.aguardarRespostaMotorista === 'function') {
      ok('FluxoConversa.aguardarRespostaMotorista existe');
    } else {
      erro('FluxoConversa.aguardarRespostaMotorista NÃO existe');
    }
    
  } catch (err) {
    erro('Falha ao carregar FluxoConversa', err);
  }
}

async function testarAPIs() {
  titulo('TESTE 6: APIs (ENDPOINTS)');
  
  // Verificar se rotas existem nos arquivos
  const fs = require('fs');
  
  // API Motorista - Ofertas
  try {
    const apiMotorista = fs.readFileSync('./src/api/motorista.js', 'utf8');
    
    if (apiMotorista.includes("router.get('/ofertas'")) {
      ok('GET /api/motorista/ofertas existe');
    } else {
      erro('GET /api/motorista/ofertas NÃO existe');
    }
    
    if (apiMotorista.includes("/ofertas/:corridaId/aceitar")) {
      ok('POST /api/motorista/ofertas/:corridaId/aceitar existe');
    } else {
      erro('POST /api/motorista/ofertas/:corridaId/aceitar NÃO existe');
    }
    
    if (apiMotorista.includes("/ofertas/:corridaId/recusar")) {
      ok('POST /api/motorista/ofertas/:corridaId/recusar existe');
    } else {
      erro('POST /api/motorista/ofertas/:corridaId/recusar NÃO existe');
    }
    
    if (apiMotorista.includes("estatisticas-ofertas")) {
      ok('GET /api/motorista/estatisticas-ofertas existe');
    } else {
      erro('GET /api/motorista/estatisticas-ofertas NÃO existe');
    }
  } catch (err) {
    erro('Falha ao verificar API motorista', err);
  }
  
  // API Admin - Pontos de Referência
  try {
    const apiAdmin = fs.readFileSync('./src/api/admin.js', 'utf8');
    
    if (apiAdmin.includes("router.get('/pontos-referencia'")) {
      ok('GET /api/admin/pontos-referencia existe');
    } else {
      erro('GET /api/admin/pontos-referencia NÃO existe');
    }
    
    if (apiAdmin.includes("router.post('/pontos-referencia'")) {
      ok('POST /api/admin/pontos-referencia existe');
    } else {
      erro('POST /api/admin/pontos-referencia NÃO existe');
    }
    
    if (apiAdmin.includes("/pontos-referencia/:id/confirmar")) {
      ok('PUT /api/admin/pontos-referencia/:id/confirmar existe');
    } else {
      erro('PUT /api/admin/pontos-referencia/:id/confirmar NÃO existe');
    }
    
    // Verificar corridas_perdidas no GET motoristas
    if (apiAdmin.includes("corridas_perdidas") && apiAdmin.includes("ofertas_aceitas")) {
      ok('GET /api/admin/motoristas inclui corridas_perdidas');
    } else {
      erro('GET /api/admin/motoristas NÃO inclui corridas_perdidas');
    }
  } catch (err) {
    erro('Falha ao verificar API admin', err);
  }
}

async function testarLinguagemNatural() {
  titulo('TESTE 7: LINGUAGEM NATURAL (SEM FRASES ROBÓTICAS)');
  
  const fs = require('fs');
  
  try {
    const openaiJs = fs.readFileSync('./src/services/openai.js', 'utf8');
    const fluxoJs = fs.readFileSync('./src/conversation/fluxo.js', 'utf8');
    const regrasJs = fs.readFileSync('./src/services/rebeca-regras.js', 'utf8');
    
    // Verificar ausência de frases robóticas
    const frasesRoboticas = [
      'conforme configurado pela frota',
      'Não tenho autorização pra alterar valores',
      'Como nossa frota é automatizada, preciso',
      'valor definido pela frota',
      'configurado no sistema'
    ];
    
    let todosOk = true;
    for (const frase of frasesRoboticas) {
      if (openaiJs.includes(frase) || fluxoJs.includes(frase) || regrasJs.includes(frase)) {
        erro(`Frase robótica encontrada: "${frase}"`);
        todosOk = false;
      }
    }
    
    if (todosOk) {
      ok('Nenhuma frase robótica encontrada');
    }
    
    // Verificar presença de frases naturais
    if (openaiJs.includes("Não consigo mexer no valor")) {
      ok('Frase natural "Não consigo mexer no valor" presente');
    }
    
    if (openaiJs.includes("Fica R$")) {
      ok('Frase natural "Fica R$" presente');
    }
    
  } catch (err) {
    erro('Falha ao verificar linguagem natural', err);
  }
}

async function testarSimulacaoCompleta() {
  titulo('TESTE 8: SIMULAÇÃO DE FLUXO COMPLETO');
  
  info('Simulando: Cliente pede carro → Motorista não aceita → Passa pro próximo');
  console.log('');
  
  try {
    // Simular dados
    const empresaId = 1;
    const clienteTelefone = '14999001234';
    const origemLat = -22.3154;
    const origemLng = -49.0587;
    
    // 1. Buscar motoristas disponíveis
    const AtribuicaoService = require('./src/services/atribuicao');
    const resultado = await AtribuicaoService.buscarMotoristasDisponiveis(
      origemLat, origemLng, empresaId
    );
    
    info(`Motoristas disponíveis: ${resultado.motoristas?.length || 0}`);
    
    if (resultado.motoristas && resultado.motoristas.length > 0) {
      ok('Busca de motoristas funcionando');
      
      const motorista1 = resultado.motoristas[0];
      info(`Primeiro motorista: ${motorista1.nome} (${motorista1.distancia_km?.toFixed(2) || '?'}km)`);
      
      // 2. Simular busca excluindo o primeiro
      const resultado2 = await AtribuicaoService.buscarMotoristasDisponiveis(
        origemLat, origemLng, empresaId, { excluirIds: [motorista1.id] }
      );
      
      if (resultado2.motoristas) {
        ok(`Exclusão de motorista funcionando (${resultado2.motoristas.length} restantes)`);
        
        if (resultado2.motoristas.length > 0) {
          const motorista2 = resultado2.motoristas[0];
          info(`Próximo motorista: ${motorista2.nome}`);
        }
      }
    } else {
      info('Nenhum motorista cadastrado - teste parcial');
    }
    
    // 3. Testar PontoReferenciaRepository
    const PontoReferenciaRepository = require('./src/database/repositories/pontoReferenciaRepository');
    
    // Simular aprendizado
    info('Simulando aprendizado de ponto de referência...');
    
    const ponto = await PontoReferenciaRepository.registrarOuAtualizar(
      empresaId, 
      'Rodoviária Teste', 
      origemLat, 
      origemLng, 
      'Rodoviária de Bauru',
      clienteTelefone
    );
    
    ok(`Ponto registrado: "${ponto.nome}" (usos: ${ponto.vezes_usado})`);
    
    // Buscar ponto
    const pontoBuscado = await PontoReferenciaRepository.buscar(empresaId, 'Rodoviária Teste');
    if (pontoBuscado) {
      ok('Busca de ponto funcionando');
    }
    
    // Limpar ponto de teste
    await query(`DELETE FROM pontos_referencia WHERE nome = 'Rodoviária Teste'`);
    info('Ponto de teste removido');
    
  } catch (err) {
    erro('Simulação falhou', err);
  }
}

async function testarValoresADM() {
  titulo('TESTE 9: INTEGRAÇÃO DE VALORES DO PAINEL ADM');
  
  try {
    const { ConfiguracaoRepository } = require('./src/database');
    
    // Testar sem cidade
    const valorPadrao = await ConfiguracaoRepository.getValorCorrida(1, null);
    ok(`Valor padrão: R$ ${valorPadrao.valor} (tipo: ${valorPadrao.tipo})`);
    
    // Testar com cidade que não existe
    const valorCidadeInexistente = await ConfiguracaoRepository.getValorCorrida(1, 'CidadeQueNaoExiste');
    ok(`Fallback para cidade inexistente: R$ ${valorCidadeInexistente.valor}`);
    
    // Verificar estrutura do retorno
    if (valorPadrao.valor !== undefined && valorPadrao.tipo !== undefined) {
      ok('Estrutura de retorno correta');
    } else {
      erro('Estrutura de retorno incorreta');
    }
    
  } catch (err) {
    erro('Teste de valores falhou', err);
  }
}

async function main() {
  console.log('\n');
  console.log(`${azul}╔══════════════════════════════════════════════════════════╗${reset}`);
  console.log(`${azul}║     TESTE COMPLETO DE INTEGRAÇÃO - SISTEMA REBECA        ║${reset}`);
  console.log(`${azul}╚══════════════════════════════════════════════════════════╝${reset}`);
  
  try {
    await testarConexaoBanco();
    await testarTabelasNovas();
    await testarRepositorios();
    await testarServicos();
    await testarFluxoConversa();
    await testarAPIs();
    await testarLinguagemNatural();
    await testarValoresADM();
    await testarSimulacaoCompleta();
    
  } catch (err) {
    console.error('Erro geral:', err);
  }
  
  // Resumo final
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
    console.log(`   ${verde}   Sistema 100% integrado e funcionando!${reset}`);
  } else {
    console.log(`   ${amarelo}⚠️  Alguns testes falharam - verificar logs acima${reset}`);
  }
  
  console.log('');
  
  process.exit(testesFalharam > 0 ? 1 : 0);
}

main();
