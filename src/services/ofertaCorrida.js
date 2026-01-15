// ========================================
// REBECA - SERVIÇO DE OFERTAS DE CORRIDA
// Timeout de 30 segundos por motorista
// Se não aceitar, passa pro próximo
// ========================================

const { query } = require('../database/connection');
const AtribuicaoService = require('./atribuicao');

// Tempo máximo para motorista aceitar (30 segundos)
const TIMEOUT_SEGUNDOS = 30;

// Cache de ofertas pendentes (para controle de timeout)
const ofertasPendentes = new Map();

const OfertaCorridaService = {
  
  /**
   * ========================================
   * ENVIAR OFERTA PARA MOTORISTA
   * Com timeout de 30 segundos
   * ========================================
   */
  async enviarOferta(empresaId, corridaId, motorista, clienteTelefone, distanciaKm, valorCorrida, ordemFila = 1) {
    const tempoEstimado = Math.ceil((distanciaKm / 30) * 60); // minutos
    const expiraEm = new Date(Date.now() + (TIMEOUT_SEGUNDOS * 1000));
    
    try {
      // Registrar oferta no banco
      const result = await query(`
        INSERT INTO ofertas_corrida (
          empresa_id, corrida_id, motorista_id, cliente_telefone,
          status, distancia_km, tempo_estimado_min, valor_corrida,
          enviado_em, expira_em, ordem_fila
        ) VALUES ($1, $2, $3, $4, 'pendente', $5, $6, $7, NOW(), $8, $9)
        ON CONFLICT (corrida_id, motorista_id) 
        DO UPDATE SET status = 'pendente', enviado_em = NOW(), expira_em = $8, ordem_fila = $9
        RETURNING *
      `, [empresaId, corridaId, motorista.id, clienteTelefone, distanciaKm, tempoEstimado, valorCorrida, expiraEm, ordemFila]);
      
      const oferta = result.rows[0];
      
      // Salvar no cache para controle de timeout
      const chaveOferta = `${corridaId}-${motorista.id}`;
      ofertasPendentes.set(chaveOferta, {
        ofertaId: oferta.id,
        corridaId,
        motoristaId: motorista.id,
        empresaId,
        clienteTelefone,
        expiraEm,
        ordemFila
      });
      
      console.log(`📨 Oferta enviada para ${motorista.nome} (${TIMEOUT_SEGUNDOS}s para aceitar)`);
      
      // Programar timeout
      this.programarTimeout(chaveOferta, corridaId, motorista.id, empresaId, clienteTelefone);
      
      return oferta;
    } catch (error) {
      console.error('Erro ao enviar oferta:', error);
      throw error;
    }
  },
  
  /**
   * ========================================
   * PROGRAMAR TIMEOUT DE 30 SEGUNDOS
   * ========================================
   */
  programarTimeout(chaveOferta, corridaId, motoristaId, empresaId, clienteTelefone) {
    setTimeout(async () => {
      // Verificar se ainda está pendente
      const ofertaCache = ofertasPendentes.get(chaveOferta);
      if (!ofertaCache) return; // Já foi processada
      
      // Verificar no banco
      const oferta = await query(`
        SELECT status FROM ofertas_corrida
        WHERE corrida_id = $1 AND motorista_id = $2
      `, [corridaId, motoristaId]);
      
      if (oferta.rows.length > 0 && oferta.rows[0].status === 'pendente') {
        console.log(`⏰ TIMEOUT! Motorista ${motoristaId} não aceitou em ${TIMEOUT_SEGUNDOS}s`);
        
        // Marcar como expirada e incrementar corridas_perdidas
        await this.expirarOferta(corridaId, motoristaId, empresaId, clienteTelefone);
      }
      
      // Remover do cache
      ofertasPendentes.delete(chaveOferta);
      
    }, TIMEOUT_SEGUNDOS * 1000);
  },
  
  /**
   * ========================================
   * EXPIRAR OFERTA (TIMEOUT)
   * Incrementa corridas_perdidas e passa pro próximo
   * ========================================
   */
  async expirarOferta(corridaId, motoristaId, empresaId, clienteTelefone) {
    try {
      // 1. Marcar oferta como expirada
      await query(`
        UPDATE ofertas_corrida SET
          status = 'expirada',
          respondido_em = NOW()
        WHERE corrida_id = $1 AND motorista_id = $2
      `, [corridaId, motoristaId]);
      
      // 2. Incrementar corridas_perdidas do motorista
      await query(`
        UPDATE motoristas SET
          corridas_perdidas = COALESCE(corridas_perdidas, 0) + 1,
          ultima_corrida_perdida = NOW()
        WHERE id = $1
      `, [motoristaId]);
      
      console.log(`📉 Motorista ${motoristaId}: +1 corrida perdida`);
      
      // 3. Buscar próximo motorista disponível
      await this.tentarProximoMotorista(corridaId, empresaId, clienteTelefone);
      
    } catch (error) {
      console.error('Erro ao expirar oferta:', error);
    }
  },
  
  /**
   * ========================================
   * TENTAR PRÓXIMO MOTORISTA
   * ========================================
   */
  async tentarProximoMotorista(corridaId, empresaId, clienteTelefone) {
    try {
      // Buscar dados da corrida
      const corridaResult = await query(`
        SELECT * FROM corridas WHERE id = $1
      `, [corridaId]);
      
      if (corridaResult.rows.length === 0) return;
      const corrida = corridaResult.rows[0];
      
      // Verificar se corrida ainda está aguardando motorista
      if (corrida.status !== 'aguardando_motorista' && corrida.status !== 'solicitada') {
        console.log(`Corrida ${corridaId} já não está mais aguardando motorista`);
        return;
      }
      
      // Buscar motoristas que já receberam oferta (para excluir)
      const jaOfertados = await query(`
        SELECT motorista_id FROM ofertas_corrida
        WHERE corrida_id = $1
      `, [corridaId]);
      
      const idsExcluir = jaOfertados.rows.map(r => r.motorista_id);
      
      // Buscar próximo motorista
      const resultado = await AtribuicaoService.buscarMotoristasDisponiveis(
        corrida.origem_latitude,
        corrida.origem_longitude,
        empresaId,
        { excluirIds: idsExcluir }
      );
      
      if (resultado.motoristas && resultado.motoristas.length > 0) {
        const proximoMotorista = resultado.motoristas[0];
        const ordemFila = idsExcluir.length + 1;
        
        console.log(`🔄 Tentando próximo motorista: ${proximoMotorista.nome} (ordem ${ordemFila})`);
        
        // Emitir evento para o sistema enviar oferta ao próximo
        // Isso será tratado pelo WebSocket
        if (global.io) {
          global.io.to(`empresa_${empresaId}`).emit('nova_oferta_corrida', {
            corridaId,
            motorista: proximoMotorista,
            ordemFila,
            mensagem: `Oferta passada para ${proximoMotorista.nome}`
          });
        }
        
        // Retornar próximo motorista para o fluxo continuar
        return proximoMotorista;
      } else {
        console.log(`❌ Nenhum motorista disponível para corrida ${corridaId}`);
        
        // Notificar que não há motoristas
        if (global.io) {
          global.io.to(`empresa_${empresaId}`).emit('sem_motorista', {
            corridaId,
            clienteTelefone,
            mensagem: 'Nenhum motorista disponível no momento'
          });
        }
        
        // Atualizar status da corrida
        await query(`
          UPDATE corridas SET status = 'sem_motorista' WHERE id = $1
        `, [corridaId]);
        
        return null;
      }
    } catch (error) {
      console.error('Erro ao tentar próximo motorista:', error);
      return null;
    }
  },
  
  /**
   * ========================================
   * MOTORISTA ACEITOU A CORRIDA
   * ========================================
   */
  async aceitarOferta(corridaId, motoristaId) {
    try {
      const chaveOferta = `${corridaId}-${motoristaId}`;
      
      // 1. Verificar se ainda está no prazo
      const oferta = await query(`
        SELECT * FROM ofertas_corrida
        WHERE corrida_id = $1 AND motorista_id = $2 AND status = 'pendente'
      `, [corridaId, motoristaId]);
      
      if (oferta.rows.length === 0) {
        console.log(`Oferta ${corridaId}-${motoristaId} não encontrada ou já processada`);
        return { sucesso: false, motivo: 'Oferta expirada ou já processada' };
      }
      
      // 2. Marcar como aceita
      await query(`
        UPDATE ofertas_corrida SET
          status = 'aceita',
          respondido_em = NOW()
        WHERE corrida_id = $1 AND motorista_id = $2
      `, [corridaId, motoristaId]);
      
      // 3. Atualizar corrida
      await query(`
        UPDATE corridas SET
          motorista_id = $1,
          status = 'aceita'
        WHERE id = $2
      `, [motoristaId, corridaId]);
      
      // 4. Marcar motorista como em_corrida
      await query(`
        UPDATE motoristas SET
          em_corrida = true,
          disponivel = false
        WHERE id = $1
      `, [motoristaId]);
      
      // 5. Remover do cache
      ofertasPendentes.delete(chaveOferta);
      
      // 6. Cancelar outras ofertas pendentes dessa corrida
      await query(`
        UPDATE ofertas_corrida SET
          status = 'cancelada',
          respondido_em = NOW()
        WHERE corrida_id = $1 AND motorista_id != $2 AND status = 'pendente'
      `, [corridaId, motoristaId]);
      
      console.log(`✅ Motorista ${motoristaId} aceitou corrida ${corridaId}`);
      
      return { sucesso: true };
    } catch (error) {
      console.error('Erro ao aceitar oferta:', error);
      return { sucesso: false, motivo: error.message };
    }
  },
  
  /**
   * ========================================
   * MOTORISTA RECUSOU A CORRIDA
   * ========================================
   */
  async recusarOferta(corridaId, motoristaId, empresaId, clienteTelefone) {
    try {
      const chaveOferta = `${corridaId}-${motoristaId}`;
      
      // 1. Marcar como recusada
      await query(`
        UPDATE ofertas_corrida SET
          status = 'recusada',
          respondido_em = NOW()
        WHERE corrida_id = $1 AND motorista_id = $2
      `, [corridaId, motoristaId]);
      
      // 2. Incrementar corridas_perdidas (recusa também conta)
      await query(`
        UPDATE motoristas SET
          corridas_perdidas = COALESCE(corridas_perdidas, 0) + 1,
          ultima_corrida_perdida = NOW()
        WHERE id = $1
      `, [motoristaId]);
      
      // 3. Remover do cache
      ofertasPendentes.delete(chaveOferta);
      
      console.log(`❌ Motorista ${motoristaId} recusou corrida ${corridaId}`);
      
      // 4. Tentar próximo motorista
      return await this.tentarProximoMotorista(corridaId, empresaId, clienteTelefone);
      
    } catch (error) {
      console.error('Erro ao recusar oferta:', error);
      return null;
    }
  },
  
  /**
   * ========================================
   * BUSCAR OFERTAS PENDENTES DE UM MOTORISTA
   * ========================================
   */
  async buscarOfertasPendentes(motoristaId) {
    const result = await query(`
      SELECT oc.*, c.origem_endereco, c.destino_endereco,
             cl.nome as cliente_nome, cl.telefone as cliente_telefone
      FROM ofertas_corrida oc
      JOIN corridas c ON c.id = oc.corrida_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      WHERE oc.motorista_id = $1 AND oc.status = 'pendente'
      ORDER BY oc.enviado_em DESC
    `, [motoristaId]);
    
    return result.rows;
  },
  
  /**
   * ========================================
   * ESTATÍSTICAS DE OFERTAS
   * ========================================
   */
  async estatisticas(empresaId, motoristaId = null) {
    let sql = `
      SELECT 
        COUNT(*) as total_ofertas,
        COUNT(*) FILTER (WHERE status = 'aceita') as aceitas,
        COUNT(*) FILTER (WHERE status = 'recusada') as recusadas,
        COUNT(*) FILTER (WHERE status = 'expirada') as expiradas,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'aceita')::numeric / 
          NULLIF(COUNT(*), 0) * 100, 1
        ) as taxa_aceitacao
      FROM ofertas_corrida
      WHERE empresa_id = $1
    `;
    
    const params = [empresaId];
    
    if (motoristaId) {
      sql += ` AND motorista_id = $2`;
      params.push(motoristaId);
    }
    
    const result = await query(sql, params);
    return result.rows[0];
  },
  
  /**
   * ========================================
   * LIMPAR OFERTAS EXPIRADAS ANTIGAS
   * ========================================
   */
  async limparOfertasAntigas(diasAtras = 30) {
    await query(`
      DELETE FROM ofertas_corrida
      WHERE enviado_em < NOW() - INTERVAL '${diasAtras} days'
    `);
  }
};

module.exports = OfertaCorridaService;
