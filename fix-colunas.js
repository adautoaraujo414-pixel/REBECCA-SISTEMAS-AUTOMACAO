const { Pool } = require('pg'); 
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
}); 
async function fixColunas() { 
  try { 
    console.log('?? Corrigindo colunas...'); 
    // 1. Adicionar admin_whatsapp 
    await pool.query(`ALTER TABLE empresas ADD COLUMN IF NOT EXISTS admin_whatsapp VARCHAR(255);`); 
    console.log('? Coluna admin_whatsapp adicionada'); 
    // 2. Adicionar ativo (verificar em qual tabela) 
    const tabelas = ['empresas', 'motoristas', 'usuarios', 'corridas']; 
    for (const tabela of tabelas) { 
      try { 
        await pool.query(`ALTER TABLE ${tabela} ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;`); 
        console.log(`? Coluna ativo adicionada em ${tabela}`); 
      } catch (e) { 
        console.log(`?? Tabela ${tabela} n∆o existe ou j† tem a coluna`); 
      } 
    } 
    console.log('? Colunas corrigidas!'); 
  } catch (error) { 
    console.error('? Erro:', error.message); 
  } finally { 
    await pool.end(); 
  } 
} 
