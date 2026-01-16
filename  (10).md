# 🔄 REBECA - Guia de Atualizações

## 📋 Índice
1. [Atualização Local (Desenvolvimento)](#1-atualização-local)
2. [Atualização em Produção](#2-atualização-em-produção)
3. [Atualização do Banco de Dados](#3-atualização-do-banco-de-dados)
4. [Rollback (Voltar Versão)](#4-rollback)
5. [Boas Práticas](#5-boas-práticas)

---

## 1. Atualização Local

### Se você editou arquivos manualmente:

```bash
# 1. Parar o servidor (Ctrl+C)

# 2. Fazer backup antes
cp -r rebeca rebeca-backup-$(date +%Y%m%d)

# 3. Editar os arquivos que precisa

# 4. Testar
npm test

# 5. Reiniciar
npm start
```

### Se eu (Claude) enviei um novo ZIP:

```bash
# 1. Parar o servidor

# 2. Fazer backup da pasta atual
mv rebeca rebeca-backup-$(date +%Y%m%d)

# 3. Extrair novo ZIP
unzip rebeca-NOVO.zip

# 4. Copiar seu .env (configurações)
cp rebeca-backup-*/. env rebeca/.env

# 5. Instalar dependências novas (se houver)
cd rebeca
npm install

# 6. Rodar migrations (se houver mudanças no banco)
npm run db:migrate

# 7. Reiniciar
npm start
```

---

## 2. Atualização em Produção

### Opção A: Railway (Recomendado)

```bash
# Se conectou com GitHub, só fazer push:
git add .
git commit -m "Atualização: descrição da mudança"
git push origin main

# Railway detecta e faz deploy automático!
```

### Opção B: Railway CLI

```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Opção C: Manual (VPS/Servidor próprio)

```bash
# 1. Conectar no servidor
ssh usuario@seu-servidor.com

# 2. Ir para pasta do projeto
cd /var/www/rebeca

# 3. Fazer backup
cp -r . ../rebeca-backup-$(date +%Y%m%d)

# 4. Baixar atualizações (se usar Git)
git pull origin main

# 5. Instalar dependências novas
npm install

# 6. Rodar migrations
npm run db:migrate

# 7. Reiniciar com PM2
pm2 restart rebeca

# OU reiniciar com systemd
sudo systemctl restart rebeca
```

---

## 3. Atualização do Banco de Dados

### Se eu adicionar novas tabelas/colunas:

```bash
# O arquivo migrate.js já tem proteção para não duplicar
# Basta rodar:
npm run db:migrate
```

### Se precisar adicionar coluna manualmente:

```sql
-- Conectar no banco
psql -U postgres -d rebeca_db

-- Adicionar coluna (exemplo)
ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS avaliacao DECIMAL(3,2) DEFAULT 5.0;

-- Sair
\q
```

### Backup antes de atualizar banco:

```bash
# Fazer backup
npm run backup

# Listar backups
npm run backup:list

# Restaurar se der problema
npm run backup:restore backup_rebeca_db_2024-01-15.sql.gz
```

---

## 4. Rollback (Voltar Versão)

### Se algo der errado:

```bash
# 1. Parar servidor
pm2 stop rebeca

# 2. Voltar pasta antiga
mv rebeca rebeca-com-problema
mv rebeca-backup-20240115 rebeca

# 3. Restaurar banco (se necessário)
npm run backup:restore backup_rebeca_db_2024-01-15.sql.gz

# 4. Reiniciar
pm2 start rebeca
```

---

## 5. Boas Práticas

### ✅ SEMPRE fazer antes de atualizar:

1. **Backup do banco**
   ```bash
   npm run backup
   ```

2. **Backup dos arquivos**
   ```bash
   cp -r rebeca rebeca-backup-$(date +%Y%m%d)
   ```

3. **Salvar o .env** (suas configurações)
   ```bash
   cp rebeca/.env ~/meu-env-backup.txt
   ```

### ✅ Testar antes de ir para produção:

```bash
# Rodar testes
npm test

# Testar localmente
npm run dev
```

### ✅ Atualizar em horário de baixo movimento:

- Madrugada (2h-5h)
- Ou domingo de manhã

### ✅ Monitorar após atualização:

```bash
# Ver logs em tempo real
pm2 logs rebeca

# Ou
tail -f logs/combined.log
```

---

## 📞 Checklist de Atualização

```
[ ] Backup do banco feito
[ ] Backup dos arquivos feito
[ ] .env salvo
[ ] Testei localmente
[ ] Atualizei em horário tranquilo
[ ] Rodei npm install
[ ] Rodei npm run db:migrate
[ ] Servidor reiniciado
[ ] Testei as funcionalidades principais
[ ] Monitorei logs por 10 minutos
```

---

## 🆘 Se der problema:

1. **Verificar logs:**
   ```bash
   pm2 logs rebeca --lines 100
   ```

2. **Verificar se banco está rodando:**
   ```bash
   sudo systemctl status postgresql
   ```

3. **Verificar porta em uso:**
   ```bash
   lsof -i :3000
   ```

4. **Reiniciar tudo:**
   ```bash
   pm2 restart all
   ```

5. **Voltar versão anterior** (rollback)

---

## 📝 Versionamento

Versão atual: **2.1.0**

Quando atualizar, mudar no `package.json`:
- Bug fix: 2.1.0 → 2.1.1
- Nova função: 2.1.0 → 2.2.0
- Mudança grande: 2.1.0 → 3.0.0
