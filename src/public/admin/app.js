async function conectarWhatsApp(empresaId) {
  const container = document.getElementById('qrcode-container');
  container.innerHTML = '⏳ Gerando QR Code...';

  try {
    const response = await fetch('/api/admin/whatsapp/conectar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa_id: empresaId })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Erro ao conectar WhatsApp');
    }

    if (data.qrcode) {
      container.innerHTML = `
        <h3>Escaneie o QR Code</h3>
        <img src="data:image/png;base64,${data.qrcode}" width="300" />
      `;
    } else {
      container.innerHTML = '✅ WhatsApp já conectado';
    }

  } catch (err) {
    console.error(err);
    container.innerHTML = '❌ Erro ao gerar QR Code';
  }
}
