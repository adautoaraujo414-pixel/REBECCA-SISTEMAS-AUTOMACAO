// ========================================
// RESET COMPLETO DO SISTEMA REBECA
// - Limpa todos os dados de demo
// - Cria usuário MASTER
// - Configura preços
// ========================================

const { Pool } = require('pg');
const crypto = require('crypto');

// Conexão com banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4
});

// Hash de senha
const hashSenha = (senha) => {
  return crypto.createHash('sha256').update(senha).digest('hex');
};

const resetSistema = async () => {
  console.log('🔄 INICIANDO RESET COMPLETO DO SISTEMA...\n');

  try {
    // ========================================
    // 1. LIMPAR TODOS OS DADOS DE DEMO
    // ========================================
    console.log('🗑️  Limpando dados de demonstração...');
    
    // Deletar na ordem correta (por causa das foreign keys)
    await pool.query('DELETE FROM mensagens');
    await pool.query('DELETE FROM ofertas_corrida');
    await pool.query('DELETE FROM alertas_fraude');
    await pool.query('DELETE FROM avarias');
    await pool.query('DELETE FROM chat_frota');
    await pool.query('DELETE FROM mensagens_suporte');
    await pool.query('DELETE FROM logs_localizacao');
    await pool.query('DELETE FROM corridas');
    await pool.query('DELETE FROM conversas');
    await pool.query('DELETE FROM mensalidades');
    await pool.query('DELETE FROM pagamentos');
    await pool.query('DELETE FROM motoristas');
    await pool.query('DELETE FROM clientes');
    await pool.query('DELETE FROM admins');
    await pool.query('DELETE FROM config_rebeca');
    await pool.query('DELETE FROM assinaturas');
    await pool.query('DELETE FROM notificacoes');
    await pool.query('DELETE FROM log_master');
    await pool.query('DELETE FROM configuracoes');
    await pool.query('DELETE FROM pontos_referencia');
    await pool.query('DELETE FROM usuarios_master');
    await pool.query('DELETE FROM empresas');
    
    console.log('✅ Dados de demo removidos!\n');

    // ========================================
    // 2. CRIAR USUÁRIO MASTER
    // ========================================
    console.log('👤 Criando usuário MASTER...');
    
    const emailMaster = 'adautoaraujo414@gmail.com';
    const senhaMaster = 'Ci851213@';
    const senhaHash = hashSenha(senhaMaster);
    
    await pool.query(`
      INSERT INTO usuarios_master (email, senha_hash, nome, ativo)
      VALUES ($1, $2, $3, true)
    `, [emailMaster, senhaHash, 'Adauto Araújo']);
    
    console.log('✅ Usuário MASTER criado!');
    console.log(`   📧 Email: ${emailMaster}`);
    console.log(`   🔑 Senha: ${senhaMaster}\n`);

    // ========================================
    // 3. CONFIGURAR PREÇOS POR MOTORISTA
    // ========================================
    console.log('💰 Configurando preços...');
    
    await pool.query(`
      INSERT INTO configuracoes (chave, valor, tipo) VALUES
      ('preco_motorista_ate_40', '49.90', 'sistema'),
      ('preco_motorista_acima_40', '41.90', 'sistema'),
      ('limite_motoristas_preco_cheio', '40', 'sistema')
    `);
    
    console.log('✅ Preços configurados!');
    console.log('   📌 Até 40 motoristas: R$ 49,90/cada');
    console.log('   📌 Acima de 40: R$ 41,90/cada\n');

    // ========================================
    // 4. CONFIGURAÇÕES GERAIS DO SISTEMA
    // ========================================
    console.log('⚙️  Inserindo configurações do sistema...');
    
    await pool.query(`
      INSERT INTO configuracoes (chave, valor, tipo) VALUES
      ('valor_corrida', '13.00', 'texto'),
      ('valor_minimo', '13.00', 'texto'),
      ('valor_km_adicional', '2.50', 'texto'),
      ('km_incluso', '5', 'texto'),
      ('horario_inicio', '06:00', 'texto'),
      ('horario_fim', '23:00', 'texto'),
      ('taxa_noturna', '0', 'texto'),
      ('aceita_pix', 'true', 'texto'),
      ('aceita_cartao', 'true', 'texto'),
      ('aceita_dinheiro', 'true', 'texto'),
      ('nome_frota', 'UBMAX', 'texto')
    `);
    
    console.log('✅ Configurações inseridas!\n');

    // ========================================
    // RESUMO FINAL
    // ========================================
    console.log('═══════════════════════════════════════════');
    console.log('✅ RESET COMPLETO FINALIZADO!');
    console.log('═══════════════════════════════════════════\n');
    console.log('🔑 LOGIN MASTER:');
    console.log('   Email: adautoaraujo414@gmail.com');
    console.log('   Senha: Ci851213@\n');
    console.log('💰 PREÇOS:');
    console.log('   Até 40 motoristas: R$ 49,90/cada');
    console.log('   Acima de 40: R$ 41,90/cada\n');
    console.log('📱 ACESSOS:');
    console.log('   /master - Painel MASTER');
    console.log('   /admin - Painel Admin');
    console.log('   /motorista - App Motorista\n');
    console.log('⚠️  Sistema está LIMPO e pronto para uso!');
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

// Executar
resetSistema()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
