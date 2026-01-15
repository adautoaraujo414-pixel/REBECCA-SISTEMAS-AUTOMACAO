// ========================================
// REBECA - SETUP DOS TESTES
// ========================================

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.JWT_SECRET = 'test_jwt_secret_123';
process.env.OPENAI_API_KEY = 'test_key';

// Mock do console para testes mais limpos
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
}

// Timeout global
jest.setTimeout(10000);

// Limpar mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

// Fechar conexões após todos os testes
afterAll(async () => {
  // Aguardar promises pendentes
  await new Promise(resolve => setTimeout(resolve, 100));
});
