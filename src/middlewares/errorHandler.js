// ========================================
// REBECA - MIDDLEWARE DE ERROS
// Tratamento centralizado de erros
// ========================================

const logger = require('../utils/logger');

// ========================================
// CLASSES DE ERRO CUSTOMIZADAS
// ========================================

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, 'AUTH_ERROR');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Limite de requisições excedido') {
    super(message, 429, 'RATE_LIMIT');
  }
}

// ========================================
// MIDDLEWARE DE LOG DE REQUISIÇÕES
// ========================================

const logRequests = (req, res, next) => {
  const inicio = Date.now();
  
  // Log ao finalizar resposta
  res.on('finish', () => {
    const duracao = Date.now() - inicio;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    // Nível de log baseado no status
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(level, `${method} ${originalUrl} ${statusCode} ${duracao}ms`, {
      tipo: 'request',
      method,
      url: originalUrl,
      status: statusCode,
      duracao,
      ip
    });
  });
  
  next();
};

// ========================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ========================================

const errorHandler = (err, req, res, next) => {
  // Se já enviou resposta, delegar ao handler padrão
  if (res.headersSent) {
    return next(err);
  }
  
  // Log do erro
  logger.erro('Erro na requisição', err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: req.body
  });
  
  // Erro operacional (esperado)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.field && { field: err.field })
    });
  }
  
  // Erros específicos do PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        return res.status(409).json({
          success: false,
          error: 'Registro já existe',
          code: 'DUPLICATE_ENTRY'
        });
      
      case '23503': // Foreign key violation
        return res.status(400).json({
          success: false,
          error: 'Referência inválida',
          code: 'INVALID_REFERENCE'
        });
      
      case '23502': // Not null violation
        return res.status(400).json({
          success: false,
          error: 'Campo obrigatório não preenchido',
          code: 'REQUIRED_FIELD'
        });
      
      case 'ECONNREFUSED':
        return res.status(503).json({
          success: false,
          error: 'Serviço temporariamente indisponível',
          code: 'SERVICE_UNAVAILABLE'
        });
    }
  }
  
  // Erros de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  // Erros de validação do Express
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'JSON inválido',
      code: 'INVALID_JSON'
    });
  }
  
  // Erro genérico (não esperado)
  const isDev = process.env.NODE_ENV === 'development';
  
  return res.status(500).json({
    success: false,
    error: isDev ? err.message : 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    ...(isDev && { stack: err.stack })
  });
};

// ========================================
// MIDDLEWARE 404
// ========================================

const notFoundHandler = (req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`, {
    tipo: 'not_found',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    code: 'ROUTE_NOT_FOUND'
  });
};

// ========================================
// ASYNC WRAPPER (try/catch automático)
// ========================================

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ========================================
// SHUTDOWN GRACEFUL
// ========================================

const setupGracefulShutdown = (server, pool) => {
  const shutdown = async (signal) => {
    console.log(`\n⚠️ ${signal} recebido. Encerrando graciosamente...`);
    
    // Parar de aceitar novas conexões
    server.close(async () => {
      console.log('🔒 Servidor HTTP fechado');
      
      // Fechar conexões do banco
      if (pool) {
        await pool.end();
        console.log('🗄️ Pool do banco fechado');
      }
      
      console.log('✅ Encerramento completo');
      process.exit(0);
    });
    
    // Forçar encerramento após 30 segundos
    setTimeout(() => {
      console.error('⚠️ Forçando encerramento...');
      process.exit(1);
    }, 30000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Erros não tratados
  process.on('uncaughtException', (err) => {
    logger.erro('Exceção não tratada', err);
    console.error('❌ Exceção não tratada:', err);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.erro('Promise rejeitada não tratada', reason);
    console.error('❌ Promise rejeitada:', reason);
  });
};

module.exports = {
  // Classes de erro
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // Middlewares
  logRequests,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  setupGracefulShutdown
};
