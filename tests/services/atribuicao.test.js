// ========================================
// REBECA - TESTES: ATRIBUIÇÃO DE CORRIDAS
// ========================================

const AtribuicaoService = require('../../src/services/atribuicao');

describe('AtribuicaoService', () => {
  
  // ========================================
  // TESTES: CÁLCULO DE DISTÂNCIA
  // ========================================
  describe('calcularDistancia', () => {
    
    test('deve calcular distância entre dois pontos corretamente', () => {
      // Lins, SP para Guaiçara, SP (~15km)
      const lat1 = -21.6786;
      const lon1 = -49.7424;
      const lat2 = -21.6236;
      const lon2 = -49.7978;
      
      const distancia = AtribuicaoService.calcularDistancia(lat1, lon1, lat2, lon2);
      
      expect(distancia).toBeGreaterThan(5);
      expect(distancia).toBeLessThan(20);
    });
    
    test('deve retornar 0 para mesmas coordenadas', () => {
      const lat = -21.6786;
      const lon = -49.7424;
      
      const distancia = AtribuicaoService.calcularDistancia(lat, lon, lat, lon);
      
      expect(distancia).toBe(0);
    });
    
    test('deve calcular distâncias maiores corretamente', () => {
      // São Paulo para Rio de Janeiro (~360km)
      const spLat = -23.5505;
      const spLon = -46.6333;
      const rjLat = -22.9068;
      const rjLon = -43.1729;
      
      const distancia = AtribuicaoService.calcularDistancia(spLat, spLon, rjLat, rjLon);
      
      expect(distancia).toBeGreaterThan(300);
      expect(distancia).toBeLessThan(500);
    });
    
  });
  
  // ========================================
  // TESTES: ESTIMATIVA DE TEMPO
  // ========================================
  describe('estimarTempo', () => {
    
    test('deve estimar tempo para 1km', () => {
      const tempo = AtribuicaoService.estimarTempo(1);
      expect(tempo).toBe(2); // ~2 minutos
    });
    
    test('deve estimar tempo para 5km', () => {
      const tempo = AtribuicaoService.estimarTempo(5);
      expect(tempo).toBe(10); // ~10 minutos
    });
    
    test('deve arredondar para cima', () => {
      const tempo = AtribuicaoService.estimarTempo(1.5);
      expect(tempo).toBe(3);
    });
    
  });
  
  // ========================================
  // TESTES: CONVERSÃO DE GRAUS PARA RADIANOS
  // ========================================
  describe('toRad', () => {
    
    test('deve converter 180 graus para PI radianos', () => {
      const rad = AtribuicaoService.toRad(180);
      expect(rad).toBeCloseTo(Math.PI, 5);
    });
    
    test('deve converter 90 graus para PI/2 radianos', () => {
      const rad = AtribuicaoService.toRad(90);
      expect(rad).toBeCloseTo(Math.PI / 2, 5);
    });
    
    test('deve converter 0 graus para 0 radianos', () => {
      const rad = AtribuicaoService.toRad(0);
      expect(rad).toBe(0);
    });
    
  });
  
});
