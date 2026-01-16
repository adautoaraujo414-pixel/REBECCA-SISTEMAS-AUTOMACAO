# 📞 REBECA - Atendimento Telefônico com IA

## Como Funciona

```
📞 Cliente liga
      ↓
   Twilio recebe
      ↓
   Webhook /api/telefone/entrada
      ↓
   Rebeca: "Olá! Aqui é a Rebeca da UBMAX. Como posso ajudar?"
      ↓
   Cliente fala (gravação)
      ↓
   Webhook /api/telefone/processar
      ↓
   Whisper transcreve → GPT-4 processa → Polly responde
      ↓
   📞 Cliente ouve voz humana
```

---

## 🚀 Configuração Passo a Passo

### 1. Criar conta no Twilio
1. Acesse: https://www.twilio.com/try-twilio
2. Crie uma conta (tem $15 de crédito grátis)
3. Verifique seu número de telefone

### 2. Comprar número de telefone
1. No Console Twilio: Phone Numbers → Buy a Number
2. Escolha um número brasileiro (+55)
3. Custo: ~$1/mês

### 3. Configurar Webhooks
1. Vá em Phone Numbers → Manage → Active Numbers
2. Clique no seu número
3. Em "Voice & Fax":
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://seu-servidor.com/api/telefone/entrada`
   - **HTTP**: POST
   
   - **CALL STATUS CHANGES**: `https://seu-servidor.com/api/telefone/status`

### 4. Obter credenciais
1. No Console Twilio → Dashboard
2. Copie:
   - **Account SID**: ACxxxxxxxx
   - **Auth Token**: xxxxxxxx

### 5. Configurar .env
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+5511999999999
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 6. Instalar dependências
```bash
npm install twilio openai axios
```

### 7. Adicionar rotas no server.js
```javascript
const telefoneRoutes = require('./api/telefone');
app.use('/api/telefone', telefoneRoutes);
```

---

## 🧪 Testar Localmente

### Usar ngrok para expor servidor local:
```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta 3000
ngrok http 3000

# Copie a URL (ex: https://abc123.ngrok.io)
# Configure no Twilio como webhook
```

---

## 💰 Custos Estimados

| Serviço | Custo |
|---------|-------|
| Número Twilio (BR) | ~R$5/mês |
| Ligação recebida | ~R$0,10/min |
| Ligação feita | ~R$0,15/min |
| Whisper (transcrição) | $0,006/min |
| GPT-4 | ~$0,01/resposta |
| **Total por ligação 3min** | **~R$0,50** |

---

## 🔧 Vozes Disponíveis (Polly)

### Português Brasil:
- **Camila** (feminina, neural) ← Recomendada
- **Vitoria** (feminina)
- **Ricardo** (masculina)

### Configurar voz:
```javascript
twiml.say({
  voice: 'Polly.Camila',  // ou Polly.Vitoria, Polly.Ricardo
  language: 'pt-BR'
}, 'Texto aqui');
```

### Usar OpenAI TTS (mais natural):
```javascript
// Vozes: alloy, echo, fable, onyx, nova, shimmer
const mp3 = await openai.audio.speech.create({
  model: 'tts-1-hd',  // qualidade HD
  voice: 'nova',      // voz feminina natural
  input: texto
});
```

---

## 📱 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/telefone/entrada` | Webhook - recebe ligação |
| POST | `/api/telefone/processar` | Webhook - processa gravação |
| POST | `/api/telefone/status` | Webhook - status da ligação |
| POST | `/api/telefone/ligar` | Fazer ligação (outbound) |
| POST | `/api/telefone/sms` | Enviar SMS |
| GET | `/api/telefone/ativas` | Listar ligações ativas |

---

## ✅ Checklist de Implementação

- [ ] Criar conta Twilio
- [ ] Comprar número brasileiro
- [ ] Configurar webhooks no Twilio
- [ ] Adicionar variáveis no .env
- [ ] Instalar dependências (twilio, openai, axios)
- [ ] Adicionar rotas no server.js
- [ ] Testar com ngrok
- [ ] Deploy em produção
