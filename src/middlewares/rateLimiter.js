// ========================================
// REBECA - RATE LIMITING
// Proteção contra spam e ataques
// ========================================

const rateLimit = require('express-rate-limit');

// ========================================
// CONFIGURAÇÕES POR TIPO DE ROTA
// ========================================

// Limite geral para API
const limiteGeral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por IP
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`⚠️ Rate limit excedido: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Muitas requisições. Tente novamente em alguns minutos.',
      retryAfter: 15
    });
  }
});

// Limite para autenticação (mais restritivo)
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas de login
  message: {
    success: false,
    error: 'Muitas tentativas de login. Aguarde 15 minutos.',
    retryAfter: 15
  },
  skipSuccessfulRequests: true, // Não conta requisições bem sucedidas
  handler: (req, res) => {
    console.log(`🔒 Bloqueio de login: ${req.ip} - ${req.body?.email || 'sem email'}`);
    res.status(429).json({
      success: false,
      error: 'Muitas tentativas de login. Aguarde 15 minutos.',
      retryAfter: 15
    });
  }
});

// Limite para webhook WhatsApp (mais permissivo)
const limiteWebhook = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 mensagens por minuto
  message: {
    success: false,
    error: 'Limite de mensagens excedido.'
  },
  keyGenerator: (req) => {
    // Usar telefone como chave se disponível
    return req.body?.data?.key?.remoteJid || req.ip;
  }
});

// Limite para criação de corridas - DESATIVADO
// Clientes podem pedir quantas corridas precisarem
const limiteCorridas = (req, res, next) => next();

// Limite para SMS/Ligações (custo alto)
const limiteTelefonia = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // 20 ligações/SMS por hora
  message: {
    success: false,
    error: 'Limite de ligações/SMS atingido. Tente novamente mais tarde.'
  }
});

// Limite para busca de motoristas
const limiteBusca = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 buscas por minuto
  message: {
    success: false,
    error: 'Muitas buscas. Aguarde um momento.'
  }
});

// ========================================
// MIDDLEWARE DE BLOQUEIO POR IP
// ========================================

const ipsBloqueados = new Set();
const tentativasPorIP = new Map();

const verificarBloqueio = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  // Verificar se IP está bloqueado
  if (ipsBloqueados.has(ip)) {
    console.log(`🚫 IP bloqueado tentou acessar: ${ip}`);
    return res.status(403).json({
      success: false,
      error: 'Acesso bloqueado. Entre em contato com o suporte.'
    });
  }

  next();
};

// Bloquear IP manualmente
const bloquearIP = (ip, motivo) => {
  ipsBloqueados.add(ip);
  console.log(`🔒 IP bloqueado: ${ip} - Motivo: ${motivo}`);
};

// Desbloquear IP
const desbloquearIP = (ip) => {
  ipsBloqueados.delete(ip);
  console.log(`🔓 IP desbloqueado: ${ip}`);
};

// ========================================
// PROTEÇÃO CONTRA ATAQUES
// ========================================

const protecaoAtaques = (req, res, next) => {
  const ip = req.ip;
  const agora = Date.now();
  
  // Registrar tentativa
  if (!tentativasPorIP.has(ip)) {
    tentativasPorIP.set(ip, []);
  }
  
  const tentativas = tentativasPorIP.get(ip);
  tentativas.push(agora);
  
  // Manter apenas últimos 60 segundos
  const umMinutoAtras = agora - 60000;
  const tentativasRecentes = tentativas.filter(t => t > umMinutoAtras);
  tentativasPorIP.set(ip, tentativasRecentes);
  
  // Se mais de 100 requisições por minuto, bloquear temporariamente
  if (tentativasRecentes.length > 100) {
    console.log(`⚠️ Possível ataque detectado: ${ip} - ${tentativasRecentes.length} req/min`);
    
    // Bloquear por 5 minutos
    ipsBloqueados.add(ip);
    setTimeout(() => {
      ipsBloqueados.delete(ip);
      console.log(`🔓 IP desbloqueado automaticamente: ${ip}`);
    }, 5 * 60 * 1000);
    
    return res.status(429).json({
      success: false,
      error: 'Atividade suspeita detectada. Acesso temporariamente bloqueado.'
    });
  }
  
  next();
};

// ========================================
// LIMPAR MEMÓRIA PERIODICAMENTE
// ========================================

setInterval(() => {
  const agora = Date.now();
  const umMinutoAtras = agora - 60000;
  
  tentativasPorIP.forEach((tentativas, ip) => {
    const recentes = tentativas.filter(t => t > umMinutoAtras);
    if (recentes.length === 0) {
      tentativasPorIP.delete(ip);
    } else {
      tentativasPorIP.set(ip, recentes);
    }
  });
}, 60000); // A cada minuto

module.exports = {
  limiteGeral,
  limiteAuth,
  limiteWebhook,
  limiteCorridas,
  limiteTelefonia,
  limiteBusca,
  verificarBloqueio,
  bloquearIP,
  desbloquearIP,
  protecaoAtaques
};
