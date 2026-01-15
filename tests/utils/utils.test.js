// ========================================
// REBECA - TESTES: UTILITÁRIOS
// ========================================

const { delay, delayHumano } = require('../../src/utils/delay');
const { verificarHorarioFuncionamento, formatarHora } = require('../../src/utils/horario');

describe('Utils - Delay', () => {
  
  describe('delay', () => {
    test('deve aguardar o tempo especificado', async () => {
      const inicio = Date.now();
      await delay(100);
      const fim = Date.now();
      
      expect(fim - inicio).toBeGreaterThanOrEqual(90);
      expect(fim - inicio).toBeLessThan(200);
    });
  });
  
  describe('delayHumano', () => {
    test('deve retornar delay dentro do intervalo', async () => {
      const inicio = Date.now();
      await delayHumano(100, 200);
      const fim = Date.now();
      
      expect(fim - inicio).toBeGreaterThanOrEqual(90);
      expect(fim - inicio).toBeLessThan(300);
    });
  });
  
});

describe('Utils - Horário', () => {
  
  describe('verificarHorarioFuncionamento', () => {
    
    test('deve retornar true em horário comercial', () => {
      // Mock de hora: 14:00
      const mockDate = new Date('2024-01-15T14:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const resultado = verificarHorarioFuncionamento('06:00', '23:00');
      
      expect(resultado).toBe(true);
      
      jest.restoreAllMocks();
    });
    
    test('deve retornar false fora do horário', () => {
      // Mock de hora: 03:00
      const mockDate = new Date('2024-01-15T03:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const resultado = verificarHorarioFuncionamento('06:00', '23:00');
      
      expect(resultado).toBe(false);
      
      jest.restoreAllMocks();
    });
    
  });
  
  describe('formatarHora', () => {
    
    test('deve formatar hora corretamente', () => {
      const data = new Date('2024-01-15T14:30:00');
      const formatado = formatarHora(data);
      
      expect(formatado).toMatch(/\d{2}:\d{2}/);
    });
    
  });
  
});
