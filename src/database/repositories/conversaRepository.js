// ========================================
// REBECA - REPOSITÓRIO DE CONVERSAS
// Gerencia o estado de cada conversa
// ========================================

const { query } = require('../connection');

// Etapas possíveis da conversa
const ETAPAS = {
  INICIO: 'inicio',
  AGUARDANDO_RESPOSTA_INICIAL: 'aguardando_resposta_inicial',
  AGUARDANDO_LOCALIZACAO: 'aguardando_localizacao',
  AGUARDANDO_DESTINO: 'aguardando_destino',
  CONFIRMANDO: 'confirmando',
  BUSCANDO_MOTORISTA: 'buscando_motorista',
  AGUARDANDO_MOTORISTA: 'aguardando_motorista',
  EM_CORRIDA: 'em_corrida',
  AGUARDANDO_REFERENCIA: 'aguardando_referencia',
};

const ConversaRepository = {
  ETAPAS,

  /**
   * Busca conversa pelo telefone
   */
  async buscarPorTelefone(telefone) {
    const result = await query(
      'SELECT * FROM conversas WHERE telefone = $1',
      [telefone]
    );
    return result.rows[0] || null;
  },

  /**
   * Criar ou atualizar conversa
   */
  async upsert(telefone, clienteId, etapa, dados = {}, corridaAtualId = null) {
    // Verificar se já existe
    const existe = await query('SELECT id FROM conversas WHERE telefone = $1', [telefone]);
    
    let result;
    if (existe.rows.length > 0) {
      result = await query(
        `UPDATE conversas SET cliente_id = $1, etapa = $2, dados = $3, corrida_atual_id = $4, atualizado_em = CURRENT_TIMESTAMP WHERE telefone = $5 RETURNING *`,
        [clienteId, etapa, JSON.stringify(dados), corridaAtualId, telefone]
      );
    } else {
      result = await query(
        `INSERT INTO conversas (telefone, cliente_id, etapa, dados, corrida_atual_id, atualizado_em) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *`,
        [telefone, clienteId, etapa, JSON.stringify(dados), corridaAtualId]
      );
    }
    return result.rows[0];
  },

  /**
   * Atualizar apenas a etapa
   */
  async atualizarEtapa(telefone, etapa) {
    const result = await query(
      `UPDATE conversas 
       SET etapa = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE telefone = $2 
       RETURNING *`,
      [etapa, telefone]
    );
    return result.rows[0];
  },

  /**
   * Atualizar dados da conversa
   */
  async atualizarDados(telefone, novosDados) {
    // Primeiro busca os dados atuais
    const conversa = await this.buscarPorTelefone(telefone);
    const dadosAtuais = conversa?.dados || {};
    
    // Merge dos dados
    const dadosMerge = { ...dadosAtuais, ...novosDados };

    const result = await query(
      `UPDATE conversas 
       SET dados = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE telefone = $2 
       RETURNING *`,
      [JSON.stringify(dadosMerge), telefone]
    );
    return result.rows[0];
  },

  /**
   * Atualizar corrida atual
   */
  async atualizarCorridaAtual(telefone, corridaId) {
    const result = await query(
      `UPDATE conversas 
       SET corrida_atual_id = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE telefone = $2 
       RETURNING *`,
      [corridaId, telefone]
    );
    return result.rows[0];
  },

  /**
   * Resetar conversa (nova interação)
   */
  async resetar(telefone) {
    const result = await query(
      `UPDATE conversas 
       SET etapa = 'inicio', dados = '{}', corrida_atual_id = NULL, atualizado_em = CURRENT_TIMESTAMP
       WHERE telefone = $1 
       RETURNING *`,
      [telefone]
    );
    return result.rows[0];
  },

  /**
   * Limpar conversas antigas (mais de 24h sem atividade)
   */
  async limparAntigas() {
    const result = await query(
      `DELETE FROM conversas 
       WHERE atualizado_em < NOW() - INTERVAL '24 hours'
       AND etapa NOT IN ('em_corrida', 'aguardando_motorista')`
    );
    return result.rowCount;
  },
};

module.exports = ConversaRepository;
