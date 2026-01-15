// ========================================
// REBECA - REPOSITÓRIO DE MENSAGENS
// Log de todas as mensagens
// ========================================

const { query } = require('../connection');

const MensagemRepository = {
  /**
   * Registrar mensagem recebida
   */
  async registrarEntrada(telefone, conteudo, tipo = 'texto') {
    const result = await query(
      `INSERT INTO mensagens (telefone, direcao, conteudo, tipo)
       VALUES ($1, 'entrada', $2, $3)
       RETURNING *`,
      [telefone, conteudo, tipo]
    );
    return result.rows[0];
  },

  /**
   * Registrar mensagem enviada
   */
  async registrarSaida(telefone, conteudo, tipo = 'texto') {
    const result = await query(
      `INSERT INTO mensagens (telefone, direcao, conteudo, tipo)
       VALUES ($1, 'saida', $2, $3)
       RETURNING *`,
      [telefone, conteudo, tipo]
    );
    return result.rows[0];
  },

  /**
   * Buscar histórico de mensagens de um telefone
   */
  async buscarHistorico(telefone, limite = 50) {
    const result = await query(
      `SELECT * FROM mensagens 
       WHERE telefone = $1 
       ORDER BY criado_em DESC 
       LIMIT $2`,
      [telefone, limite]
    );
    return result.rows;
  },

  /**
   * Buscar mensagens de hoje
   */
  async buscarHoje() {
    const result = await query(
      `SELECT * FROM mensagens 
       WHERE DATE(criado_em) = CURRENT_DATE
       ORDER BY criado_em DESC`
    );
    return result.rows;
  },

  /**
   * Contar mensagens por direção
   */
  async contarPorDirecao(direcao) {
    const result = await query(
      `SELECT COUNT(*) as total FROM mensagens WHERE direcao = $1`,
      [direcao]
    );
    return parseInt(result.rows[0].total);
  },
};

module.exports = MensagemRepository;
