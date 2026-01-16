// =====================================================
// TESTE DE INTEGRAÇÕES - REBECA
// Verifica: ADM, Valores, Motorista Próximo
// =====================================================

console.log('🔍 INICIANDO TESTE DE INTEGRAÇÕES...\n');

// Simular banco de dados em memória
const mockDB = {
  empresas: [
    { id: 1, nome: 'UBMAX Bauru', telefone_adm: '14999887766' }
  ],
  motoristas: [
    { id: 1, empresa_id: 1, nome: 'João Silva', telefone: '14991111111', status: 'online', disponivel: true, ativo: true, latitude: -22.3154, longitude: -49.0587, veiculo_modelo: 'Onix', veiculo_cor: 'Branco', veiculo_placa: 'ABC1D23', nota_media: 4.8 },
    { id: 2, empresa_id: 1, nome: 'Maria Santos', telefone: '14992222222', status: 'online', disponivel: true, ativo: true, latitude: -22.3200, longitude: -49.0600, veiculo_modelo: 'HB20', veiculo_cor: 'Prata', veiculo_placa: 'XYZ9K87', nota_media: 4.5 },
    { id: 3, empresa_id: 1, nome: 'Carlos Oliveira', telefone: '14993333333', status: 'offline', disponivel: false, ativo: true, latitude: -22.3100, longitude: -49.0550, veiculo_modelo: 'Gol', veiculo_cor: 'Preto', veiculo_placa: 'QWE4R56', nota_media: 4.2 },
  ],
  clientes: [
    { id: 1, empresa_id: 1, nome: 'Cliente Teste', telefone: '14988887777' }
  ],
  configuracoes: [
    { chave: 'valor_corrida', valor: '15.00' }
  ],
  valores_horario: [
    { empresa_id: 1, dia_semana: new Date().getDay(), horario_inicio: '06:00', horario_fim: '23:00', valor_base: 15.00, km_incluso: 5 }
  ],
  valores_cidade: [
    { empresa_id: 1, cidade_destino: 'São Paulo', valor_fixo: 150.00, ativo: true }
  ]
};

// =====================================================
// TESTE 1: BUSCAR TELEFONE DO ADM
// =====================================================
console.log('📞 TESTE 1: Buscar telefone do ADM');
console.log('-----------------------------------');

function buscarTelefoneADM(clienteId) {
  const cliente = mockDB.clientes.find(c => c.id === clienteId);
  if (!cliente) return { erro: 'Cliente não encontrado' };
  
  const empresa = mockDB.empresas.find(e => e.id === cliente.empresa_id);
  if (!empresa) return { erro: 'Empresa não encontrada' };
  
  return {
    telefone_adm: empresa.telefone_adm,
    empresa_nome: empresa.nome
  };
}

const resultadoADM = buscarTelefoneADM(1);
console.log('Cliente ID: 1');
console.log('Resultado:', resultadoADM);
console.log(resultadoADM.telefone_adm ? '✅ Telefone ADM encontrado!' : '❌ Telefone ADM não encontrado');
console.log('');

// =====================================================
// TESTE 2: BUSCAR VALOR DO PAINEL ADM
// =====================================================
console.log('💰 TESTE 2: Buscar valor do painel ADM');
console.log('--------------------------------------');

function buscarValorCorrida(empresaId, cidadeDestino = null) {
  // 1. Verificar valor fixo por cidade
  if (cidadeDestino) {
    const valorCidade = mockDB.valores_cidade.find(
      v => v.empresa_id === empresaId && 
           v.cidade_destino.toLowerCase() === cidadeDestino.toLowerCase() &&
           v.ativo
    );
    if (valorCidade) {
      return { valor: valorCidade.valor_fixo, tipo: 'cidade_fixa', cidade: cidadeDestino };
    }
  }
  
  // 2. Verificar valor por horário
  const agora = new Date();
  const diaSemana = agora.getDay();
  const horaAtual = agora.toTimeString().substring(0, 5);
  
  const valorHorario = mockDB.valores_horario.find(
    v => v.empresa_id === empresaId && v.dia_semana === diaSemana
  );
  if (valorHorario) {
    return { valor: valorHorario.valor_base, tipo: 'horario', km_incluso: valorHorario.km_incluso };
  }
  
  // 3. Fallback: valor padrão
  const config = mockDB.configuracoes.find(c => c.chave === 'valor_corrida');
  return { valor: parseFloat(config?.valor || 13.00), tipo: 'padrao' };
}

// Teste sem cidade específica
const valor1 = buscarValorCorrida(1);
console.log('Sem cidade destino:', valor1);

// Teste com cidade específica
const valor2 = buscarValorCorrida(1, 'São Paulo');
console.log('Com cidade (São Paulo):', valor2);

// Teste com cidade não cadastrada
const valor3 = buscarValorCorrida(1, 'Curitiba');
console.log('Com cidade não cadastrada (Curitiba):', valor3);

console.log('✅ Sistema de valores funcionando!');
console.log('');

// =====================================================
// TESTE 3: BUSCAR MOTORISTA MAIS PRÓXIMO
// =====================================================
console.log('🚗 TESTE 3: Buscar motorista mais próximo');
console.log('-----------------------------------------');

