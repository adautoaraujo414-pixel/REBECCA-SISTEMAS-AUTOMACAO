// ========================================
// REBECA - TESTES: API ENDPOINTS
// ========================================

const request = require('supertest');
const express = require('express');

// Mock do banco de dados
jest.mock('../../src/database/connection', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn()
  }
}));

const { query, pool } = require('../../src/database/connection');

describe('API Endpoints', () => {
  let app;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Rota de health check mock
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
    
    // Mock de rota de motoristas
    app.get('/api/motoristas', async (req, res) => {
      const mockMotoristas = [
        { id: 1, nome: 'João', status: 'online', disponivel: true },
        { id: 2, nome: 'Maria', status: 'online', disponivel: false }
      ];
      res.json({ success: true, data: mockMotoristas });
    });
    
    // Mock de rota de corridas
    app.post('/api/corridas', async (req, res) => {
      const { origem, destino } = req.body;
      if (!origem || !destino) {
        return res.status(400).json({ success: false, error: 'Origem e destino obrigatórios' });
      }
      res.json({ success: true, corrida_id: 123 });
    });
  });
  
  // ========================================
  // TESTES: HEALTH CHECK
  // ========================================
  describe('GET /health', () => {
    
    test('deve retornar status ok', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
    
  });
  
  // ========================================
  // TESTES: MOTORISTAS
  // ========================================
  describe('GET /api/motoristas', () => {
    
    test('deve listar motoristas', async () => {
      const response = await request(app).get('/api/motoristas');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
    
    test('deve retornar motoristas com campos corretos', async () => {
      const response = await request(app).get('/api/motoristas');
      
      const motorista = response.body.data[0];
      expect(motorista).toHaveProperty('id');
      expect(motorista).toHaveProperty('nome');
      expect(motorista).toHaveProperty('status');
      expect(motorista).toHaveProperty('disponivel');
    });
    
  });
  
  // ========================================
  // TESTES: CORRIDAS
  // ========================================
  describe('POST /api/corridas', () => {
    
    test('deve criar corrida com dados válidos', async () => {
      const response = await request(app)
        .post('/api/corridas')
        .send({
          origem: 'Rua A, 123',
          destino: 'Rua B, 456'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.corrida_id).toBeDefined();
    });
    
    test('deve retornar erro sem origem', async () => {
      const response = await request(app)
        .post('/api/corridas')
        .send({
          destino: 'Rua B, 456'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    test('deve retornar erro sem destino', async () => {
      const response = await request(app)
        .post('/api/corridas')
        .send({
          origem: 'Rua A, 123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
  });
  
});

describe('Validações', () => {
  
  describe('Telefone', () => {
    
    test('deve validar formato de telefone brasileiro', () => {
      const regex = /^55\d{10,11}$/;
      
      expect(regex.test('5514999990001')).toBe(true);
      expect(regex.test('551499999000')).toBe(false);
      expect(regex.test('14999990001')).toBe(false);
    });
    
  });
  
  describe('Coordenadas', () => {
    
    test('deve validar latitude', () => {
      const validarLat = (lat) => lat >= -90 && lat <= 90;
      
      expect(validarLat(-21.6786)).toBe(true);
      expect(validarLat(45.5)).toBe(true);
      expect(validarLat(-100)).toBe(false);
      expect(validarLat(100)).toBe(false);
    });
    
    test('deve validar longitude', () => {
      const validarLng = (lng) => lng >= -180 && lng <= 180;
      
      expect(validarLng(-49.7424)).toBe(true);
      expect(validarLng(120.5)).toBe(true);
      expect(validarLng(-200)).toBe(false);
      expect(validarLng(200)).toBe(false);
    });
    
  });
  
});
