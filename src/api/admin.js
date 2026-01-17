// ========================================
// REBECA - API ADMIN
// Rotas do painel administrativo
// ========================================

const express = require('express');
const router = express.Router();
const {
  ClienteRepository,
  MotoristaRepository,
  CorridaRepository,
  MensagemRepository,
} = require('../database');
const { query } = require('../database/connection');

// ========================================
// MIDDLEWARE DE AUTENTICAÇÃO ADMIN
// ========================================

const autenticarAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }
    
    const result = await query(`
      SELECT a.*, e.id as empresa_id, e.nome as empresa_nome
      FROM admins a
      LEFT JOIN empresas e ON a.empresa_id = e.id
      WHERE a.token_sessao = $1 AND a.ativo = true
    `, [token]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    
    req.user = {
      id: result.rows[0].id,
      nome: result.rows[0].nome,
      empresa_id: result.rows[0].empresa_id,
      tipo: 'admin'
    };
    
    next();
  } catch (error) {
    console.error('Erro auth admin:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
};

// Aplicar middleware em todas as rotas
router.use(autenticarAdmin);

// ========================================
// DASHBOARD - ESTATÍSTICAS
// ========================================

/**
 * GET /api/admin/dashboard
 * Retorna estatísticas gerais da empresa
 */
router.get('/dashboard', async (req, res) => {
  try {
    const empresa_id = req.user?.empresa_id || 1;
    
    // Total de corridas hoje
    const corridasHoje = await query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN status = 'finalizada' THEN 1 END) as finalizadas,
             COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as canceladas,
             COUNT(CASE WHEN status IN ('aguardando', 'enviada', 'aceita', 'em_andamento') THEN 1 END) as em_andamento,
             COALESCE(SUM(CASE WHEN status = 'finalizada' THEN valor_final END), 0) as faturamento
      FROM corridas
      WHERE DATE(criado_em) = CURRENT_DATE AND empresa_id = $1
    `, [empresa_id]);

    // Motoristas online
    const motoristasOnline = await query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN status = 'online' AND disponivel = true THEN 1 END) as disponiveis,
             COUNT(CASE WHEN status = 'em_corrida' THEN 1 END) as em_corrida
      FROM motoristas
      WHERE ativo = true AND empresa_id = $1
    `, [empresa_id]);

    // Total de clientes
    const totalClientes = await query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN recorrente = true THEN 1 END) as recorrentes
      FROM clientes
      WHERE empresa_id = $1
    `, [empresa_id]);

    // Tempo médio de espera (últimas corridas finalizadas)
    const tempoMedio = await query(`
      SELECT AVG(EXTRACT(EPOCH FROM (aceito_em - criado_em))/60) as minutos
      FROM corridas
      WHERE status = 'finalizada' AND aceito_em IS NOT NULL 
        AND criado_em > NOW() - INTERVAL '7 days'
        AND empresa_id = $1
    `, [empresa_id]);

    const tempoMedioMin = tempoMedio.rows[0]?.minutos 
      ? `${Math.round(tempoMedio.rows[0].minutos)} min` 
      : '0 min';

    res.json({
      success: true,
      corridas_hoje: parseInt(corridasHoje.rows[0]?.total) || 0,
      motoristas_online: parseInt(motoristasOnline.rows[0]?.disponiveis) || 0,
      faturamento_hoje: parseFloat(corridasHoje.rows[0]?.faturamento) || 0,
      tempo_medio_espera: tempoMedioMin,
      data: {
        corridas: corridasHoje.rows[0],
        motoristas: motoristasOnline.rows[0],
        clientes: totalClientes.rows[0],
      },
    });
  } catch (error) {
    console.error('Erro dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// MOTORISTAS
// ========================================

/**
 * GET /api/admin/motoristas
 * Lista todos os motoristas da empresa
 */
router.get('/motoristas', async (req, res) => {
  try {
    const empresa_id = req.user?.empresa_id || 1;
    
    const result = await query(`
      SELECT m.*,
             COUNT(c.id) as total_corridas,
             COALESCE(AVG(c.avaliacao_motorista), 5.0) as nota_media,
             COALESCE(SUM(CASE WHEN c.status = 'finalizada' THEN c.valor_final END), 0) as total_faturado,
             COALESCE(m.corridas_perdidas, 0) as corridas_perdidas,
             m.ultima_corrida_perdida,
             (SELECT COUNT(*) FROM ofertas_corrida oc WHERE oc.motorista_id = m.id AND oc.status = 'aceita') as ofertas_aceitas,
             (SELECT COUNT(*) FROM ofertas_corrida oc WHERE oc.motorista_id = m.id AND oc.status = 'expirada') as ofertas_expiradas,
             (SELECT COUNT(*) FROM ofertas_corrida oc WHERE oc.motorista_id = m.id AND oc.status = 'recusada') as ofertas_recusadas
      FROM motoristas m
      LEFT JOIN corridas c ON m.id = c.motorista_id
      WHERE m.empresa_id = $1
      GROUP BY m.id
      ORDER BY m.nome
    `, [empresa_id]);

    res.json({ success: true, motoristas: result.rows, data: result.rows });
  } catch (error) {
    console.error('Erro listar motoristas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/motoristas/mapa/tempo-real
 * Posição dos motoristas no mapa (DEVE VIR ANTES DE :id)
 */
router.get('/motoristas/mapa/tempo-real', async (req, res) => {
  try {
    const empresa_id = req.user?.empresa_id || 1;
    
    // Buscar motoristas
    const result = await query(`
      SELECT id, nome, latitude, longitude, status, disponivel, veiculo_modelo, veiculo_cor, veiculo_placa
      FROM motoristas
      WHERE ativo = true AND empresa_id = $1
    `, [empresa_id]);
    
    // Buscar cidade da empresa para centralizar mapa
    const empresaResult = await query('SELECT nome, cidade FROM empresas WHERE id = $1', [empresa_id]);
    const empresa = empresaResult.rows[0] || {};
    
    res.json({ 
      success: true, 
      motoristas: result.rows,
      empresa: {
        nome: empresa.nome,
        cidade: empresa.cidade
      }
    });
  } catch (error) {
    console.error('Erro mapa motoristas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
/**
 * GET /api/admin/motoristas/:id
 * Detalhes de um motorista
 */
router.get('/motoristas/:id', async (req, res) => {
  try {
    const motorista = await MotoristaRepository.buscarPorId(req.params.id);
    
    if (!motorista) {
      return res.status(404).json({ success: false, error: 'Motorista não encontrado' });
    }

    // Corridas do motorista
    const corridas = await query(`
      SELECT c.*, cl.nome as cliente_nome
      FROM corridas c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.motorista_id = $1
      ORDER BY c.solicitado_em DESC
      LIMIT 50
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...motorista,
        corridas: corridas.rows,
      },
    });
  } catch (error) {
    console.error('Erro detalhes motorista:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/motoristas
 * Cadastrar novo motorista
 * ADM gera link único para o motorista acessar
 */
router.post('/motoristas', async (req, res) => {
  try {
    const { nome, telefone, senha, cnh, veiculo_modelo, veiculo_cor, veiculo_placa, empresa_id } = req.body;

    if (!nome || !telefone || !senha) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome, telefone e senha são obrigatórios' 
      });
    }

    // Hash da senha
    const crypto = require('crypto');
    const senhaHash = crypto.createHash('sha256').update(senha).digest('hex');

    // Gerar token único para o motorista (link de acesso)
    const tokenAcesso = crypto.randomBytes(32).toString('hex');

    // Limpar telefone
    const telLimpo = telefone.replace(/\D/g, '');

    const result = await query(
      `INSERT INTO motoristas (nome, telefone, senha_hash, cnh, veiculo_modelo, veiculo_cor, veiculo_placa, token_acesso, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [nome, telLimpo, senhaHash, cnh, veiculo_modelo, veiculo_cor, veiculo_placa, tokenAcesso, empresa_id || null]
    );

    const motorista = result.rows[0];

    // Gerar link ÚNICO de acesso para este motorista
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const linkAcesso = `${baseUrl}/motorista?token=${tokenAcesso}`;

    console.log(`✅ Motorista cadastrado: ${nome}`);
    console.log(`🔗 Link de acesso: ${linkAcesso}`);

    res.json({ 
      success: true, 
      data: {
        id: motorista.id,
        nome: motorista.nome,
        telefone: motorista.telefone,
        cnh: motorista.cnh,
        veiculo_modelo: motorista.veiculo_modelo,
        veiculo_cor: motorista.veiculo_cor,
        veiculo_placa: motorista.veiculo_placa,
        status: motorista.status,
        ativo: motorista.ativo,
        link_acesso: linkAcesso, // Link único para o motorista
        criado_em: motorista.criado_em
      },
      mensagem: `Motorista cadastrado! Envie este link para ${nome} acessar o painel.`
    });
  } catch (error) {
    console.error('Erro criar motorista:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Telefone já cadastrado' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/motoristas/:id
 * Atualizar motorista
 */
router.put('/motoristas/:id', async (req, res) => {
  try {
    const { nome, telefone, cnh, veiculo_modelo, veiculo_cor, veiculo_placa, ativo } = req.body;

    const result = await query(`
      UPDATE motoristas 
      SET nome = COALESCE($1, nome),
          telefone = COALESCE($2, telefone),
          cnh = COALESCE($3, cnh),
          veiculo_modelo = COALESCE($4, veiculo_modelo),
          veiculo_cor = COALESCE($5, veiculo_cor),
          veiculo_placa = COALESCE($6, veiculo_placa),
          ativo = COALESCE($7, ativo),
          atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [nome, telefone, cnh, veiculo_modelo, veiculo_cor, veiculo_placa, ativo, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Motorista não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro atualizar motorista:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/motoristas/:id
 * Desativar motorista (soft delete)
 */
router.delete('/motoristas/:id', async (req, res) => {
  try {
    const result = await query(`
      UPDATE motoristas SET ativo = false, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $1 RETURNING *
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Motorista não encontrado' });
    }

    res.json({ success: true, message: 'Motorista desativado' });
  } catch (error) {
    console.error('Erro desativar motorista:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CORRIDAS
// ========================================

/**
 * GET /api/admin/corridas
 * Lista corridas com filtros
 */
router.get('/corridas', async (req, res) => {
  try {
    const empresa_id = req.user?.empresa_id || 1;
    const { status, data, motorista_id, limit = 100 } = req.query;

    let sql = `
      SELECT c.*, 
             cl.nome as cliente_nome, cl.telefone as cliente_telefone,
             m.nome as motorista_nome, m.veiculo_modelo, m.veiculo_cor
      FROM corridas c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN motoristas m ON c.motorista_id = m.id
      WHERE c.empresa_id = $1
    `;
    const params = [empresa_id];

    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    }

    if (data) {
      params.push(data);
      sql += ` AND DATE(c.criado_em) = $${params.length}`;
    }

    if (motorista_id) {
      params.push(motorista_id);
      sql += ` AND c.motorista_id = $${params.length}`;
    }

    params.push(parseInt(limit));
    sql += ` ORDER BY c.criado_em DESC LIMIT $${params.length}`;

    const result = await query(sql, params);

    res.json({ success: true, corridas: result.rows, data: result.rows });
  } catch (error) {
    console.error('Erro listar corridas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/corridas/hoje
 * Corridas de hoje
 */
router.get('/corridas/hoje', async (req, res) => {
  try {
    const empresa_id = req.user?.empresa_id || 1;
    
    const result = await query(`
      SELECT c.*, 
             cl.nome as cliente_nome, cl.telefone as cliente_telefone,
             m.nome as motorista_nome
      FROM corridas c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN motoristas m ON c.motorista_id = m.id
      WHERE DATE(c.criado_em) = CURRENT_DATE AND c.empresa_id = $1
      ORDER BY c.criado_em DESC
    `, [empresa_id]);
    
    res.json({ success: true, corridas: result.rows, data: result.rows });
  } catch (error) {
    console.error('Erro corridas hoje:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/corridas/:id
 * Detalhes de uma corrida
 */
router.get('/corridas/:id', async (req, res) => {
  try {
    const corrida = await CorridaRepository.buscarPorId(req.params.id);

    if (!corrida) {
      return res.status(404).json({ success: false, error: 'Corrida não encontrada' });
    }

    res.json({ success: true, data: corrida });
  } catch (error) {
    console.error('Erro detalhes corrida:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/corridas/:id/cancelar
 * Cancelar corrida (admin)
 */
router.put('/corridas/:id/cancelar', async (req, res) => {
  try {
    const { motivo } = req.body;

    const corrida = await CorridaRepository.cancelar(req.params.id, motivo || 'Cancelado pelo administrador');

    if (corrida && corrida.motorista_id) {
      await MotoristaRepository.finalizarCorrida(corrida.motorista_id);
    }

    res.json({ success: true, data: corrida });
  } catch (error) {
    console.error('Erro cancelar corrida:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CLIENTES
// ========================================

/**
 * GET /api/admin/clientes
 * Lista todos os clientes
 */
router.get('/clientes', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*,
             COUNT(co.id) as total_corridas,
             MAX(co.solicitado_em) as ultima_corrida
      FROM clientes c
      LEFT JOIN corridas co ON c.id = co.cliente_id
      GROUP BY c.id
      ORDER BY c.criado_em DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar clientes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// MENSAGENS / LOG
// ========================================

/**
 * GET /api/admin/mensagens
 * Log de mensagens
 */
router.get('/mensagens', async (req, res) => {
  try {
    const { telefone, limit = 100 } = req.query;

    let sql = `SELECT * FROM mensagens`;
    const params = [];

    if (telefone) {
      params.push(telefone);
      sql += ` WHERE telefone = $1`;
    }

    params.push(parseInt(limit));
    sql += ` ORDER BY criado_em DESC LIMIT $${params.length}`;

    const result = await query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar mensagens:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CONFIGURAÇÕES
// ========================================

/**
 * GET /api/admin/configuracoes
 * Lista todas as configurações
 */
router.get('/configuracoes', async (req, res) => {
  try {
    const result = await query('SELECT * FROM configuracoes ORDER BY chave');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar configurações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/configuracoes/:chave
 * Atualizar configuração
 */
router.put('/configuracoes/:chave', async (req, res) => {
  try {
    const { valor } = req.body;

    const result = await query(`
      UPDATE configuracoes 
      SET valor = $1, atualizado_em = CURRENT_TIMESTAMP
      WHERE chave = $2
      RETURNING *
    `, [valor, req.params.chave]);

    if (result.rows.length === 0) {
      // Criar se não existe
      const insert = await query(`
        INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) RETURNING *
      `, [req.params.chave, valor]);
      return res.json({ success: true, data: insert.rows[0] });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro atualizar configuração:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// RELATÓRIOS
// ========================================

/**
 * GET /api/admin/relatorios/diario
 * Relatório diário
 */
router.get('/relatorios/diario', async (req, res) => {
  try {
    const { data } = req.query;
    const dataFiltro = data || 'CURRENT_DATE';

    const result = await query(`
      SELECT 
        COUNT(*) as total_corridas,
        COUNT(CASE WHEN status = 'finalizada' THEN 1 END) as finalizadas,
        COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as canceladas,
        COALESCE(SUM(CASE WHEN status = 'finalizada' THEN valor END), 0) as faturamento_total,
        COALESCE(AVG(CASE WHEN status = 'finalizada' THEN valor END), 0) as ticket_medio,
        COUNT(DISTINCT cliente_id) as clientes_unicos,
        COUNT(DISTINCT motorista_id) as motoristas_ativos
      FROM corridas
      WHERE DATE(solicitado_em) = ${data ? '$1' : 'CURRENT_DATE'}
    `, data ? [data] : []);

    // Top motoristas do dia
    const topMotoristas = await query(`
      SELECT m.nome, m.id,
             COUNT(c.id) as corridas,
             COALESCE(SUM(c.valor), 0) as faturamento
      FROM motoristas m
      LEFT JOIN corridas c ON m.id = c.motorista_id AND DATE(c.solicitado_em) = ${data ? '$1' : 'CURRENT_DATE'}
      WHERE m.ativo = true
      GROUP BY m.id
      ORDER BY corridas DESC
      LIMIT 10
    `, data ? [data] : []);

    res.json({
      success: true,
      data: {
        resumo: result.rows[0],
        topMotoristas: topMotoristas.rows,
      },
    });
  } catch (error) {
    console.error('Erro relatório diário:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/relatorios/semanal
 * Relatório semanal
 */
router.get('/relatorios/semanal', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        DATE(solicitado_em) as data,
        COUNT(*) as total_corridas,
        COUNT(CASE WHEN status = 'finalizada' THEN 1 END) as finalizadas,
        COALESCE(SUM(CASE WHEN status = 'finalizada' THEN valor END), 0) as faturamento
      FROM corridas
      WHERE solicitado_em >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(solicitado_em)
      ORDER BY data
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro relatório semanal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// PAGAMENTOS (ADMIN)
// ========================================

/**
 * GET /api/admin/pagamentos/motorista/:id
 * Lista pagamentos de um motorista
 */
router.get('/pagamentos/motorista/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM pagamentos 
       WHERE motorista_id = $1 
       ORDER BY criado_em DESC 
       LIMIT 100`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar pagamentos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/pagamentos/entrada
 * Registrar entrada (ganho) para motorista
 */
router.post('/pagamentos/entrada', async (req, res) => {
  try {
    const { motorista_id, valor, descricao } = req.body;

    if (!motorista_id || !valor) {
      return res.status(400).json({ success: false, error: 'Motorista e valor são obrigatórios' });
    }

    const result = await query(
      `INSERT INTO pagamentos (motorista_id, tipo, valor, descricao, criado_por)
       VALUES ($1, 'entrada', $2, $3, 'admin')
       RETURNING *`,
      [motorista_id, valor, descricao || 'Entrada manual']
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro registrar entrada:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/pagamentos/saida
 * Registrar saída (desconto/repasse) para motorista
 */
router.post('/pagamentos/saida', async (req, res) => {
  try {
    const { motorista_id, valor, descricao } = req.body;

    if (!motorista_id || !valor) {
      return res.status(400).json({ success: false, error: 'Motorista e valor são obrigatórios' });
    }

    const result = await query(
      `INSERT INTO pagamentos (motorista_id, tipo, valor, descricao, criado_por)
       VALUES ($1, 'saida', $2, $3, 'admin')
       RETURNING *`,
      [motorista_id, valor, descricao || 'Saída manual']
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro registrar saída:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/pagamentos/resumo/:motorista_id
 * Resumo financeiro de um motorista
 */
router.get('/pagamentos/resumo/:motorista_id', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as total_entradas,
        COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as total_saidas
       FROM pagamentos
       WHERE motorista_id = $1`,
      [req.params.motorista_id]
    );

    const r = result.rows[0];
    res.json({
      success: true,
      data: {
        entradas: parseFloat(r.total_entradas),
        saidas: parseFloat(r.total_saidas),
        saldo: parseFloat(r.total_entradas) - parseFloat(r.total_saidas),
      }
    });
  } catch (error) {
    console.error('Erro resumo pagamentos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/pagamentos/:id
 * Excluir pagamento
 */
router.delete('/pagamentos/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM pagamentos WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pagamento não encontrado' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro excluir pagamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// ANTI-FRAUDE - RECUSAS DE CORRIDAS
// ========================================

/**
 * GET /api/admin/antifraude/recusas
 * Lista motoristas que mais recusam corridas
 */
router.get('/antifraude/recusas', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        m.id,
        m.nome,
        m.telefone,
        m.status,
        COUNT(r.id) as total_recusas,
        MAX(r.criado_em) as ultima_recusa
      FROM motoristas m
      LEFT JOIN recusas r ON m.id = r.motorista_id
      WHERE m.ativo = true
      GROUP BY m.id, m.nome, m.telefone, m.status
      HAVING COUNT(r.id) > 0
      ORDER BY total_recusas DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar recusas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/antifraude/recusas/:motorista_id
 * Histórico de recusas de um motorista
 */
router.get('/antifraude/recusas/:motorista_id', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        r.*,
        c.origem_endereco,
        c.destino_endereco,
        cl.nome as cliente_nome
      FROM recusas r
      LEFT JOIN corridas c ON r.corrida_id = c.id
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE r.motorista_id = $1
      ORDER BY r.criado_em DESC
      LIMIT 50
    `, [req.params.motorista_id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro histórico recusas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/antifraude/alertas
 * Alertas de comportamento suspeito
 */
router.get('/antifraude/alertas', async (req, res) => {
  try {
    // Motoristas com mais de 5 recusas nos últimos 7 dias
    const recusasExcessivas = await query(`
      SELECT 
        m.id,
        m.nome,
        m.telefone,
        COUNT(r.id) as recusas_semana,
        'recusas_excessivas' as tipo_alerta
      FROM motoristas m
      JOIN recusas r ON m.id = r.motorista_id
      WHERE r.criado_em >= CURRENT_DATE - INTERVAL '7 days'
      AND m.ativo = true
      GROUP BY m.id, m.nome, m.telefone
      HAVING COUNT(r.id) >= 5
      ORDER BY recusas_semana DESC
    `);

    // Motoristas que recusaram mais de 50% das corridas
    const taxaRecusaAlta = await query(`
      SELECT 
        m.id,
        m.nome,
        m.telefone,
        COUNT(DISTINCT r.corrida_id) as recusas,
        COUNT(DISTINCT CASE WHEN c.status = 'finalizada' THEN c.id END) as finalizadas,
        'taxa_recusa_alta' as tipo_alerta
      FROM motoristas m
      LEFT JOIN recusas r ON m.id = r.motorista_id AND r.criado_em >= CURRENT_DATE - INTERVAL '7 days'
      LEFT JOIN corridas c ON m.id = c.motorista_id AND c.solicitado_em >= CURRENT_DATE - INTERVAL '7 days'
      WHERE m.ativo = true
      GROUP BY m.id, m.nome, m.telefone
      HAVING COUNT(DISTINCT r.corrida_id) > COUNT(DISTINCT CASE WHEN c.status = 'finalizada' THEN c.id END)
      AND COUNT(DISTINCT r.corrida_id) > 0
    `);

    res.json({ 
      success: true, 
      data: {
        recusas_excessivas: recusasExcessivas.rows,
        taxa_recusa_alta: taxaRecusaAlta.rows,
        total_alertas: recusasExcessivas.rows.length + taxaRecusaAlta.rows.length
      }
    });
  } catch (error) {
    console.error('Erro alertas antifraude:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// FINANCEIRO / MENSALIDADES
// ========================================

/**
 * GET /api/admin/financeiro/resumo
 * Resumo financeiro geral
 */
router.get('/financeiro/resumo', async (req, res) => {
  try {
    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Total de motoristas ativos
    const totalMotoristas = await query(
      `SELECT COUNT(*) as total FROM motoristas WHERE ativo = true`
    );

    // Motoristas em dia
    const emDia = await query(`
      SELECT COUNT(DISTINCT mf.motorista_id) as total
      FROM motorista_financeiro mf
      LEFT JOIN mensalidades m ON mf.motorista_id = m.motorista_id 
        AND m.mes_referencia = $1
      WHERE mf.isento = true 
        OR m.status = 'pago'
    `, [mesAtual]);

    // Motoristas pendentes
    const pendentes = await query(`
      SELECT COUNT(DISTINCT mot.id) as total
      FROM motoristas mot
      LEFT JOIN motorista_financeiro mf ON mot.id = mf.motorista_id
      LEFT JOIN mensalidades m ON mot.id = m.motorista_id AND m.mes_referencia = $1
      WHERE mot.ativo = true 
        AND (mf.isento IS NULL OR mf.isento = false)
        AND (m.status IS NULL OR m.status = 'pendente')
    `, [mesAtual]);

    // Motoristas atrasados
    const atrasados = await query(`
      SELECT COUNT(*) as total
      FROM mensalidades
      WHERE status = 'atrasado'
        AND mes_referencia = $1
    `, [mesAtual]);

    // Total recebido no mês
    const recebidoMes = await query(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM mensalidades
      WHERE status = 'pago'
        AND mes_referencia = $1
    `, [mesAtual]);

    // Total a receber
    const aReceberMes = await query(`
      SELECT COALESCE(SUM(COALESCE(mf.valor_mensalidade, 100)), 0) as total
      FROM motoristas mot
      LEFT JOIN motorista_financeiro mf ON mot.id = mf.motorista_id
      LEFT JOIN mensalidades m ON mot.id = m.motorista_id AND m.mes_referencia = $1
      WHERE mot.ativo = true 
        AND (mf.isento IS NULL OR mf.isento = false)
        AND (m.status IS NULL OR m.status != 'pago')
    `, [mesAtual]);

    res.json({
      success: true,
      data: {
        mes_referencia: mesAtual,
        total_motoristas: parseInt(totalMotoristas.rows[0].total),
        em_dia: parseInt(emDia.rows[0].total),
        pendentes: parseInt(pendentes.rows[0].total),
        atrasados: parseInt(atrasados.rows[0].total),
        recebido_mes: parseFloat(recebidoMes.rows[0].total),
        a_receber_mes: parseFloat(aReceberMes.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Erro resumo financeiro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/financeiro/motoristas
 * Lista motoristas com status de pagamento
 */
router.get('/financeiro/motoristas', async (req, res) => {
  try {
    const mesAtual = new Date().toISOString().slice(0, 7);

    const result = await query(`
      SELECT 
        mot.id,
        mot.nome,
        mot.telefone,
        mot.status as status_online,
        mot.ativo,
        COALESCE(mf.valor_mensalidade, 100) as valor_mensalidade,
        COALESCE(mf.dia_vencimento, 10) as dia_vencimento,
        COALESCE(mf.isento, false) as isento,
        mf.motivo_isencao,
        m.id as mensalidade_id,
        m.status as status_pagamento,
        m.data_pagamento,
        m.forma_pagamento,
        CASE 
          WHEN mf.isento = true THEN 'isento'
          WHEN m.status = 'pago' THEN 'pago'
          WHEN m.status = 'atrasado' THEN 'atrasado'
          WHEN EXTRACT(DAY FROM CURRENT_DATE) > COALESCE(mf.dia_vencimento, 10) 
            AND (m.status IS NULL OR m.status = 'pendente') THEN 'atrasado'
          ELSE 'pendente'
        END as situacao
      FROM motoristas mot
      LEFT JOIN motorista_financeiro mf ON mot.id = mf.motorista_id
      LEFT JOIN mensalidades m ON mot.id = m.motorista_id AND m.mes_referencia = $1
      WHERE mot.ativo = true
      ORDER BY 
        CASE 
          WHEN mf.isento = true THEN 3
          WHEN m.status = 'pago' THEN 2
          ELSE 1
        END,
        mot.nome
    `, [mesAtual]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar financeiro motoristas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/financeiro/motorista/:id
 * Histórico de pagamentos de um motorista
 */
router.get('/financeiro/motorista/:id', async (req, res) => {
  try {
    const motoristaId = req.params.id;

    // Dados do motorista
    const motorista = await query(`
      SELECT 
        mot.*,
        mf.valor_mensalidade,
        mf.dia_vencimento,
        mf.isento,
        mf.motivo_isencao,
        mf.data_inicio,
        mf.observacoes
      FROM motoristas mot
      LEFT JOIN motorista_financeiro mf ON mot.id = mf.motorista_id
      WHERE mot.id = $1
    `, [motoristaId]);

    // Histórico de mensalidades
    const historico = await query(`
      SELECT *
      FROM mensalidades
      WHERE motorista_id = $1
      ORDER BY mes_referencia DESC
      LIMIT 12
    `, [motoristaId]);

    res.json({
      success: true,
      data: {
        motorista: motorista.rows[0],
        historico: historico.rows
      }
    });
  } catch (error) {
    console.error('Erro histórico financeiro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/financeiro/motorista/:id
 * Atualizar configuração financeira do motorista
 */
router.put('/financeiro/motorista/:id', async (req, res) => {
  try {
    const motoristaId = req.params.id;
    const { valor_mensalidade, dia_vencimento, isento, motivo_isencao, observacoes } = req.body;

    // Verificar se existe
    const existe = await query(
      'SELECT id FROM motorista_financeiro WHERE motorista_id = $1',
      [motoristaId]
    );

    let result;
    if (existe.rows.length === 0) {
      result = await query(`
        INSERT INTO motorista_financeiro 
        (motorista_id, valor_mensalidade, dia_vencimento, isento, motivo_isencao, observacoes, data_inicio)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
        RETURNING *
      `, [motoristaId, valor_mensalidade || 100, dia_vencimento || 10, isento || false, motivo_isencao, observacoes]);
    } else {
      result = await query(`
        UPDATE motorista_financeiro SET
          valor_mensalidade = COALESCE($2, valor_mensalidade),
          dia_vencimento = COALESCE($3, dia_vencimento),
          isento = COALESCE($4, isento),
          motivo_isencao = $5,
          observacoes = $6,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE motorista_id = $1
        RETURNING *
      `, [motoristaId, valor_mensalidade, dia_vencimento, isento, motivo_isencao, observacoes]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro atualizar financeiro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/financeiro/registrar-pagamento
 * Registrar pagamento de mensalidade
 */
router.post('/financeiro/registrar-pagamento', async (req, res) => {
  try {
    const { motorista_id, mes_referencia, valor, forma_pagamento, observacao } = req.body;

    // Verificar se já existe mensalidade para este mês
    const existe = await query(
      'SELECT id FROM mensalidades WHERE motorista_id = $1 AND mes_referencia = $2',
      [motorista_id, mes_referencia]
    );

    let result;
    if (existe.rows.length > 0) {
      // Atualizar
      result = await query(`
        UPDATE mensalidades SET
          status = 'pago',
          valor = $3,
          data_pagamento = CURRENT_TIMESTAMP,
          forma_pagamento = $4,
          observacao = $5
        WHERE motorista_id = $1 AND mes_referencia = $2
        RETURNING *
      `, [motorista_id, mes_referencia, valor, forma_pagamento, observacao]);
    } else {
      // Buscar valor da mensalidade configurada
      const config = await query(
        'SELECT valor_mensalidade, dia_vencimento FROM motorista_financeiro WHERE motorista_id = $1',
        [motorista_id]
      );
      
      const valorFinal = valor || config.rows[0]?.valor_mensalidade || 100;
      const diaVenc = config.rows[0]?.dia_vencimento || 10;

      // Criar nova
      result = await query(`
        INSERT INTO mensalidades 
        (motorista_id, mes_referencia, valor, dia_vencimento, status, data_pagamento, forma_pagamento, observacao)
        VALUES ($1, $2, $3, $4, 'pago', CURRENT_TIMESTAMP, $5, $6)
        RETURNING *
      `, [motorista_id, mes_referencia, valorFinal, diaVenc, forma_pagamento, observacao]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro registrar pagamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/financeiro/gerar-mensalidades
 * Gerar mensalidades pendentes para o mês
 */
router.post('/financeiro/gerar-mensalidades', async (req, res) => {
  try {
    const { mes_referencia } = req.body;
    const mes = mes_referencia || new Date().toISOString().slice(0, 7);

    // Buscar motoristas ativos sem mensalidade para o mês
    const motoristas = await query(`
      SELECT 
        mot.id,
        COALESCE(mf.valor_mensalidade, 100) as valor,
        COALESCE(mf.dia_vencimento, 10) as dia_vencimento,
        COALESCE(mf.isento, false) as isento
      FROM motoristas mot
      LEFT JOIN motorista_financeiro mf ON mot.id = mf.motorista_id
      LEFT JOIN mensalidades m ON mot.id = m.motorista_id AND m.mes_referencia = $1
      WHERE mot.ativo = true 
        AND m.id IS NULL
        AND (mf.isento IS NULL OR mf.isento = false)
    `, [mes]);

    let criadas = 0;
    for (const m of motoristas.rows) {
      await query(`
        INSERT INTO mensalidades (motorista_id, valor, dia_vencimento, mes_referencia, status)
        VALUES ($1, $2, $3, $4, 'pendente')
      `, [m.id, m.valor, m.dia_vencimento, mes]);
      criadas++;
    }

    res.json({ 
      success: true, 
      message: `${criadas} mensalidades geradas para ${mes}`,
      criadas 
    });
  } catch (error) {
    console.error('Erro gerar mensalidades:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/financeiro/marcar-atrasados
 * Marcar mensalidades vencidas como atrasadas
 */
router.put('/financeiro/marcar-atrasados', async (req, res) => {
  try {
    const result = await query(`
      UPDATE mensalidades SET status = 'atrasado'
      WHERE status = 'pendente'
        AND EXTRACT(DAY FROM CURRENT_DATE) > dia_vencimento
        AND mes_referencia = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      RETURNING id
    `);

    res.json({ 
      success: true, 
      message: `${result.rows.length} mensalidades marcadas como atrasadas`,
      atualizadas: result.rows.length 
    });
  } catch (error) {
    console.error('Erro marcar atrasados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// ANTI-FRAUDE
// ========================================

const { AntiFraude } = require('../services');
const antiFraude = new AntiFraude();

/**
 * POST /api/admin/configuracoes/notificacoes
 * Salvar configurações de notificações do ADM
 */
router.post('/configuracoes/notificacoes', async (req, res) => {
  try {
    const { telefone_adm, email_adm, notificacoes, frequencia_relatorio } = req.body;
    
    // Salvar cada configuração
    const configs = [
      { chave: 'telefone_adm', valor: telefone_adm },
      { chave: 'email_adm', valor: email_adm },
      { chave: 'notif_atrasos', valor: notificacoes?.atrasos ? 'true' : 'false' },
      { chave: 'notif_antifraude', valor: notificacoes?.antifraude ? 'true' : 'false' },
      { chave: 'notif_corridas', valor: notificacoes?.corridas ? 'true' : 'false' },
      { chave: 'notif_financeiro', valor: notificacoes?.financeiro ? 'true' : 'false' },
      { chave: 'frequencia_relatorio', valor: frequencia_relatorio || 'diario' },
    ];
    
    for (const cfg of configs) {
      await query(`
        INSERT INTO configuracoes (chave, valor, atualizado_em)
        VALUES ($1, $2, NOW())
        ON CONFLICT (chave) DO UPDATE SET valor = $2, atualizado_em = NOW()
      `, [cfg.chave, cfg.valor]);
    }
    
    res.json({ 
      success: true, 
      message: 'Configurações de notificação salvas com sucesso'
    });
  } catch (error) {
    console.error('Erro salvar config notificações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/configuracoes/notificacoes
 * Buscar configurações de notificações
 */
router.get('/configuracoes/notificacoes', async (req, res) => {
  try {
    const result = await query(`
      SELECT chave, valor FROM configuracoes
      WHERE chave IN ('telefone_adm', 'email_adm', 'notif_atrasos', 'notif_antifraude', 
                      'notif_corridas', 'notif_financeiro', 'frequencia_relatorio')
    `);
    
    const config = {};
    result.rows.forEach(row => {
      config[row.chave] = row.valor;
    });
    
    res.json({ success: true, data: config });
  } catch (error) {
    res.json({ success: true, data: {} });
  }
});

/**
 * POST /api/admin/notificacoes/teste
 * Enviar notificação de teste via WhatsApp
 */
router.post('/notificacoes/teste', async (req, res) => {
  try {
    const { telefone, mensagem } = req.body;
    
    // Tentar enviar via Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'rebeca';
    
    if (evolutionUrl && evolutionKey) {
      const response = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionKey,
        },
        body: JSON.stringify({
          number: telefone,
          text: mensagem,
        }),
      });
      
      if (response.ok) {
        return res.json({ success: true, message: 'Mensagem enviada com sucesso' });
      }
    }
    
    // Se não conseguir enviar, retornar erro
    res.status(500).json({ 
      success: false, 
      error: 'WhatsApp não configurado. Configure a Evolution API.',
      fallback: true 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, fallback: true });
  }
});

/**
 * GET /api/admin/antifraude/resumo
 * Resumo de alertas anti-fraude para o dashboard
 */
router.get('/antifraude/resumo', async (req, res) => {
  try {
    const empresaId = req.query.empresa_id || null;
    const resumo = await antiFraude.obterResumoDashboard(empresaId);
    
    res.json({ success: true, data: resumo });
  } catch (error) {
    console.error('Erro resumo anti-fraude:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/antifraude/motorista/:id
 * Análise completa de um motorista específico
 */
router.get('/antifraude/motorista/:id', async (req, res) => {
  try {
    const analise = await antiFraude.analisarMotorista(req.params.id);
    
    res.json({ success: true, data: analise });
  } catch (error) {
    console.error('Erro análise motorista:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/antifraude/todos
 * Lista todos os motoristas com alertas
 */
router.get('/antifraude/todos', async (req, res) => {
  try {
    const empresaId = req.query.empresa_id || null;
    const analises = await antiFraude.analisarTodos(empresaId);
    
    res.json({ success: true, data: analises });
  } catch (error) {
    console.error('Erro listar anti-fraude:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/antifraude/alertas
 * Lista alertas recentes
 */
router.get('/antifraude/alertas', async (req, res) => {
  try {
    const result = await query(`
      SELECT af.*, m.nome as motorista_nome, m.telefone as motorista_telefone
      FROM alertas_fraude af
      JOIN motoristas m ON af.motorista_id = m.id
      WHERE af.criado_em > NOW() - INTERVAL '7 days'
      ORDER BY af.criado_em DESC
      LIMIT 50
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    // Tabela pode não existir
    res.json({ success: true, data: [] });
  }
});

/**
 * POST /api/admin/antifraude/verificar-todos
 * Força verificação de todos os motoristas
 */
router.post('/antifraude/verificar-todos', async (req, res) => {
  try {
    const empresaId = req.body.empresa_id || null;
    const analises = await antiFraude.analisarTodos(empresaId);
    
    // Contar alertas
    let totalAlertas = 0;
    let criticos = 0;
    
    for (const a of analises) {
      totalAlertas += a.alertas.length;
      criticos += a.alertas.filter(al => al.severidade === 'vermelho' || al.severidade === 'bloquear').length;
    }
    
    res.json({ 
      success: true, 
      message: `Verificação concluída: ${analises.length} motoristas analisados`,
      data: {
        motoristas_analisados: analises.length,
        total_alertas: totalAlertas,
        alertas_criticos: criticos,
      }
    });
  } catch (error) {
    console.error('Erro verificar todos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/antifraude/bloquear/:motorista_id
 * Bloqueia motorista por fraude
 */
router.post('/antifraude/bloquear/:motorista_id', async (req, res) => {
  try {
    const { motivo } = req.body;
    
    await query(`
      UPDATE motoristas 
      SET ativo = false, 
          bloqueado_em = NOW(),
          motivo_bloqueio = $1,
          bloqueado_por = 'anti-fraude'
      WHERE id = $2
    `, [motivo || 'Bloqueado pelo sistema anti-fraude', req.params.motorista_id]);
    
    res.json({ 
      success: true, 
      message: 'Motorista bloqueado por suspeita de fraude'
    });
  } catch (error) {
    console.error('Erro bloquear motorista:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// NOTIFICAÇÕES DA REBECA
// ========================================

/**
 * POST /api/admin/notificacao/teste
 * Envia notificação de teste via WhatsApp
 */
router.post('/notificacao/teste', async (req, res) => {
  try {
    const { telefone, mensagem } = req.body;
    
    if (!telefone) {
      return res.status(400).json({ success: false, error: 'Telefone obrigatório' });
    }
    
    // Tentar enviar via Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'rebeca';
    
    if (evolutionUrl && evolutionKey) {
      const response = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionKey
        },
        body: JSON.stringify({
          number: telefone,
          text: mensagem
        })
      });
      
      if (response.ok) {
        // Registrar no banco
        await query(`
          INSERT INTO mensagens (telefone, tipo, conteudo, direcao)
          VALUES ($1, 'texto', $2, 'saida')
        `, [telefone, mensagem]);
        
        return res.json({ success: true, message: 'Mensagem enviada com sucesso' });
      }
    }
    
    // Se Evolution API não disponível
    res.status(503).json({ success: false, error: 'WhatsApp não configurado' });
  } catch (error) {
    console.error('Erro enviar notificação teste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/notificacao/enviar
 * Envia notificação para o ADM
 */
router.post('/notificacao/enviar', async (req, res) => {
  try {
    const { tipo, titulo, mensagem } = req.body;
    
    // Buscar telefone do ADM
    let telefoneADM = null;
    
    const configResult = await query(`
      SELECT valor FROM configuracoes WHERE chave = 'telefone_adm'
    `);
    
    if (configResult.rows[0]) {
      telefoneADM = configResult.rows[0].valor;
    }
    
    if (!telefoneADM) {
      return res.status(400).json({ success: false, error: 'Telefone do ADM não configurado' });
    }
    
    // Montar mensagem formatada
    let mensagemFinal = '';
    switch (tipo) {
      case 'atraso':
        mensagemFinal = `⏰ *ALERTA DE ATRASO*\n\n${mensagem}`;
        break;
      case 'antifraude':
        mensagemFinal = `🚨 *ALERTA ANTI-FRAUDE*\n\n${mensagem}`;
        break;
      case 'cancelamento':
        mensagemFinal = `❌ *CANCELAMENTO*\n\n${mensagem}`;
        break;
      case 'relatorio':
        mensagemFinal = `📊 *RELATÓRIO DIÁRIO*\n\n${mensagem}`;
        break;
      default:
        mensagemFinal = `📢 *${titulo || 'NOTIFICAÇÃO'}*\n\n${mensagem}`;
    }
    
    mensagemFinal += '\n\n_Rebeca - UBMAX_';
    
    // Tentar enviar
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'rebeca';
    
    if (evolutionUrl && evolutionKey) {
      await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionKey
        },
        body: JSON.stringify({
          number: telefoneADM,
          text: mensagemFinal
        })
      });
    }
    
    res.json({ success: true, message: 'Notificação enviada' });
  } catch (error) {
    console.error('Erro enviar notificação:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/relatorio/diario
 * Gera e opcionalmente envia relatório diário
 */
router.get('/relatorio/diario', async (req, res) => {
  try {
    const enviar = req.query.enviar === 'true';
    
    // Buscar dados do dia
    const hoje = new Date().toISOString().split('T')[0];
    
    const corridasResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'finalizada' THEN 1 END) as finalizadas,
        COUNT(CASE WHEN status = 'cancelada' OR status = 'cancelada_atraso' THEN 1 END) as canceladas,
        COALESCE(SUM(CASE WHEN status = 'finalizada' THEN valor ELSE 0 END), 0) as faturamento
      FROM corridas
      WHERE DATE(solicitado_em) = $1
    `, [hoje]);
    
    const motoristasResult = await query(`
      SELECT COUNT(*) as total FROM motoristas WHERE ativo = true
    `);
    
    const alertasResult = await query(`
      SELECT COUNT(*) as total FROM alertas_fraude 
      WHERE DATE(criado_em) = $1 AND severidade IN ('vermelho', 'bloquear')
    `, [hoje]);
    
    const dados = corridasResult.rows[0];
    const totalMotoristas = motoristasResult.rows[0]?.total || 0;
    const alertasCriticos = alertasResult.rows[0]?.total || 0;
    
    // Montar relatório
    const relatorio = {
      data: hoje,
      corridas: {
        total: parseInt(dados.total),
        finalizadas: parseInt(dados.finalizadas),
        canceladas: parseInt(dados.canceladas),
        taxa_sucesso: dados.total > 0 ? ((dados.finalizadas / dados.total) * 100).toFixed(1) : 0
      },
      faturamento: parseFloat(dados.faturamento).toFixed(2),
      motoristas_ativos: parseInt(totalMotoristas),
      alertas_criticos: parseInt(alertasCriticos)
    };
    
    // Gerar mensagem
    const mensagem = `📊 *RELATÓRIO DO DIA ${hoje}*

🚗 *Corridas:*
   Total: ${relatorio.corridas.total}
   Finalizadas: ${relatorio.corridas.finalizadas}
   Canceladas: ${relatorio.corridas.canceladas}
   Taxa de sucesso: ${relatorio.corridas.taxa_sucesso}%

💰 *Faturamento:* R$ ${relatorio.faturamento}

👥 *Motoristas ativos:* ${relatorio.motoristas_ativos}

🚨 *Alertas críticos:* ${relatorio.alertas_criticos}

_Relatório automático - Rebeca_`;
    
    // Enviar se solicitado
    if (enviar) {
      await fetch(`http://localhost:${process.env.PORT || 3000}/api/admin/notificacao/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'relatorio', mensagem })
      });
    }
    
    res.json({ 
      success: true, 
      data: relatorio,
      mensagem: mensagem,
      enviado: enviar
    });
  } catch (error) {
    console.error('Erro gerar relatório:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CONFIGURAÇÕES DE NOTIFICAÇÃO REBECA
// ========================================

/**
 * POST /api/admin/configuracoes/notificacoes
 * Salva configurações de notificação do ADM
 */
router.post('/configuracoes/notificacoes', async (req, res) => {
  try {
    const { telefone_adm, email_adm, notificacoes, frequencia_relatorio } = req.body;
    
    // Salvar telefone do ADM
    await query(`
      INSERT INTO configuracoes (chave, valor, atualizado_em)
      VALUES ('telefone_adm', $1, NOW())
      ON CONFLICT (chave) DO UPDATE SET valor = $1, atualizado_em = NOW()
    `, [telefone_adm]);
    
    // Salvar email
    if (email_adm) {
      await query(`
        INSERT INTO configuracoes (chave, valor, atualizado_em)
        VALUES ('email_adm', $1, NOW())
        ON CONFLICT (chave) DO UPDATE SET valor = $1, atualizado_em = NOW()
      `, [email_adm]);
    }
    
    // Salvar preferências de notificação
    await query(`
      INSERT INTO configuracoes (chave, valor, atualizado_em)
      VALUES ('notificacoes_config', $1, NOW())
      ON CONFLICT (chave) DO UPDATE SET valor = $1, atualizado_em = NOW()
    `, [JSON.stringify({ notificacoes, frequencia_relatorio })]);
    
    console.log(`📱 Configuração de notificação salva: ${telefone_adm}`);
    
    res.json({ 
      success: true, 
      message: 'Configurações de notificação salvas',
      telefone: telefone_adm
    });
  } catch (error) {
    console.error('Erro salvar config notificações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/configuracoes/notificacoes
 * Retorna configurações de notificação
 */
router.get('/configuracoes/notificacoes', async (req, res) => {
  try {
    const telefoneResult = await query(`SELECT valor FROM configuracoes WHERE chave = 'telefone_adm'`);
    const emailResult = await query(`SELECT valor FROM configuracoes WHERE chave = 'email_adm'`);
    const configResult = await query(`SELECT valor FROM configuracoes WHERE chave = 'notificacoes_config'`);
    
    const config = configResult.rows[0]?.valor ? JSON.parse(configResult.rows[0].valor) : {};
    
    res.json({
      success: true,
      data: {
        telefone_adm: telefoneResult.rows[0]?.valor || '',
        email_adm: emailResult.rows[0]?.valor || '',
        ...config
      }
    });
  } catch (error) {
    console.error('Erro buscar config notificações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/notificacoes/teste
 * Envia mensagem de teste para o ADM
 */
router.post('/notificacoes/teste', async (req, res) => {
  try {
    const { telefone, mensagem } = req.body;
    
    // Tentar enviar via WhatsApp (Evolution API)
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE || 'rebeca';
    
    if (evolutionUrl && evolutionKey) {
      const response = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionKey
        },
        body: JSON.stringify({
          number: telefone,
          text: mensagem
        })
      });
      
      if (response.ok) {
        console.log(`✅ Mensagem de teste enviada para ${telefone}`);
        res.json({ success: true, message: 'Mensagem enviada com sucesso' });
        return;
      }
    }
    
    // Se não conseguiu enviar, retorna erro para o frontend abrir WhatsApp Web
    res.status(503).json({ 
      success: false, 
      error: 'WhatsApp não configurado. Use o link direto.' 
    });
  } catch (error) {
    console.error('Erro enviar teste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/notificacoes/enviar
 * Endpoint para Rebeca enviar notificações ao ADM
 */
router.post('/notificacoes/enviar', async (req, res) => {
  try {
    const { tipo, titulo, mensagem, dados } = req.body;
    
    // Buscar telefone do ADM
    const telefoneResult = await query(`SELECT valor FROM configuracoes WHERE chave = 'telefone_adm'`);
    const telefone = telefoneResult.rows[0]?.valor;
    
    if (!telefone) {
      return res.status(400).json({ success: false, error: 'Telefone do ADM não configurado' });
    }
    
    // Buscar preferências
    const configResult = await query(`SELECT valor FROM configuracoes WHERE chave = 'notificacoes_config'`);
    const config = configResult.rows[0]?.valor ? JSON.parse(configResult.rows[0].valor) : { notificacoes: {} };
    
    // Verificar se esse tipo de notificação está habilitado
    if (config.notificacoes && config.notificacoes[tipo] === false) {
      return res.json({ success: true, message: 'Notificação desabilitada pelo usuário', enviada: false });
    }
    
    // Tentar enviar via WhatsApp
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE || 'rebeca';
    
    if (evolutionUrl && evolutionKey) {
      const msgCompleta = titulo ? `${titulo}\n\n${mensagem}` : mensagem;
      
      await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionKey
        },
        body: JSON.stringify({
          number: telefone,
          text: msgCompleta
        })
      });
      
      console.log(`📢 Notificação [${tipo}] enviada para ADM`);
    }
    
    res.json({ success: true, message: 'Notificação enviada', enviada: true, telefone });
  } catch (error) {
    console.error('Erro enviar notificação:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// MOTORISTAS COM MENSALIDADE
// ========================================

/**
 * POST /api/admin/motoristas
 * Cadastrar novo motorista com mensalidade e gerar token de acesso
 */
router.post('/motoristas', async (req, res) => {
  try {
    const { 
      nome, telefone, cpf, veiculo, cor, placa, ano,
      valorMensalidade, diaVencimento, comissao, status
    } = req.body;
    
    // Gerar token único de primeiro acesso
    const token = 'MOT-' + Date.now().toString(36).toUpperCase() + '-' + 
                  Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Inserir motorista
    const result = await query(`
      INSERT INTO motoristas (
        nome, telefone, cpf, veiculo, cor, placa, ano,
        token_acesso, primeiro_acesso, ativo, comissao,
        valor_mensalidade, dia_vencimento, criado_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, $12, NOW())
      RETURNING *
    `, [
      nome, telefone, cpf || null, veiculo, cor, placa, ano || null,
      token, status === 'ativo', comissao || 15, valorMensalidade || 150, diaVencimento || 10
    ]);
    
    const motorista = result.rows[0];
    
    // Gerar primeira mensalidade
    const hoje = new Date();
    let vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento || 10);
    if (vencimento < hoje) {
      vencimento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento || 10);
    }
    
    await query(`
      INSERT INTO mensalidades (
        motorista_id, valor, vencimento, mes_referencia, status, criado_em
      ) VALUES ($1, $2, $3, $4, 'pendente', NOW())
    `, [
      motorista.id,
      valorMensalidade || 150,
      vencimento.toISOString().split('T')[0],
      vencimento.toISOString().substring(0, 7)
    ]);
    
    // Gerar link de acesso
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const linkAcesso = `${baseUrl}/motorista/primeiro-acesso?token=${token}`;
    
    console.log(`✅ Motorista ${nome} cadastrado com token: ${token}`);
    
    res.json({ 
      success: true, 
      data: motorista,
      token: token,
      linkAcesso: linkAcesso
    });
  } catch (error) {
    console.error('Erro cadastrar motorista:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/motoristas/:id/mensalidades
 * Listar mensalidades de um motorista
 */
router.get('/motoristas/:id/mensalidades', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM mensalidades
      WHERE motorista_id = $1
      ORDER BY vencimento DESC
    `, [req.params.id]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/mensalidades/gerar
 * Gerar mensalidades do mês para todos os motoristas
 */
router.post('/mensalidades/gerar', async (req, res) => {
  try {
    const { mesReferencia } = req.body;
    const mes = mesReferencia || new Date().toISOString().substring(0, 7);
    
    // Buscar motoristas ativos
    const motoristas = await query(`
      SELECT id, nome, valor_mensalidade, dia_vencimento 
      FROM motoristas WHERE ativo = true
    `);
    
    let geradas = 0;
    
    for (const mot of motoristas.rows) {
      // Verificar se já existe
      const existe = await query(`
        SELECT id FROM mensalidades 
        WHERE motorista_id = $1 AND mes_referencia = $2
      `, [mot.id, mes]);
      
      if (existe.rows.length === 0) {
        const [ano, mesNum] = mes.split('-');
        const vencimento = new Date(parseInt(ano), parseInt(mesNum) - 1, mot.dia_vencimento || 10);
        
        await query(`
          INSERT INTO mensalidades (motorista_id, valor, vencimento, mes_referencia, status)
          VALUES ($1, $2, $3, $4, 'pendente')
        `, [mot.id, mot.valor_mensalidade || 150, vencimento.toISOString().split('T')[0], mes]);
        
        geradas++;
      }
    }
    
    res.json({ 
      success: true, 
      message: `${geradas} mensalidades geradas para ${mes}`,
      geradas: geradas
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/mensalidades/:id/pagar
 * Registrar pagamento de mensalidade
 */
router.put('/mensalidades/:id/pagar', async (req, res) => {
  try {
    const { observacao } = req.body;
    
    const result = await query(`
      UPDATE mensalidades 
      SET status = 'pago', pago_em = NOW(), observacao = $1
      WHERE id = $2
      RETURNING *
    `, [observacao || null, req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Mensalidade não encontrada' });
    }
    
    // Desbloquear motorista se estava bloqueado por inadimplência
    await query(`
      UPDATE motoristas 
      SET ativo = true, bloqueado_por = NULL
      WHERE id = $1 AND bloqueado_por = 'inadimplencia'
    `, [result.rows[0].motorista_id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/mensalidades/resumo
 * Resumo de mensalidades
 */
router.get('/mensalidades/resumo', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pago') as pagas,
        COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
        COUNT(*) FILTER (WHERE status = 'atrasado') as atrasadas,
        COALESCE(SUM(valor) FILTER (WHERE status != 'pago'), 0) as total_a_receber
      FROM mensalidades
      WHERE mes_referencia = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: true, data: { pagas: 0, pendentes: 0, atrasadas: 0, total_a_receber: 0 } });
  }
});

/**
 * POST /api/admin/mensalidades/bloquear-inadimplentes
 * Bloquear motoristas com mensalidades atrasadas
 */
router.post('/mensalidades/bloquear-inadimplentes', async (req, res) => {
  try {
    const diasAtraso = req.body.diasAtraso || 5;
    
    // Atualizar status de atrasados
    await query(`
      UPDATE mensalidades SET status = 'atrasado'
      WHERE status = 'pendente' AND vencimento < CURRENT_DATE
    `);
    
    // Bloquear motoristas com atraso maior que X dias
    const result = await query(`
      UPDATE motoristas m SET 
        ativo = false,
        bloqueado_por = 'inadimplencia',
        bloqueado_em = NOW()
      FROM mensalidades me
      WHERE m.id = me.motorista_id
        AND me.status = 'atrasado'
        AND me.vencimento < CURRENT_DATE - $1
        AND m.ativo = true
      RETURNING m.id, m.nome
    `, [diasAtraso]);
    
    res.json({ 
      success: true, 
      message: `${result.rows.length} motoristas bloqueados por inadimplência`,
      bloqueados: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/motoristas/:id/reenviar-acesso
 * Reenviar link de primeiro acesso
 */
router.post('/motoristas/:id/reenviar-acesso', async (req, res) => {
  try {
    // Gerar novo token
    const token = 'MOT-' + Date.now().toString(36).toUpperCase() + '-' + 
                  Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const result = await query(`
      UPDATE motoristas 
      SET token_acesso = $1, primeiro_acesso = true
      WHERE id = $2
      RETURNING nome, telefone
    `, [token, req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Motorista não encontrado' });
    }
    
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const linkAcesso = `${baseUrl}/motorista/primeiro-acesso?token=${token}`;
    
    res.json({ 
      success: true, 
      token: token,
      linkAcesso: linkAcesso,
      motorista: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// VALORES POR HORÁRIO
// ========================================

/**
 * GET /api/admin/valores-horario
 * Listar valores por horário
 */
router.get('/valores-horario', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    
    const result = await query(`
      SELECT * FROM valores_horario 
      WHERE empresa_id = $1 
      ORDER BY dia_semana, horario_inicio
    `, [empresa_id]);
    
    res.json({ success: true, valores: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/valores-horario
 * Criar/atualizar valor por horário
 */
router.post('/valores-horario', async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id || req.headers['x-empresa-id'] || 1;
    const { dia_semana, horario_inicio, horario_fim, valor_base, valor_km_adicional, km_incluso } = req.body;
    
    // Verificar se já existe
    const existe = await query(`
      SELECT id FROM valores_horario 
      WHERE empresa_id = $1 AND dia_semana = $2 AND horario_inicio = $3
    `, [empresa_id, dia_semana, horario_inicio]);
    
    let result;
    if (existe.rows.length > 0) {
      // Atualizar
      result = await query(`
        UPDATE valores_horario SET
          horario_fim = $1, valor_base = $2, valor_km_adicional = $3, km_incluso = $4
        WHERE id = $5
        RETURNING *
      `, [horario_fim, valor_base, valor_km_adicional || 2.50, km_incluso || 5, existe.rows[0].id]);
    } else {
      // Inserir
      result = await query(`
        INSERT INTO valores_horario (empresa_id, dia_semana, horario_inicio, horario_fim, valor_base, valor_km_adicional, km_incluso)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [empresa_id, dia_semana, horario_inicio, horario_fim, valor_base, valor_km_adicional || 2.50, km_incluso || 5]);
    }
    
    res.json({ success: true, valor: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/valores-horario/:id
 * Excluir valor por horário
 */
router.delete('/valores-horario/:id', async (req, res) => {
  try {
    await query('DELETE FROM valores_horario WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/valores-horario/lote
 * Salvar múltiplos valores de uma vez
 */
router.post('/valores-horario/lote', async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id || req.headers['x-empresa-id'] || 1;
    const { valores } = req.body;
    
    // Limpar valores antigos
    await query('DELETE FROM valores_horario WHERE empresa_id = $1', [empresa_id]);
    
    // Inserir novos
    for (const v of valores) {
      await query(`
        INSERT INTO valores_horario (empresa_id, dia_semana, horario_inicio, horario_fim, valor_base, valor_km_adicional, km_incluso)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [empresa_id, v.dia_semana, v.horario_inicio, v.horario_fim, v.valor_base, v.valor_km_adicional || 2.50, v.km_incluso || 5]);
    }
    
    res.json({ success: true, total: valores.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// VALORES POR CIDADE/VIAGEM
// ========================================

/**
 * GET /api/admin/valores-cidade
 * Listar valores por cidade
 */
router.get('/valores-cidade', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    
    const result = await query(`
      SELECT * FROM valores_cidade 
      WHERE empresa_id = $1 AND ativo = true
      ORDER BY cidade_destino
    `, [empresa_id]);
    
    res.json({ success: true, cidades: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/valores-cidade
 * Criar/atualizar valor por cidade
 */
router.post('/valores-cidade', async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id || req.headers['x-empresa-id'] || 1;
    const { cidade_destino, distancia_km, valor_fixo, tempo_estimado_min } = req.body;
    
    const result = await query(`
      INSERT INTO valores_cidade (empresa_id, cidade_destino, distancia_km, valor_fixo, tempo_estimado_min)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (empresa_id, cidade_destino) DO UPDATE SET
        distancia_km = EXCLUDED.distancia_km,
        valor_fixo = EXCLUDED.valor_fixo,
        tempo_estimado_min = EXCLUDED.tempo_estimado_min
      RETURNING *
    `, [empresa_id, cidade_destino, distancia_km, valor_fixo, tempo_estimado_min]);
    
    res.json({ success: true, cidade: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/valores-cidade/:id
 * Excluir valor por cidade
 */
router.delete('/valores-cidade/:id', async (req, res) => {
  try {
    await query('DELETE FROM valores_cidade WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CONTATOS SUPORTE/EMERGÊNCIA
// ========================================

/**
 * GET /api/admin/contatos-suporte
 * Listar contatos de suporte
 */
router.get('/contatos-suporte', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    
    const result = await query(`
      SELECT * FROM contatos_suporte 
      WHERE empresa_id = $1 AND ativo = true
      ORDER BY ordem, tipo
    `, [empresa_id]);
    
    res.json({ success: true, contatos: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/contatos-suporte
 * Criar/atualizar contato de suporte
 */
router.post('/contatos-suporte', async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id || req.headers['x-empresa-id'] || 1;
    const { id, tipo, nome, telefone, descricao, ordem } = req.body;
    
    let result;
    if (id) {
      result = await query(`
        UPDATE contatos_suporte SET
          tipo = $1, nome = $2, telefone = $3, descricao = $4, ordem = $5
        WHERE id = $6
        RETURNING *
      `, [tipo, nome, telefone, descricao, ordem || 0, id]);
    } else {
      result = await query(`
        INSERT INTO contatos_suporte (empresa_id, tipo, nome, telefone, descricao, ordem)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [empresa_id, tipo, nome, telefone, descricao, ordem || 0]);
    }
    
    res.json({ success: true, contato: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/contatos-suporte/:id
 * Excluir contato de suporte
 */
router.delete('/contatos-suporte/:id', async (req, res) => {
  try {
    await query('DELETE FROM contatos_suporte WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CONFIGURAÇÕES REBECA (IA)
// ========================================

/**
 * GET /api/admin/config-rebeca
 * Buscar configurações da Rebeca
 */
router.get('/config-rebeca', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    
    let result = await query(`
      SELECT * FROM config_rebeca WHERE empresa_id = $1
    `, [empresa_id]);
    
    // Se não existe, criar com valores padrão
    if (result.rows.length === 0) {
      result = await query(`
        INSERT INTO config_rebeca (empresa_id) VALUES ($1) RETURNING *
      `, [empresa_id]);
    }
    
    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/config-rebeca
 * Atualizar configurações da Rebeca
 */
router.put('/config-rebeca', async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id || req.headers['x-empresa-id'] || 1;
    const {
      permitir_sem_destino,
      msg_sem_destino,
      msg_todos_ocupados,
      msg_corrida_finalizada,
      tempo_espera_destino_seg,
      tempo_espera_resposta_seg,
      prioridade_geolocalizacao,
      prioridade_avaliacao,
      prioridade_antifraude,
      prioridade_experiencia,
      raio_busca_km
    } = req.body;
    
    const result = await query(`
      INSERT INTO config_rebeca (
        empresa_id, permitir_sem_destino, msg_sem_destino, msg_todos_ocupados, 
        msg_corrida_finalizada, tempo_espera_destino_seg, tempo_espera_resposta_seg,
        prioridade_geolocalizacao, prioridade_avaliacao, prioridade_antifraude,
        prioridade_experiencia, raio_busca_km
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (empresa_id) DO UPDATE SET
        permitir_sem_destino = EXCLUDED.permitir_sem_destino,
        msg_sem_destino = EXCLUDED.msg_sem_destino,
        msg_todos_ocupados = EXCLUDED.msg_todos_ocupados,
        msg_corrida_finalizada = EXCLUDED.msg_corrida_finalizada,
        tempo_espera_destino_seg = EXCLUDED.tempo_espera_destino_seg,
        tempo_espera_resposta_seg = EXCLUDED.tempo_espera_resposta_seg,
        prioridade_geolocalizacao = EXCLUDED.prioridade_geolocalizacao,
        prioridade_avaliacao = EXCLUDED.prioridade_avaliacao,
        prioridade_antifraude = EXCLUDED.prioridade_antifraude,
        prioridade_experiencia = EXCLUDED.prioridade_experiencia,
        raio_busca_km = EXCLUDED.raio_busca_km,
        atualizado_em = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      empresa_id, permitir_sem_destino, msg_sem_destino, msg_todos_ocupados,
      msg_corrida_finalizada, tempo_espera_destino_seg, tempo_espera_resposta_seg,
      prioridade_geolocalizacao, prioridade_avaliacao, prioridade_antifraude,
      prioridade_experiencia, raio_busca_km
    ]);
    
    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CONFIGURAÇÕES DA EMPRESA
// ========================================

/**
 * PUT /api/admin/empresa/config
 * Atualizar configurações da empresa
 */
router.put('/empresa/config', async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id || req.headers['x-empresa-id'] || 1;
    const { telefone_dono, nome_dono, msg_corrida_finalizada } = req.body;
    
    const result = await query(`
      UPDATE empresas SET
        telefone_dono = COALESCE($1, telefone_dono),
        nome_dono = COALESCE($2, nome_dono),
        msg_corrida_finalizada = COALESCE($3, msg_corrida_finalizada),
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [telefone_dono, nome_dono, msg_corrida_finalizada, empresa_id]);
    
    res.json({ success: true, empresa: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/empresa/config
 * Buscar configurações da empresa
 */
router.get('/empresa/config', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    
    const result = await query(`
      SELECT id, nome, telefone_adm, telefone_dono, nome_dono, msg_corrida_finalizada,
             cidade, white_label, nome_exibido
      FROM empresas WHERE id = $1
    `, [empresa_id]);
    
    res.json({ success: true, empresa: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/motoristas/:id/fora-cidade
 * Marcar motorista como fora da cidade
 */
router.put('/motoristas/:id/fora-cidade', async (req, res) => {
  try {
    const { fora_cidade } = req.body;
    
    const result = await query(`
      UPDATE motoristas SET fora_cidade = $1, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [fora_cidade, req.params.id]);
    
    res.json({ success: true, motorista: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/motoristas/proximos
 * Buscar motoristas mais próximos com algoritmo melhorado
 */
router.get('/motoristas/proximos', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    const { lat, lng, raio_km } = req.query;
    
    // Buscar config da Rebeca
    const configResult = await query(`
      SELECT * FROM config_rebeca WHERE empresa_id = $1
    `, [empresa_id]);
    
    const config = configResult.rows[0] || {};
    const raio = raio_km || config.raio_busca_km || 10;
    
    // Buscar motoristas usando algoritmo melhorado
    // 1. Disponíveis
    // 2. Não em corrida (verifica última corrida finalizada)
    // 3. Sem alertas antifraude graves
    // 4. Ordenados por: distância, avaliação, experiência
    const result = await query(`
      SELECT m.*,
        CASE WHEN m.latitude IS NOT NULL AND m.longitude IS NOT NULL THEN
          (6371 * acos(cos(radians($2)) * cos(radians(m.latitude)) * 
           cos(radians(m.longitude) - radians($3)) + sin(radians($2)) * 
           sin(radians(m.latitude))))
        ELSE 999 END as distancia_km,
        COALESCE(m.nota_media, 5) as avaliacao,
        COALESCE(m.total_corridas, 0) as experiencia,
        CASE WHEN af.severidade = 'alta' THEN 1 ELSE 0 END as tem_alerta_grave
      FROM motoristas m
      LEFT JOIN alertas_fraude af ON af.motorista_id = m.id AND af.resolvido = false
      WHERE m.empresa_id = $1
        AND m.ativo = true
        AND m.disponivel = true
        AND m.status = 'online'
        AND COALESCE(m.fora_cidade, false) = false
        AND COALESCE(m.em_manutencao, false) = false
        AND (m.status != 'em_corrida' OR m.status IS NULL)
      ORDER BY 
        tem_alerta_grave ASC,
        distancia_km ASC,
        avaliacao DESC,
        experiencia DESC
      LIMIT 10
    `, [empresa_id, lat || 0, lng || 0]);
    
    // Filtrar por raio
    const motoristas = result.rows.filter(m => m.distancia_km <= raio);
    
    res.json({ success: true, motoristas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/motoristas/proximo-disponivel
 * Estimar quando o próximo motorista estará disponível
 */
router.get('/motoristas/proximo-disponivel', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    
    // Buscar corridas em andamento e tempo estimado de término
    const result = await query(`
      SELECT m.nome, c.tempo_estimado, c.aceito_em,
        EXTRACT(EPOCH FROM (NOW() - c.aceito_em))/60 as minutos_decorridos
      FROM corridas c
      JOIN motoristas m ON m.id = c.motorista_id
      WHERE c.empresa_id = $1
        AND c.status IN ('aceita', 'em_andamento')
        AND c.tempo_estimado IS NOT NULL
      ORDER BY (c.tempo_estimado - EXTRACT(EPOCH FROM (NOW() - c.aceito_em))/60) ASC
      LIMIT 1
    `, [empresa_id]);
    
    if (result.rows.length === 0) {
      res.json({ success: true, proximo: null, mensagem: 'Nenhum motorista em corrida' });
    } else {
      const corrida = result.rows[0];
      const minutosRestantes = Math.max(0, Math.round(corrida.tempo_estimado - corrida.minutos_decorridos));
      
      res.json({ 
        success: true, 
        proximo: {
          motorista: corrida.nome,
          minutos_restantes: minutosRestantes
        },
        mensagem: `${corrida.nome} estará disponível em aproximadamente ${minutosRestantes} minutos`
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/calcular-valor
 * Calcular valor da corrida baseado em horário e dia
 */
router.get('/calcular-valor', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    const { distancia_km, cidade_destino } = req.query;
    
    // 1. Verificar se é cidade com valor fixo
    if (cidade_destino) {
      const cidadeResult = await query(`
        SELECT * FROM valores_cidade 
        WHERE empresa_id = $1 AND LOWER(cidade_destino) = LOWER($2) AND ativo = true
      `, [empresa_id, cidade_destino]);
      
      if (cidadeResult.rows.length > 0) {
        return res.json({ 
          success: true, 
          valor: cidadeResult.rows[0].valor_fixo,
          tipo: 'cidade_fixa',
          detalhes: cidadeResult.rows[0]
        });
      }
    }
    
    // 2. Calcular baseado em horário
    const agora = new Date();
    const diaSemana = agora.getDay(); // 0=domingo, 6=sábado
    const hora = agora.toTimeString().substring(0, 5); // HH:MM
    
    let tipoDia;
    if (diaSemana === 0) tipoDia = 'domingo';
    else if (diaSemana === 6) tipoDia = 'sabado';
    else tipoDia = 'segunda_sexta';
    
    const valorResult = await query(`
      SELECT * FROM valores_horario
      WHERE empresa_id = $1 
        AND dia_semana = $2
        AND horario_inicio <= $3::time
        AND horario_fim > $3::time
        AND ativo = true
      ORDER BY horario_inicio DESC
      LIMIT 1
    `, [empresa_id, tipoDia, hora]);
    
    if (valorResult.rows.length > 0) {
      const config = valorResult.rows[0];
      const kmExcedente = Math.max(0, (distancia_km || 0) - config.km_incluso);
      const valorTotal = parseFloat(config.valor_base) + (kmExcedente * parseFloat(config.valor_km_adicional));
      
      return res.json({
        success: true,
        valor: valorTotal.toFixed(2),
        tipo: 'horario',
        detalhes: {
          dia: tipoDia,
          hora: hora,
          valor_base: config.valor_base,
          km_incluso: config.km_incluso,
          km_excedente: kmExcedente,
          valor_km_adicional: config.valor_km_adicional
        }
      });
    }
    
    // 3. Valor padrão se não encontrar configuração
    const configPadrao = await query(`
      SELECT valor FROM configuracoes WHERE chave = 'valor_corrida'
    `);
    
    const valorPadrao = configPadrao.rows[0]?.valor || 13;
    
    res.json({
      success: true,
      valor: valorPadrao,
      tipo: 'padrao'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CORRIDAS AGENDADAS
// ========================================

/**
 * GET /api/admin/corridas-agendadas
 * Listar corridas agendadas
 */
router.get('/corridas-agendadas', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    const { data, status } = req.query;
    
    let sql = `
      SELECT ca.*, c.nome as cliente_nome
      FROM corridas_agendadas ca
      LEFT JOIN clientes c ON c.id = ca.cliente_id
      WHERE ca.empresa_id = $1
    `;
    const params = [empresa_id];
    
    if (data) {
      sql += ` AND ca.data_agendada = $${params.length + 1}`;
      params.push(data);
    }
    
    if (status) {
      sql += ` AND ca.status = $${params.length + 1}`;
      params.push(status);
    }
    
    sql += ` ORDER BY ca.data_agendada, ca.hora_agendada`;
    
    const result = await query(sql, params);
    res.json({ success: true, agendamentos: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/corridas-agendadas
 * Criar corrida agendada
 */
router.post('/corridas-agendadas', async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id || req.headers['x-empresa-id'] || 1;
    const {
      telefone_cliente, nome_cliente, origem_endereco, origem_lat, origem_lng,
      destino_endereco, destino_lat, destino_lng, data_agendada, hora_agendada,
      observacoes, motorista_preferido_id
    } = req.body;
    
    const result = await query(`
      INSERT INTO corridas_agendadas (
        empresa_id, telefone_cliente, nome_cliente, origem_endereco, origem_lat, origem_lng,
        destino_endereco, destino_lat, destino_lng, data_agendada, hora_agendada,
        observacoes, motorista_preferido_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      empresa_id, telefone_cliente, nome_cliente, origem_endereco, origem_lat, origem_lng,
      destino_endereco, destino_lat, destino_lng, data_agendada, hora_agendada,
      observacoes, motorista_preferido_id
    ]);
    
    res.json({ success: true, agendamento: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/corridas-agendadas/:id/cancelar
 * Cancelar corrida agendada
 */
router.put('/corridas-agendadas/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE corridas_agendadas SET status = 'cancelada'
      WHERE id = $1 RETURNING *
    `, [id]);
    
    res.json({ success: true, agendamento: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/corridas-agendadas/:id
 * Excluir corrida agendada
 */
router.delete('/corridas-agendadas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM corridas_agendadas WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// RANKING DE MOTORISTAS
// ========================================

/**
 * GET /api/admin/ranking
 * Buscar ranking de motoristas
 */
router.get('/ranking', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    const { mes } = req.query;
    
    // Calcular ranking atual
    const result = await query(`
      SELECT 
        m.id, m.nome, m.telefone, m.veiculo_modelo, m.veiculo_cor,
        m.total_corridas, m.nota_media, m.pontos_ranking,
        COALESCE(m.nota_media, 5) * 10 + COALESCE(m.total_corridas, 0) as score
      FROM motoristas m
      WHERE m.empresa_id = $1 AND m.ativo = true
      ORDER BY score DESC, m.nota_media DESC, m.total_corridas DESC
    `, [empresa_id]);
    
    // Adicionar posição
    const ranking = result.rows.map((m, i) => ({
      ...m,
      posicao: i + 1
    }));
    
    res.json({ success: true, ranking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/ranking/atualizar-pontos
 * Atualizar pontos do ranking de um motorista
 */
router.post('/ranking/atualizar-pontos', async (req, res) => {
  try {
    const { motorista_id, pontos, motivo } = req.body;
    
    const result = await query(`
      UPDATE motoristas SET 
        pontos_ranking = pontos_ranking + $1,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, nome, pontos_ranking
    `, [pontos, motorista_id]);
    
    res.json({ success: true, motorista: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CHAT SUPORTE (ADM ↔ MOTORISTA)
// ========================================

/**
 * GET /api/admin/mensagens-suporte
 * Listar mensagens de suporte
 */
router.get('/mensagens-suporte', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    const { lida, motorista_id } = req.query;
    
    let sql = `
      SELECT ms.*, m.nome as motorista_nome, m.telefone as motorista_telefone
      FROM mensagens_suporte ms
      LEFT JOIN motoristas m ON m.id = ms.motorista_id
      WHERE ms.empresa_id = $1
    `;
    const params = [empresa_id];
    
    if (lida !== undefined) {
      sql += ` AND ms.lida = $${params.length + 1}`;
      params.push(lida === 'true');
    }
    
    if (motorista_id) {
      sql += ` AND ms.motorista_id = $${params.length + 1}`;
      params.push(motorista_id);
    }
    
    sql += ` ORDER BY ms.criado_em DESC LIMIT 100`;
    
    const result = await query(sql, params);
    
    // Contar não lidas
    const naoLidas = await query(`
      SELECT COUNT(*) as total FROM mensagens_suporte 
      WHERE empresa_id = $1 AND lida = false
    `, [empresa_id]);
    
    res.json({ 
      success: true, 
      mensagens: result.rows,
      nao_lidas: parseInt(naoLidas.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/mensagens-suporte/responder/:id
 * Responder mensagem de suporte
 */
router.post('/mensagens-suporte/responder/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { resposta } = req.body;
    
    const result = await query(`
      UPDATE mensagens_suporte SET 
        lida = true, respondida = true, resposta = $1, respondido_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [resposta, id]);
    
    res.json({ success: true, mensagem: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/mensagens-suporte/:id/lida
 * Marcar mensagem como lida
 */
router.put('/mensagens-suporte/:id/lida', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE mensagens_suporte SET lida = true WHERE id = $1 RETURNING *
    `, [id]);
    
    res.json({ success: true, mensagem: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// BLOQUEIO AUTOMÁTICO DE INADIMPLENTES
// ========================================

/**
 * GET /api/admin/inadimplentes
 * Listar motoristas inadimplentes
 */
router.get('/inadimplentes', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    
    const result = await query(`
      SELECT m.id, m.nome, m.telefone, m.veiculo_modelo, m.valor_mensalidade,
             m.bloqueado_inadimplencia, m.data_bloqueio_inadimplencia,
             ms.mes_referencia as ultimo_mes_pago, ms.pago_em
      FROM motoristas m
      LEFT JOIN (
        SELECT motorista_id, mes_referencia, pago_em,
               ROW_NUMBER() OVER (PARTITION BY motorista_id ORDER BY pago_em DESC) as rn
        FROM mensalidades WHERE status = 'pago'
      ) ms ON ms.motorista_id = m.id AND ms.rn = 1
      WHERE m.empresa_id = $1 AND m.ativo = true
      ORDER BY m.bloqueado_inadimplencia DESC, m.nome
    `, [empresa_id]);
    
    res.json({ success: true, motoristas: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/inadimplentes/bloquear/:id
 * Bloquear motorista por inadimplência
 */
router.post('/inadimplentes/bloquear/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE motoristas SET 
        bloqueado_inadimplencia = true,
        data_bloqueio_inadimplencia = CURRENT_TIMESTAMP,
        disponivel = false,
        status = 'bloqueado'
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    res.json({ success: true, motorista: result.rows[0], mensagem: 'Motorista bloqueado por inadimplência' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/inadimplentes/desbloquear/:id
 * Desbloquear motorista após pagamento
 */
router.post('/inadimplentes/desbloquear/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE motoristas SET 
        bloqueado_inadimplencia = false,
        data_bloqueio_inadimplencia = NULL,
        status = 'offline'
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    res.json({ success: true, motorista: result.rows[0], mensagem: 'Motorista desbloqueado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/inadimplentes/verificar-automatico
 * Verificar e bloquear inadimplentes automaticamente
 */
router.post('/inadimplentes/verificar-automatico', async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id || req.headers['x-empresa-id'] || 1;
    const { dias_tolerancia = 5 } = req.body;
    
    // Buscar motoristas com mensalidade vencida
    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const inadimplentes = await query(`
      SELECT m.id, m.nome, m.dia_vencimento
      FROM motoristas m
      WHERE m.empresa_id = $1 
        AND m.ativo = true 
        AND m.bloqueado_inadimplencia = false
        AND NOT EXISTS (
          SELECT 1 FROM mensalidades ms 
          WHERE ms.motorista_id = m.id 
          AND ms.mes_referencia = $2 
          AND ms.status = 'pago'
        )
        AND EXTRACT(DAY FROM CURRENT_DATE) > m.dia_vencimento + $3
    `, [empresa_id, mesAtual, dias_tolerancia]);
    
    // Bloquear cada inadimplente
    const bloqueados = [];
    for (const motorista of inadimplentes.rows) {
      await query(`
        UPDATE motoristas SET 
          bloqueado_inadimplencia = true,
          data_bloqueio_inadimplencia = CURRENT_TIMESTAMP,
          disponivel = false,
          status = 'bloqueado'
        WHERE id = $1
      `, [motorista.id]);
      bloqueados.push(motorista);
    }
    
    res.json({ 
      success: true, 
      bloqueados: bloqueados.length,
      motoristas: bloqueados
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// HISTÓRICO DE CORRIDAS (CLIENTE)
// ========================================

/**
 * GET /api/admin/cliente/:telefone/historico
 * Buscar histórico de corridas de um cliente
 */
router.get('/cliente/:telefone/historico', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    const { telefone } = req.params;
    const { limite = 10 } = req.query;
    
    const result = await query(`
      SELECT c.id, c.origem_endereco, c.destino_endereco, c.valor, c.status,
             c.criado_em, m.nome as motorista_nome, m.veiculo_modelo, m.veiculo_cor
      FROM corridas c
      LEFT JOIN motoristas m ON m.id = c.motorista_id
      WHERE c.empresa_id = $1 AND c.telefone_cliente = $2
      ORDER BY c.criado_em DESC
      LIMIT $3
    `, [empresa_id, telefone, limite]);
    
    // Total de corridas
    const total = await query(`
      SELECT COUNT(*) as total, SUM(valor) as valor_total
      FROM corridas 
      WHERE empresa_id = $1 AND telefone_cliente = $2 AND status = 'finalizada'
    `, [empresa_id, telefone]);
    
    res.json({ 
      success: true, 
      corridas: result.rows,
      total_corridas: parseInt(total.rows[0].total) || 0,
      valor_total: parseFloat(total.rows[0].valor_total) || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// ENDPOINTS ADICIONAIS PARA PAINEL REACT
// ========================================

/**
 * GET /api/admin/conversas
 * Lista conversas agrupadas por telefone
 */
router.get('/conversas', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    
    const result = await query(`
      SELECT 
        m.telefone,
        c.nome,
        MAX(m.criado_em) as ultima_atividade,
        (SELECT conteudo FROM mensagens WHERE telefone = m.telefone ORDER BY criado_em DESC LIMIT 1) as ultima_mensagem,
        COUNT(*) FILTER (WHERE m.direcao = 'entrada' AND NOT m.lida) as nao_lidas
      FROM mensagens m
      LEFT JOIN clientes c ON c.telefone = m.telefone
      WHERE c.empresa_id = $1 OR $1 IS NULL
      GROUP BY m.telefone, c.nome
      ORDER BY ultima_atividade DESC
      LIMIT 50
    `, [empresa_id]);
    
    res.json({ success: true, conversas: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/mensagens/:telefone
 * Lista mensagens de um telefone específico
 */
router.get('/mensagens/:telefone', async (req, res) => {
  try {
    const { telefone } = req.params;
    
    const result = await query(`
      SELECT 
        id, telefone, tipo, conteudo, direcao as tipo, criado_em, lida
      FROM mensagens 
      WHERE telefone = $1
      ORDER BY criado_em ASC
      LIMIT 100
    `, [telefone]);
    
    // Mapear tipo para enviada/recebida
    const mensagens = result.rows.map(m => ({
      ...m,
      tipo: m.tipo === 'saida' ? 'enviada' : 'recebida'
    }));
    
    res.json({ success: true, mensagens });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/mensagens/enviar
 * Envia mensagem via WhatsApp
 */
router.post('/mensagens/enviar', async (req, res) => {
  try {
    const { telefone, mensagem } = req.body;
    
    if (!telefone || !mensagem) {
      return res.status(400).json({ success: false, error: 'Telefone e mensagem são obrigatórios' });
    }
    
    // Salvar no banco
    await query(`
      INSERT INTO mensagens (telefone, tipo, conteudo, direcao)
      VALUES ($1, 'texto', $2, 'saida')
    `, [telefone, mensagem]);
    
    // TODO: Enviar via Evolution API quando estiver configurado
    // Por agora, apenas salva no banco
    
    res.json({ success: true, message: 'Mensagem enviada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/alertas
 * Lista alertas do sistema
 */
router.get('/alertas', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const alertas = [];
    
    // Buscar motoristas sem corrida há muito tempo
    const motoristasInativos = await query(`
      SELECT m.nome, 
        EXTRACT(EPOCH FROM (NOW() - COALESCE(
          (SELECT MAX(criado_em) FROM corridas WHERE motorista_id = m.id), 
          m.criado_em
        ))) / 3600 as horas_sem_corrida
      FROM motoristas m
      WHERE m.empresa_id = $1 AND m.status = 'online' AND m.ativo = true
      HAVING EXTRACT(EPOCH FROM (NOW() - COALESCE(
        (SELECT MAX(criado_em) FROM corridas WHERE motorista_id = m.id), 
        m.criado_em
      ))) / 3600 > 2
    `, [empresa_id]);
    
    motoristasInativos.rows.forEach(m => {
      alertas.push({
        id: `inativo-${m.nome}`,
        tipo: 'aviso',
        mensagem: `Motorista ${m.nome} está há ${Math.floor(m.horas_sem_corrida)}h sem corrida`,
        tempo: 'Agora'
      });
    });
    
    // Buscar alertas de antifraude recentes
    const alertasFraude = await query(`
      SELECT m.nome, af.tipo, af.criado_em
      FROM alertas_antifraude af
      JOIN motoristas m ON m.id = af.motorista_id
      WHERE m.empresa_id = $1 AND af.criado_em > NOW() - INTERVAL '24 hours'
      ORDER BY af.criado_em DESC
      LIMIT 5
    `, [empresa_id]);
    
    alertasFraude.rows.forEach(a => {
      alertas.push({
        id: `fraude-${a.tipo}-${a.criado_em}`,
        tipo: 'aviso',
        mensagem: `Alerta de ${a.tipo} para ${a.nome}`,
        tempo: new Date(a.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
    });
    
    res.json({ success: true, alertas });
  } catch (error) {
    res.status(500).json({ success: false, alertas: [] });
  }
});

/**
 * POST /api/admin/corridas/:id/cancelar
 * Cancela uma corrida
 */
router.post('/corridas/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;
    const empresa_id = req.user.empresa_id;
    
    // Verificar se corrida pertence à empresa
    const corrida = await query(`
      SELECT * FROM corridas WHERE id = $1 AND empresa_id = $2
    `, [id, empresa_id]);
    
    if (corrida.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Corrida não encontrada' });
    }
    
    // Atualizar status
    await query(`
      UPDATE corridas SET status = 'cancelada', atualizado_em = NOW()
      WHERE id = $1
    `, [id]);
    
    // Liberar motorista se houver
    if (corrida.rows[0].motorista_id) {
      await query(`
        UPDATE motoristas SET disponivel = true, em_corrida = false
        WHERE id = $1
      `, [corrida.rows[0].motorista_id]);
    }
    
    res.json({ success: true, message: 'Corrida cancelada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// PONTOS DE REFERÊNCIA - APRENDIZADO DA REBECA
// ========================================

/**
 * GET /api/admin/pontos-referencia
 * Lista todos os pontos de referência aprendidos
 */
router.get('/pontos-referencia', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { apenas_confirmados } = req.query;
    
    let sql = `
      SELECT 
        pr.*,
        (SELECT COUNT(*) FROM pontos_referencia_historico WHERE ponto_id = pr.id) as total_historico
      FROM pontos_referencia pr
      WHERE pr.empresa_id = $1
    `;
    
    if (apenas_confirmados === 'true') {
      sql += ` AND pr.confirmado = true`;
    }
    
    sql += ` ORDER BY pr.vezes_usado DESC, pr.nome`;
    
    const result = await query(sql, [empresa_id]);
    
    // Estatísticas
    const stats = await query(`
      SELECT 
        COUNT(*) as total_pontos,
        COUNT(*) FILTER (WHERE confirmado = true) as pontos_confirmados,
        COALESCE(SUM(vezes_usado), 0) as total_usos
      FROM pontos_referencia
      WHERE empresa_id = $1
    `, [empresa_id]);
    
    res.json({ 
      success: true, 
      pontos: result.rows,
      estatisticas: stats.rows[0]
    });
  } catch (error) {
    console.error('Erro ao listar pontos de referência:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/pontos-referencia
 * Adiciona ponto de referência manualmente
 */
router.post('/pontos-referencia', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { nome, latitude, longitude, endereco_completo, confirmado } = req.body;
    
    if (!nome || !latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Nome, latitude e longitude são obrigatórios' });
    }
    
    const nomeNorm = nome.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    
    const result = await query(`
      INSERT INTO pontos_referencia (
        empresa_id, nome, nome_normalizado, latitude, longitude, 
        endereco_completo, vezes_usado, confirmado
      ) VALUES ($1, $2, $3, $4, $5, $6, 1, $7)
      ON CONFLICT (empresa_id, nome_normalizado) 
      DO UPDATE SET
        latitude = $4,
        longitude = $5,
        endereco_completo = COALESCE($6, pontos_referencia.endereco_completo),
        confirmado = COALESCE($7, pontos_referencia.confirmado),
        atualizado_em = CURRENT_TIMESTAMP
      RETURNING *
    `, [empresa_id, nome, nomeNorm, latitude, longitude, endereco_completo, confirmado || false]);
    
    res.json({ success: true, ponto: result.rows[0] });
  } catch (error) {
    console.error('Erro ao adicionar ponto de referência:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/pontos-referencia/:id/confirmar
 * Confirma um ponto de referência manualmente
 */
router.put('/pontos-referencia/:id/confirmar', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { id } = req.params;
    
    const result = await query(`
      UPDATE pontos_referencia SET
        confirmado = true,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $1 AND empresa_id = $2
      RETURNING *
    `, [id, empresa_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ponto não encontrado' });
    }
    
    res.json({ success: true, ponto: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/pontos-referencia/:id
 * Remove um ponto de referência
 */
router.delete('/pontos-referencia/:id', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { id } = req.params;
    
    await query(`
      DELETE FROM pontos_referencia
      WHERE id = $1 AND empresa_id = $2
    `, [id, empresa_id]);
    
    res.json({ success: true, message: 'Ponto removido' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/pontos-referencia/:id/historico
 * Histórico de uso de um ponto de referência
 */
router.get('/pontos-referencia/:id/historico', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { id } = req.params;
    
    const result = await query(`
      SELECT prh.*, c.nome as cliente_nome
      FROM pontos_referencia_historico prh
      LEFT JOIN clientes c ON c.telefone = prh.cliente_telefone
      WHERE prh.ponto_id = $1 AND prh.empresa_id = $2
      ORDER BY prh.criado_em DESC
      LIMIT 50
    `, [id, empresa_id]);
    
    res.json({ success: true, historico: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CONTATOS DE ASSISTÊNCIA (Guincho, Mecânico, etc)
// ========================================

/**
 * GET /api/admin/assistencia
 * Lista contatos de assistência da empresa
 */
router.get('/assistencia', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { tipo } = req.query;
    
    let sql = `
      SELECT * FROM contatos_assistencia
      WHERE empresa_id = $1
    `;
    const params = [empresa_id];
    
    if (tipo) {
      sql += ` AND tipo = $2`;
      params.push(tipo);
    }
    
    sql += ` ORDER BY tipo, nome`;
    
    const result = await query(sql, params);
    
    // Agrupar por tipo
    const agrupados = {};
    result.rows.forEach(c => {
      if (!agrupados[c.tipo]) agrupados[c.tipo] = [];
      agrupados[c.tipo].push(c);
    });
    
    res.json({ 
      success: true, 
      contatos: result.rows,
      agrupados,
      tipos: ['guincho', 'mecanico', 'borracheiro', 'eletricista', 'seguro', 'outros']
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/assistencia
 * Adiciona novo contato de assistência
 */
router.post('/assistencia', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { tipo, nome, telefone, telefone2, endereco, observacoes } = req.body;
    
    if (!tipo || !nome || !telefone) {
      return res.status(400).json({ success: false, error: 'Tipo, nome e telefone são obrigatórios' });
    }
    
    const result = await query(`
      INSERT INTO contatos_assistencia (empresa_id, tipo, nome, telefone, telefone2, endereco, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [empresa_id, tipo, nome, telefone, telefone2, endereco, observacoes]);
    
    res.json({ success: true, contato: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/assistencia/:id
 * Atualiza contato de assistência
 */
router.put('/assistencia/:id', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { id } = req.params;
    const { tipo, nome, telefone, telefone2, endereco, observacoes, ativo } = req.body;
    
    const result = await query(`
      UPDATE contatos_assistencia SET
        tipo = COALESCE($3, tipo),
        nome = COALESCE($4, nome),
        telefone = COALESCE($5, telefone),
        telefone2 = COALESCE($6, telefone2),
        endereco = COALESCE($7, endereco),
        observacoes = COALESCE($8, observacoes),
        ativo = COALESCE($9, ativo),
        atualizado_em = NOW()
      WHERE id = $1 AND empresa_id = $2
      RETURNING *
    `, [id, empresa_id, tipo, nome, telefone, telefone2, endereco, observacoes, ativo]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contato não encontrado' });
    }
    
    res.json({ success: true, contato: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/assistencia/:id
 * Remove contato de assistência
 */
router.delete('/assistencia/:id', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { id } = req.params;
    
    await query(`DELETE FROM contatos_assistencia WHERE id = $1 AND empresa_id = $2`, [id, empresa_id]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// AVARIAS (Registro de acidentes/danos)
// ========================================

/**
 * GET /api/admin/avarias
 * Lista avarias da empresa
 */
router.get('/avarias', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { status, motorista_id, limite } = req.query;
    
    let sql = `
      SELECT a.*, m.nome as motorista_nome, m.telefone as motorista_telefone,
             m.veiculo_modelo, m.veiculo_placa
      FROM avarias a
      JOIN motoristas m ON m.id = a.motorista_id
      WHERE a.empresa_id = $1
    `;
    const params = [empresa_id];
    let paramIndex = 2;
    
    if (status) {
      sql += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (motorista_id) {
      sql += ` AND a.motorista_id = $${paramIndex++}`;
      params.push(motorista_id);
    }
    
    sql += ` ORDER BY a.criado_em DESC LIMIT $${paramIndex}`;
    params.push(limite || 50);
    
    const result = await query(sql, params);
    
    // Estatísticas
    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'registrada') as pendentes,
        COUNT(*) FILTER (WHERE status = 'em_analise') as em_analise,
        COUNT(*) FILTER (WHERE status = 'resolvida') as resolvidas,
        COALESCE(SUM(valor_prejuizo), 0) as total_prejuizo
      FROM avarias WHERE empresa_id = $1
    `, [empresa_id]);
    
    res.json({ 
      success: true, 
      avarias: result.rows,
      estatisticas: stats.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/avarias/:id
 * Detalhes de uma avaria
 */
router.get('/avarias/:id', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { id } = req.params;
    
    const result = await query(`
      SELECT a.*, m.nome as motorista_nome, m.telefone as motorista_telefone,
             m.veiculo_modelo, m.veiculo_placa, m.veiculo_cor
      FROM avarias a
      JOIN motoristas m ON m.id = a.motorista_id
      WHERE a.id = $1 AND a.empresa_id = $2
    `, [id, empresa_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Avaria não encontrada' });
    }
    
    const avaria = result.rows[0];
    if (avaria.fotos) {
      try { avaria.fotos = JSON.parse(avaria.fotos); } catch(e) { avaria.fotos = []; }
    }
    
    res.json({ success: true, avaria });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/avarias/:id
 * Atualiza status/observações de uma avaria
 */
router.put('/avarias/:id', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { id } = req.params;
    const { status, valor_prejuizo, observacoes_admin } = req.body;
    
    const result = await query(`
      UPDATE avarias SET
        status = COALESCE($3, status),
        valor_prejuizo = COALESCE($4, valor_prejuizo),
        observacoes_admin = COALESCE($5, observacoes_admin),
        atualizado_em = NOW()
      WHERE id = $1 AND empresa_id = $2
      RETURNING *
    `, [id, empresa_id, status, valor_prejuizo, observacoes_admin]);
    
    res.json({ success: true, avaria: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CORRIDA MANUAL (ADM solicita via painel)
// ========================================

/**
 * POST /api/admin/corrida-manual
 * ADM solicita uma corrida que vai para a Rebeca processar
 */
router.post('/corrida-manual', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { 
      cliente_nome, 
      cliente_telefone, 
      origem_endereco, 
      origem_latitude, 
      origem_longitude,
      destino_endereco,
      observacoes 
    } = req.body;
    
    if (!cliente_telefone || !origem_endereco) {
      return res.status(400).json({ 
        success: false, 
        error: 'Telefone do cliente e endereço de origem são obrigatórios' 
      });
    }
    
    // Criar ou buscar cliente
    let clienteResult = await query(`
      SELECT id FROM clientes WHERE telefone = $1 AND empresa_id = $2
    `, [cliente_telefone, empresa_id]);
    
    let clienteId;
    if (clienteResult.rows.length === 0) {
      const novoCliente = await query(`
        INSERT INTO clientes (empresa_id, telefone, nome)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [empresa_id, cliente_telefone, cliente_nome || 'Cliente Manual']);
      clienteId = novoCliente.rows[0].id;
    } else {
      clienteId = clienteResult.rows[0].id;
    }
    
    // Criar corrida
    const corridaResult = await query(`
      INSERT INTO corridas (
        empresa_id, cliente_id, status,
        origem_endereco, origem_latitude, origem_longitude,
        destino_endereco, observacoes
      ) VALUES ($1, $2, 'solicitada', $3, $4, $5, $6, $7)
      RETURNING *
    `, [empresa_id, clienteId, origem_endereco, origem_latitude, origem_longitude, destino_endereco, observacoes]);
    
    const corrida = corridaResult.rows[0];
    
    // Registrar como corrida manual
    await query(`
      INSERT INTO corridas_manuais (
        empresa_id, corrida_id, solicitado_por, cliente_nome, cliente_telefone,
        origem_endereco, origem_latitude, origem_longitude, destino_endereco, observacoes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [empresa_id, corrida.id, req.user.nome || 'ADM', cliente_nome, cliente_telefone,
        origem_endereco, origem_latitude, origem_longitude, destino_endereco, observacoes]);
    
    // Emitir para WebSocket para Rebeca processar
    if (global.io) {
      global.io.to(`empresa_${empresa_id}`).emit('corrida_manual', {
        corrida,
        cliente_telefone,
        mensagem: 'Corrida solicitada manualmente pelo ADM'
      });
    }
    
    // TODO: Integrar com Rebeca para processar a corrida
    // Por enquanto, notificar via WebSocket
    
    res.json({ 
      success: true, 
      corrida,
      mensagem: 'Corrida criada! A Rebeca vai buscar um motorista.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/corridas-manuais
 * Lista corridas solicitadas manualmente
 */
router.get('/corridas-manuais', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    
    const result = await query(`
      SELECT cm.*, c.status as corrida_status, c.motorista_id,
             m.nome as motorista_nome
      FROM corridas_manuais cm
      LEFT JOIN corridas c ON c.id = cm.corrida_id
      LEFT JOIN motoristas m ON m.id = c.motorista_id
      WHERE cm.empresa_id = $1
      ORDER BY cm.criado_em DESC
      LIMIT 50
    `, [empresa_id]);
    
    res.json({ success: true, corridas: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CHAT DA FROTA (ADM participa)
// ========================================

/**
 * GET /api/admin/chat
 * Lista conversas do chat da frota
 */
router.get('/chat', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    
    // Buscar últimas mensagens agrupadas por motorista
    const result = await query(`
      SELECT DISTINCT ON (cf.motorista_id) 
        cf.*, m.nome as motorista_nome, m.telefone as motorista_telefone,
        (SELECT COUNT(*) FROM chat_frota WHERE motorista_id = cf.motorista_id AND lida = false AND remetente_tipo = 'motorista') as nao_lidas
      FROM chat_frota cf
      JOIN motoristas m ON m.id = cf.motorista_id
      WHERE cf.empresa_id = $1
      ORDER BY cf.motorista_id, cf.criado_em DESC
    `, [empresa_id]);
    
    res.json({ success: true, conversas: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/chat/:motoristaId
 * Mensagens de um motorista específico
 */
router.get('/chat/:motoristaId', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { motoristaId } = req.params;
    const { limite } = req.query;
    
    const result = await query(`
      SELECT cf.*, m.nome as motorista_nome
      FROM chat_frota cf
      JOIN motoristas m ON m.id = cf.motorista_id
      WHERE cf.empresa_id = $1 AND cf.motorista_id = $2
      ORDER BY cf.criado_em DESC
      LIMIT $3
    `, [empresa_id, motoristaId, limite || 50]);
    
    // Marcar como lidas
    await query(`
      UPDATE chat_frota SET lida = true, lida_em = NOW()
      WHERE empresa_id = $1 AND motorista_id = $2 AND lida = false AND remetente_tipo = 'motorista'
    `, [empresa_id, motoristaId]);
    
    res.json({ success: true, mensagens: result.rows.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/chat/:motoristaId
 * Envia mensagem para motorista
 */
router.post('/chat/:motoristaId', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { motoristaId } = req.params;
    const { mensagem, tipo_mensagem } = req.body;
    
    if (!mensagem) {
      return res.status(400).json({ success: false, error: 'Mensagem é obrigatória' });
    }
    
    const result = await query(`
      INSERT INTO chat_frota (empresa_id, motorista_id, remetente_tipo, remetente_nome, mensagem, tipo_mensagem)
      VALUES ($1, $2, 'admin', $3, $4, $5)
      RETURNING *
    `, [empresa_id, motoristaId, req.user.nome || 'ADM', mensagem, tipo_mensagem || 'texto']);
    
    // Notificar motorista via WebSocket
    if (global.io) {
      global.io.to(`motorista_${motoristaId}`).emit('nova_mensagem_chat', {
        mensagem: result.rows[0],
        remetente: 'admin'
      });
    }
    
    res.json({ success: true, mensagem: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/chat/broadcast
 * Envia mensagem para todos os motoristas
 */
router.post('/chat/broadcast', async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id;
    const { mensagem, apenas_online } = req.body;
    
    if (!mensagem) {
      return res.status(400).json({ success: false, error: 'Mensagem é obrigatória' });
    }
    
    // Buscar motoristas
    let sql = `SELECT id FROM motoristas WHERE empresa_id = $1 AND ativo = true`;
    if (apenas_online) {
      sql += ` AND status = 'online'`;
    }
    
    const motoristas = await query(sql, [empresa_id]);
    
    // Inserir mensagem para cada motorista
    for (const m of motoristas.rows) {
      await query(`
        INSERT INTO chat_frota (empresa_id, motorista_id, remetente_tipo, remetente_nome, mensagem)
        VALUES ($1, $2, 'admin', $3, $4)
      `, [empresa_id, m.id, req.user.nome || 'ADM', mensagem]);
      
      // Notificar via WebSocket
      if (global.io) {
        global.io.to(`motorista_${m.id}`).emit('nova_mensagem_chat', {
          mensagem,
          remetente: 'admin',
          broadcast: true
        });
      }
    }
    
    res.json({ 
      success: true, 
      enviados: motoristas.rows.length,
      mensagem: `Mensagem enviada para ${motoristas.rows.length} motoristas`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/sistema/versao
 * Retorna informações do sistema
 */
router.get('/sistema/versao', async (req, res) => {
  try {
    const empresa_id = req.user?.empresa_id;
    
    // Buscar estatísticas
    const stats = empresa_id ? await query(`
      SELECT 
        (SELECT COUNT(*) FROM motoristas WHERE empresa_id = $1) as total_motoristas,
        (SELECT COUNT(*) FROM corridas WHERE empresa_id = $1) as total_corridas,
        (SELECT COUNT(*) FROM clientes WHERE empresa_id = $1) as total_clientes
    `, [empresa_id]) : { rows: [{}] };
    
    res.json({
      success: true,
      versao: {
        sistema: 'REBECA',
        versao: '2.0.0',
        build: '2024.01.13',
        ambiente: process.env.NODE_ENV || 'development',
        node: process.version,
        uptime: process.uptime(),
        memoria: process.memoryUsage(),
        plataforma: process.platform
      },
      estatisticas: stats.rows[0],
      funcionalidades: [
        'WhatsApp Integration',
        'GPS Tracking',
        'Push Notifications',
        'Timeout 30s',
        'Aprendizado Automático',
        'Chat Frota',
        'Registro Avarias',
        'Assistência 24h',
        'PWA Mobile',
        'Dashboard Tempo Real'
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// WHATSAPP - CONEXÃO VIA EVOLUTION API
// ========================================

/**
 * POST /api/admin/whatsapp/conectar
 * Gera QR Code para conectar WhatsApp
 */
router.post('/whatsapp/conectar', async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id || req.headers['x-empresa-id'] || 1;
    
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    
    if (!evolutionUrl || !evolutionKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Evolution API não configurada. Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no Railway.' 
      });
    }
    
    const instanceName = `rebeca_${empresa_id}`;
    
    // 1. Criar instância se não existir
    try {
      await fetch(`${evolutionUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionKey
        },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      });
    } catch (e) {
      // Instância pode já existir, continuar
    }
    
    // 2. Conectar e obter QR Code
    const connectResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionKey
      }
    });
    
    const connectData = await connectResponse.json();
    
    if (connectData.base64) {
      // QR Code gerado
      res.json({
        success: true,
        qrcode: connectData.base64,
        instance: instanceName
      });
      
    } else if (connectData.instance?.state === 'open') {
      // Já está conectado
      res.json({
        success: true,
        connected: true,
        phone: connectData.instance?.owner || null
      });
      
    } else {
      res.json({
        success: false,
        error: 'Não foi possível gerar QR Code',
        data: connectData
      });
    }
    
  } catch (error) {
    console.error('Erro ao conectar WhatsApp:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/whatsapp/status
 * Verifica status da conexão
 */
router.get('/whatsapp/status', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    
    if (!evolutionUrl || !evolutionKey) {
      return res.json({ 
        success: true, 
        connected: false,
        status: 'not_configured'
      });
    }
    
    const instanceName = `rebeca_${empresa_id}`;
    
    const response = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': evolutionKey
      }
    });
    
    const data = await response.json();
    
    if (data.instance?.state === 'open') {
      // Atualizar status no banco
      await query(`
        UPDATE empresas 
        SET whatsapp_conectado = true, whatsapp_instancia = $1, whatsapp_ultima_conexao = NOW()
        WHERE id = $2
      `, [instanceName, empresa_id]);
      
      res.json({
        success: true,
        connected: true,
        status: 'open',
        phone: data.instance?.owner || null
      });
      
    } else {
      res.json({
        success: true,
        connected: false,
        status: data.instance?.state || 'disconnected'
      });
    }
    
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.json({ 
      success: true, 
      connected: false,
      status: 'error',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/whatsapp/desconectar
 * Desconecta WhatsApp
 */
router.post('/whatsapp/desconectar', async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id || req.headers['x-empresa-id'] || 1;
    
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    
    if (!evolutionUrl || !evolutionKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Evolution API não configurada' 
      });
    }
    
    const instanceName = `rebeca_${empresa_id}`;
    
    // Fazer logout
    await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionKey
      }
    });
    
    // Atualizar banco
    await query(`
      UPDATE empresas 
      SET whatsapp_conectado = false
      WHERE id = $1
    `, [empresa_id]);
    
    res.json({ success: true, message: 'WhatsApp desconectado' });
    
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// ========================================
// NOME DA EMPRESA (WHITE LABEL)
// ========================================

/**
 * PUT /api/admin/empresa/nome
 * Atualizar nome da empresa (White Label)
 */
router.put('/empresa/nome', async (req, res) => {
  try {
    const { nome } = req.body;
    const empresa_id = req.user?.empresa_id || req.headers['x-empresa-id'] || 1;
    
    if (!nome || nome.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Nome inválido' });
    }
    
    console.log('[ADMIN] Atualizando nome da empresa:', nome);
    
    const result = await query(`
      UPDATE empresas SET 
        nome = $1,
        nome_exibido = $1,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [nome.trim(), empresa_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }
    
    res.json({ 
      success: true, 
      mensagem: 'Nome atualizado com sucesso!',
      empresa: result.rows[0]
    });
    
  } catch (error) {
    console.error('[ADMIN] Erro ao atualizar nome:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/empresa/nome
 * Obter nome atual da empresa
 */
router.get('/empresa/nome', async (req, res) => {
  try {
    const empresa_id = req.query.empresa_id || req.headers['x-empresa-id'] || 1;
    
    const result = await query(`
      SELECT nome, nome_exibido FROM empresas WHERE id = $1
    `, [empresa_id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: true, nome: 'UBMAX' });
    }
    
    res.json({ 
      success: true, 
      nome: result.rows[0].nome_exibido || result.rows[0].nome || 'UBMAX'
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

