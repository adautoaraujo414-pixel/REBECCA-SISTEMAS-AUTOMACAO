// ========================================
// REBECA - REPOSITÓRIO DE MOTORISTAS
// ========================================

const { query } = require('../connection');

const MotoristaRepository = {
  /**
   * Busca motorista por ID
   */
  async buscarPorId(id) {
    const result = await query(
      'SELECT * FROM motoristas WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Busca motorista por telefone
   */
  async buscarPorTelefone(telefone) {
    const result = await query(
      'SELECT * FROM motoristas WHERE telefone = $1',
      [telefone]
    );
    return result.rows[0] || null;
  },

  /**
   * Lista todos os motoristas ativos
   */
  async listarAtivos() {
    const result = await query(
      'SELECT * FROM motoristas WHERE ativo = true ORDER BY nome'
    );
    return result.rows;
  },

  /**
   * Lista motoristas disponíveis para corrida
   */
  async listarDisponiveis() {
    const result = await query(
      `SELECT * FROM motoristas 
       WHERE ativo = true 
       AND disponivel = true 
       AND status = 'online'
       ORDER BY nome`
    );
    return result.rows;
  },

  /**
   * Busca motorista mais próximo (simplificado)
   * TODO: Implementar cálculo real de distância com coordenadas
   */
  async buscarMaisProximo(latitude, longitude) {
    // Por enquanto, retorna o primeiro disponível
    // Futuramente: calcular distância real usando coordenadas
    const result = await query(
      `SELECT * FROM motoristas 
       WHERE ativo = true 
       AND disponivel = true 
       AND status = 'online'
       LIMIT 1`
    );
    return result.rows[0] || null;
  },

  /**
   * Atualiza status do motorista
   */
  async atualizarStatus(id, status, disponivel = null) {
    let sql = `UPDATE motoristas SET status = $1, atualizado_em = CURRENT_TIMESTAMP`;
    const params = [status];

    if (disponivel !== null) {
      sql += `, disponivel = $${params.length + 1}`;
      params.push(disponivel);
    }

    sql += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);

    const result = await query(sql, params);
    return result.rows[0];
  },

  /**
   * Atualiza localização do motorista
   */
  async atualizarLocalizacao(id, latitude, longitude) {
    const result = await query(
      `UPDATE motoristas 
       SET latitude = $1, longitude = $2, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $3 
       RETURNING *`,
      [latitude, longitude, id]
    );
    return result.rows[0];
  },

  /**
   * Criar novo motorista
   */
  async criar(dados) {
    const result = await query(
      `INSERT INTO motoristas (nome, telefone, cnh, veiculo_modelo, veiculo_cor, veiculo_placa)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [dados.nome, dados.telefone, dados.cnh, dados.veiculo_modelo, dados.veiculo_cor, dados.veiculo_placa]
    );
    return result.rows[0];
  },

  /**
   * Marcar motorista como em corrida
   */
  async iniciarCorrida(id) {
    return this.atualizarStatus(id, 'em_corrida', false);
  },

  /**
   * Marcar motorista como disponível novamente
   */
  async finalizarCorrida(id) {
    return this.atualizarStatus(id, 'online', true);
  },
};

module.exports = MotoristaRepository;
