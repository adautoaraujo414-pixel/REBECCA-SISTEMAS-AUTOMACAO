// ========================================
// REBECA - SEED DE CONFIGURAÇÕES INICIAIS
// Inclui: Usuário MASTER, Configurações de Preço
// ========================================

const { pool } = require('./connection');
const crypto = require('crypto');

// Função para criar hash de senha
const hashSenha = (senha) => {
  return crypto.createHash('sha256').update(senha).digest('hex');
};

const seedData = async () => {
  console.log('⚙️ Inserindo configurações iniciais...');

  try {
    // ========================================
    // 1. USUÁRIO MASTER ADM
    // Login: adautoaraujo414@gmail.com
    // Senha: Ci851213@
    // ========================================
    const emailMaster = 'adautoaraujo414@gmail.com';
    const senhaMaster = 'Ci851213@';
    const senhaHash = hashSenha(senhaMaster);
    
    const masterExiste = await pool.query('SELECT id FROM usuarios_master WHERE email = $1', [emailMaster]);
    if (masterExiste.rows.length === 0) {
      await pool.query(
        `INSERT INTO usuarios_master (email, senha_hash, nome, ativo) 
         VALUES ($1, $2, $3, true)`,
        [emailMaster, senhaHash, 'Adauto Araújo']
      );
      console.log('✅ Usuário MASTER criado: ' + emailMaster);
    } else {
      // Atualizar senha se já existe
      await pool.query(
        'UPDATE usuarios_master SET senha_hash = $1 WHERE email = $2',
        [senhaHash, emailMaster]
      );
      console.log('✅ Senha do MASTER atualizada');
    }

    // ========================================
    // 2. CONFIGURAÇÕES DE PREÇO POR MOTORISTA
    // Até 40 motoristas: R$ 49,90 cada
    // Acima de 40: R$ 41,90 cada
    // ========================================
    const configsPreco = [
      ['preco_motorista_ate_40', '49.90', 'Valor por motorista (até 40)'],
      ['preco_motorista_acima_40', '41.90', 'Valor por motorista (acima de 40)'],
      ['limite_motoristas_preco_cheio', '40', 'Limite para preço cheio'],
    ];
    
    for (const [chave, valor, descricao] of configsPreco) {
      const existe = await pool.query('SELECT id FROM configuracoes WHERE chave = $1 AND empresa_id IS NULL', [chave]);
      if (existe.rows.length === 0) {
        await pool.query(
          'INSERT INTO configuracoes (chave, valor, tipo) VALUES ($1, $2, $3)',
          [chave, valor, 'sistema']
        );
      } else {
        await pool.query(
          'UPDATE configuracoes SET valor = $1 WHERE chave = $2 AND empresa_id IS NULL',
          [valor, chave]
        );
      }
    }
    console.log('✅ Preços por motorista configurados:');
    console.log('   📌 Até 40 motoristas: R$ 49,90/cada');
    console.log('   📌 Acima de 40: R$ 41,90/cada');

    // ========================================
    // 3. CONFIGURAÇÕES PADRÃO DO SISTEMA
    // ========================================
    const configs = [
      ['valor_corrida', '13.00', 'Valor fixo da corrida'],
      ['valor_minimo', '13.00', 'Valor mínimo da corrida'],
      ['valor_km_adicional', '2.50', 'Valor por km adicional'],
      ['km_incluso', '5', 'KM inclusos no valor base'],
      ['horario_inicio', '06:00', 'Horário de início do atendimento'],
      ['horario_fim', '23:00', 'Horário de fim do atendimento'],
      ['taxa_noturna', '0', 'Taxa adicional noturna (%)'],
      ['horario_noturno_inicio', '22:00', 'Início do horário noturno'],
      ['horario_noturno_fim', '06:00', 'Fim do horário noturno'],
      ['aceita_pix', 'true', 'Aceita pagamento via PIX'],
      ['aceita_cartao', 'true', 'Aceita pagamento via cartão'],
      ['aceita_dinheiro', 'true', 'Aceita pagamento em dinheiro'],
      ['chave_pix', '', 'Chave PIX para pagamentos'],
      ['nome_frota', 'UBMAX', 'Nome da frota/empresa'],
      ['telefone_suporte', '', 'Telefone do suporte']
    ];
    
    for (const [chave, valor, descricao] of configs) {
      const existe = await pool.query('SELECT id FROM configuracoes WHERE chave = $1 AND empresa_id IS NULL', [chave]);
      if (existe.rows.length === 0) {
        await pool.query(
          'INSERT INTO configuracoes (chave, valor, tipo) VALUES ($1, $2, $3)',
          [chave, valor, 'texto']
        );
      }
    }
    
    console.log('✅ Configurações do sistema inseridas');
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('📌 SISTEMA REBECA CONFIGURADO!');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('🔑 Login MASTER:');
    console.log('   Email: adautoaraujo414@gmail.com');
    console.log('   Senha: Ci851213@');
    console.log('');
    console.log('💰 Preços por Motorista:');
    console.log('   Até 40 motoristas: R$ 49,90/cada');
    console.log('   Acima de 40: R$ 41,90/cada');
    console.log('');
    console.log('📱 Acessos:');
    console.log('   /master - Painel MASTER (criar empresas)');
    console.log('   /admin - Painel ADM (gerenciar frota)');
    console.log('   /motorista - App do motorista');
    console.log('');

  } catch (error) {
    console.error('❌ Erro no seed:', error.message);
    throw error;
  }
};

