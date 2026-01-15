// ========================================
// REBECA - REPOSITÓRIO DE PAGAMENTOS
// Controle de entrada e saída financeira
// ========================================

const { query } = require('../connection');

const PagamentoRepository = {
  /**
   * Registrar entrada (ganho)
   */
  async registrarEntrada(motoristaId, valor, descricao, corridaId = null, criadoPor = 'sistema') {
    const result = await query(
      `INSERT INTO pagamentos (motorista_id, tipo, valor, descricao, corrida_id, criado_por)
       VALUES ($1, 'entrada', $2, $3, $4, $5)
       RETURNING *`,
      [motoristaId, valor, descricao, corridaId, criadoPor]
    );
    return result.rows[0];
  },

  /**
   * Registrar saída (desconto/repasse)
   */
  async registrarSaida(motoristaId, valor, descricao, criadoPor = 'admin') {
    const result = await query(
      `INSERT INTO pagamentos (motorista_id, tipo, valor, descricao, criado_por)
       VALUES ($1, 'saida', $2, $3, $4)
       RETURNING *`,
      [motoristaId, valor, descricao, criadoPor]
    );
    return result.rows[0];
  },

  /**
   * Listar pagamentos de um motorista
   */
  async listarPorMotorista(motoristaId, limite = 50) {
    const result = await query(
      `SELECT * FROM pagamentos 
       WHERE motorista_id = $1 
       ORDER BY criado_em DESC 
       LIMIT $2`,
      [motoristaId, limite]
    );
    return result.rows;
  },

  /**
   * Resumo financeiro do motorista
   */
  async resumoMotorista(motoristaId) {
    // Total geral
    const total = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as total_entradas,
        COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as total_saidas
       FROM pagamentos
       WHERE motorista_id = $1`,
      [motoristaId]
    );

    // Hoje
    const hoje = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as entradas,
        COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as saidas
       FROM pagamentos
       WHERE motorista_id = $1 AND DATE(criado_em) = CURRENT_DATE`,
      [motoristaId]
    );

    // Semana
    const semana = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as entradas,
        COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as saidas
       FROM pagamentos
       WHERE motorista_id = $1 AND criado_em >= CURRENT_DATE - INTERVAL '7 days'`,
      [motoristaId]
    );

    // Mês
    const mes = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as entradas,
        COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as saidas
       FROM pagamentos
       WHERE motorista_id = $1 
       AND EXTRACT(MONTH FROM criado_em) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM criado_em) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [motoristaId]
    );

    const t = total.rows[0];
    const h = hoje.rows[0];
    const s = semana.rows[0];
    const m = mes.rows[0];

    return {
      saldo: parseFloat(t.total_entradas) - parseFloat(t.total_saidas),
      total: {
        entradas: parseFloat(t.total_entradas),
        saidas: parseFloat(t.total_saidas),
      },
      hoje: {
        entradas: parseFloat(h.entradas),
        saidas: parseFloat(h.saidas),
        saldo: parseFloat(h.entradas) - parseFloat(h.saidas),
      },
      semana: {
        entradas: parseFloat(s.entradas),
        saidas: parseFloat(s.saidas),
        saldo: parseFloat(s.entradas) - parseFloat(s.saidas),
      },
      mes: {
        entradas: parseFloat(m.entradas),
        saidas: parseFloat(m.saidas),
        saldo: parseFloat(m.entradas) - parseFloat(m.saidas),
      },
    };
  },

  /**
   * Buscar por ID
   */
  async buscarPorId(id) {
    const result = await query(
      'SELECT * FROM pagamentos WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Excluir pagamento
   */
  async excluir(id) {
    const result = await query(
      'DELETE FROM pagamentos WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = PagamentoRepository;
