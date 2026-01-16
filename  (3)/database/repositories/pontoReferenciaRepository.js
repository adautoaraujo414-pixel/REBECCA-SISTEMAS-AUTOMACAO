// ========================================
// REBECA - REPOSITÓRIO DE PONTOS DE REFERÊNCIA
// Sistema de auto-capacitação da Rebeca
// Aprende pontos de referência de cada cidade/empresa
// ========================================

const { query } = require('../connection');

// Normaliza nome para busca (sem acentos, lowercase)
function normalizarNome(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, '')     // remove caracteres especiais
    .trim();
}

const PontoReferenciaRepository = {
  
  // ========================================
  // BUSCAR PONTO DE REFERÊNCIA APRENDIDO
  // Verifica se a Rebeca já conhece esse ponto
  // ========================================
  async buscar(empresaId, nome) {
    const nomeNorm = normalizarNome(nome);
    
    const result = await query(`
      SELECT * FROM pontos_referencia
      WHERE empresa_id = $1 AND nome_normalizado = $2
    `, [empresaId, nomeNorm]);
    
    return result.rows[0] || null;
  },
  
  // ========================================
  // BUSCAR PONTO CONFIRMADO (3+ USOS)
  // Retorna apenas se for confiável
  // ========================================
  async buscarConfirmado(empresaId, nome) {
    const nomeNorm = normalizarNome(nome);
    
    const result = await query(`
      SELECT * FROM pontos_referencia
      WHERE empresa_id = $1 
        AND nome_normalizado = $2
        AND confirmado = true
    `, [empresaId, nomeNorm]);
    
    return result.rows[0] || null;
  },
  
  // ========================================
  // BUSCAR POR SIMILARIDADE
  // Para casos como "rodovia" vs "rodoviária"
  // ========================================
  async buscarSimilar(empresaId, nome) {
    const nomeNorm = normalizarNome(nome);
    
    // Busca exata primeiro
    let result = await this.buscarConfirmado(empresaId, nome);
    if (result) return result;
    
    // Busca por parte do nome (LIKE)
    result = await query(`
      SELECT * FROM pontos_referencia
      WHERE empresa_id = $1 
        AND (nome_normalizado LIKE $2 OR $3 LIKE '%' || nome_normalizado || '%')
        AND confirmado = true
      ORDER BY vezes_usado DESC
      LIMIT 1
    `, [empresaId, `%${nomeNorm}%`, nomeNorm]);
    
    return result.rows[0] || null;
  },
  
  // ========================================
  // REGISTRAR USO / APRENDER NOVO PONTO
  // Chamado quando cliente confirma localização após dar referência
  // ========================================
  async registrarOuAtualizar(empresaId, nome, latitude, longitude, enderecoCompleto = null, clienteTelefone = null) {
    const nomeNorm = normalizarNome(nome);
    
    // Verificar se já existe
    const existente = await this.buscar(empresaId, nome);
    
    if (existente) {
      // Atualizar contagem e média de coordenadas
      const novoUso = existente.vezes_usado + 1;
      
      // Calcular média ponderada das coordenadas (para maior precisão)
      const peso = existente.vezes_usado;
      const novaLat = ((parseFloat(existente.latitude) * peso) + parseFloat(latitude)) / novoUso;
      const novaLon = ((parseFloat(existente.longitude) * peso) + parseFloat(longitude)) / novoUso;
      
      // Confirmar se atingiu 3 usos
      const confirmado = novoUso >= 3;
      
      const result = await query(`
        UPDATE pontos_referencia SET
          latitude = $1,
          longitude = $2,
          endereco_completo = COALESCE($3, endereco_completo),
          vezes_usado = $4,
          confirmado = $5,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [novaLat.toFixed(7), novaLon.toFixed(7), enderecoCompleto, novoUso, confirmado, existente.id]);
      
      // Log do aprendizado
      await this.registrarHistorico(empresaId, existente.id, clienteTelefone, nome, latitude, longitude, 'atualizado');
      
      if (confirmado && !existente.confirmado) {
        console.log(`🧠 REBECA APRENDEU: "${nome}" confirmado após ${novoUso} usos!`);
      }
      
      return result.rows[0];
    } else {
      // Criar novo ponto
      const result = await query(`
        INSERT INTO pontos_referencia (
          empresa_id, nome, nome_normalizado, latitude, longitude, 
          endereco_completo, vezes_usado, confirmado
        ) VALUES ($1, $2, $3, $4, $5, $6, 1, false)
        RETURNING *
      `, [empresaId, nome, nomeNorm, latitude, longitude, enderecoCompleto]);
      
      // Log do aprendizado
      await this.registrarHistorico(empresaId, result.rows[0].id, clienteTelefone, nome, latitude, longitude, 'criado');
      
      console.log(`📍 NOVO PONTO: "${nome}" registrado (1º uso, precisa de mais 2 para confirmar)`);
      
      return result.rows[0];
    }
  },
  
  // ========================================
  // INCREMENTAR USO (sem atualizar coordenadas)
  // Quando cliente usa ponto já confirmado
  // ========================================
  async incrementarUso(empresaId, nome, clienteTelefone = null) {
    const nomeNorm = normalizarNome(nome);
    
    const result = await query(`
      UPDATE pontos_referencia SET
        vezes_usado = vezes_usado + 1,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE empresa_id = $1 AND nome_normalizado = $2
      RETURNING *
    `, [empresaId, nomeNorm]);
    
    if (result.rows[0]) {
      await this.registrarHistorico(empresaId, result.rows[0].id, clienteTelefone, nome, null, null, 'usado');
    }
    
    return result.rows[0];
  },
  
  // ========================================
  // REGISTRAR HISTÓRICO (LOG)
  // ========================================
  async registrarHistorico(empresaId, pontoId, clienteTelefone, nomeInformado, latitude, longitude, acao) {
    try {
      await query(`
        INSERT INTO pontos_referencia_historico (
          empresa_id, ponto_id, cliente_telefone, nome_informado, 
          latitude, longitude, acao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [empresaId, pontoId, clienteTelefone, nomeInformado, latitude, longitude, acao]);
    } catch (error) {
      console.error('Erro ao registrar histórico:', error);
    }
  },
  
  // ========================================
  // LISTAR TODOS OS PONTOS DE UMA EMPRESA
  // ========================================
  async listarPorEmpresa(empresaId, apenasConfirmados = false) {
    let sql = `
      SELECT * FROM pontos_referencia
      WHERE empresa_id = $1
    `;
    
    if (apenasConfirmados) {
      sql += ` AND confirmado = true`;
    }
    
    sql += ` ORDER BY vezes_usado DESC`;
    
    const result = await query(sql, [empresaId]);
    return result.rows;
  },
  
  // ========================================
  // ESTATÍSTICAS DE APRENDIZADO
  // ========================================
  async estatisticas(empresaId) {
    const result = await query(`
      SELECT 
        COUNT(*) as total_pontos,
        COUNT(*) FILTER (WHERE confirmado = true) as pontos_confirmados,
        SUM(vezes_usado) as total_usos,
        MAX(atualizado_em) as ultima_atualizacao
      FROM pontos_referencia
      WHERE empresa_id = $1
    `, [empresaId]);
    
    return result.rows[0];
  },
  
  // ========================================
  // REMOVER PONTO (ADMIN)
  // ========================================
  async remover(empresaId, pontoId) {
    await query(`
      DELETE FROM pontos_referencia
      WHERE id = $1 AND empresa_id = $2
    `, [pontoId, empresaId]);
  },
  
  // ========================================
  // CONFIRMAR MANUALMENTE (ADMIN)
  // ========================================
  async confirmarManualmente(empresaId, pontoId) {
    const result = await query(`
      UPDATE pontos_referencia SET
        confirmado = true,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $1 AND empresa_id = $2
      RETURNING *
    `, [pontoId, empresaId]);
    
    return result.rows[0];
  }
};

module.exports = PontoReferenciaRepository;
