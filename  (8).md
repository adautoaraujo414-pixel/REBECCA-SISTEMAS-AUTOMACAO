# 🚀 REBECA - GUIA DE INSTALAÇÃO E DEPLOY

## 📋 ARQUITETURA DO SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                        REBECA SYSTEM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📱 WhatsApp (Evolution API)                                     │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────┐                    │
│  │           REBECA SERVER                  │                    │
│  │  ┌─────────────────────────────────┐    │                    │
│  │  │  🔌 WebSocket Server            │    │                    │
│  │  │  (Socket.io - Tempo Real)       │    │                    │
│  │  └─────────────────────────────────┘    │                    │
│  │  ┌─────────────────────────────────┐    │                    │
│  │  │  🌐 HTTP API                    │    │                    │
│  │  │  (Express.js - REST)            │    │                    │
│  │  └─────────────────────────────────┘    │                    │
│  │  ┌─────────────────────────────────┐    │                    │
│  │  │  🤖 Fluxo de Conversa           │    │                    │
│  │  │  (IA + Regras de Negócio)       │    │                    │
│  │  └─────────────────────────────────┘    │                    │
│  └─────────────────────────────────────────┘                    │
│       │              │              │                            │
│       ▼              ▼              ▼                            │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                        │
│  │ 🚗      │   │ 🏢      │   │ 👑      │                        │
│  │Motorista│   │ADM Frota│   │ADM Master│                       │
│  │ (App)   │   │(Empresa)│   │  (Você)  │                        │
│  └─────────┘   └─────────┘   └─────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 PRÉ-REQUISITOS

### 1. Servidor (VPS)
- Ubuntu 22.04 LTS
- 2GB RAM mínimo (4GB recomendado)
- 20GB SSD
- IP fixo

### 2. Softwares
- Node.js 18+ 
- PostgreSQL 14+
- Docker + Docker Compose (para Evolution API)
- Nginx (proxy reverso)
- PM2 (process manager)

---

## 🔧 INSTALAÇÃO PASSO A PASSO

### PASSO 1: Configurar VPS

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx
sudo apt install -y nginx
```

### PASSO 2: Instalar Evolution API (WhatsApp)

```bash
# Criar pasta
mkdir -p ~/evolution && cd ~/evolution

# Criar docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=http://SEU_IP:8080
      - AUTHENTICATION_API_KEY=SUA_CHAVE_SECRETA_AQUI
      - AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
      - DATABASE_ENABLED=true
      - DATABASE_CONNECTION_URI=postgresql://postgres:postgres@postgres:5432/evolution
      - DATABASE_SAVE_DATA_INSTANCE=true
      - DATABASE_SAVE_DATA_NEW_MESSAGE=true
      - DATABASE_SAVE_MESSAGE_UPDATE=true
      - DATABASE_SAVE_DATA_CONTACTS=true
      - DATABASE_SAVE_DATA_CHATS=true
      - REDIS_ENABLED=true
      - REDIS_URI=redis://redis:6379
      - WEBHOOK_GLOBAL_URL=http://host.docker.internal:3000/webhook
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false
      - LOG_LEVEL=ERROR
    volumes:
      - evolution_instances:/evolution/instances
    networks:
      - rebeca-network
    depends_on:
      - postgres
      - redis
    extra_hosts:
      - "host.docker.internal:host-gateway"

  postgres:
    image: postgres:15
    container_name: postgres_evolution
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - rebeca-network

  redis:
    image: redis:7
    container_name: redis_evolution
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - rebeca-network

volumes:
  evolution_instances:
  postgres_data:
  redis_data:

networks:
  rebeca-network:
    driver: bridge
EOF

# Iniciar Evolution API
docker-compose up -d

# Verificar se está rodando
docker-compose ps
docker-compose logs -f evolution-api
```

### PASSO 3: Configurar Banco de Dados (Rebeca)

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar banco e usuário
CREATE DATABASE rebeca_db;
CREATE USER rebeca_user WITH ENCRYPTED PASSWORD 'sua_senha_forte';
GRANT ALL PRIVILEGES ON DATABASE rebeca_db TO rebeca_user;
\q
```

### PASSO 4: Instalar REBECA

```bash
# Criar pasta e copiar arquivos
cd ~
mkdir rebeca && cd rebeca
# Copie todos os arquivos do sistema aqui (ou use git clone)

# Instalar dependências
npm install

# Configurar .env
nano .env

# Edite as variáveis conforme necessário

# Rodar migrations
npm run db:migrate

# Testar em modo desenvolvimento
npm run dev
```

### PASSO 5: Configurar PM2 (Produção)

```bash
# Criar arquivo ecosystem
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'rebeca',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar para reinício automático
pm2 save
pm2 startup
```

### PASSO 6: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/rebeca
```

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/rebeca /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### PASSO 7: SSL (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com.br
```

---

## 📱 CONECTAR WHATSAPP

### 1. Criar Instância
```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_CHAVE_SECRETA" \
  -d '{"instanceName": "rebeca", "qrcode": true}'
```

### 2. Obter QR Code
```bash
curl http://localhost:8080/instance/connect/rebeca \
  -H "apikey: SUA_CHAVE_SECRETA"
```

### 3. Configurar Webhook
```bash
curl -X POST http://localhost:8080/webhook/set/rebeca \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_CHAVE_SECRETA" \
  -d '{
    "url": "http://localhost:3000/webhook",
    "webhook_by_events": false,
    "events": [
      "MESSAGES_UPSERT",
      "CONNECTION_UPDATE",
      "QRCODE_UPDATED"
    ]
  }'
```

---

## 🔌 EVENTOS WEBSOCKET

### Motorista
```javascript
const socket = io('http://localhost:3000');

// Autenticar
socket.emit('auth', {
  tipo: 'motorista',
  id: 'motorista_001',
  nome: 'João Santos'
});

// Enviar localização
socket.emit('motorista:localizacao', {
  lat: -21.6785,
  lng: -49.7498,
  local: 'Centro',
  status: 'online'
});

// Receber nova corrida
socket.on('nova_corrida', (corrida) => {
  console.log('Nova corrida!', corrida);
});

// Aceitar corrida
socket.emit('motorista:aceitar_corrida', { corridaId: 1001 });
```

### Admin
```javascript
const socket = io('http://localhost:3000');

socket.emit('auth', {
  tipo: 'admin',
  id: 'admin_001',
  nome: 'Administrador'
});

// Receber localizações
socket.on('motorista:localizacao', (data) => {
  atualizarMapa(data);
});
```

---

## 🛠️ TROUBLESHOOTING

### Evolution API não conecta
```bash
docker-compose logs -f evolution-api
docker-compose restart evolution-api
```

### Rebeca não inicia
```bash
pm2 logs rebeca
pm2 restart rebeca
```

### Webhook não funciona
```bash
# Testar webhook manualmente
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": {}}'
```

---

## ✅ CHECKLIST DE DEPLOY

- [ ] VPS configurada
- [ ] Docker instalado
- [ ] Evolution API rodando
- [ ] PostgreSQL configurado
- [ ] Rebeca instalada
- [ ] PM2 configurado
- [ ] Nginx configurado
- [ ] SSL/HTTPS ativo
- [ ] WhatsApp conectado
- [ ] Webhook testado

---

Desenvolvido com ❤️ para UBMAX Transportes
Versão 2.0 - Janeiro 2026
