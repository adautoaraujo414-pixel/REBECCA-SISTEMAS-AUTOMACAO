// ========================================
// REBECA - MONITORAMENTO E MÉTRICAS
// Sentry + APM customizado
// ========================================

const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

// ========================================
// CONFIGURAÇÃO DO SENTRY
// ========================================

const inicializarSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️ Sentry não configurado (SENTRY_DSN não definido)');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
  });

  // Middleware de rastreamento
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  console.log('✅ Sentry inicializado');
};

// Handler de erros do Sentry
const sentryErrorHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler();
};

// ========================================
// APM CUSTOMIZADO - MÉTRICAS
// ========================================

const metricas = {
  requisicoes: {
    total: 0,
    porRota: new Map(),
    porStatus: new Map(),
    porMetodo: new Map()
  },
  corridas: {
    criadas: 0,
    aceitas: 0,
    finalizadas: 0,
    canceladas: 0
  },
  motoristas: {
    online: 0,
    emCorrida: 0,
    offline: 0
  },
  whatsapp: {
    mensagensRecebidas: 0,
    mensagensEnviadas: 0,
    erros: 0
  },
  telefone: {
    ligacoesRecebidas: 0,
    ligacoesRealizadas: 0,
    smsEnviados: 0
  },
  performance: {
    tempoMedioResposta: 0,
    requisicoesPorSegundo: 0,
    tempos: []
  },
  sistema: {
    uptime: Date.now(),
    ultimaAtualizacao: Date.now()
  }
};

// ========================================
// MIDDLEWARE DE MÉTRICAS
// ========================================

const middlewareMetricas = (req, res, next) => {
  const inicio = Date.now();
  
  // Contar requisição
  metricas.requisicoes.total++;
  
  // Por método
  const metodo = req.method;
  metricas.requisicoes.porMetodo.set(
    metodo, 
    (metricas.requisicoes.porMetodo.get(metodo) || 0) + 1
  );
  
  // Interceptar fim da resposta
  res.on('finish', () => {
    const duracao = Date.now() - inicio;
    const rota = req.route?.path || req.path;
    const status = res.statusCode;
    
    // Por rota
    metricas.requisicoes.porRota.set(
      rota, 
      (metricas.requisicoes.porRota.get(rota) || 0) + 1
    );
    
    // Por status
    const statusGrupo = `${Math.floor(status / 100)}xx`;
    metricas.requisicoes.porStatus.set(
      statusGrupo, 
      (metricas.requisicoes.porStatus.get(statusGrupo) || 0) + 1
    );
    
    // Performance
    metricas.performance.tempos.push(duracao);
    if (metricas.performance.tempos.length > 1000) {
      metricas.performance.tempos.shift();
    }
    metricas.performance.tempoMedioResposta = 
      metricas.performance.tempos.reduce((a, b) => a + b, 0) / 
      metricas.performance.tempos.length;
    
    // Log se demorar muito
    if (duracao > 2000) {
      logger.performance('Requisição lenta', duracao, { rota, metodo, status });
    }
    
    metricas.sistema.ultimaAtualizacao = Date.now();
  });
  
  next();
};

// ========================================
// FUNÇÕES DE REGISTRO
// ========================================

const registrarCorrida = (tipo) => {
  if (metricas.corridas[tipo] !== undefined) {
    metricas.corridas[tipo]++;
  }
};

const registrarMotorista = (status, delta = 1) => {
  if (metricas.motoristas[status] !== undefined) {
    metricas.motoristas[status] += delta;
    if (metricas.motoristas[status] < 0) {
      metricas.motoristas[status] = 0;
    }
  }
};

const registrarWhatsApp = (tipo) => {
  if (metricas.whatsapp[tipo] !== undefined) {
    metricas.whatsapp[tipo]++;
  }
};

const registrarTelefone = (tipo) => {
  if (metricas.telefone[tipo] !== undefined) {
    metricas.telefone[tipo]++;
  }
};

// ========================================
// ENDPOINT DE MÉTRICAS
// ========================================

