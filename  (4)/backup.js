#!/usr/bin/env node
// ========================================
// REBECA - BACKUP AUTOMÁTICO DO BANCO
// PostgreSQL Dump + Rotação
// ========================================

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// Configurações
const CONFIG = {
  // Dados do banco
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rebeca_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  
  // Diretório de backups
  backupDir: process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'),
  
  // Retenção (dias)
  retencao: parseInt(process.env.BACKUP_RETENCAO) || 7,
  
  // Compressão
  comprimir: process.env.BACKUP_COMPRIMIR !== 'false'
};

// ========================================
// CRIAR DIRETÓRIO DE BACKUP
// ========================================
const criarDiretorio = () => {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    console.log(`📁 Diretório de backup criado: ${CONFIG.backupDir}`);
  }
};

// ========================================
// GERAR NOME DO ARQUIVO
// ========================================
const gerarNomeArquivo = () => {
  const agora = new Date();
  const timestamp = agora.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  
  const extensao = CONFIG.comprimir ? 'sql.gz' : 'sql';
  return `backup_${CONFIG.database}_${timestamp}.${extensao}`;
};

// ========================================
// EXECUTAR BACKUP
// ========================================
const executarBackup = async () => {
  console.log('\n🔄 ========================================');
  console.log('🔄 INICIANDO BACKUP DO BANCO DE DADOS');
  console.log('🔄 ========================================');
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🗄️ Banco: ${CONFIG.database}`);
  
  criarDiretorio();
  
  const nomeArquivo = gerarNomeArquivo();
  const caminhoCompleto = path.join(CONFIG.backupDir, nomeArquivo);
  
  // Definir variável de ambiente para senha
  process.env.PGPASSWORD = CONFIG.password;
  
  try {
    let comando;
    
    if (CONFIG.comprimir) {
      // Backup comprimido com gzip
      comando = `pg_dump -h ${CONFIG.host} -p ${CONFIG.port} -U ${CONFIG.user} -d ${CONFIG.database} -F p | gzip > "${caminhoCompleto}"`;
    } else {
      // Backup sem compressão
      comando = `pg_dump -h ${CONFIG.host} -p ${CONFIG.port} -U ${CONFIG.user} -d ${CONFIG.database} -F p -f "${caminhoCompleto}"`;
    }
    
    console.log(`\n⏳ Executando backup...`);
    const inicio = Date.now();
    
    await execPromise(comando);
    
    const duracao = ((Date.now() - inicio) / 1000).toFixed(2);
    
    // Verificar tamanho do arquivo
    const stats = fs.statSync(caminhoCompleto);
    const tamanhoMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log(`\n✅ Backup concluído com sucesso!`);
    console.log(`📄 Arquivo: ${nomeArquivo}`);
    console.log(`📦 Tamanho: ${tamanhoMB} MB`);
    console.log(`⏱️ Duração: ${duracao}s`);
    
    // Limpar backups antigos
    await limparBackupsAntigos();
    
    return { sucesso: true, arquivo: nomeArquivo, tamanho: tamanhoMB };
    
  } catch (error) {
    console.error(`\n❌ Erro no backup: ${error.message}`);
    return { sucesso: false, erro: error.message };
  } finally {
    delete process.env.PGPASSWORD;
  }
};

// ========================================
// LIMPAR BACKUPS ANTIGOS
// ========================================
const limparBackupsAntigos = async () => {
  console.log(`\n🧹 Limpando backups com mais de ${CONFIG.retencao} dias...`);
  
  const arquivos = fs.readdirSync(CONFIG.backupDir);
  const agora = Date.now();
  const limiteDias = CONFIG.retencao * 24 * 60 * 60 * 1000;
  
  let removidos = 0;
  
  for (const arquivo of arquivos) {
    if (!arquivo.startsWith('backup_')) continue;
    
    const caminhoArquivo = path.join(CONFIG.backupDir, arquivo);
    const stats = fs.statSync(caminhoArquivo);
    const idade = agora - stats.mtimeMs;
    
    if (idade > limiteDias) {
      fs.unlinkSync(caminhoArquivo);
      console.log(`   🗑️ Removido: ${arquivo}`);
      removidos++;
    }
  }
  
  if (removidos > 0) {
    console.log(`   ✅ ${removidos} backup(s) antigo(s) removido(s)`);
  } else {
    console.log(`   ✓ Nenhum backup antigo para remover`);
  }
};

// ========================================
// LISTAR BACKUPS
// ========================================
const listarBackups = () => {
  criarDiretorio();
  
  const arquivos = fs.readdirSync(CONFIG.backupDir)
    .filter(f => f.startsWith('backup_'))
    .map(arquivo => {
      const caminhoArquivo = path.join(CONFIG.backupDir, arquivo);
      const stats = fs.statSync(caminhoArquivo);
      return {
        nome: arquivo,
        tamanho: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
        data: stats.mtime.toLocaleString('pt-BR')
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data));
  
  console.log('\n📋 BACKUPS DISPONÍVEIS:');
  console.log('========================================');
  
  if (arquivos.length === 0) {
    console.log('Nenhum backup encontrado.');
  } else {
    arquivos.forEach((backup, i) => {
      console.log(`${i + 1}. ${backup.nome}`);
      console.log(`   Tamanho: ${backup.tamanho} | Data: ${backup.data}`);
    });
  }
  
  return arquivos;
};

// ========================================
// RESTAURAR BACKUP
// ========================================
const restaurarBackup = async (nomeArquivo) => {
  console.log('\n🔄 ========================================');
  console.log('🔄 RESTAURANDO BACKUP');
  console.log('🔄 ========================================');
  
  const caminhoArquivo = path.join(CONFIG.backupDir, nomeArquivo);
  
  if (!fs.existsSync(caminhoArquivo)) {
    console.error(`❌ Arquivo não encontrado: ${nomeArquivo}`);
    return { sucesso: false, erro: 'Arquivo não encontrado' };
  }
  
  process.env.PGPASSWORD = CONFIG.password;
  
  try {
    let comando;
    
    if (nomeArquivo.endsWith('.gz')) {
      comando = `gunzip -c "${caminhoArquivo}" | psql -h ${CONFIG.host} -p ${CONFIG.port} -U ${CONFIG.user} -d ${CONFIG.database}`;
    } else {
      comando = `psql -h ${CONFIG.host} -p ${CONFIG.port} -U ${CONFIG.user} -d ${CONFIG.database} -f "${caminhoArquivo}"`;
    }
    
    console.log(`⏳ Restaurando...`);
    const inicio = Date.now();
    
    await execPromise(comando);
    
    const duracao = ((Date.now() - inicio) / 1000).toFixed(2);
    
    console.log(`\n✅ Backup restaurado com sucesso!`);
    console.log(`⏱️ Duração: ${duracao}s`);
    
    return { sucesso: true };
    
  } catch (error) {
    console.error(`\n❌ Erro na restauração: ${error.message}`);
    return { sucesso: false, erro: error.message };
  } finally {
    delete process.env.PGPASSWORD;
  }
};

// ========================================
// EXPORTAR MÓDULO
// ========================================
module.exports = {
  executarBackup,
  listarBackups,
  restaurarBackup,
  limparBackupsAntigos
};

// ========================================
// EXECUÇÃO VIA CLI
// ========================================
if (require.main === module) {
  const args = process.argv.slice(2);
  const comando = args[0];
  
  switch (comando) {
    case 'backup':
    case undefined:
      executarBackup()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'listar':
    case 'list':
      listarBackups();
      break;
      
    case 'restaurar':
    case 'restore':
      if (!args[1]) {
        console.error('❌ Informe o nome do arquivo de backup');
        console.log('Uso: node backup.js restaurar <nome_arquivo>');
        process.exit(1);
      }
      restaurarBackup(args[1])
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'limpar':
    case 'clean':
      limparBackupsAntigos()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    default:
      console.log(`
📦 REBECA - Sistema de Backup

Comandos:
  node backup.js backup     - Fazer backup
  node backup.js listar     - Listar backups
  node backup.js restaurar <arquivo> - Restaurar backup
  node backup.js limpar     - Limpar backups antigos

Variáveis de ambiente:
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
  BACKUP_DIR        - Diretório dos backups
  BACKUP_RETENCAO   - Dias para manter backups (default: 7)
  BACKUP_COMPRIMIR  - Comprimir com gzip (default: true)
      `);
  }
}