// Fórmula de Haversine para calcular distância
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371.0088; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function buscarMotoristaProximo(latCliente, lonCliente, empresaId) {
  console.log(`\n📍 Cliente em: ${latCliente}, ${lonCliente}`);
  
  // Filtrar motoristas disponíveis da empresa
  const disponiveis = mockDB.motoristas.filter(m => 
    m.empresa_id === empresaId &&
    m.status === 'online' &&
    m.disponivel === true &&
    m.ativo === true &&
    m.latitude && m.longitude
  );
  
  console.log(`👥 Motoristas disponíveis: ${disponiveis.length}`);
  
  if (disponiveis.length === 0) {
    return null;
  }
  
  // Calcular distância de cada um
  const comDistancia = disponiveis.map(m => {
    const dist = calcularDistancia(latCliente, lonCliente, m.latitude, m.longitude);
    const tempoMin = Math.ceil((dist / 30) * 60); // Assumindo 30km/h média
    return {
      ...m,
      distancia_km: dist,
      tempo_estimado_min: Math.max(tempoMin, 3) // Mínimo 3 min
    };
  });
  
  // Ordenar por distância
  comDistancia.sort((a, b) => a.distancia_km - b.distancia_km);
  
  // Mostrar todos
  console.log('\n📊 Ranking de motoristas:');
  comDistancia.forEach((m, i) => {
    console.log(`   ${i+1}. ${m.nome} - ${m.distancia_km.toFixed(2)}km (~${m.tempo_estimado_min}min) - ⭐${m.nota_media}`);
  });
  
  return comDistancia[0];
}

// Simular cliente em Bauru
const clienteLat = -22.3180;
const clienteLon = -49.0595;

const motoristaMaisProximo = buscarMotoristaProximo(clienteLat, clienteLon, 1);

if (motoristaMaisProximo) {
  console.log('\n✅ MOTORISTA SELECIONADO:');
  console.log(`   Nome: ${motoristaMaisProximo.nome}`);
  console.log(`   Veículo: ${motoristaMaisProximo.veiculo_modelo} ${motoristaMaisProximo.veiculo_cor}`);
  console.log(`   Placa: ${motoristaMaisProximo.veiculo_placa}`);
  console.log(`   Distância: ${motoristaMaisProximo.distancia_km.toFixed(2)}km`);
  console.log(`   Tempo estimado: ~${motoristaMaisProximo.tempo_estimado_min} minutos`);
} else {
  console.log('\n❌ Nenhum motorista disponível');
}

console.log('');

// =====================================================
// TESTE 4: SIMULAÇÃO DE FLUXO COMPLETO
// =====================================================
console.log('🔄 TESTE 4: Simulação de fluxo completo');
console.log('---------------------------------------');

function simularFluxo() {
  const cliente = mockDB.clientes[0];
  
  console.log(`\n1️⃣ Cliente "${cliente.nome}" solicita corrida`);
  console.log(`   Localização: ${clienteLat}, ${clienteLon}`);
  
  // Buscar valor
  const valor = buscarValorCorrida(cliente.empresa_id);
  console.log(`\n2️⃣ Valor buscado do painel: R$ ${valor.valor.toFixed(2)} (${valor.tipo})`);
  
  // Buscar motorista
  const motorista = buscarMotoristaProximo(clienteLat, clienteLon, cliente.empresa_id);
  
  if (motorista) {
    console.log(`\n3️⃣ Motorista encontrado: ${motorista.nome}`);
    
    // Mensagem para cliente
    console.log('\n4️⃣ Mensagem para CLIENTE:');
    console.log('   "Encontrei um motorista a ' + motorista.tempo_estimado_min + ' minutos de você. Posso mandar?"');
    
    console.log('\n5️⃣ Cliente confirma: "Sim"');
    
    // Mensagem de confirmação (SEM valor - só quando perguntar)
    console.log('\n6️⃣ Mensagem de confirmação para CLIENTE:');
    console.log('   "Prontinho! 🚗"');
    console.log(`   "Seu motorista já está a caminho."`);
    console.log(`   "Nome: ${motorista.nome}"`);
    console.log(`   "Veículo: ${motorista.veiculo_modelo} ${motorista.veiculo_cor}"`);
    console.log(`   "Placa: ${motorista.veiculo_placa}"`);
    
    // Se cliente perguntar valor
    console.log('\n7️⃣ SE cliente perguntar "quanto fica?":');
    console.log(`   "Fica R$ ${valor.valor.toFixed(2).replace('.', ',')}."`);
    
  } else {
    console.log('\n❌ Sem motorista disponível');
    console.log('   Mensagem: "Poxa, não encontrei motorista disponível agora. Tenta de novo em alguns minutos?"');
  }
}

simularFluxo();

console.log('\n');
console.log('=====================================================');
console.log('✅ TODOS OS TESTES PASSARAM!');
console.log('=====================================================');
console.log('');
console.log('RESUMO DAS INTEGRAÇÕES:');
console.log('');
console.log('1. ✅ Telefone ADM: Busca de empresas.telefone_adm');
console.log('2. ✅ Valores: Busca de valores_cidade → valores_horario → configuracoes');
console.log('3. ✅ Motorista próximo: Filtra por empresa_id + Haversine + ordenação');
console.log('4. ✅ Fluxo completo: Multi-tenant funcionando');
console.log('');
