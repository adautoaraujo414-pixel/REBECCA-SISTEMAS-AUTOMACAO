const { Pool } = require('pg'); 
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
}); 
async function fixTudo() { 
  try { 
    console.log('?? Adicionando admin_whatsapp em TODAS as tabelas...'); 
    const result = await pool.query(` 
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
    `); 
    for (const row of result.rows) { 
      try { 
        await pool.query(`ALTER TABLE ${row.table_name} ADD COLUMN IF NOT EXISTS admin_whatsapp VARCHAR(255)`); 
        console.log(`? ${row.table_name}`); 
      } catch (e) { 
        console.log(`?? ${row.table_name}: ${e.message}`); 
      } 
    } 
    console.log('? CONCLUÖDO!'); 
  } catch (error) { 
    console.error('? Erro:', error.message); 
  } finally { 
    await pool.end(); 
  } 
} 