// ========================================
// FUNÇÃO PARA CALCULAR VALOR DA ASSINATURA
// ========================================
const calcularValorAssinatura = async (empresaId) => {
  try {
    // Contar motoristas ativos da empresa
    const result = await pool.query(
      'SELECT COUNT(*) as total FROM motoristas WHERE empresa_id = $1 AND ativo = true',
      [empresaId]
    );
    const totalMotoristas = parseInt(result.rows[0].total) || 0;
    
    // Buscar preços configurados
    const precoAte40 = await pool.query(
      "SELECT valor FROM configuracoes WHERE chave = 'preco_motorista_ate_40' AND empresa_id IS NULL"
    );
    const precoAcima40 = await pool.query(
      "SELECT valor FROM configuracoes WHERE chave = 'preco_motorista_acima_40' AND empresa_id IS NULL"
    );
    
    const valorAte40 = parseFloat(precoAte40.rows[0]?.valor) || 49.90;
    const valorAcima40 = parseFloat(precoAcima40.rows[0]?.valor) || 41.90;
    
    let valorTotal = 0;
    
    if (totalMotoristas <= 40) {
      // Todos pagam R$ 49,90
      valorTotal = totalMotoristas * valorAte40;
    } else {
      // Primeiros 40 pagam R$ 49,90, resto paga R$ 41,90
      valorTotal = (40 * valorAte40) + ((totalMotoristas - 40) * valorAcima40);
    }
    
    return {
      totalMotoristas,
      valorPorMotorista: totalMotoristas <= 40 ? valorAte40 : valorAcima40,
      valorTotal: valorTotal.toFixed(2),
      detalhes: totalMotoristas <= 40 
        ? `${totalMotoristas} x R$ ${valorAte40.toFixed(2)} = R$ ${valorTotal.toFixed(2)}`
        : `40 x R$ ${valorAte40.toFixed(2)} + ${totalMotoristas - 40} x R$ ${valorAcima40.toFixed(2)} = R$ ${valorTotal.toFixed(2)}`
    };
  } catch (error) {
    console.error('Erro ao calcular assinatura:', error);
    return { valorTotal: '0.00', totalMotoristas: 0 };
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  seedData().then(() => {
    console.log('Seed finalizado');
    process.exit(0);
  }).catch(() => process.exit(1));
}

module.exports = { seedData, calcularValorAssinatura };
