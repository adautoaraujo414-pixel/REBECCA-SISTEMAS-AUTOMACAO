// ========================================
// REBECA - REPOSITÓRIO DE CORRIDAS
// ========================================

const { query } = require('../connection');

const CorridaRepository = {
  /**
   * Busca corrida por ID
   */
  async buscarPorId(id) {
    const result = await query(
      `SELECT c.*, 
              cl.nome as cliente_nome, cl.telefone as cliente_telefone,
              m.nome as motorista_nome, m.veiculo_modelo, m.veiculo_cor, m.telefone as motorista_telefone
       FROM corridas c
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       LEFT JOIN motoristas m ON c.motorista_id = m.id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Criar nova corrida
   */
  async criar(dados) {
    const result = await query(
      `INSERT INTO corridas (
        cliente_id, origem_endereco, origem_latitude, origem_longitude,
        origem_referencia,
        destino_endereco, destino_latitude, destino_longitude, valor, status,
        motorista_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        dados.cliente_id,
        dados.origem_endereco,
        dados.origem_latitude,
        dados.origem_longitude,
        dados.origem_referencia || null,
        dados.destino_endereco || null,
        dados.destino_latitude || null,
        dados.destino_longitude || null,
        dados.valor || null,
        dados.status || 'aguardando',
        dados.motorista_id || null
      ]
    );
    return result.rows[0];
  },

  /**
   * Atribuir motorista à corrida
   */
  async atribuirMotorista(corridaId, motoristaId) {
    const result = await query(
      `UPDATE corridas 
       SET motorista_id = $1, status = 'enviada'
       WHERE id = $2 
       RETURNING *`,
      [motoristaId, corridaId]
    );
    return result.rows[0];
  },

  /**
   * Motorista aceita a corrida
   */
  async aceitar(corridaId) {
    const result = await query(
      `UPDATE corridas 
       SET status = 'aceita', aceito_em = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [corridaId]
    );
    return result.rows[0];
  },

  /**
   * Iniciar corrida (motorista chegou e começou)
   */
  async iniciar(corridaId) {
    const result = await query(
      `UPDATE corridas 
       SET status = 'em_andamento', iniciado_em = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [corridaId]
    );
    return result.rows[0];
  },

  /**
   * Finalizar corrida
   */
  async finalizar(corridaId) {
    const result = await query(
      `UPDATE corridas 
       SET status = 'finalizada', finalizado_em = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [corridaId]
    );
    return result.rows[0];
  },

  /**
   * Cancelar corrida
   */
  async cancelar(corridaId, motivo = null) {
    const result = await query(
      `UPDATE corridas 
       SET status = 'cancelada', cancelado_em = CURRENT_TIMESTAMP, motivo_cancelamento = $1
       WHERE id = $2 
       RETURNING *`,
      [motivo, corridaId]
    );
    return result.rows[0];
  },

  /**
   * Atualizar destino da corrida
   */
  async atualizarDestino(corridaId, endereco, latitude = null, longitude = null) {
    const result = await query(
      `UPDATE corridas 
       SET destino_endereco = $1, destino_latitude = $2, destino_longitude = $3
       WHERE id = $4 
       RETURNING *`,
      [endereco, latitude, longitude, corridaId]
    );
    return result.rows[0];
  },

  /**
   * Atualizar valor da corrida
   */
  async atualizarValor(corridaId, valor) {
    const result = await query(
      `UPDATE corridas SET valor = $1 WHERE id = $2 RETURNING *`,
      [valor, corridaId]
    );
    return result.rows[0];
  },

  /**
   * Listar corridas do dia
   */
  async listarHoje() {
    const result = await query(
      `SELECT c.*, 
              cl.nome as cliente_nome,
              m.nome as motorista_nome
       FROM corridas c
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       LEFT JOIN motoristas m ON c.motorista_id = m.id
       WHERE DATE(c.solicitado_em) = CURRENT_DATE
       ORDER BY c.solicitado_em DESC`
    );
    return result.rows;
  },

  /**
   * Listar corridas por status
   */
  async listarPorStatus(status) {
    const result = await query(
      `SELECT c.*, 
              cl.nome as cliente_nome, cl.telefone as cliente_telefone,
              m.nome as motorista_nome
       FROM corridas c
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       LEFT JOIN motoristas m ON c.motorista_id = m.id
       WHERE c.status = $1
       ORDER BY c.solicitado_em DESC`,
      [status]
    );
    return result.rows;
  },

  /**
   * Corrida ativa do cliente
   */
  async buscarAtivaDoCliente(clienteId) {
    const result = await query(
      `SELECT * FROM corridas 
       WHERE cliente_id = $1 
       AND status IN ('aguardando', 'enviada', 'aceita', 'em_andamento')
       ORDER BY solicitado_em DESC
       LIMIT 1`,
      [clienteId]
    );
    return result.rows[0] || null;
  },

  /**
   * Corrida atual do motorista (em andamento)
   */
  async buscarAtualDoMotorista(motoristaId) {
    const result = await query(
      `SELECT c.*, 
              cl.nome as cliente_nome, cl.telefone as cliente_telefone
       FROM corridas c
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       WHERE c.motorista_id = $1 
       AND c.status IN ('enviada', 'aceita', 'em_andamento')
       ORDER BY c.solicitado_em DESC
       LIMIT 1`,
      [motoristaId]
    );
    return result.rows[0] || null;
  },

  /**
   * Corridas do motorista hoje
   */
  async buscarDoMotoristaHoje(motoristaId) {
    const result = await query(
      `SELECT c.*, 
              cl.nome as cliente_nome
       FROM corridas c
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       WHERE c.motorista_id = $1 
       AND DATE(c.solicitado_em) = CURRENT_DATE
       ORDER BY c.solicitado_em DESC`,
      [motoristaId]
    );
    return result.rows;
  },
};

module.exports = CorridaRepository;
