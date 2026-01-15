// ========================================
// REBECA - SEED DE CONFIGURAÇÕES INICIAIS
// Apenas configurações básicas (sem dados de teste)
// ========================================

const { pool } = require('./connection');

const seedData = async () => {
  console.log('⚙️ Inserindo configurações iniciais...');

  try {
    // ========================================
    // CONFIGURAÇÕES PADRÃO OBRIGATÓRIAS
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
      const existe = await pool.query('SELECT id FROM configuracoes WHERE chave = $1', [chave]);
      if (existe.rows.length === 0) {
        await pool.query(
          'INSERT INTO configuracoes (chave, valor, descricao) VALUES ($1, $2, $3)',
          [chave, valor, descricao]
        );
      }
    }
    
    console.log('✅ Configurações iniciais inseridas');
    console.log('');
    console.log('📌 Sistema pronto para uso!');
    console.log('   - Acesse /master para configurar empresas');
    console.log('   - Acesse /admin para gerenciar a frota');
    console.log('   - Os motoristas se cadastram via /motorista');
    console.log('');

  } catch (error) {
    console.error('❌ Erro no seed:', error.message);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  seedData().then(() => {
    console.log('Seed finalizado');
    process.exit(0);
  });
}

module.exports = { seedData };
