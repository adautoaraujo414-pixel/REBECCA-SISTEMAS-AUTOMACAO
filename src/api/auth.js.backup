// ========================================
// REBECA - API AUTENTICAÇÃO
// Login de motoristas
// ========================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../database/connection');

/**
 * Gera hash de senha simples
 */
function hashSenha(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

/**
 * Gera token de sessão
 */
function gerarToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * POST /api/auth/motorista/login
 * Login do motorista
 */
router.post('/motorista/login', async (req, res) => {
  try {
    const { telefone, senha } = req.body;

    if (!telefone || !senha) {
      return res.status(400).json({ 
        success: false, 
        error: 'Telefone e senha são obrigatórios' 
      });
    }

    // Buscar motorista com dados da empresa
    const result = await query(
      `SELECT m.*, e.id as empresa_id, e.nome as empresa_nome, 
              e.white_label, e.nome_exibido
       FROM motoristas m
       LEFT JOIN empresas e ON m.empresa_id = e.id
       WHERE m.telefone = $1 AND m.ativo = true`,
      [telefone.replace(/\D/g, '')]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Telefone ou senha incorretos' 
      });
    }

    const motorista = result.rows[0];

    // Verificar senha
    if (motorista.senha_hash !== hashSenha(senha)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Telefone ou senha incorretos' 
      });
    }

    // Gerar token
    const token = gerarToken();
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Salvar token
    await query(
      `UPDATE motoristas 
       SET token_sessao = $1, token_expira_em = $2, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [token, expiraEm, motorista.id]
    );

    // Determinar nome a exibir (White Label)
    const nomeExibido = motorista.white_label && motorista.nome_exibido 
      ? motorista.nome_exibido 
      : 'UBMAX';

    // Retornar dados (sem senha)
    res.json({
      success: true,
      data: {
        id: motorista.id,
        nome: motorista.nome,
        telefone: motorista.telefone,
        veiculo_modelo: motorista.veiculo_modelo,
        veiculo_cor: motorista.veiculo_cor,
        veiculo_placa: motorista.veiculo_placa,
        status: motorista.status,
        token,
        // Dados da empresa para White Label
        empresa_id: motorista.empresa_id,
        empresa_nome: motorista.empresa_nome,
        white_label: motorista.white_label || false,
        nome_exibido: nomeExibido
      }
    });

  } catch (error) {
    console.error('Erro login motorista:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/auth/motorista/verificar
 * Verifica se token é válido
 */
router.post('/motorista/verificar', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }

    const result = await query(
      `SELECT * FROM motoristas 
       WHERE token_sessao = $1 AND token_expira_em > NOW() AND ativo = true`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }

    const motorista = result.rows[0];

    res.json({
      success: true,
      data: {
        id: motorista.id,
        nome: motorista.nome,
        telefone: motorista.telefone,
        veiculo_modelo: motorista.veiculo_modelo,
        veiculo_cor: motorista.veiculo_cor,
        status: motorista.status,
        disponivel: motorista.disponivel,
      }
    });

  } catch (error) {
    console.error('Erro verificar token:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/auth/motorista/logout
 * Logout do motorista
 */
router.post('/motorista/logout', async (req, res) => {
  try {
    const { token } = req.body;

    if (token) {
      await query(
        `UPDATE motoristas 
         SET token_sessao = NULL, token_expira_em = NULL, 
             status = 'offline', disponivel = false
         WHERE token_sessao = $1`,
        [token]
      );
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Erro logout:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/auth/motorista/acesso
 * Login via link de acesso (token gerado pelo ADM)
 * Motorista acessa: /motorista?token=XXX
 */
router.post('/motorista/acesso', async (req, res) => {
  try {
    const { token_acesso } = req.body;

    if (!token_acesso) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token de acesso não fornecido. Solicite o link ao administrador.' 
      });
    }

    // Buscar motorista pelo token de acesso
    const result = await query(
      'SELECT * FROM motoristas WHERE token_acesso = $1 AND ativo = true',
      [token_acesso]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Link inválido ou expirado. Solicite um novo link ao administrador.' 
      });
    }

    const motorista = result.rows[0];

    // Gerar token de sessão
    const tokenSessao = gerarToken();
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Salvar token de sessão
    await query(
      `UPDATE motoristas 
       SET token_sessao = $1, token_expira_em = $2, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [tokenSessao, expiraEm, motorista.id]
    );

    console.log(`✅ Motorista ${motorista.nome} acessou via link`);

    // Buscar dados da empresa/frota para mostrar número da Rebeca
    let dadosFrota = {
      nome: process.env.NOME_FROTA || 'UBMAX',
      whatsapp: process.env.WHATSAPP_FROTA || '5514999990001'
    };

    if (motorista.empresa_id) {
      const empresa = await query(
        'SELECT nome, whatsapp_rebeca FROM empresas WHERE id = $1',
        [motorista.empresa_id]
      );
      if (empresa.rows.length > 0) {
        dadosFrota = {
          nome: empresa.rows[0].nome,
          whatsapp: empresa.rows[0].whatsapp_rebeca || dadosFrota.whatsapp
        };
      }
    }

    // Retornar dados
    res.json({
      success: true,
      data: {
        id: motorista.id,
        nome: motorista.nome,
        telefone: motorista.telefone,
        veiculo_modelo: motorista.veiculo_modelo,
        veiculo_cor: motorista.veiculo_cor,
        veiculo_placa: motorista.veiculo_placa,
        status: motorista.status,
        disponivel: motorista.disponivel,
        token: tokenSessao,
        frota: dadosFrota
      }
    });

  } catch (error) {
    console.error('Erro acesso via link:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// PRIMEIRO ACESSO MOTORISTA (CADASTRAR SENHA)
// ========================================

/**
 * GET /api/auth/motorista/validar-token
 * Valida token de primeiro acesso do motorista
 */
router.get('/motorista/validar-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token não fornecido' });
    }

    // Buscar motorista pelo token
    const result = await query(
      `SELECT id, nome, telefone, veiculo, cor, placa, primeiro_acesso, senha_hash
       FROM motoristas
       WHERE token_acesso = $1 AND ativo = true`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Link inválido ou expirado. Solicite um novo ao administrador.' 
      });
    }

    const motorista = result.rows[0];

    // Verificar se já cadastrou senha
    if (motorista.senha_hash && !motorista.primeiro_acesso) {
      return res.json({
        success: true,
        data: {
          id: motorista.id,
          nome: motorista.nome,
          telefone: motorista.telefone,
          jaConfigurado: true
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: motorista.id,
        nome: motorista.nome,
        telefone: motorista.telefone,
        veiculo: `${motorista.veiculo} ${motorista.cor}`,
        placa: motorista.placa,
        jaConfigurado: false
      }
    });

  } catch (error) {
    console.error('Erro validar token motorista:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/auth/motorista/configurar-acesso
 * Motorista cadastra sua senha no primeiro acesso
 */
router.post('/motorista/configurar-acesso', async (req, res) => {
  try {
    const { token, senha } = req.body;

    if (!token || !senha) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token e senha são obrigatórios' 
      });
    }

    if (senha.length < 4) {
      return res.status(400).json({ 
        success: false, 
        error: 'Senha deve ter pelo menos 4 caracteres' 
      });
    }

    // Buscar motorista
    const result = await query(
      `SELECT id, nome, telefone FROM motoristas WHERE token_acesso = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Token inválido' 
      });
    }

    const motorista = result.rows[0];

    // Hash da senha
    const crypto = require('crypto');
    const senhaHash = crypto.createHash('sha256').update(senha).digest('hex');

    // Gerar token de sessão
    const tokenSessao = gerarToken();
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    // Atualizar motorista
    await query(
      `UPDATE motoristas 
       SET senha_hash = $1, 
           token_sessao = $2, 
           token_expira_em = $3,
           primeiro_acesso = false,
           atualizado_em = NOW()
       WHERE id = $4`,
      [senhaHash, tokenSessao, expiraEm, motorista.id]
    );

    console.log(`✅ Motorista ${motorista.nome} configurou acesso`);

    // Buscar dados da frota
    let dadosFrota = {
      nome: process.env.NOME_FROTA || 'UBMAX',
      whatsapp: process.env.WHATSAPP_FROTA || '5514999990001'
    };

    res.json({
      success: true,
      message: 'Acesso configurado com sucesso!',
      data: {
        id: motorista.id,
        nome: motorista.nome,
        telefone: motorista.telefone,
        token: tokenSessao,
        frota: dadosFrota
      }
    });

  } catch (error) {
    console.error('Erro configurar acesso motorista:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * GET /api/auth/info-frota
 * Retorna informações da frota (número da Rebeca, nome, etc)
 */
router.get('/info-frota', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        nome: process.env.NOME_FROTA || 'UBMAX Transportes',
        whatsapp_rebeca: process.env.WHATSAPP_FROTA || '5514999990001',
        telefone: process.env.TELEFONE_FROTA || '14999990001',
        cidade: process.env.CIDADE_FROTA || 'Lins - SP'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ========================================
// PRIMEIRO ACESSO ADM (CADASTRAR SENHA)
// ========================================

/**
 * GET /api/auth/admin/validar-token
 * Valida token de primeiro acesso
 */
router.get('/admin/validar-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token não fornecido' 
      });
    }

    // Buscar empresa pelo token
    const result = await query(
      `SELECT id, nome, email, telefone, token_primeiro_acesso, admin_senha_hash
       FROM empresas 
       WHERE token_primeiro_acesso = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Token inválido ou expirado' 
      });
    }

    const empresa = result.rows[0];

    // Verificar se já cadastrou senha
    if (empresa.admin_senha_hash) {
      return res.status(400).json({ 
        success: false, 
        error: 'Senha já cadastrada. Faça login normalmente.',
        ja_cadastrado: true
      });
    }

    res.json({
      success: true,
      data: {
        nome: empresa.nome,
        email: empresa.email
      }
    });
  } catch (error) {
    console.error('Erro validar token:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/auth/admin/cadastrar-senha
 * Cadastra senha no primeiro acesso
 */
router.post('/admin/cadastrar-senha', async (req, res) => {
  try {
    const { token, senha, confirmar_senha } = req.body;

    if (!token || !senha || !confirmar_senha) {
      return res.status(400).json({ 
        success: false, 
        error: 'Todos os campos são obrigatórios' 
      });
    }

    if (senha !== confirmar_senha) {
      return res.status(400).json({ 
        success: false, 
        error: 'As senhas não conferem' 
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'A senha deve ter pelo menos 6 caracteres' 
      });
    }

    // Buscar empresa pelo token
    const empresa = await query(
      `SELECT id, nome, email, token_primeiro_acesso, admin_senha_hash
       FROM empresas 
       WHERE token_primeiro_acesso = $1`,
      [token]
    );

    if (empresa.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Token inválido ou expirado' 
      });
    }

    if (empresa.rows[0].admin_senha_hash) {
      return res.status(400).json({ 
        success: false, 
        error: 'Senha já cadastrada' 
      });
    }

    // Cadastrar senha e limpar token
    const senhaHash = hashSenha(senha);
    
    await query(
      `UPDATE empresas 
       SET admin_senha_hash = $1, 
           token_primeiro_acesso = NULL,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [senhaHash, empresa.rows[0].id]
    );

    res.json({
      success: true,
      message: 'Senha cadastrada com sucesso! Você já pode fazer login.',
      data: {
        empresa_id: empresa.rows[0].id,
        nome: empresa.rows[0].nome,
        email: empresa.rows[0].email
      }
    });
  } catch (error) {
    console.error('Erro cadastrar senha:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/auth/admin/login
 * Login do ADM da frota
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email e senha são obrigatórios' 
      });
    }

    // Buscar empresa pelo email
    const result = await query(
      `SELECT e.*, p.nome as plano_nome
       FROM empresas e
       LEFT JOIN planos p ON e.plano_id = p.id
       WHERE e.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Email ou senha incorretos' 
      });
    }

    const empresa = result.rows[0];

    // Verificar se cadastrou senha
    if (!empresa.admin_senha_hash) {
      return res.status(400).json({ 
        success: false, 
        error: 'Você ainda não cadastrou sua senha. Use o link de primeiro acesso.',
        primeiro_acesso: true
      });
    }

    // Verificar senha
    if (empresa.admin_senha_hash !== hashSenha(senha)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Email ou senha incorretos' 
      });
    }

    // Verificar se empresa está ativa
    if (empresa.status === 'bloqueada' || empresa.status === 'cancelada') {
      return res.status(403).json({ 
        success: false, 
        error: `Empresa ${empresa.status}. Entre em contato com o suporte.`,
        status: empresa.status
      });
    }

    // Gerar token de sessão
    const tokenSessao = gerarToken();

    res.json({
      success: true,
      data: {
        token: tokenSessao,
        empresa: {
          id: empresa.id,
          nome: empresa.nome,
          email: empresa.email,
          telefone: empresa.telefone,
          status: empresa.status,
          plano: empresa.plano_nome,
          whatsapp_rebeca: empresa.whatsapp_rebeca,
          data_vencimento: empresa.data_vencimento
        }
      }
    });
  } catch (error) {
    console.error('Erro login admin:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// Exportar também a função de hash para uso no cadastro
router.hashSenha = hashSenha;

module.exports = router;
