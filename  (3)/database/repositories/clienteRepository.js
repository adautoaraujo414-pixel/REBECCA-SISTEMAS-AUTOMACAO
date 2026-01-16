// ========================================
// REBECA - REPOSITÓRIO DE CLIENTES
// ========================================

const { query } = require('../connection');

const ClienteRepository = {
  /**
   * Busca cliente pelo telefone
   */
  async buscarPorTelefone(telefone) {
    const result = await query(
      'SELECT * FROM clientes WHERE telefone = $1',
      [telefone]
    );
    return result.rows[0] || null;
  },

  /**
   * Cria novo cliente
   */
  async criar(telefone, nome = null) {
    const result = await query(
      `INSERT INTO clientes (telefone, nome) 
       VALUES ($1, $2) 
       RETURNING *`,
      [telefone, nome]
    );
    return result.rows[0];
  },

  /**
   * Busca ou cria cliente
   */
  async buscarOuCriar(telefone) {
    let cliente = await this.buscarPorTelefone(telefone);
    
    if (!cliente) {
      cliente = await this.criar(telefone);
    }
    
    return cliente;
  },

  /**
   * Atualiza cliente
   */
  async atualizar(id, dados) {
    const campos = [];
    const valores = [];
    let idx = 1;

    for (const [chave, valor] of Object.entries(dados)) {
      campos.push(`${chave} = $${idx}`);
      valores.push(valor);
      idx++;
    }

    campos.push(`atualizado_em = CURRENT_TIMESTAMP`);
    valores.push(id);

    const result = await query(
      `UPDATE clientes SET ${campos.join(', ')} WHERE id = $${idx} RETURNING *`,
      valores
    );

    return result.rows[0];
  },

  /**
   * Incrementa total de corridas
   */
  async incrementarCorridas(id) {
    const result = await query(
      `UPDATE clientes 
       SET total_corridas = total_corridas + 1,
           recorrente = CASE WHEN total_corridas >= 2 THEN true ELSE false END,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  /**
   * Verifica se cliente é recorrente
   */
  async ehRecorrente(telefone) {
    const cliente = await this.buscarPorTelefone(telefone);
    return cliente?.recorrente || false;
  },
};

module.exports = ClienteRepository;
