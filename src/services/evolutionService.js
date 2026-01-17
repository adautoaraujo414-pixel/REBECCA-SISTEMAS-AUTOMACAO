const fetch = require('node-fetch');

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

if (!EVOLUTION_URL || !API_KEY) {
  console.warn('⚠️ Evolution API não configurada corretamente');
}

async function criarInstancia(instanceName) {
  const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY
    },
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao criar instância: ${text}`);
  }

  return res.json();
}

async function gerarQRCode(instanceName) {
  const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
    headers: {
      'apikey': API_KEY
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao gerar QR Code: ${text}`);
  }

  return res.json();
}

async function statusInstancia(instanceName) {
  const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
    headers: {
      'apikey': API_KEY
    }
  });

  if (!res.ok) return null;
  return res.json();
}

module.exports = {
  criarInstancia,
  gerarQRCode,
  statusInstancia
};