const obterMetricas = () => {
  const agora = Date.now();
  const uptimeMs = agora - metricas.sistema.uptime;
  const uptimeSegundos = Math.floor(uptimeMs / 1000);
  
  return {
    timestamp: new Date().toISOString(),
    uptime: {
      segundos: uptimeSegundos,
      formatado: formatarUptime(uptimeSegundos)
    },
    requisicoes: {
      total: metricas.requisicoes.total,
      porMinuto: calcularPorMinuto(metricas.requisicoes.total, uptimeSegundos),
      porMetodo: Object.fromEntries(metricas.requisicoes.porMetodo),
      porStatus: Object.fromEntries(metricas.requisicoes.porStatus),
      rotasMaisAcessadas: obterTop5Rotas()
    },
    corridas: { ...metricas.corridas },
    motoristas: { ...metricas.motoristas },
    whatsapp: { ...metricas.whatsapp },
    telefone: { ...metricas.telefone },
    performance: {
      tempoMedioResposta: Math.round(metricas.performance.tempoMedioResposta),
      requisicoesPorSegundo: (metricas.requisicoes.total / uptimeSegundos).toFixed(2)
    },
    memoria: {
      usada: formatarBytes(process.memoryUsage().heapUsed),
      total: formatarBytes(process.memoryUsage().heapTotal)
    }
  };
};

// ========================================
// HEALTH CHECK
// ========================================

const healthCheck = async (pool) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Verificar banco de dados
  try {
    const inicio = Date.now();
    await pool.query('SELECT 1');
    checks.services.database = {
      status: 'healthy',
      latency: Date.now() - inicio
    };
  } catch (error) {
    checks.status = 'unhealthy';
    checks.services.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  // Verificar memória
  const memoria = process.memoryUsage();
  const memoriaUsadaMB = memoria.heapUsed / 1024 / 1024;
  checks.services.memory = {
    status: memoriaUsadaMB < 500 ? 'healthy' : 'warning',
    usedMB: Math.round(memoriaUsadaMB)
  };

  // Verificar uptime
  checks.services.uptime = {
    status: 'healthy',
    seconds: Math.floor((Date.now() - metricas.sistema.uptime) / 1000)
  };

  return checks;
};

// ========================================
// UTILITÁRIOS
// ========================================

const formatarUptime = (segundos) => {
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  
  const partes = [];
  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  if (minutos > 0) partes.push(`${minutos}m`);
  partes.push(`${segs}s`);
  
  return partes.join(' ');
};

const formatarBytes = (bytes) => {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
};

const calcularPorMinuto = (total, segundos) => {
  if (segundos < 60) return total;
  return Math.round(total / (segundos / 60));
};

const obterTop5Rotas = () => {
  return Array.from(metricas.requisicoes.porRota.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rota, count]) => ({ rota, count }));
};

// ========================================
// ALERTAS AUTOMÁTICOS
// ========================================

const verificarAlertas = () => {
  const alertas = [];
  
  // Muitos erros
  const erros5xx = metricas.requisicoes.porStatus.get('5xx') || 0;
  if (erros5xx > 10) {
    alertas.push({
      tipo: 'erro',
      mensagem: `Alto número de erros 5xx: ${erros5xx}`,
      nivel: 'critico'
    });
  }
  
  // Memória alta
  const memoriaUsada = process.memoryUsage().heapUsed / 1024 / 1024;
  if (memoriaUsada > 400) {
    alertas.push({
      tipo: 'memoria',
      mensagem: `Uso de memória alto: ${memoriaUsada.toFixed(0)}MB`,
      nivel: 'aviso'
    });
  }
  
  // Tempo de resposta alto
  if (metricas.performance.tempoMedioResposta > 1000) {
    alertas.push({
      tipo: 'performance',
      mensagem: `Tempo médio de resposta alto: ${metricas.performance.tempoMedioResposta}ms`,
      nivel: 'aviso'
    });
  }
  
  // Muitos erros WhatsApp
  if (metricas.whatsapp.erros > 20) {
    alertas.push({
      tipo: 'whatsapp',
      mensagem: `Muitos erros no WhatsApp: ${metricas.whatsapp.erros}`,
      nivel: 'aviso'
    });
  }
  
  return alertas;
};

module.exports = {
  inicializarSentry,
  sentryErrorHandler,
  middlewareMetricas,
  registrarCorrida,
  registrarMotorista,
  registrarWhatsApp,
  registrarTelefone,
  obterMetricas,
  healthCheck,
  verificarAlertas,
  metricas
};
