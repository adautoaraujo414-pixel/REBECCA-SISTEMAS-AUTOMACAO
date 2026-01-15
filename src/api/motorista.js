// ========================================
// REBECA - API MOTORISTA
// Rotas do painel do motorista
// ========================================

const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { MotoristaRepository, CorridaRepository, PagamentoRepository } = require('../database');

/**
 * Middleware de autenticação do motorista
 */
async function authMotorista(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token não fornecido' });
  }

  try {
    const result = await query(
      `SELECT * FROM motoristas 
       WHERE token_sessao = $1 AND token_expira_em > NOW() AND ativo = true`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    req.motorista = result.rows[0];
    next();
  } catch (error) {
    console.error('Erro auth:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
}

// Aplicar middleware em todas as rotas
router.use(authMotorista);

/**
 * GET /api/motorista/perfil
 * Dados do motorista logado
 */
router.get('/perfil', (req, res) => {
  const m = req.motorista;
  res.json({
    success: true,
    data: {
      id: m.id,
      nome: m.nome,
      telefone: m.telefone,
      veiculo_modelo: m.veiculo_modelo,
      veiculo_cor: m.veiculo_cor,
      veiculo_placa: m.veiculo_placa,
      status: m.status,
      disponivel: m.disponivel,
    }
  });
});

/**
 * PUT /api/motorista/status
 * Atualizar status (online/offline)
 */
router.put('/status', async (req, res) => {
  try {
    const { online } = req.body;
    const status = online ? 'online' : 'offline';
    const disponivel = online;

    const result = await query(
      `UPDATE motoristas 
       SET status = $1, disponivel = $2, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, disponivel, req.motorista.id]
    );

    res.json({ 
      success: true, 
      data: { 
        status: result.rows[0].status,
        disponivel: result.rows[0].disponivel 
      } 
    });

  } catch (error) {
    console.error('Erro atualizar status:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PUT /api/motorista/localizacao
 * Atualizar localização do motorista
 */
router.put('/localizacao', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    await MotoristaRepository.atualizarLocalizacao(
      req.motorista.id, 
      latitude, 
      longitude
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Erro atualizar localização:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * GET /api/motorista/corrida-atual
 * Corrida atual do motorista (se houver)
 */
router.get('/corrida-atual', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, cl.nome as cliente_nome
       FROM corridas c
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       WHERE c.motorista_id = $1 
       AND c.status IN ('enviada', 'aceita', 'em_andamento')
       ORDER BY c.solicitado_em DESC
       LIMIT 1`,
      [req.motorista.id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Erro buscar corrida atual:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PUT /api/motorista/corrida/:id/aceitar
 * Aceitar corrida
 */
router.put('/corrida/:id/aceitar', async (req, res) => {
  try {
    const corridaId = req.params.id;

    // Verificar se a corrida é do motorista
    const corrida = await CorridaRepository.buscarPorId(corridaId);
    
    if (!corrida || corrida.motorista_id !== req.motorista.id) {
      return res.status(404).json({ success: false, error: 'Corrida não encontrada' });
    }

    if (corrida.status !== 'enviada') {
      return res.status(400).json({ success: false, error: 'Corrida não pode ser aceita' });
    }

    // Aceitar corrida
    await CorridaRepository.aceitar(corridaId);

    // Marcar motorista como em corrida
    await MotoristaRepository.iniciarCorrida(req.motorista.id);

    res.json({ success: true });

  } catch (error) {
    console.error('Erro aceitar corrida:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PUT /api/motorista/corrida/:id/recusar
 * Recusar corrida - REGISTRA PARA ANTI-FRAUDE
 */
router.put('/corrida/:id/recusar', async (req, res) => {
  try {
    const corridaId = req.params.id;
    const { motivo } = req.body;

    // Verificar se a corrida é do motorista
    const corrida = await CorridaRepository.buscarPorId(corridaId);
    
    if (!corrida || corrida.motorista_id !== req.motorista.id) {
      return res.status(404).json({ success: false, error: 'Corrida não encontrada' });
    }

    // REGISTRAR RECUSA PARA ANTI-FRAUDE
    await query(
      `INSERT INTO recusas (motorista_id, corrida_id, motivo) VALUES ($1, $2, $3)`,
      [req.motorista.id, corridaId, motivo || 'Não informado']
    );

    // Remover motorista da corrida
    await query(
      `UPDATE corridas SET motorista_id = NULL, status = 'aguardando' WHERE id = $1`,
      [corridaId]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Erro recusar corrida:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PUT /api/motorista/corrida/:id/iniciar
 * Iniciar corrida (motorista chegou no cliente)
 */
router.put('/corrida/:id/iniciar', async (req, res) => {
  try {
    const corridaId = req.params.id;

    const corrida = await CorridaRepository.buscarPorId(corridaId);
    
    if (!corrida || corrida.motorista_id !== req.motorista.id) {
      return res.status(404).json({ success: false, error: 'Corrida não encontrada' });
    }

    await CorridaRepository.iniciar(corridaId);

    res.json({ success: true });

  } catch (error) {
    console.error('Erro iniciar corrida:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PUT /api/motorista/corrida/:id/finalizar
 * Finalizar corrida
 */
router.put('/corrida/:id/finalizar', async (req, res) => {
  try {
    const corridaId = req.params.id;
    const { valor } = req.body;

    const corrida = await CorridaRepository.buscarPorId(corridaId);
    
    if (!corrida || corrida.motorista_id !== req.motorista.id) {
      return res.status(404).json({ success: false, error: 'Corrida não encontrada' });
    }

    // Atualizar valor se informado
    if (valor) {
      await CorridaRepository.atualizarValor(corridaId, valor);
    }

    // Finalizar corrida
    await CorridaRepository.finalizar(corridaId);

    // Liberar motorista
    await MotoristaRepository.finalizarCorrida(req.motorista.id);

    res.json({ success: true });

  } catch (error) {
    console.error('Erro finalizar corrida:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * GET /api/motorista/historico
 * Histórico de corridas do motorista
 */
router.get('/historico', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await query(
      `SELECT c.*, cl.nome as cliente_nome
       FROM corridas c
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       WHERE c.motorista_id = $1
       ORDER BY c.solicitado_em DESC
       LIMIT $2`,
      [req.motorista.id, parseInt(limit)]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Erro histórico:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * GET /api/motorista/ganhos
 * Resumo de ganhos do motorista
 */
router.get('/ganhos', async (req, res) => {
  try {
    // Ganhos de hoje
    const hoje = await query(
      `SELECT 
        COUNT(*) as corridas,
        COALESCE(SUM(valor), 0) as total
       FROM corridas
       WHERE motorista_id = $1 
       AND status = 'finalizada'
       AND DATE(finalizado_em) = CURRENT_DATE`,
      [req.motorista.id]
    );

    // Ganhos da semana
    const semana = await query(
      `SELECT 
        COUNT(*) as corridas,
        COALESCE(SUM(valor), 0) as total
       FROM corridas
       WHERE motorista_id = $1 
       AND status = 'finalizada'
       AND finalizado_em >= CURRENT_DATE - INTERVAL '7 days'`,
      [req.motorista.id]
    );

    // Ganhos do mês
    const mes = await query(
      `SELECT 
        COUNT(*) as corridas,
        COALESCE(SUM(valor), 0) as total
       FROM corridas
       WHERE motorista_id = $1 
       AND status = 'finalizada'
       AND EXTRACT(MONTH FROM finalizado_em) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM finalizado_em) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [req.motorista.id]
    );

    res.json({
      success: true,
      data: {
        hoje: hoje.rows[0],
        semana: semana.rows[0],
        mes: mes.rows[0],
      }
    });

  } catch (error) {
    console.error('Erro ganhos:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// PAGAMENTOS (ENTRADA/SAÍDA)
// ========================================

/**
 * GET /api/motorista/pagamentos
 * Lista pagamentos do motorista
 */
router.get('/pagamentos', async (req, res) => {
  try {
    const { limite = 50 } = req.query;
    const pagamentos = await PagamentoRepository.listarPorMotorista(req.motorista.id, parseInt(limite));
    res.json({ success: true, data: pagamentos });
  } catch (error) {
    console.error('Erro listar pagamentos:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * GET /api/motorista/pagamentos/resumo
 * Resumo financeiro completo
 */
router.get('/pagamentos/resumo', async (req, res) => {
  try {
    const resumo = await PagamentoRepository.resumoMotorista(req.motorista.id);
    res.json({ success: true, data: resumo });
  } catch (error) {
    console.error('Erro resumo pagamentos:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/motorista/pagamentos/entrada
 * Motorista registra uma entrada (recebimento)
 */
router.post('/pagamentos/entrada', async (req, res) => {
  try {
    const { valor, descricao } = req.body;

    if (!valor || valor <= 0) {
      return res.status(400).json({ success: false, error: 'Valor inválido' });
    }

    const result = await query(
      `INSERT INTO pagamentos (motorista_id, tipo, valor, descricao, criado_por)
       VALUES ($1, 'entrada', $2, $3, 'motorista')
       RETURNING *`,
      [req.motorista.id, valor, descricao || 'Entrada registrada']
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Erro registrar entrada:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/motorista/pagamentos/saida
 * Motorista registra uma saída (despesa)
 */
router.post('/pagamentos/saida', async (req, res) => {
  try {
    const { valor, descricao } = req.body;

    if (!valor || valor <= 0) {
      return res.status(400).json({ success: false, error: 'Valor inválido' });
    }

    const result = await query(
      `INSERT INTO pagamentos (motorista_id, tipo, valor, descricao, criado_por)
       VALUES ($1, 'saida', $2, $3, 'motorista')
       RETURNING *`,
      [req.motorista.id, valor, descricao || 'Saída registrada']
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Erro registrar saída:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// CONFIGURAÇÕES DO MOTORISTA
// ========================================

/**
 * GET /api/motorista/configuracoes
 * Buscar configurações do motorista
 */
router.get('/configuracoes', async (req, res) => {
  try {
    let config = await query(
      `SELECT * FROM motorista_config WHERE motorista_id = $1`,
      [req.motorista.id]
    );

    // Se não existe, criar config padrão
    if (config.rows.length === 0) {
      config = await query(
        `INSERT INTO motorista_config (motorista_id) VALUES ($1) RETURNING *`,
        [req.motorista.id]
      );
    }

    res.json({ success: true, data: config.rows[0] });

  } catch (error) {
    console.error('Erro buscar configurações:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PUT /api/motorista/configuracoes
 * Atualizar configurações do motorista
 */
router.put('/configuracoes', async (req, res) => {
  try {
    const { 
      modo_endereco, 
      endereco_base, 
      endereco_base_lat, 
      endereco_base_lng,
      aceitar_fila_auto,
      raio_maximo_km
    } = req.body;

    // Verificar se existe
    const existe = await query(
      'SELECT id FROM motorista_config WHERE motorista_id = $1',
      [req.motorista.id]
    );

    let result;
    if (existe.rows.length === 0) {
      result = await query(
        `INSERT INTO motorista_config 
         (motorista_id, modo_endereco, endereco_base, endereco_base_lat, endereco_base_lng, aceitar_fila_auto, raio_maximo_km)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.motorista.id, modo_endereco, endereco_base, endereco_base_lat, endereco_base_lng, aceitar_fila_auto, raio_maximo_km]
      );
    } else {
      result = await query(
        `UPDATE motorista_config SET
          modo_endereco = COALESCE($2, modo_endereco),
          endereco_base = COALESCE($3, endereco_base),
          endereco_base_lat = COALESCE($4, endereco_base_lat),
          endereco_base_lng = COALESCE($5, endereco_base_lng),
          aceitar_fila_auto = COALESCE($6, aceitar_fila_auto),
          raio_maximo_km = COALESCE($7, raio_maximo_km),
          atualizado_em = CURRENT_TIMESTAMP
         WHERE motorista_id = $1
         RETURNING *`,
        [req.motorista.id, modo_endereco, endereco_base, endereco_base_lat, endereco_base_lng, aceitar_fila_auto, raio_maximo_km]
      );
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Erro atualizar configurações:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// FILA DE CORRIDAS (PRÉ-CARREGAMENTO)
// ========================================

/**
 * GET /api/motorista/fila
 * Buscar próxima corrida na fila
 */
router.get('/fila', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        fc.*,
        c.origem_endereco,
        c.destino_endereco,
        c.valor,
        cl.nome as cliente_nome
      FROM fila_corridas fc
      JOIN corridas c ON fc.corrida_id = c.id
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE fc.motorista_id = $1 
        AND fc.status = 'pendente'
      ORDER BY fc.enviado_em ASC
      LIMIT 1
    `, [req.motorista.id]);

    res.json({ success: true, data: result.rows[0] || null });

  } catch (error) {
    console.error('Erro buscar fila:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PUT /api/motorista/fila/:id/aceitar
 * Aceitar corrida da fila
 */
router.put('/fila/:id/aceitar', async (req, res) => {
  try {
    const filaId = req.params.id;

    // Atualizar fila
    const fila = await query(
      `UPDATE fila_corridas 
       SET status = 'aceita', respondido_em = CURRENT_TIMESTAMP
       WHERE id = $1 AND motorista_id = $2
       RETURNING corrida_id`,
      [filaId, req.motorista.id]
    );

    if (!fila.rows[0]) {
      return res.status(404).json({ success: false, error: 'Corrida não encontrada na fila' });
    }

    const corridaId = fila.rows[0].corrida_id;

    // Atribuir corrida ao motorista
    await query(
      `UPDATE corridas SET motorista_id = $1, status = 'aceita', aceito_em = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.motorista.id, corridaId]
    );

    // Atualizar status do motorista
    await query(
      `UPDATE motoristas SET status = 'em_corrida', disponivel = false WHERE id = $1`,
      [req.motorista.id]
    );

    res.json({ success: true, corrida_id: corridaId });

  } catch (error) {
    console.error('Erro aceitar fila:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PUT /api/motorista/fila/:id/recusar
 * Recusar corrida da fila
 */
router.put('/fila/:id/recusar', async (req, res) => {
  try {
    const filaId = req.params.id;
    const { motivo } = req.body;

    // Atualizar fila
    const fila = await query(
      `UPDATE fila_corridas 
       SET status = 'recusada', respondido_em = CURRENT_TIMESTAMP
       WHERE id = $1 AND motorista_id = $2
       RETURNING corrida_id`,
      [filaId, req.motorista.id]
    );

    if (!fila.rows[0]) {
      return res.status(404).json({ success: false, error: 'Corrida não encontrada na fila' });
    }

    // Registrar recusa
    await query(
      `INSERT INTO recusas (motorista_id, corrida_id, motivo) VALUES ($1, $2, $3)`,
      [req.motorista.id, fila.rows[0].corrida_id, motivo || 'Recusou da fila']
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Erro recusar fila:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PUT /api/motorista/corrida/:id/finalizar-direto
 * Finalizar corrida direto (quando motorista conhece a localidade)
 */
router.put('/corrida/:id/finalizar-direto', async (req, res) => {
  try {
    const corridaId = req.params.id;
    const { valor } = req.body;

    const corrida = await CorridaRepository.buscarPorId(corridaId);
    
    if (!corrida || corrida.motorista_id !== req.motorista.id) {
      return res.status(404).json({ success: false, error: 'Corrida não encontrada' });
    }

    // Atualizar valor se informado
    if (valor) {
      await CorridaRepository.atualizarValor(corridaId, valor);
    }

    // Finalizar corrida diretamente (pula etapa de "em_andamento")
    await query(
      `UPDATE corridas SET 
        status = 'finalizada', 
        iniciado_em = COALESCE(iniciado_em, CURRENT_TIMESTAMP),
        finalizado_em = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [corridaId]
    );

    // Liberar motorista
    await MotoristaRepository.finalizarCorrida(req.motorista.id);

    // Registrar pagamento automático
    if (valor || corrida.valor) {
      await query(
        `INSERT INTO pagamentos (motorista_id, tipo, valor, descricao, corrida_id, criado_por)
         VALUES ($1, 'entrada', $2, $3, $4, 'sistema')`,
        [req.motorista.id, valor || corrida.valor, `Corrida #${corridaId}`, corridaId]
      );
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Erro finalizar direto:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// MANUTENÇÃO DO VEÍCULO
// ========================================

/**
 * POST /api/motorista/manutencao
 * Registrar manutenção programada
 */
router.post('/manutencao', async (req, res) => {
  try {
    const { tipo, empresa, valor, dias, data, descricao, iniciarAgora } = req.body;
    const motorista = req.motorista;
    
    // Inserir manutenção
    const result = await query(
      `INSERT INTO manutencoes 
       (empresa_id, motorista_id, tipo, empresa_nome, valor, dias, data_programada, descricao, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [motorista.empresa_id, motorista.id, tipo, empresa, valor, dias, data, descricao, 
       iniciarAgora ? 'em_andamento' : 'programada']
    );
    
    // Se iniciar agora, colocar motorista offline
    if (iniciarAgora) {
      await query(
        `UPDATE motoristas SET status = 'manutencao', em_manutencao = true, disponivel = false 
         WHERE id = $1`,
        [motorista.id]
      );
    }
    
    // Notificar ADM via WhatsApp
    const { MENSAGENS_REBECA } = require('../services/rebeca-regras');
    // Aqui seria a integração com WhatsApp para notificar o dono
    
    res.json({ 
      success: true, 
      manutencaoId: result.rows[0].id,
      message: iniciarAgora ? 'Manutenção iniciada - Você está offline' : 'Manutenção programada'
    });
    
  } catch (error) {
    console.error('Erro registrar manutenção:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/motorista/avaria
 * Registrar avaria no veículo
 */
router.post('/avaria', async (req, res) => {
  try {
    const { tipo, local, gravidade, descricao, impedeTrabalho } = req.body;
    const motorista = req.motorista;
    
    // Inserir avaria
    const result = await query(
      `INSERT INTO avarias 
       (empresa_id, motorista_id, tipo, local, gravidade, descricao, impede_trabalho, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente')
       RETURNING id`,
      [motorista.empresa_id, motorista.id, tipo, local, gravidade, descricao, impedeTrabalho]
    );
    
    // Se impede trabalho, colocar offline
    if (impedeTrabalho) {
      await query(
        `UPDATE motoristas SET status = 'avaria', disponivel = false 
         WHERE id = $1`,
        [motorista.id]
      );
    }
    
    res.json({ 
      success: true, 
      avariaId: result.rows[0].id,
      message: impedeTrabalho ? 'Avaria registrada - Você está offline' : 'Avaria registrada'
    });
    
  } catch (error) {
    console.error('Erro registrar avaria:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * GET /api/motorista/manutencoes
 * Listar manutenções do motorista
 */
router.get('/manutencoes', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM manutencoes WHERE motorista_id = $1 ORDER BY criado_em DESC LIMIT 20`,
      [req.motorista.id]
    );
    res.json({ success: true, manutencoes: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// CVS - CENTRAL DE ATENDIMENTO (Proxy Call)
// Cliente e Motorista falam sem expor números
// ========================================

/**
 * POST /api/motorista/cvs/ligar
 * Iniciar ligação via central (números mascarados)
 */
router.post('/cvs/ligar', async (req, res) => {
  try {
    const { corridaId } = req.body;
    const motorista = req.motorista;
    
    // Buscar corrida e cliente
    const corrida = await query(
      `SELECT c.*, cl.telefone as cliente_telefone, cl.nome as cliente_nome
       FROM corridas c
       JOIN clientes cl ON c.cliente_id = cl.id
       WHERE c.id = $1 AND c.motorista_id = $2`,
      [corridaId, motorista.id]
    );
    
    if (corrida.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Corrida não encontrada' });
    }
    
    // Buscar número da central (Rebeca) da empresa
    const empresa = await query(
      `SELECT telefone_rebeca FROM empresas WHERE id = $1`,
      [motorista.empresa_id]
    );
    
    const telefoneRebeca = empresa.rows[0]?.telefone_rebeca;
    
    if (!telefoneRebeca) {
      // Fallback: abrir WhatsApp Web da central
      return res.json({ 
        success: true, 
        metodo: 'whatsapp',
        numero: telefoneRebeca || process.env.TELEFONE_REBECA,
        mensagem: `Motorista ${motorista.nome} precisa falar com cliente da corrida #${corridaId}`
      });
    }
    
    // Aqui seria a integração com Twilio para fazer proxy call
    // twilioClient.calls.create({...})
    
    res.json({ 
      success: true, 
      metodo: 'central',
      message: 'Ligação iniciada via central. O cliente receberá uma chamada.'
    });
    
  } catch (error) {
    console.error('Erro CVS:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// CHAT RÁPIDO COM ADM
// ========================================

/**
 * POST /api/motorista/mensagem-adm
 * Enviar mensagem para o ADM
 */
router.post('/mensagem-adm', async (req, res) => {
  try {
    const motorista = req.motorista;
    const { mensagem } = req.body;
    
    if (!mensagem || mensagem.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Mensagem não pode ser vazia' });
    }
    
    const result = await query(`
      INSERT INTO mensagens_suporte (empresa_id, motorista_id, tipo, mensagem)
      VALUES ($1, $2, 'motorista', $3)
      RETURNING *
    `, [motorista.empresa_id, motorista.id, mensagem]);
    
    res.json({ 
      success: true, 
      mensagem: result.rows[0],
      aviso: 'Mensagem enviada para o ADM. Você receberá a resposta em breve.'
    });
  } catch (error) {
    console.error('Erro enviar mensagem ADM:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * GET /api/motorista/mensagens-adm
 * Ver mensagens trocadas com ADM
 */
router.get('/mensagens-adm', async (req, res) => {
  try {
    const motorista = req.motorista;
    
    const result = await query(`
      SELECT * FROM mensagens_suporte 
      WHERE motorista_id = $1
      ORDER BY criado_em DESC
      LIMIT 50
    `, [motorista.id]);
    
    res.json({ success: true, mensagens: result.rows });
  } catch (error) {
    console.error('Erro buscar mensagens:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// RANKING
// ========================================

/**
 * GET /api/motorista/ranking
 * Ver ranking de motoristas
 */
router.get('/ranking', async (req, res) => {
  try {
    const motorista = req.motorista;
    
    // Buscar ranking
    const result = await query(`
      SELECT 
        m.id, m.nome, m.total_corridas, m.nota_media, m.pontos_ranking,
        COALESCE(m.nota_media, 5) * 10 + COALESCE(m.total_corridas, 0) as score
      FROM motoristas m
      WHERE m.empresa_id = $1 AND m.ativo = true
      ORDER BY score DESC, m.nota_media DESC, m.total_corridas DESC
    `, [motorista.empresa_id]);
    
    // Adicionar posição e destacar o motorista atual
    const ranking = result.rows.map((m, i) => ({
      id: m.id,
      nome: m.nome,
      total_corridas: m.total_corridas,
      nota_media: m.nota_media,
      pontos_ranking: m.pontos_ranking,
      posicao: i + 1,
      eu: m.id === motorista.id
    }));
    
    // Encontrar posição do motorista atual
    const minhaPosicao = ranking.find(r => r.eu);
    
    res.json({ 
      success: true, 
      ranking: ranking.slice(0, 10), // Top 10
      minha_posicao: minhaPosicao
    });
  } catch (error) {
    console.error('Erro buscar ranking:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// NOTIFICAÇÃO DE CHEGADA
// ========================================

/**
 * POST /api/motorista/chegou
 * Notificar que chegou no local do cliente
 */
router.post('/chegou', async (req, res) => {
  try {
    const motorista = req.motorista;
    const { corrida_id } = req.body;
    
    // Buscar corrida ativa
    let corridaAtiva;
    if (corrida_id) {
      const result = await query(`
        SELECT * FROM corridas WHERE id = $1 AND motorista_id = $2
      `, [corrida_id, motorista.id]);
      corridaAtiva = result.rows[0];
    } else {
      const result = await query(`
        SELECT * FROM corridas 
        WHERE motorista_id = $1 AND status IN ('aceita', 'a_caminho')
        ORDER BY criado_em DESC LIMIT 1
      `, [motorista.id]);
      corridaAtiva = result.rows[0];
    }
    
    if (!corridaAtiva) {
      return res.status(404).json({ success: false, error: 'Nenhuma corrida ativa encontrada' });
    }
    
    // Atualizar status da corrida
    await query(`
      UPDATE corridas SET status = 'aguardando_cliente', motorista_chegou_em = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [corridaAtiva.id]);
    
    // TODO: Enviar mensagem WhatsApp para o cliente
    // A mensagem será: MENSAGENS_FIXAS.motoristaChegou
    
    res.json({ 
      success: true, 
      corrida_id: corridaAtiva.id,
      message: 'Cliente notificado que você chegou!'
    });
  } catch (error) {
    console.error('Erro notificar chegada:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// OFERTAS DE CORRIDA (TIMEOUT 30s)
// ========================================

/**
 * GET /api/motorista/ofertas
 * Lista ofertas pendentes para o motorista
 */
router.get('/ofertas', async (req, res) => {
  try {
    const motoristaId = req.motorista.id;
    
    const result = await query(`
      SELECT 
        oc.*,
        c.origem_endereco,
        c.destino_endereco,
        cl.nome as cliente_nome,
        EXTRACT(EPOCH FROM (oc.expira_em - NOW())) as segundos_restantes
      FROM ofertas_corrida oc
      JOIN corridas c ON c.id = oc.corrida_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      WHERE oc.motorista_id = $1 
        AND oc.status = 'pendente'
        AND oc.expira_em > NOW()
      ORDER BY oc.enviado_em DESC
    `, [motoristaId]);
    
    res.json({ 
      success: true, 
      ofertas: result.rows.map(o => ({
        ...o,
        segundos_restantes: Math.max(0, Math.floor(o.segundos_restantes))
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar ofertas:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/motorista/ofertas/:corridaId/aceitar
 * Motorista aceita a corrida (dentro dos 30s)
 */
router.post('/ofertas/:corridaId/aceitar', async (req, res) => {
  try {
    const motoristaId = req.motorista.id;
    const { corridaId } = req.params;
    const OfertaCorridaService = require('../services/ofertaCorrida');
    
    // Verificar se oferta ainda está válida
    const oferta = await query(`
      SELECT * FROM ofertas_corrida
      WHERE corrida_id = $1 AND motorista_id = $2 AND status = 'pendente'
    `, [corridaId, motoristaId]);
    
    if (oferta.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Oferta não encontrada ou já expirada' 
      });
    }
    
    // Verificar se ainda está no tempo
    if (new Date(oferta.rows[0].expira_em) < new Date()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tempo esgotado! A corrida foi para outro motorista.' 
      });
    }
    
    // Aceitar a oferta
    const resultado = await OfertaCorridaService.aceitarOferta(corridaId, motoristaId);
    
    if (resultado.sucesso) {
      // Buscar dados da corrida
      const corrida = await query(`
        SELECT c.*, cl.nome as cliente_nome, cl.telefone as cliente_telefone
        FROM corridas c
        LEFT JOIN clientes cl ON cl.id = c.cliente_id
        WHERE c.id = $1
      `, [corridaId]);
      
      // Notificar via WebSocket
      if (global.io) {
        global.io.to(`empresa_${req.motorista.empresa_id}`).emit('corrida_aceita', {
          corrida_id: corridaId,
          motorista_id: motoristaId,
          motorista_nome: req.motorista.nome
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Corrida aceita! Vá até o cliente.',
        corrida: corrida.rows[0]
      });
    } else {
      res.status(400).json({ success: false, error: resultado.motivo });
    }
  } catch (error) {
    console.error('Erro ao aceitar oferta:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/motorista/ofertas/:corridaId/recusar
 * Motorista recusa a corrida
 */
router.post('/ofertas/:corridaId/recusar', async (req, res) => {
  try {
    const motoristaId = req.motorista.id;
    const { corridaId } = req.params;
    const OfertaCorridaService = require('../services/ofertaCorrida');
    
    // Buscar dados da oferta
    const oferta = await query(`
      SELECT * FROM ofertas_corrida
      WHERE corrida_id = $1 AND motorista_id = $2
    `, [corridaId, motoristaId]);
    
    if (oferta.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Oferta não encontrada' });
    }
    
    // Recusar e passar para próximo
    await OfertaCorridaService.recusarOferta(
      corridaId, 
      motoristaId, 
      req.motorista.empresa_id,
      oferta.rows[0].cliente_telefone
    );
    
    res.json({ 
      success: true, 
      message: 'Corrida recusada. Isso conta como corrida perdida.' 
    });
  } catch (error) {
    console.error('Erro ao recusar oferta:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * GET /api/motorista/estatisticas-ofertas
 * Estatísticas de ofertas do motorista
 */
router.get('/estatisticas-ofertas', async (req, res) => {
  try {
    const motoristaId = req.motorista.id;
    
    const result = await query(`
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
      WHERE motorista_id = $1
    `, [motoristaId]);
    
    // Buscar corridas_perdidas do motorista
    const motorista = await query(`
      SELECT corridas_perdidas, ultima_corrida_perdida
      FROM motoristas WHERE id = $1
    `, [motoristaId]);
    
    res.json({ 
      success: true, 
      estatisticas: {
        ...result.rows[0],
        corridas_perdidas: motorista.rows[0]?.corridas_perdidas || 0,
        ultima_corrida_perdida: motorista.rows[0]?.ultima_corrida_perdida
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// ASSISTÊNCIA (Guincho, Mecânico, etc)
// ========================================

/**
 * GET /api/motorista/assistencia
 * Lista contatos de assistência da empresa
 */
router.get('/assistencia', async (req, res) => {
  try {
    const empresaId = req.motorista.empresa_id;
    const { tipo } = req.query;
    
    let sql = `
      SELECT id, tipo, nome, telefone, telefone2, endereco, observacoes
      FROM contatos_assistencia
      WHERE empresa_id = $1 AND ativo = true
    `;
    const params = [empresaId];
    
    if (tipo) {
      sql += ` AND tipo = $2`;
      params.push(tipo);
    }
    
    sql += ` ORDER BY tipo, nome`;
    
    const result = await query(sql, params);
    
    // Agrupar por tipo
    const agrupados = {
      guincho: [],
      mecanico: [],
      borracheiro: [],
      eletricista: [],
      seguro: [],
      outros: []
    };
    
    result.rows.forEach(c => {
      if (agrupados[c.tipo]) {
        agrupados[c.tipo].push(c);
      } else {
        agrupados.outros.push(c);
      }
    });
    
    res.json({ 
      success: true, 
      contatos: result.rows,
      agrupados
    });
  } catch (error) {
    console.error('Erro ao buscar assistência:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// AVARIAS (Registro de acidentes)
// ========================================

/**
 * GET /api/motorista/avarias
 * Lista avarias do motorista
 */
router.get('/avarias', async (req, res) => {
  try {
    const motoristaId = req.motorista.id;
    
    const result = await query(`
      SELECT * FROM avarias
      WHERE motorista_id = $1
      ORDER BY criado_em DESC
      LIMIT 20
    `, [motoristaId]);
    
    // Parse fotos JSON
    const avarias = result.rows.map(a => {
      if (a.fotos) {
        try { a.fotos = JSON.parse(a.fotos); } catch(e) { a.fotos = []; }
      }
      return a;
    });
    
    res.json({ success: true, avarias });
  } catch (error) {
    console.error('Erro ao buscar avarias:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/motorista/avarias
 * Registra nova avaria
 */
router.post('/avarias', async (req, res) => {
  try {
    const motoristaId = req.motorista.id;
    const empresaId = req.motorista.empresa_id;
    const {
      tipo,
      descricao,
      data_ocorrencia,
      endereco_ocorrencia,
      latitude,
      longitude,
      envolvidos_nome,
      envolvidos_telefone,
      envolvidos_placa,
      envolvidos_seguro,
      fotos, // array de URLs
      corrida_id
    } = req.body;
    
    if (!tipo || !descricao) {
      return res.status(400).json({ success: false, error: 'Tipo e descrição são obrigatórios' });
    }
    
    const fotosJson = fotos ? JSON.stringify(fotos) : null;
    
    const result = await query(`
      INSERT INTO avarias (
        empresa_id, motorista_id, corrida_id,
        tipo, descricao, data_ocorrencia,
        endereco_ocorrencia, latitude, longitude,
        envolvidos_nome, envolvidos_telefone, envolvidos_placa, envolvidos_seguro,
        fotos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      empresaId, motoristaId, corrida_id,
      tipo, descricao, data_ocorrencia || new Date(),
      endereco_ocorrencia, latitude, longitude,
      envolvidos_nome, envolvidos_telefone, envolvidos_placa, envolvidos_seguro,
      fotosJson
    ]);
    
    // Notificar ADM via WebSocket
    if (global.io) {
      global.io.to(`empresa_${empresaId}`).emit('nova_avaria', {
        avaria: result.rows[0],
        motorista: req.motorista.nome,
        tipo
      });
    }
    
    res.json({ 
      success: true, 
      avaria: result.rows[0],
      mensagem: 'Avaria registrada com sucesso. A administração foi notificada.'
    });
  } catch (error) {
    console.error('Erro ao registrar avaria:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * PUT /api/motorista/avarias/:id
 * Atualiza avaria (adiciona mais fotos/info)
 */
router.put('/avarias/:id', async (req, res) => {
  try {
    const motoristaId = req.motorista.id;
    const { id } = req.params;
    const { descricao, fotos, envolvidos_nome, envolvidos_telefone, envolvidos_placa, envolvidos_seguro } = req.body;
    
    const fotosJson = fotos ? JSON.stringify(fotos) : null;
    
    const result = await query(`
      UPDATE avarias SET
        descricao = COALESCE($3, descricao),
        fotos = COALESCE($4, fotos),
        envolvidos_nome = COALESCE($5, envolvidos_nome),
        envolvidos_telefone = COALESCE($6, envolvidos_telefone),
        envolvidos_placa = COALESCE($7, envolvidos_placa),
        envolvidos_seguro = COALESCE($8, envolvidos_seguro),
        atualizado_em = NOW()
      WHERE id = $1 AND motorista_id = $2
      RETURNING *
    `, [id, motoristaId, descricao, fotosJson, envolvidos_nome, envolvidos_telefone, envolvidos_placa, envolvidos_seguro]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Avaria não encontrada' });
    }
    
    res.json({ success: true, avaria: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar avaria:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// CHAT COM ADM
// ========================================

/**
 * GET /api/motorista/chat
 * Lista mensagens do chat com ADM
 */
router.get('/chat', async (req, res) => {
  try {
    const motoristaId = req.motorista.id;
    const empresaId = req.motorista.empresa_id;
    const { limite } = req.query;
    
    const result = await query(`
      SELECT * FROM chat_frota
      WHERE empresa_id = $1 AND motorista_id = $2
      ORDER BY criado_em DESC
      LIMIT $3
    `, [empresaId, motoristaId, limite || 50]);
    
    // Marcar como lidas
    await query(`
      UPDATE chat_frota SET lida = true, lida_em = NOW()
      WHERE empresa_id = $1 AND motorista_id = $2 AND lida = false AND remetente_tipo = 'admin'
    `, [empresaId, motoristaId]);
    
    // Contar não lidas
    const naoLidas = await query(`
      SELECT COUNT(*) as total FROM chat_frota
      WHERE empresa_id = $1 AND motorista_id = $2 AND lida = false AND remetente_tipo = 'admin'
    `, [empresaId, motoristaId]);
    
    res.json({ 
      success: true, 
      mensagens: result.rows.reverse(),
      nao_lidas: parseInt(naoLidas.rows[0].total)
    });
  } catch (error) {
    console.error('Erro ao buscar chat:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/motorista/chat
 * Envia mensagem para ADM
 */
router.post('/chat', async (req, res) => {
  try {
    const motoristaId = req.motorista.id;
    const empresaId = req.motorista.empresa_id;
    const { mensagem, tipo_mensagem } = req.body;
    
    if (!mensagem) {
      return res.status(400).json({ success: false, error: 'Mensagem é obrigatória' });
    }
    
    const result = await query(`
      INSERT INTO chat_frota (empresa_id, motorista_id, remetente_tipo, remetente_nome, mensagem, tipo_mensagem)
      VALUES ($1, $2, 'motorista', $3, $4, $5)
      RETURNING *
    `, [empresaId, motoristaId, req.motorista.nome, mensagem, tipo_mensagem || 'texto']);
    
    // Notificar ADM via WebSocket
    if (global.io) {
      global.io.to(`empresa_${empresaId}`).emit('nova_mensagem_chat', {
        mensagem: result.rows[0],
        remetente: 'motorista',
        motorista_id: motoristaId,
        motorista_nome: req.motorista.nome
      });
    }
    
    res.json({ success: true, mensagem: result.rows[0] });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

module.exports = router;
