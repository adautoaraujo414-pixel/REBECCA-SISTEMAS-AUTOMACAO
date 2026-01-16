// ========================================
// REBECA - REPOSITORY DE EMPRESAS
// ========================================

const { query } = require('../connection');

const EmpresaRepository = {
  
  /**
   * Buscar empresa por ID
   */
  async buscarPorId(id) {
    const result = await query(
      'SELECT * FROM empresas WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Buscar cidade da empresa
   */
  async getCidade(empresaId = 1) {
    const result = await query(
      'SELECT cidade FROM empresas WHERE id = $1',
      [empresaId]
    );
    return result.rows[0]?.cidade || null;
  },

  /**
   * Buscar empresa por telefone da Rebeca
   */
  async buscarPorTelefoneRebeca(telefone) {
    const result = await query(
      'SELECT * FROM empresas WHERE whatsapp_rebeca = $1 OR telefone_rebeca = $1',
      [telefone]
    );
    return result.rows[0] || null;
  },

  /**
   * Atualizar cidade da empresa
   */
  async atualizarCidade(empresaId, cidade) {
    const result = await query(
      'UPDATE empresas SET cidade = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [cidade, empresaId]
    );
    return result.rows[0];
  },

  /**
   * Listar todas empresas ativas
   */
  async listarAtivas() {
    const result = await query(
      'SELECT * FROM empresas WHERE ativo = true ORDER BY nome'
    );
    return result.rows;
  }
};

module.exports = EmpresaRepository;
