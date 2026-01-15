// ========================================
// REBECA - SISTEMA CENTRAL DE CORRIDAS
// Arquivo principal
// ========================================

require('dotenv').config();

const { WhatsAppClient } = require('./whatsapp');
const { FluxoConversa } = require('./conversation');
const { runMigrations, seedData, pool } = require('./database');
const config = require('./config');
const Server = require('./server');

// Arte ASCII da Rebeca
const banner = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗ ███████╗██████╗ ███████╗ ██████╗ █████╗         ║
║   ██╔══██╗██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗        ║
║   ██████╔╝█████╗  ██████╔╝█████╗  ██║     ███████║        ║
║   ██╔══██╗██╔══╝  ██╔══██╗██╔══╝  ██║     ██╔══██║        ║
║   ██║  ██║███████╗██████╔╝███████╗╚██████╗██║  ██║        ║
║   ╚═╝  ╚═╝╚══════╝╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝        ║
║                                                           ║
║   Sistema Central de Corridas via WhatsApp                ║
║   Versão 1.0.0                                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

class Rebeca {
  constructor() {
    this.whatsapp = new WhatsAppClient();
    this.server = new Server();
    this.fluxo = null;
  }

  /**
   * Inicializa todo o sistema
   */
  async iniciar() {
    console.log(banner);
    console.log('🚀 Iniciando sistema REBECA...\n');

    try {
      // 1. Conectar banco de dados e rodar migrations
      console.log('📦 Configurando banco de dados...');
      await runMigrations();
      
      // NOTA: Para inserir dados de teste, rode manualmente: npm run db:seed

      // 2. Inicializar WhatsApp
      console.log('\n📱 Conectando ao WhatsApp...');
      await this.whatsapp.inicializar();

      // 4. Criar fluxo de conversa
      this.fluxo = new FluxoConversa(this.whatsapp);

      // 5. Configurar handler de mensagens
      this.whatsapp.onMessage(async (msg) => {
        await this.fluxo.processar(msg);
      });

      // 6. Iniciar servidor HTTP (Painel Admin)
      await this.server.iniciar();

      console.log('\n✅ Sistema REBECA iniciado com sucesso!');
      console.log(`📍 Ambiente: ${config.server.env}`);
      console.log(`⏰ Horário de funcionamento: ${config.horario.inicio} - ${config.horario.fim}`);
      console.log(`🏢 Frota: ${config.frota.nome}\n`);

    } catch (error) {
      console.error('❌ Erro ao iniciar sistema:', error);
      process.exit(1);
    }
  }

  /**
   * Para o sistema
   */
  async parar() {
    console.log('\n🛑 Parando sistema REBECA...');
    
    await this.whatsapp.desconectar();
    await this.server.parar();
    await pool.end();
    
    console.log('👋 Sistema encerrado.');
    process.exit(0);
  }
}

// Criar instância e iniciar
const rebeca = new Rebeca();

// Handler para encerramento gracioso
process.on('SIGINT', () => rebeca.parar());
process.on('SIGTERM', () => rebeca.parar());

// Iniciar sistema
rebeca.iniciar().catch(console.error);

module.exports = Rebeca;
