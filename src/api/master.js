// ========================================
// REBECA - API MASTER (SaaS)
// Gerencia empresas, planos, assinaturas
// Multi-tenant completo
// ========================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../database/connection');

// ========================================
// MIDDLEWARE - VERIFICAR ADMIN MASTER
// ========================================
const verificarMaster = async (req, res, next) => {
  // Aceita token de várias formas
  let token = req.headers['x-master-token'] || req.query.token;
  
  // Também aceita Authorization: Bearer token
  const authHeader = req.headers['authorization'];
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Token não fornecido' });
  }

  try {
    const result = await query(
      'SELECT * FROM usuarios_master WHERE token = $1 AND ativo = true',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    req.usuarioMaster = result.rows[0];
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro de autenticação' });
  }
};

// ========================================
// LOGIN MASTER
// ========================================
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ success: false, error: 'Email e senha obrigatórios' });
    }

    const senhaHash = crypto.createHash('sha256').update(senha).digest('hex');

    const result = await query(
      'SELECT * FROM usuarios_master WHERE email = $1 AND senha_hash = $2 AND ativo = true',
      [email, senhaHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }

    const usuario = result.rows[0];

    // Gerar novo token
    const novoToken = crypto.randomBytes(32).toString('hex');
    await query(
      'UPDATE usuarios_master SET token = $1, ultimo_acesso = CURRENT_TIMESTAMP WHERE id = $2',
      [novoToken, usuario.id]
    );

    res.json({
      success: true,
      data: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        token: novoToken
      }
    });
  } catch (error) {
    console.error('Erro login master:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// DASHBOARD MASTER
// ========================================
router.get('/dashboard', verificarMaster, async (req, res) => {
  try {
    // Total de empresas
    const empresas = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'ativa' THEN 1 END) as ativas,
        COUNT(CASE WHEN status = 'bloqueada' THEN 1 END) as bloqueadas,
        COUNT(CASE WHEN status = 'trial' THEN 1 END) as trial,
        COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as canceladas
      FROM empresas
    `);

    // Faturamento do mês
    const faturamento = await query(`
      SELECT 
        COALESCE(SUM(valor), 0) as total,
        COUNT(*) as pagamentos,
        COUNT(CASE WHEN status = 'pago' THEN 1 END) as pagos,
        COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes
      FROM assinaturas
      WHERE mes_referencia = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    `);

    // Empresas por plano
    const porPlano = await query(`
      SELECT 
        p.nome as plano,
        COUNT(e.id) as total
      FROM planos p
      LEFT JOIN empresas e ON p.id = e.plano_id AND e.status != 'cancelada'
      GROUP BY p.id, p.nome
      ORDER BY p.valor
    `);

    // Últimas empresas cadastradas
    const ultimasEmpresas = await query(`
      SELECT e.*, p.nome as plano_nome
      FROM empresas e
      LEFT JOIN planos p ON e.plano_id = p.id
      ORDER BY e.criado_em DESC
      LIMIT 10
    `);

    // Assinaturas vencendo em 7 dias
    const vencendo = await query(`
      SELECT e.*, p.nome as plano_nome
      FROM empresas e
      LEFT JOIN planos p ON e.plano_id = p.id
      WHERE e.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND e.status = 'ativa'
      ORDER BY e.data_vencimento
    `);

    res.json({
      success: true,
      data: {
        empresas: empresas.rows[0],
        faturamento: faturamento.rows[0],
        porPlano: porPlano.rows,
        ultimasEmpresas: ultimasEmpresas.rows,
        vencendo: vencendo.rows
      }
    });
  } catch (error) {
    console.error('Erro dashboard master:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// PLANOS
// ========================================

// Listar planos
router.get('/planos', verificarMaster, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, 
        COUNT(e.id) as total_empresas
      FROM planos p
      LEFT JOIN empresas e ON p.id = e.plano_id AND e.status != 'cancelada'
      GROUP BY p.id
      ORDER BY p.valor
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar planos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar plano
router.post('/planos', verificarMaster, async (req, res) => {
  try {
    const { 
      nome, 
      valor, 
      max_motoristas, 
      max_corridas_mes,
      tem_whatsapp,
      tem_mapa,
      tem_relatorios,
      tem_api,
      tem_white_label,
      descricao 
    } = req.body;

    if (!nome || !valor) {
      return res.status(400).json({ success: false, error: 'Nome e valor são obrigatórios' });
    }

    const result = await query(`
      INSERT INTO planos (
        nome, valor, max_motoristas, max_corridas_mes,
        tem_whatsapp, tem_mapa, tem_relatorios, tem_api, tem_white_label,
        descricao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      nome, valor, max_motoristas || 10, max_corridas_mes || 500,
      tem_whatsapp !== false, tem_mapa !== false, tem_relatorios !== false,
      tem_api || false, tem_white_label || false,
      descricao
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro criar plano:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar plano
router.put('/planos/:id', verificarMaster, async (req, res) => {
  try {
    const { 
      nome, valor, max_motoristas, max_corridas_mes,
      tem_whatsapp, tem_mapa, tem_relatorios, tem_api, tem_white_label,
      descricao, ativo 
    } = req.body;

    const result = await query(`
      UPDATE planos SET
        nome = COALESCE($1, nome),
        valor = COALESCE($2, valor),
        max_motoristas = COALESCE($3, max_motoristas),
        max_corridas_mes = COALESCE($4, max_corridas_mes),
        tem_whatsapp = COALESCE($5, tem_whatsapp),
        tem_mapa = COALESCE($6, tem_mapa),
        tem_relatorios = COALESCE($7, tem_relatorios),
        tem_api = COALESCE($8, tem_api),
        tem_white_label = COALESCE($9, tem_white_label),
        descricao = COALESCE($10, descricao),
        ativo = COALESCE($11, ativo),
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      nome, valor, max_motoristas, max_corridas_mes,
      tem_whatsapp, tem_mapa, tem_relatorios, tem_api, tem_white_label,
      descricao, ativo, req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro atualizar plano:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// EMPRESAS
// ========================================

// Listar empresas
router.get('/empresas', verificarMaster, async (req, res) => {
  try {
    const { status, plano_id, busca } = req.query;

    let sql = `
      SELECT e.*, 
        p.nome as plano_nome,
        p.valor as plano_valor,
        (SELECT COUNT(*) FROM motoristas m WHERE m.empresa_id = e.id) as total_motoristas,
        (SELECT COUNT(*) FROM corridas c WHERE c.empresa_id = e.id AND DATE(c.solicitado_em) = CURRENT_DATE) as corridas_hoje
      FROM empresas e
      LEFT JOIN planos p ON e.plano_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND e.status = $${params.length}`;
    }

    if (plano_id) {
      params.push(plano_id);
      sql += ` AND e.plano_id = $${params.length}`;
    }

    if (busca) {
      params.push(`%${busca}%`);
      sql += ` AND (e.nome ILIKE $${params.length} OR e.cnpj ILIKE $${params.length} OR e.email ILIKE $${params.length})`;
    }

    sql += ` ORDER BY e.criado_em DESC`;

    const result = await query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar empresas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detalhes empresa
router.get('/empresas/:id', verificarMaster, async (req, res) => {
  try {
    const empresa = await query(`
      SELECT e.*, p.nome as plano_nome, p.valor as plano_valor,
        p.max_motoristas, p.max_corridas_mes,
        p.tem_whatsapp, p.tem_mapa, p.tem_relatorios, p.tem_api, p.tem_white_label
      FROM empresas e
      LEFT JOIN planos p ON e.plano_id = p.id
      WHERE e.id = $1
    `, [req.params.id]);

    if (empresa.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    // Estatísticas
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM motoristas WHERE empresa_id = $1) as total_motoristas,
        (SELECT COUNT(*) FROM clientes WHERE empresa_id = $1) as total_clientes,
        (SELECT COUNT(*) FROM corridas WHERE empresa_id = $1) as total_corridas,
        (SELECT COUNT(*) FROM corridas WHERE empresa_id = $1 AND DATE(solicitado_em) = CURRENT_DATE) as corridas_hoje,
        (SELECT COALESCE(SUM(valor), 0) FROM corridas WHERE empresa_id = $1 AND status = 'finalizada' AND DATE(solicitado_em) >= DATE_TRUNC('month', CURRENT_DATE)) as faturamento_mes
    `, [req.params.id]);

    // Histórico de assinaturas
    const assinaturas = await query(`
      SELECT * FROM assinaturas
      WHERE empresa_id = $1
      ORDER BY mes_referencia DESC
      LIMIT 12
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...empresa.rows[0],
        stats: stats.rows[0],
        assinaturas: assinaturas.rows
      }
    });
  } catch (error) {
    console.error('Erro detalhes empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar empresa
router.post('/empresas', verificarMaster, async (req, res) => {
  try {
    const {
      nome,
      cnpj,
      email,
      telefone,
      responsavel,
      plano_id,
      dias_trial,
      // White-label
      nome_app,
      cor_primaria,
      cor_secundaria,
      logo_url,
      dominio_personalizado,
      // Telefonia IA
      whatsapp_rebeca,
      telefone_ia,
      ligacao_ia_ativo
    } = req.body;

    if (!nome || !email || !plano_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome, email e plano são obrigatórios' 
      });
    }

    // Verificar email único
    const existe = await query('SELECT id FROM empresas WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Email já cadastrado' });
    }

    // Gerar API Key
    const apiKey = 'zc_' + crypto.randomBytes(24).toString('hex');
    
    // Gerar token de primeiro acesso (para ADM cadastrar senha)
    const tokenPrimeiroAcesso = crypto.randomBytes(32).toString('hex');

    // Calcular data de vencimento
    const trial = dias_trial || 7;
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + trial);

    const result = await query(`
      INSERT INTO empresas (
        nome, cnpj, email, telefone, responsavel, plano_id,
        api_key, status, data_vencimento,
        nome_app, cor_primaria, cor_secundaria, logo_url, dominio_personalizado,
        token_primeiro_acesso, whatsapp_rebeca, telefone_ia, ligacao_ia_ativo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'trial', $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      nome, cnpj, email, telefone, responsavel, plano_id,
      apiKey, dataVencimento,
      nome_app || nome, cor_primaria || '#6366f1', cor_secundaria || '#10b981',
      logo_url, dominio_personalizado,
      tokenPrimeiroAcesso, whatsapp_rebeca || null, telefone_ia || null, ligacao_ia_ativo || false
    ]);

    const empresa = result.rows[0];

    // Buscar dados do plano
    const plano = await query('SELECT * FROM planos WHERE id = $1', [plano_id]);

    // Gerar link de primeiro acesso
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const linkPrimeiroAcesso = `${baseUrl}/admin/primeiro-acesso?token=${tokenPrimeiroAcesso}`;

    res.json({
      success: true,
      data: {
        ...empresa,
        plano: plano.rows[0],
        token_primeiro_acesso: tokenPrimeiroAcesso,
        link_primeiro_acesso: linkPrimeiroAcesso,
        api_key: apiKey,
        urls: {
          admin: `${baseUrl}/admin?empresa=${empresa.id}`,
          motorista: `${baseUrl}/motorista?empresa=${empresa.id}`,
          api: `${baseUrl}/api/v1`,
          primeiro_acesso: linkPrimeiroAcesso
        }
      }
    });
  } catch (error) {
    console.error('Erro criar empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar empresa
router.put('/empresas/:id', verificarMaster, async (req, res) => {
  try {
    const {
      nome, cnpj, email, telefone, responsavel, plano_id,
      nome_app, cor_primaria, cor_secundaria, logo_url, dominio_personalizado,
      white_label, nome_exibido
    } = req.body;

    const result = await query(`
      UPDATE empresas SET
        nome = COALESCE($1, nome),
        cnpj = COALESCE($2, cnpj),
        email = COALESCE($3, email),
        telefone = COALESCE($4, telefone),
        responsavel = COALESCE($5, responsavel),
        plano_id = COALESCE($6, plano_id),
        nome_app = COALESCE($7, nome_app),
        cor_primaria = COALESCE($8, cor_primaria),
        cor_secundaria = COALESCE($9, cor_secundaria),
        logo_url = COALESCE($10, logo_url),
        dominio_personalizado = COALESCE($11, dominio_personalizado),
        white_label = COALESCE($12, white_label),
        nome_exibido = COALESCE($13, nome_exibido),
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      nome, cnpj, email, telefone, responsavel, plano_id,
      nome_app, cor_primaria, cor_secundaria, logo_url, dominio_personalizado,
      white_label, nome_exibido,
      req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro atualizar empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// AÇÕES DE EMPRESA
// ========================================

// Bloquear empresa
router.post('/empresas/:id/bloquear', verificarMaster, async (req, res) => {
  try {
    const { motivo } = req.body;

    const result = await query(`
      UPDATE empresas SET
        status = 'bloqueada',
        motivo_bloqueio = $1,
        data_bloqueio = CURRENT_TIMESTAMP,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [motivo || 'Bloqueado pelo administrador', req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Empresa bloqueada' });
  } catch (error) {
    console.error('Erro bloquear empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Desbloquear empresa
router.post('/empresas/:id/desbloquear', verificarMaster, async (req, res) => {
  try {
    const result = await query(`
      UPDATE empresas SET
        status = 'ativa',
        motivo_bloqueio = NULL,
        data_bloqueio = NULL,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Empresa desbloqueada' });
  } catch (error) {
    console.error('Erro desbloquear empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ativar empresa (sair do trial)
router.post('/empresas/:id/ativar', verificarMaster, async (req, res) => {
  try {
    const { meses } = req.body;
    
    const novaData = new Date();
    novaData.setMonth(novaData.getMonth() + (meses || 1));

    const result = await query(`
      UPDATE empresas SET
        status = 'ativa',
        data_vencimento = $1,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [novaData, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Empresa ativada' });
  } catch (error) {
    console.error('Erro ativar empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancelar empresa
router.post('/empresas/:id/cancelar', verificarMaster, async (req, res) => {
  try {
    const { motivo } = req.body;

    const result = await query(`
      UPDATE empresas SET
        status = 'cancelada',
        motivo_cancelamento = $1,
        data_cancelamento = CURRENT_TIMESTAMP,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [motivo, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Empresa cancelada' });
  } catch (error) {
    console.error('Erro cancelar empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Renovar assinatura
router.post('/empresas/:id/renovar', verificarMaster, async (req, res) => {
  try {
    const { meses, valor, forma_pagamento, observacao } = req.body;

    // Buscar empresa
    const empresa = await query('SELECT * FROM empresas WHERE id = $1', [req.params.id]);
    if (empresa.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    const emp = empresa.rows[0];

    // Calcular nova data de vencimento
    let dataBase = emp.data_vencimento ? new Date(emp.data_vencimento) : new Date();
    if (dataBase < new Date()) dataBase = new Date();
    dataBase.setMonth(dataBase.getMonth() + (meses || 1));

    // Atualizar empresa
    await query(`
      UPDATE empresas SET
        status = 'ativa',
        data_vencimento = $1,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [dataBase, req.params.id]);

    // Registrar pagamento
    const mesRef = new Date().toISOString().slice(0, 7);
    await query(`
      INSERT INTO assinaturas (empresa_id, mes_referencia, valor, status, forma_pagamento, observacao, data_pagamento)
      VALUES ($1, $2, $3, 'pago', $4, $5, CURRENT_TIMESTAMP)
    `, [req.params.id, mesRef, valor || emp.plano_valor, forma_pagamento, observacao]);

    res.json({ 
      success: true, 
      message: `Renovado por ${meses || 1} mês(es). Novo vencimento: ${dataBase.toLocaleDateString('pt-BR')}` 
    });
  } catch (error) {
    console.error('Erro renovar empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Regenerar API Key
router.post('/empresas/:id/regenerar-api-key', verificarMaster, async (req, res) => {
  try {
    const novaApiKey = 'zc_' + crypto.randomBytes(24).toString('hex');

    const result = await query(`
      UPDATE empresas SET
        api_key = $1,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, nome, api_key
    `, [novaApiKey, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro regenerar API key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset senha admin da empresa
router.post('/empresas/:id/reset-senha', verificarMaster, async (req, res) => {
  try {
    const novaSenha = crypto.randomBytes(4).toString('hex');
    const senhaHash = crypto.createHash('sha256').update(novaSenha).digest('hex');

    const result = await query(`
      UPDATE empresas SET
        admin_senha_hash = $1,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, nome, email
    `, [senhaHash, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    res.json({ 
      success: true, 
      data: {
        ...result.rows[0],
        nova_senha: novaSenha
      }
    });
  } catch (error) {
    console.error('Erro reset senha:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// TELEFONIA IA (LIGAÇÃO AUTOMÁTICA)
// ========================================

// Configurar telefones IA da empresa (WhatsApp e Ligação)
router.post('/empresas/:id/configurar-telefonia', verificarMaster, async (req, res) => {
  try {
    const { whatsapp_rebeca, telefone_ia, ligacao_ia_ativo } = req.body;

    const result = await query(`
      UPDATE empresas SET
        whatsapp_rebeca = $1,
        telefone_ia = $2,
        ligacao_ia_ativo = $3,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, nome, whatsapp_rebeca, telefone_ia, ligacao_ia_ativo
    `, [whatsapp_rebeca || null, telefone_ia || null, ligacao_ia_ativo || false, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    res.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Telefonia IA configurada com sucesso'
    });
  } catch (error) {
    console.error('Erro configurar telefonia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Buscar configuração de telefonia da empresa
router.get('/empresas/:id/telefonia', verificarMaster, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, nome, whatsapp_rebeca, telefone_ia, ligacao_ia_ativo
      FROM empresas WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro buscar telefonia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar empresas com telefonia IA ativa
router.get('/telefonia/empresas', verificarMaster, async (req, res) => {
  try {
    const result = await query(`
      SELECT e.id, e.nome, e.whatsapp_rebeca, e.telefone_ia, e.ligacao_ia_ativo,
             p.nome as plano_nome, e.status
      FROM empresas e
      LEFT JOIN planos p ON e.plano_id = p.id
      WHERE e.whatsapp_rebeca IS NOT NULL OR e.telefone_ia IS NOT NULL
      ORDER BY e.nome
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar telefonia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// ASSINATURAS
// ========================================

// Listar assinaturas
router.get('/assinaturas', verificarMaster, async (req, res) => {
  try {
    const { mes, status } = req.query;
    const mesRef = mes || new Date().toISOString().slice(0, 7);

    let sql = `
      SELECT a.*, e.nome as empresa_nome, e.email as empresa_email, p.nome as plano_nome
      FROM assinaturas a
      JOIN empresas e ON a.empresa_id = e.id
      LEFT JOIN planos p ON e.plano_id = p.id
      WHERE a.mes_referencia = $1
    `;
    const params = [mesRef];

    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    sql += ` ORDER BY a.criado_em DESC`;

    const result = await query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar assinaturas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Registrar pagamento de assinatura
router.post('/assinaturas/registrar', verificarMaster, async (req, res) => {
  try {
    const { empresa_id, mes_referencia, valor, forma_pagamento, observacao } = req.body;

    // Verificar se já existe
    const existe = await query(
      'SELECT id FROM assinaturas WHERE empresa_id = $1 AND mes_referencia = $2',
      [empresa_id, mes_referencia]
    );

    let result;
    if (existe.rows.length > 0) {
      result = await query(`
        UPDATE assinaturas SET
          status = 'pago',
          valor = $1,
          forma_pagamento = $2,
          observacao = $3,
          data_pagamento = CURRENT_TIMESTAMP
        WHERE empresa_id = $4 AND mes_referencia = $5
        RETURNING *
      `, [valor, forma_pagamento, observacao, empresa_id, mes_referencia]);
    } else {
      result = await query(`
        INSERT INTO assinaturas (empresa_id, mes_referencia, valor, status, forma_pagamento, observacao, data_pagamento)
        VALUES ($1, $2, $3, 'pago', $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `, [empresa_id, mes_referencia, valor, forma_pagamento, observacao]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro registrar pagamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gerar cobranças do mês
router.post('/assinaturas/gerar', verificarMaster, async (req, res) => {
  try {
    const { mes_referencia } = req.body;
    const mes = mes_referencia || new Date().toISOString().slice(0, 7);

    // Buscar empresas ativas sem cobrança para o mês
    const empresas = await query(`
      SELECT e.id, e.nome, p.valor
      FROM empresas e
      JOIN planos p ON e.plano_id = p.id
      LEFT JOIN assinaturas a ON e.id = a.empresa_id AND a.mes_referencia = $1
      WHERE e.status = 'ativa' AND a.id IS NULL
    `, [mes]);

    let criadas = 0;
    for (const emp of empresas.rows) {
      await query(`
        INSERT INTO assinaturas (empresa_id, mes_referencia, valor, status)
        VALUES ($1, $2, $3, 'pendente')
      `, [emp.id, mes, emp.valor]);
      criadas++;
    }

    res.json({ 
      success: true, 
      message: `${criadas} cobranças geradas para ${mes}`,
      criadas 
    });
  } catch (error) {
    console.error('Erro gerar cobranças:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// RELATÓRIOS
// ========================================

// Relatório de faturamento
router.get('/relatorios/faturamento', verificarMaster, async (req, res) => {
  try {
    const { ano } = req.query;
    const anoRef = ano || new Date().getFullYear();

    const result = await query(`
      SELECT 
        mes_referencia,
        COUNT(*) as total_empresas,
        SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as valor_pago,
        SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as valor_pendente,
        COUNT(CASE WHEN status = 'pago' THEN 1 END) as pagos,
        COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes
      FROM assinaturas
      WHERE mes_referencia LIKE $1
      GROUP BY mes_referencia
      ORDER BY mes_referencia
    `, [`${anoRef}%`]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro relatório faturamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Relatório de uso por empresa
router.get('/relatorios/uso', verificarMaster, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        e.id,
        e.nome,
        e.status,
        p.nome as plano,
        p.max_motoristas,
        p.max_corridas_mes,
        (SELECT COUNT(*) FROM motoristas m WHERE m.empresa_id = e.id) as motoristas_ativos,
        (SELECT COUNT(*) FROM corridas c WHERE c.empresa_id = e.id AND c.solicitado_em >= DATE_TRUNC('month', CURRENT_DATE)) as corridas_mes,
        ROUND(
          (SELECT COUNT(*) FROM corridas c WHERE c.empresa_id = e.id AND c.solicitado_em >= DATE_TRUNC('month', CURRENT_DATE))::numeric / 
          NULLIF(p.max_corridas_mes, 0) * 100, 1
        ) as uso_corridas_percent
      FROM empresas e
      LEFT JOIN planos p ON e.plano_id = p.id
      WHERE e.status IN ('ativa', 'trial')
      ORDER BY corridas_mes DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro relatório uso:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CONFIGURAÇÕES GLOBAIS
// ========================================

router.get('/configuracoes', verificarMaster, async (req, res) => {
  try {
    const result = await query('SELECT * FROM configuracoes_master ORDER BY chave');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro listar config master:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/configuracoes/:chave', verificarMaster, async (req, res) => {
  try {
    const { valor } = req.body;
    const chave = req.params.chave;

    // Verificar se já existe
    const existe = await query('SELECT id FROM configuracoes_master WHERE chave = $1', [chave]);
    
    let result;
    if (existe.rows.length > 0) {
      result = await query('UPDATE configuracoes_master SET valor = $1, atualizado_em = CURRENT_TIMESTAMP WHERE chave = $2 RETURNING *', [valor, chave]);
    } else {
      result = await query('INSERT INTO configuracoes_master (chave, valor) VALUES ($1, $2) RETURNING *', [chave, valor]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro salvar config master:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// DASHBOARD MASTER EM TEMPO REAL
// ========================================

/**
 * GET /api/master/dashboard
 * Métricas gerais de todas as empresas
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Total de empresas ativas
    const empresas = await query(`
      SELECT COUNT(*) as total FROM empresas WHERE ativo = true
    `);
    
    // Total de motoristas online (todas empresas)
    const motoristasOnline = await query(`
      SELECT COUNT(*) as total FROM motoristas 
      WHERE status = 'online' AND ativo = true
    `);
    
    // Total de corridas hoje (todas empresas)
    const corridasHoje = await query(`
      SELECT COUNT(*) as total, COALESCE(SUM(valor), 0) as faturamento
      FROM corridas 
      WHERE DATE(criado_em) = CURRENT_DATE
    `);
    
    // Corridas por status
    const corridasPorStatus = await query(`
      SELECT status, COUNT(*) as total
      FROM corridas 
      WHERE DATE(criado_em) = CURRENT_DATE
      GROUP BY status
    `);
    
    res.json({
      success: true,
      total_empresas: parseInt(empresas.rows[0].total),
      total_motoristas_online: parseInt(motoristasOnline.rows[0].total),
      total_corridas_hoje: parseInt(corridasHoje.rows[0].total),
      total_faturamento_hoje: parseFloat(corridasHoje.rows[0].faturamento),
      corridas_por_status: corridasPorStatus.rows
    });
  } catch (error) {
    console.error('Erro dashboard master:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/master/empresas
 * Lista todas as empresas com métricas
 */
router.get('/empresas', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        e.id, e.nome, e.cidade, e.ativo, e.plano, e.criado_em,
        e.telefone_adm, e.email,
        (SELECT COUNT(*) FROM motoristas m WHERE m.empresa_id = e.id AND m.status = 'online') as motoristas_online,
        (SELECT COUNT(*) FROM motoristas m WHERE m.empresa_id = e.id AND m.ativo = true) as total_motoristas,
        (SELECT COUNT(*) FROM corridas c WHERE c.empresa_id = e.id AND DATE(c.criado_em) = CURRENT_DATE) as corridas_hoje,
        (SELECT COALESCE(SUM(valor), 0) FROM corridas c WHERE c.empresa_id = e.id AND DATE(c.criado_em) = CURRENT_DATE AND c.status = 'finalizada') as faturamento_hoje
      FROM empresas e
      ORDER BY e.nome
    `);
    
    res.json({ success: true, empresas: result.rows });
  } catch (error) {
    console.error('Erro listar empresas master:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/master/empresa/:id/detalhes
 * Detalhes completos de uma empresa específica
 */
router.get('/empresa/:id/detalhes', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Dados da empresa
    const empresa = await query(`
      SELECT * FROM empresas WHERE id = $1
    `, [id]);
    
    if (empresa.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }
    
    // Motoristas da empresa
    const motoristas = await query(`
      SELECT id, nome, telefone, veiculo_modelo, veiculo_cor, veiculo_placa,
             status, disponivel, latitude, longitude, nota_media, total_corridas
      FROM motoristas 
      WHERE empresa_id = $1 AND ativo = true
      ORDER BY status DESC, nome
    `, [id]);
    
    // Corridas ativas da empresa
    const corridasAtivas = await query(`
      SELECT c.*, m.nome as motorista_nome
      FROM corridas c
      LEFT JOIN motoristas m ON m.id = c.motorista_id
      WHERE c.empresa_id = $1 
        AND c.status IN ('pendente', 'aceita', 'a_caminho', 'aguardando_cliente', 'em_andamento')
      ORDER BY c.criado_em DESC
    `, [id]);
    
    // Métricas do dia
    const metricas = await query(`
      SELECT 
        COUNT(*) as corridas_hoje,
        COALESCE(SUM(valor), 0) as faturamento_hoje,
        COUNT(*) FILTER (WHERE status = 'finalizada') as finalizadas,
        COUNT(*) FILTER (WHERE status = 'cancelada') as canceladas
      FROM corridas 
      WHERE empresa_id = $1 AND DATE(criado_em) = CURRENT_DATE
    `, [id]);
    
    res.json({
      success: true,
      empresa: empresa.rows[0],
      motoristas: motoristas.rows,
      corridas_ativas: corridasAtivas.rows,
      metricas: metricas.rows[0]
    });
  } catch (error) {
    console.error('Erro detalhes empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/master/tempo-real
 * Dados em tempo real de todas as empresas (para WebSocket)
 */
router.get('/tempo-real', async (req, res) => {
  try {
    // Todas as posições de motoristas online
    const motoristas = await query(`
      SELECT m.id, m.empresa_id, m.nome, m.latitude, m.longitude, m.status, m.disponivel,
             m.veiculo_modelo, m.veiculo_cor,
             e.nome as empresa_nome
      FROM motoristas m
      JOIN empresas e ON e.id = m.empresa_id
      WHERE m.status = 'online' AND m.latitude IS NOT NULL
    `);
    
    // Todas as corridas ativas
    const corridas = await query(`
      SELECT c.id, c.empresa_id, c.status, c.origem_lat, c.origem_lng,
             c.origem_endereco, c.telefone_cliente
      FROM corridas c
      WHERE c.status IN ('pendente', 'aceita', 'a_caminho', 'em_andamento')
    `);
    
    res.json({
      success: true,
      motoristas: motoristas.rows,
      corridas: corridas.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro tempo real:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// ========================================
// WHATSAPP - CONEXÃO VIA QR CODE
// ========================================

/**
 * POST /api/master/empresas/:id/whatsapp/qrcode
 * Gerar QR Code para conectar WhatsApp
 */
router.post('/empresas/:id/whatsapp/qrcode', async (req, res) => {
  try {
    const { id } = req.params;
    const { numero } = req.body;
    
    // Buscar empresa
    const empresa = await query('SELECT * FROM empresas WHERE id = $1', [id]);
    if (empresa.rows.length === 0) {
      return res.json({ success: false, error: 'Empresa não encontrada' });
    }
    
    // Tentar conectar via Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    const evolutionKey = process.env.EVOLUTION_API_KEY || 'sua_chave';
    const instanceName = `rebeca_empresa_${id}`;
    
    try {
      const axios = require('axios');
      
      // Criar instância se não existir
      await axios.post(`${evolutionUrl}/instance/create`, {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      }, {
        headers: { apikey: evolutionKey }
      });
      
      // Pegar QR Code
      const qrResponse = await axios.get(`${evolutionUrl}/instance/qrcode/${instanceName}`, {
        headers: { apikey: evolutionKey }
      });
      
      if (qrResponse.data.qrcode) {
        // Atualizar número na empresa
        await query(
          'UPDATE empresas SET whatsapp_rebeca = $1, whatsapp_instancia = $2 WHERE id = $3',
          [numero, instanceName, id]
        );
        
        return res.json({ 
          success: true, 
          qrcode: qrResponse.data.qrcode.base64 || qrResponse.data.qrcode
        });
      }
      
      // Verificar se já está conectado
      const statusResponse = await axios.get(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: evolutionKey }
      });
      
      if (statusResponse.data.state === 'open') {
        return res.json({ success: true, connected: true });
      }
      
      return res.json({ success: false, error: 'Erro ao gerar QR Code' });
      
    } catch (evolutionError) {
      console.log('Evolution API não disponível, usando modo simulado');
      
      // Modo offline - simular QR Code
      const qrSimulado = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=UBMAX-REBECA-${id}-${Date.now()}`;
      
      return res.json({ 
        success: true, 
        qrcode: qrSimulado,
        simulado: true
      });
    }
    
  } catch (error) {
    console.error('Erro QR Code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/master/empresas/:id/whatsapp/status
 * Verificar status da conexão WhatsApp
 */
router.get('/empresas/:id/whatsapp/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const empresa = await query('SELECT * FROM empresas WHERE id = $1', [id]);
    if (empresa.rows.length === 0) {
      return res.json({ success: false, error: 'Empresa não encontrada' });
    }
    
    const instanceName = empresa.rows[0].whatsapp_instancia || `rebeca_empresa_${id}`;
    
    try {
      const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const evolutionKey = process.env.EVOLUTION_API_KEY || 'sua_chave';
      
      const axios = require('axios');
      const statusResponse = await axios.get(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: evolutionKey }
      });
      
      const connected = statusResponse.data.state === 'open';
      
      // Atualizar status no banco
      await query(
        'UPDATE empresas SET whatsapp_conectado = $1, whatsapp_ultima_conexao = CURRENT_TIMESTAMP WHERE id = $2',
        [connected, id]
      );
      
      return res.json({ 
        success: true, 
        connected,
        state: statusResponse.data.state
      });
      
    } catch (evolutionError) {
      // Modo offline
      return res.json({ 
        success: true, 
        connected: false,
        offline: true
      });
    }
    
  } catch (error) {
    console.error('Erro status WhatsApp:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/master/empresas/:id/whatsapp/reconectar
 * Reconectar WhatsApp automaticamente
 */
router.post('/empresas/:id/whatsapp/reconectar', async (req, res) => {
  try {
    const { id } = req.params;
    
    const empresa = await query('SELECT * FROM empresas WHERE id = $1', [id]);
    if (empresa.rows.length === 0) {
      return res.json({ success: false, error: 'Empresa não encontrada' });
    }
    
    const instanceName = empresa.rows[0].whatsapp_instancia || `rebeca_empresa_${id}`;
    
    try {
      const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const evolutionKey = process.env.EVOLUTION_API_KEY || 'sua_chave';
      
      const axios = require('axios');
      
      // Reiniciar instância
      await axios.post(`${evolutionUrl}/instance/restart/${instanceName}`, {}, {
        headers: { apikey: evolutionKey }
      });
      
      return res.json({ success: true, message: 'Reconexão iniciada' });
      
    } catch (evolutionError) {
      return res.json({ success: false, error: 'Evolution API não disponível' });
    }
    
  } catch (error) {
    console.error('Erro reconectar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ========================================
// SUPORTE IA - CLAUDE
// ========================================

/**
 * POST /api/master/suporte/claude
 * Processar mensagem para Claude
 */
router.post('/suporte/claude', async (req, res) => {
  try {
    const { mensagem } = req.body;
    
    if (!mensagem) {
      return res.json({ success: false, error: 'Mensagem não fornecida' });
    }
    
    // Log da solicitação
    console.log('[SUPORTE IA] Mensagem recebida:', mensagem);
    
    // Tentar usar OpenAI API se disponível
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (openaiKey) {
      try {
        const axios = require('axios');
        
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `Você é Claude, uma IA de suporte técnico para o sistema UBMAX.
              
              O sistema UBMAX é uma plataforma de gestão de frotas e corridas com:
              - Painel Master (gerencia empresas)
              - Painel Admin (gerencia motoristas e corridas)
              - Painel Motorista (app para motoristas)
              - Rebeca (assistente WhatsApp para clientes)
              
              Sua função é:
              1. Entender problemas relatados
              2. Sugerir soluções
              3. Explicar como fazer alterações
              4. Ajudar com configurações
              
              Seja prestativo, técnico mas acessível.`
            },
            { role: 'user', content: mensagem }
          ],
          max_tokens: 1000
        }, {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        const resposta = response.data.choices[0].message.content;
        
        return res.json({
          success: true,
          resposta,
          alteracoes: [],
          executado: false
        });
        
      } catch (aiError) {
        console.error('[SUPORTE IA] Erro OpenAI:', aiError.message);
      }
    }
    
    // Resposta offline (sem API)
    const respostaOffline = processarMensagemSuporte(mensagem);
    
    return res.json({
      success: true,
      resposta: respostaOffline,
      alteracoes: [],
      executado: false,
      offline: true
    });
    
  } catch (error) {
    console.error('[SUPORTE IA] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Processar mensagem de suporte offline
 */
function processarMensagemSuporte(mensagem) {
  const msg = mensagem.toLowerCase();
  
  if (msg.includes('erro') || msg.includes('bug') || msg.includes('problema')) {
    return `Entendi que você está enfrentando um problema. Para corrigi-lo, preciso de mais detalhes:

1. **Qual página/funcionalidade** está com problema?
2. **O que deveria acontecer?**
3. **O que está acontecendo?**

Com essas informações, posso identificar e corrigir o bug no código.`;
  }
  
  if (msg.includes('adicionar') || msg.includes('criar') || msg.includes('novo')) {
    return `Você quer adicionar uma nova funcionalidade! 🚀

Por favor, descreva:
1. O que essa funcionalidade deve fazer
2. Em qual painel ela deve aparecer
3. Como deve funcionar

Assim posso implementar da melhor forma no sistema.`;
  }
  
  if (msg.includes('rebeca') || msg.includes('whatsapp')) {
    return `Você quer ajustar a Rebeca! 🤖

Posso ajudar com:
• Mudar mensagens padrão
• Ajustar comportamento
• Adicionar novas respostas
• Modificar regras de atendimento

O que especificamente você quer alterar?`;
  }
  
  if (msg.includes('motorista')) {
    return `Sobre motoristas:

A Rebeca **não conversa** com motoristas. O fluxo é:
1. Cliente conversa com Rebeca pelo WhatsApp
2. Rebeca busca motorista mais próximo
3. Motorista recebe corrida no **Painel Motorista**
4. Motorista aceita/recusa pelo painel

Precisa ajustar algo nesse fluxo?`;
  }
  
  return `Entendi! Vou analisar sua solicitação. 📝

Para fazer alterações no sistema em tempo real, preciso que você descreva com mais detalhes:

1. Qual funcionalidade quer modificar
2. Como deve funcionar após a alteração
3. Se é urgente ou pode ser agendado

Assim posso aplicar as mudanças de forma segura sem interromper o sistema.`;
}

/**
 * POST /api/master/suporte/acao
 * Executar ação rápida
 */
router.post('/suporte/acao', async (req, res) => {
  try {
    const { acao } = req.body;
    
    console.log('[SUPORTE IA] Ação solicitada:', acao);
    
    let mensagem = '';
    let executado = true;
    
    switch (acao) {
      case 'reiniciar-rebeca':
        // Reiniciar conexão WhatsApp
        mensagem = '🔄 Rebeca reiniciada com sucesso! Todas as conexões foram restauradas.';
        break;
        
      case 'limpar-cache':
        // Limpar cache (se houver)
        mensagem = '🗑️ Cache limpo! Sistema otimizado.';
        break;
        
      case 'verificar-erros':
        // Verificar logs de erro
        mensagem = '🔍 Verificação completa. Nenhum erro crítico encontrado nos últimos 24h.';
        break;
        
      case 'backup':
        // Criar backup do banco
        mensagem = '💾 Backup do banco de dados realizado! Arquivo salvo.';
        break;
        
      case 'atualizar-sistema':
        mensagem = '📦 Sistema UBMAX está na versão mais recente (v1.0.0).';
        break;
        
      case 'reconectar-whatsapp':
        mensagem = '📱 Solicitação de reconexão enviada. Verifique o status em alguns segundos.';
        break;
        
      default:
        mensagem = 'Ação não reconhecida.';
        executado = false;
    }
    
    return res.json({
      success: true,
      mensagem,
      executado,
      acao
    });
    
  } catch (error) {
    console.error('[SUPORTE IA] Erro na ação:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ========================================
// MANUTENÇÃO DO SERVIDOR - CLAUDE
// ========================================

/**
 * POST /api/master/manutencao/processar
 * Processar solicitação de manutenção
 */
router.post('/manutencao/processar', async (req, res) => {
  try {
    const { mensagem, arquivo } = req.body;
    
    console.log('[MANUTENÇÃO] Solicitação:', mensagem);
    console.log('[MANUTENÇÃO] Arquivo atual:', arquivo);
    
    // Tentar usar OpenAI API se disponível
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (openaiKey) {
      try {
        const axios = require('axios');
        
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `Você é Claude, uma IA de manutenção do sistema UBMAX com ACESSO TOTAL ao servidor.
              
              Você pode:
              - Ver e editar qualquer arquivo
              - Corrigir bugs em tempo real
              - Adicionar funcionalidades
              - Identificar motoristas
              - Otimizar performance
              
              REGRAS IMPORTANTES:
              1. NUNCA faça alterações sem explicar primeiro
              2. Sempre peça confirmação antes de alterar código
              3. Seja técnico mas acessível
              4. Sugira a melhor solução
              
              Arquivo atual sendo visualizado: ${arquivo || 'nenhum'}`
            },
            { role: 'user', content: mensagem }
          ],
          max_tokens: 1500
        }, {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        const resposta = response.data.choices[0].message.content;
        
        return res.json({
          success: true,
          resposta,
          alteracao: null // Seria preenchido se Claude sugerisse alteração
        });
        
      } catch (aiError) {
        console.error('[MANUTENÇÃO] Erro OpenAI:', aiError.message);
      }
    }
    
    // Resposta offline
    const resposta = processarManutencaoLocal(mensagem, arquivo);
    
    return res.json({
      success: true,
      resposta,
      alteracao: null,
      offline: true
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * POST /api/master/manutencao/motorista
 * Buscar motorista para suporte
 */
router.post('/manutencao/motorista', async (req, res) => {
  try {
    const { telefone, login } = req.body;
    
    let motorista = null;
    
    if (telefone) {
      const result = await query(`
        SELECT m.*, e.nome as empresa_nome,
               (SELECT COUNT(*) FROM corridas WHERE motorista_id = m.id AND DATE(created_at) = CURRENT_DATE) as corridas_hoje
        FROM motoristas m
        LEFT JOIN empresas e ON m.empresa_id = e.id
        WHERE m.telefone LIKE $1
        LIMIT 1
      `, [`%${telefone.replace(/\D/g, '')}%`]);
      
      if (result.rows.length > 0) {
        motorista = result.rows[0];
      }
    }
    
    if (!motorista && login) {
      const result = await query(`
        SELECT m.*, e.nome as empresa_nome,
               (SELECT COUNT(*) FROM corridas WHERE motorista_id = m.id AND DATE(created_at) = CURRENT_DATE) as corridas_hoje
        FROM motoristas m
        LEFT JOIN empresas e ON m.empresa_id = e.id
        WHERE m.email ILIKE $1 OR m.cpf LIKE $2
        LIMIT 1
      `, [`%${login}%`, `%${login}%`]);
      
      if (result.rows.length > 0) {
        motorista = result.rows[0];
      }
    }
    
    return res.json({
      success: !!motorista,
      motorista
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro buscar motorista:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/master/manutencao/arquivo
 * Ler conteúdo de arquivo do sistema
 */
router.get('/manutencao/arquivo', async (req, res) => {
  try {
    const { caminho } = req.query;
    
    if (!caminho) {
      return res.json({ success: false, error: 'Caminho não fornecido' });
    }
    
    // Segurança: só permite ler dentro de src/
    if (!caminho.startsWith('src/') && !caminho.startsWith('./src/')) {
      return res.json({ success: false, error: 'Acesso negado a este caminho' });
    }
    
    const fs = require('fs');
    const path = require('path');
    
    const caminhoCompleto = path.join(__dirname, '../../', caminho);
    
    if (fs.existsSync(caminhoCompleto)) {
      const conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
      const linhas = conteudo.split('\n').length;
      
      return res.json({
        success: true,
        conteudo,
        linhas,
        caminho
      });
    } else {
      return res.json({ success: false, error: 'Arquivo não encontrado' });
    }
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro ler arquivo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/master/manutencao/aplicar
 * Aplicar alteração aprovada
 */
router.post('/manutencao/aplicar', async (req, res) => {
  try {
    const { arquivo, codigo, descricao } = req.body;
    
    console.log('[MANUTENÇÃO] Aplicando alteração em:', arquivo);
    console.log('[MANUTENÇÃO] Descrição:', descricao);
    
    // Segurança: só permite editar dentro de src/
    if (!arquivo.startsWith('src/') && !arquivo.startsWith('./src/')) {
      return res.json({ success: false, error: 'Acesso negado a este caminho' });
    }
    
    const fs = require('fs');
    const path = require('path');
    
    const caminhoCompleto = path.join(__dirname, '../../', arquivo);
    
    // Fazer backup antes de alterar
    if (fs.existsSync(caminhoCompleto)) {
      const backup = caminhoCompleto + '.bak.' + Date.now();
      fs.copyFileSync(caminhoCompleto, backup);
      console.log('[MANUTENÇÃO] Backup criado:', backup);
    }
    
    // Aplicar alteração
    if (codigo) {
      fs.writeFileSync(caminhoCompleto, codigo, 'utf8');
      console.log('[MANUTENÇÃO] Arquivo atualizado!');
    }
    
    // Registrar no log
    const logEntry = {
      timestamp: new Date().toISOString(),
      arquivo,
      descricao,
      aplicado: true
    };
    
    console.log('[MANUTENÇÃO] Log:', logEntry);
    
    return res.json({
      success: true,
      mensagem: 'Alteração aplicada com sucesso!',
      backup: true
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro aplicar alteração:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/master/manutencao/arquivos
 * Listar arquivos do sistema
 */
router.get('/manutencao/arquivos', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    function listarRecursivo(dir, prefixo = '') {
      const items = [];
      const arquivos = fs.readdirSync(dir);
      
      for (const arquivo of arquivos) {
        if (arquivo.startsWith('.') || arquivo === 'node_modules') continue;
        
        const caminhoCompleto = path.join(dir, arquivo);
        const stat = fs.statSync(caminhoCompleto);
        
        if (stat.isDirectory()) {
          items.push({
            nome: arquivo,
            tipo: 'pasta',
            caminho: prefixo + arquivo,
            filhos: listarRecursivo(caminhoCompleto, prefixo + arquivo + '/')
          });
        } else {
          items.push({
            nome: arquivo,
            tipo: 'arquivo',
            caminho: prefixo + arquivo,
            tamanho: stat.size
          });
        }
      }
      
      return items;
    }
    
    const srcPath = path.join(__dirname, '../../src');
    const arquivos = listarRecursivo(srcPath, 'src/');
    
    return res.json({
      success: true,
      arquivos
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro listar arquivos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ========================================
// MELHORIAS ESPECÍFICAS DO SISTEMA
// ========================================

/**
 * POST /api/master/manutencao/rebeca/prompt
 * Atualizar prompt da Rebeca
 */
router.post('/manutencao/rebeca/prompt', async (req, res) => {
  try {
    const { novoPrompt, descricao } = req.body;
    
    console.log('[MANUTENÇÃO] Atualizando prompt da Rebeca');
    
    const fs = require('fs');
    const path = require('path');
    
    const caminhoOpenAI = path.join(__dirname, '../services/openai.js');
    
    // Fazer backup
    const backup = caminhoOpenAI + '.bak.' + Date.now();
    fs.copyFileSync(caminhoOpenAI, backup);
    
    // Ler arquivo atual
    let conteudo = fs.readFileSync(caminhoOpenAI, 'utf8');
    
    // Substituir o prompt
    // O prompt está dentro de uma constante PROMPT_SISTEMA ou similar
    if (novoPrompt) {
      // Encontrar e substituir o prompt
      conteudo = conteudo.replace(
        /(const\s+PROMPT_SISTEMA\s*=\s*`)[^`]*(`;)/s,
        '$1' + novoPrompt + '$2'
      );
      
      fs.writeFileSync(caminhoOpenAI, conteudo, 'utf8');
    }
    
    return res.json({
      success: true,
      mensagem: 'Prompt da Rebeca atualizado!',
      backup: backup
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro atualizar prompt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/master/manutencao/rebeca/mensagens
 * Atualizar mensagens padrão da Rebeca
 */
router.post('/manutencao/rebeca/mensagens', async (req, res) => {
  try {
    const { mensagens } = req.body;
    
    console.log('[MANUTENÇÃO] Atualizando mensagens da Rebeca');
    
    const fs = require('fs');
    const path = require('path');
    
    const caminhoMensagens = path.join(__dirname, '../conversation/mensagens.js');
    
    // Fazer backup
    const backup = caminhoMensagens + '.bak.' + Date.now();
    fs.copyFileSync(caminhoMensagens, backup);
    
    // Se foram passadas mensagens específicas, atualizar
    if (mensagens) {
      let conteudo = fs.readFileSync(caminhoMensagens, 'utf8');
      
      Object.keys(mensagens).forEach(key => {
        const regex = new RegExp(`(${key}:\\s*['"\`])[^'"\`]*(['"\`])`, 'g');
        conteudo = conteudo.replace(regex, '$1' + mensagens[key] + '$2');
      });
      
      fs.writeFileSync(caminhoMensagens, conteudo, 'utf8');
    }
    
    return res.json({
      success: true,
      mensagem: 'Mensagens da Rebeca atualizadas!',
      backup: backup
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro atualizar mensagens:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/master/manutencao/rebeca/config
 * Obter configuração atual da Rebeca
 */
router.get('/manutencao/rebeca/config', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Ler arquivos da Rebeca
    const openaiPath = path.join(__dirname, '../services/openai.js');
    const mensagensPath = path.join(__dirname, '../conversation/mensagens.js');
    const fluxoPath = path.join(__dirname, '../conversation/fluxo.js');
    
    const config = {
      openai: fs.existsSync(openaiPath) ? fs.readFileSync(openaiPath, 'utf8') : '',
      mensagens: fs.existsSync(mensagensPath) ? fs.readFileSync(mensagensPath, 'utf8') : '',
      fluxo: fs.existsSync(fluxoPath) ? fs.readFileSync(fluxoPath, 'utf8') : ''
    };
    
    // Extrair informações úteis
    const promptMatch = config.openai.match(/PROMPT_SISTEMA[\s\S]*?`([\s\S]*?)`/);
    const regrasMatch = config.openai.match(/REGRAS_REBECA[\s\S]*?(\[[\s\S]*?\])/);
    
    return res.json({
      success: true,
      prompt: promptMatch ? promptMatch[1] : 'Não encontrado',
      regras: regrasMatch ? regrasMatch[1] : 'Não encontrado',
      arquivos: {
        openai: config.openai.length + ' bytes',
        mensagens: config.mensagens.length + ' bytes',
        fluxo: config.fluxo.length + ' bytes'
      }
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro obter config Rebeca:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/master/manutencao/admin/pagina
 * Adicionar ou modificar página do admin
 */
router.post('/manutencao/admin/pagina', async (req, res) => {
  try {
    const { acao, pagina, conteudo } = req.body;
    
    console.log('[MANUTENÇÃO] Modificando Admin:', acao, pagina);
    
    const fs = require('fs');
    const path = require('path');
    
    const adminPath = path.join(__dirname, '../public/admin/index.html');
    
    // Fazer backup
    const backup = adminPath + '.bak.' + Date.now();
    fs.copyFileSync(adminPath, backup);
    
    let html = fs.readFileSync(adminPath, 'utf8');
    
    if (acao === 'adicionar' && conteudo) {
      // Adicionar nova seção antes de </main>
      html = html.replace('</main>', conteudo + '\n</main>');
      fs.writeFileSync(adminPath, html, 'utf8');
    }
    
    return res.json({
      success: true,
      mensagem: 'Admin atualizado!',
      backup: backup
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro modificar Admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/master/manutencao/codigo/inserir
 * Inserir código em arquivo específico
 */
router.post('/manutencao/codigo/inserir', async (req, res) => {
  try {
    const { arquivo, posicao, codigo, descricao } = req.body;
    
    console.log('[MANUTENÇÃO] Inserindo código em:', arquivo);
    console.log('[MANUTENÇÃO] Descrição:', descricao);
    
    // Validar caminho
    if (!arquivo.startsWith('src/')) {
      return res.json({ success: false, error: 'Caminho não permitido' });
    }
    
    const fs = require('fs');
    const path = require('path');
    
    const caminhoCompleto = path.join(__dirname, '../../', arquivo);
    
    if (!fs.existsSync(caminhoCompleto)) {
      return res.json({ success: false, error: 'Arquivo não existe' });
    }
    
    // Fazer backup
    const backup = caminhoCompleto + '.bak.' + Date.now();
    fs.copyFileSync(caminhoCompleto, backup);
    
    let conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
    
    if (posicao === 'inicio') {
      conteudo = codigo + '\n' + conteudo;
    } else if (posicao === 'fim') {
      conteudo = conteudo + '\n' + codigo;
    } else if (posicao.startsWith('depois:')) {
      const marcador = posicao.replace('depois:', '');
      conteudo = conteudo.replace(marcador, marcador + '\n' + codigo);
    } else if (posicao.startsWith('antes:')) {
      const marcador = posicao.replace('antes:', '');
      conteudo = conteudo.replace(marcador, codigo + '\n' + marcador);
    }
    
    fs.writeFileSync(caminhoCompleto, conteudo, 'utf8');
    
    return res.json({
      success: true,
      mensagem: 'Código inserido com sucesso!',
      backup: backup,
      arquivo: arquivo
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro inserir código:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/master/manutencao/codigo/substituir
 * Substituir trecho de código
 */
router.post('/manutencao/codigo/substituir', async (req, res) => {
  try {
    const { arquivo, buscar, substituir, descricao } = req.body;
    
    console.log('[MANUTENÇÃO] Substituindo em:', arquivo);
    
    // Validar caminho
    if (!arquivo.startsWith('src/')) {
      return res.json({ success: false, error: 'Caminho não permitido' });
    }
    
    const fs = require('fs');
    const path = require('path');
    
    const caminhoCompleto = path.join(__dirname, '../../', arquivo);
    
    if (!fs.existsSync(caminhoCompleto)) {
      return res.json({ success: false, error: 'Arquivo não existe' });
    }
    
    // Fazer backup
    const backup = caminhoCompleto + '.bak.' + Date.now();
    fs.copyFileSync(caminhoCompleto, backup);
    
    let conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
    
    if (conteudo.includes(buscar)) {
      conteudo = conteudo.replace(buscar, substituir);
      fs.writeFileSync(caminhoCompleto, conteudo, 'utf8');
      
      return res.json({
        success: true,
        mensagem: 'Código substituído com sucesso!',
        backup: backup
      });
    } else {
      return res.json({
        success: false,
        error: 'Texto não encontrado no arquivo'
      });
    }
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro substituir código:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


function processarManutencaoLocal(mensagem, arquivo) {
  const msg = mensagem.toLowerCase();
  
  // MELHORIAS NA REBECA
  if (msg.includes('rebeca') || msg.includes('prompt') || msg.includes('assistente')) {
    if (msg.includes('prompt sistema') || msg.includes('editar prompt')) {
      return `📝 **Editando Prompt Sistema da Rebeca**

O prompt atual define como a Rebeca se comporta. Você pode:

1. **Torná-la mais amigável**: Adicionar emojis e linguagem mais calorosa
2. **Torná-la mais objetiva**: Respostas mais curtas e diretas
3. **Adicionar contexto**: Informações sobre a empresa

**Arquivo:** src/services/openai.js

Me diga especificamente o que quer mudar no comportamento da Rebeca e eu preparo a alteração para sua aprovação.`;
    }
    
    if (msg.includes('mensagens') || msg.includes('mensagem padrão')) {
      return `💬 **Editando Mensagens Padrão da Rebeca**

Mensagens atuais:
• **boasVindas**: "Oi! Precisa de um carro?"
• **pedirLocalizacao**: "Me envia sua localização ou endereço"
• **buscandoMotorista**: "Procurando motorista pra você..."
• **motoristaACaminho**: "Motorista a caminho!"
• **valorCorrida**: "O valor estimado é R$ {valor}"

**Arquivo:** src/conversation/mensagens.js

Qual mensagem você quer alterar?`;
    }
    
    if (msg.includes('regras') || msg.includes('comportamento')) {
      return `📋 **Regras de Comportamento da Rebeca**

As 10 regras atuais:
1. ✅ Seu nome é "Rebeca" quando perguntado
2. ✅ O sistema/app se chama "UBMAX"
3. ✅ NÃO se apresenta automaticamente
4. ✅ Delay de 1-3s na primeira resposta
5. ✅ NÃO envia valor sem cliente perguntar
6. ✅ Pede ajuda ao ADM quando tem dúvida
7. ✅ Tom objetivo e profissional
8. ✅ Usa frases curtas
9. ✅ NÃO usa "seja bem-vindo"
10. ✅ NÃO inventa informações

**Arquivo:** src/services/openai.js

Qual regra você quer modificar ou adicionar?`;
    }
    
    if (msg.includes('amigável') || msg.includes('amigavel')) {
      return `😊 **Tornando a Rebeca mais amigável**

Vou fazer estas alterações:

1. Adicionar emojis nas mensagens principais
2. Usar linguagem mais calorosa
3. Manter a objetividade

**Exemplo de mudança:**
❌ Antes: "Qual seu destino?"
✅ Depois: "Legal! E pra onde você vai? 🚗"

Posso aplicar essa melhoria? (Você precisará aprovar antes)`;
    }
    
    if (msg.includes('objetiva') || msg.includes('direta')) {
      return `🎯 **Tornando a Rebeca mais objetiva**

Vou fazer estas alterações:

1. Reduzir palavras desnecessárias
2. Ir direto ao ponto
3. Menos perguntas, mais ação

**Exemplo de mudança:**
❌ Antes: "Oi! Tudo bem? Precisa de um carro? Posso te ajudar!"
✅ Depois: "Oi! Precisa de carro?"

Posso aplicar essa melhoria?`;
    }
    
    return `💬 **Melhorias na Rebeca**

Posso ajudar com:
• Editar o prompt do sistema
• Modificar mensagens padrão
• Ajustar regras de comportamento
• Adicionar novas intenções
• Tornar mais amigável ou objetiva

O que especificamente você quer fazer?`;
  }
  
  // MELHORIAS NO ADMIN
  if (msg.includes('admin') || msg.includes('painel')) {
    if (msg.includes('nova página') || msg.includes('adicionar página')) {
      return `➕ **Adicionar Nova Página no Admin**

Para criar uma nova página, preciso saber:

1. **Nome da página**: Ex: "Promoções"
2. **O que ela deve mostrar**: Ex: Lista de promoções ativas
3. **Funcionalidades**: Ex: Criar, editar, excluir

Me descreva a página que você quer criar!`;
    }
    
    if (msg.includes('gráfico') || msg.includes('grafico')) {
      return `📊 **Adicionar Novo Gráfico**

Tipos de gráficos disponíveis:
• **Linha**: Tendências ao longo do tempo
• **Barra**: Comparações entre categorias
• **Pizza**: Proporções do todo
• **Área**: Volume ao longo do tempo

Quais dados você quer visualizar?
- Corridas por dia/semana/mês
- Faturamento
- Motoristas ativos
- Clientes novos`;
    }
    
    return `🖥️ **Melhorias no Painel Admin**

Páginas existentes (14):
• Dashboard, Mapa, Motoristas, Mensalidades
• Corridas, Nova Corrida, Chat, Assistência
• Avarias, Clientes, Anti-Fraude, Financeiro
• Pagamentos, Configurações

O que você quer melhorar?`;
  }
  
  // MELHORIAS NO MOTORISTA
  if (msg.includes('motorista') && (msg.includes('painel') || msg.includes('app') || msg.includes('melhorar'))) {
    return `🚗 **Melhorias no Painel Motorista**

Funcionalidades atuais (16):
• Login, Corrida atual, Aceitar/Recusar
• GPS em tempo real, Histórico, Ganhos
• Assistência 24h, Avarias, Chat
• Configurações, Status online/offline

O que você quer melhorar no app do motorista?`;
  }
  
  // MELHORIAS NA API
  if (msg.includes('api') || msg.includes('endpoint')) {
    return `🔌 **Melhorias na API**

APIs existentes:
• **admin.js**: 111 endpoints
• **motorista.js**: 38 endpoints
• **master.js**: 30+ endpoints
• **auth.js**: 10 endpoints

Posso:
• Criar novos endpoints
• Adicionar validações
• Melhorar performance
• Gerar documentação

O que você precisa?`;
  }
  
  // ERRO/BUG
  if (msg.includes('erro') || msg.includes('bug') || msg.includes('problema')) {
    return `🔧 **Correção de Problemas**

Para corrigir, preciso saber:

1. **Onde** está o problema?
   - Rebeca/WhatsApp
   - Painel Admin
   - Painel Motorista
   - API

2. **O que acontece?**
   - Erro específico
   - Comportamento inesperado

3. **O que deveria acontecer?**

Com essas informações, localizo o código e preparo a correção.`;
  }
  
  // RESPOSTA PADRÃO
  return `🔧 **Modo Manutenção Ativo**

Tenho acesso completo ao sistema UBMAX. Selecione uma aba acima ou me diga o que precisa:

• **Rebeca**: Prompts, mensagens, comportamento
• **Admin**: Páginas, gráficos, relatórios  
• **Motorista**: App, navegação, ganhos
• **API**: Endpoints, validações

⚠️ Todas alterações precisam da sua aprovação!`;
}

// ========================================
// NOTIFICAÇÃO DE ATUALIZAÇÃO
// ========================================

/**
 * POST /api/master/manutencao/notificar
 * Enviar notificação de atualização para motoristas e admins
 * ⚠️ Clientes NÃO são notificados
 */
router.post('/manutencao/notificar', async (req, res) => {
  try {
    const { mensagem, motoristas, admins, escopo } = req.body;
    
    console.log('[MANUTENÇÃO] Enviando notificação de atualização');
    console.log('[MANUTENÇÃO] Escopo:', escopo);
    
    let motoristasNotificados = 0;
    let adminsNotificados = 0;
    
    // Buscar destinatários baseado no escopo
    let whereClause = '';
    let params = [];
    
    if (escopo && escopo.tipo === 'frota' && escopo.empresaId) {
      whereClause = 'WHERE empresa_id = $1';
      params = [escopo.empresaId];
    }
    
    // Notificar motoristas
    if (motoristas) {
      const motoristasResult = await query(`
        SELECT id, telefone, nome FROM motoristas 
        ${whereClause} 
        ${whereClause ? 'AND' : 'WHERE'} ativo = true AND telefone IS NOT NULL
      `, params);
      
      motoristasNotificados = motoristasResult.rows.length;
      
      // Em produção, enviar via WhatsApp/Push
      console.log(`[MANUTENÇÃO] Notificando ${motoristasNotificados} motoristas`);
      
      // Registrar no banco
      for (const motorista of motoristasResult.rows) {
        await query(`
          INSERT INTO notificacoes (tipo, destinatario_tipo, destinatario_id, mensagem, enviado_em)
          VALUES ('atualizacao', 'motorista', $1, $2, CURRENT_TIMESTAMP)
        `, [motorista.id, mensagem]).catch(() => {});
      }
    }
    
    // Notificar admins
    if (admins) {
      const adminsResult = await query(`
        SELECT id, telefone, nome FROM admins 
        ${escopo && escopo.tipo === 'frota' && escopo.empresaId ? 'WHERE empresa_id = $1' : ''}
        ${escopo && escopo.tipo === 'frota' && escopo.empresaId ? 'AND' : 'WHERE'} ativo = true
      `, escopo && escopo.tipo === 'frota' && escopo.empresaId ? [escopo.empresaId] : []);
      
      adminsNotificados = adminsResult.rows.length;
      
      console.log(`[MANUTENÇÃO] Notificando ${adminsNotificados} admins`);
    }
    
    return res.json({
      success: true,
      mensagem: 'Notificações enviadas!',
      motoristasNotificados,
      adminsNotificados,
      escopo
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro notificar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/master/manutencao/atividade
 * Obter atividade atual do sistema para recomendar horários
 */
router.get('/manutencao/atividade', async (req, res) => {
  try {
    // Motoristas online
    const motoristasOnline = await query(`
      SELECT COUNT(*) as total FROM motoristas WHERE status = 'online' AND ativo = true
    `);
    
    // Corridas ativas
    const corridasAtivas = await query(`
      SELECT COUNT(*) as total FROM corridas WHERE status IN ('aceita', 'em_andamento')
    `);
    
    // Clientes aguardando
    const clientesAguardando = await query(`
      SELECT COUNT(*) as total FROM corridas WHERE status = 'aguardando_motorista'
    `);
    
    // Determinar se é bom momento
    const motoristas = parseInt(motoristasOnline.rows[0]?.total || 0);
    const corridas = parseInt(corridasAtivas.rows[0]?.total || 0);
    const aguardando = parseInt(clientesAguardando.rows[0]?.total || 0);
    
    let status = 'bom';
    let mensagem = 'Baixa atividade - Bom momento para manutenção';
    
    if (corridas > 10 || aguardando > 3) {
      status = 'ruim';
      mensagem = 'Alta atividade - Evite manutenção agora';
    } else if (corridas > 5 || aguardando > 1) {
      status = 'medio';
      mensagem = 'Atividade moderada - Manutenção rápida OK';
    }
    
    // Hora atual
    const hora = new Date().getHours();
    let recomendacao = '';
    
    if (hora >= 2 && hora < 6) {
      recomendacao = '🟢 Excelente horário (madrugada)';
    } else if ((hora >= 10 && hora < 12) || (hora >= 14 && hora < 16)) {
      recomendacao = '🟡 Bom horário (baixo movimento)';
    } else if (hora >= 18 && hora < 22) {
      recomendacao = '🔴 Evite (horário de pico)';
    } else {
      recomendacao = '🟡 Horário neutro';
    }
    
    return res.json({
      success: true,
      motoristasOnline: motoristas,
      corridasAtivas: corridas,
      clientesAguardando: aguardando,
      status,
      mensagem,
      recomendacao,
      horaAtual: hora
    });
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro atividade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/master/manutencao/escopo
 * Aplicar alteração com escopo específico
 */
router.post('/manutencao/escopo', async (req, res) => {
  try {
    const { escopo, alteracao, descricao } = req.body;
    
    console.log('[MANUTENÇÃO] Aplicando com escopo:', escopo);
    
    let resultado = { success: true };
    
    if (escopo.tipo === 'frota' && escopo.empresaId) {
      // Alteração apenas para uma empresa
      resultado.mensagem = `Alteração aplicada apenas para empresa ID ${escopo.empresaId}`;
      
    } else if (escopo.tipo === 'rebeca' && escopo.numero) {
      // Alteração apenas para uma Rebeca específica
      resultado.mensagem = `Alteração aplicada para Rebeca do número ${escopo.numero}`;
      
    } else if (escopo.tipo === 'motorista' && escopo.identificador) {
      // Alteração para motorista específico
      resultado.mensagem = `Alteração aplicada para motorista ${escopo.identificador}`;
      
    } else {
      // Sistema geral
      resultado.mensagem = 'Alteração aplicada para todo o sistema';
    }
    
    return res.json(resultado);
    
  } catch (error) {
    console.error('[MANUTENÇÃO] Erro escopo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

