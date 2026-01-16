import { useState, useEffect } from 'react';

export default function ConfiguracaoWhatsapp() {
  const [apiUrl, setApiUrl] = useState('https://evolution-api-production-f2dd.up.railway.app');
  const [apiKey, setApiKey] = useState('');
  const [apiStatus, setApiStatus] = useState('disconnected');
  const [rebecaNumber, setRebecaNumber] = useState('5534996445518');
  const [admNumber, setAdmNumber] = useState('5534984039955');
  const [qrCodeModal, setQrCodeModal] = useState({ show: false, title: '', number: '', instanceName: '' });
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const connectToAPI = async () => {
    if (!apiUrl) {
      showMessage('Por favor, insira a URL da API', 'error');
      return;
    }

    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['apikey'] = apiKey;

      const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers,
      });

      if (response.ok || response.status === 401) {
        setApiStatus('connected');
        showMessage('Conectado com sucesso!', 'success');
        localStorage.setItem('evolutionApiUrl', apiUrl);
        localStorage.setItem('evolutionApiKey', apiKey);
      } else {
        throw new Error('Erro na conexﾆo');
      }
    } catch (error) {
      setApiStatus('disconnected');
      showMessage('Erro ao conectar. Verifique CORS no Railway.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async (instanceName, number) => {
    if (!apiUrl) {
      showMessage('Configure a API primeiro!', 'error');
      return;
    }

    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['apikey'] = apiKey;

      const response = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instanceName,
          number,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      });

      if (response.ok) {
        showMessage(`Instハcia ${instanceName} criada!`, 'success');
      } else {
        showMessage('Instハcia pode j existir. Tente gerar QR Code.', 'warning');
      }
    } catch (error) {
      showMessage('Erro ao criar instハcia', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (instanceName, title, number) => {
    if (!apiUrl) {
      showMessage('Configure a API primeiro!', 'error');
      return;
    }

    setQrCodeModal({ show: true, title, number, instanceName });
    setQrCodeData(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['apikey'] = apiKey;

      await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers
      });

      const interval = setInterval(async () => {
        try {
          const qrResponse = await fetch(`${apiUrl}/instance/qrcode/${instanceName}`, {
            method: 'GET',
            headers
          });
          const qrData = await qrResponse.json();

          if (qrData.base64) {
            setQrCodeData(qrData.base64);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Erro ao buscar QR:', error);
        }
      }, 2000);

      setTimeout(() => clearInterval(interval), 120000);
    } catch (error) {
      showMessage('Erro ao gerar QR Code', 'error');
    }
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('evolutionApiUrl');
    const savedKey = localStorage.getItem('evolutionApiKey');
    if (savedUrl) {
      setApiUrl(savedUrl);
      if (savedKey) setApiKey(savedKey);
    }
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">?? Configurar WhatsApp Business</h1>
        <p className="text-gray-600">Configure os n｣meros do WhatsApp da sua frota</p>
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          message.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* API Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-2xl">
            ??
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Conexﾆo com Evolution API</h2>
            <p className="text-sm text-gray-600">Configure primeiro a conexﾆo</p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 ${
          apiStatus === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${apiStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
          <span className="text-sm font-medium">{apiStatus === 'connected' ? 'Conectado' : 'Desconectado'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">?? URL da Evolution API</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="https://evolution-api-production-f2dd.up.railway.app"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">?? API Key (opcional)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Deixe em branco se nﾆo houver"
            />
          </div>
        </div>

        <button
          onClick={connectToAPI}
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
        >
          {loading ? 'Testando...' : '?? Testar Conexﾆo'}
        </button>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          ?? <strong>Se der erro "Failed to fetch":</strong> Configure CORS no Railway: <code className="bg-white px-2 py-1 rounded">CORS_ORIGIN = *</code>
        </div>
      </div>

      {/* WhatsApp Rebeca */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
            ?????
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">WhatsApp da Rebeca</h2>
            <p className="text-sm text-gray-600">Atendimento aos clientes</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">?? N｣mero do WhatsApp</label>
          <input
            type="text"
            value={rebecaNumber}
            onChange={(e) => setRebecaNumber(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="5534996445518"
          />
          <p className="mt-1 text-xs text-gray-500">Formato: 55 + DDD + N｣mero</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => createInstance('REBECA', rebecaNumber)}
            disabled={loading}
            className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50"
          >
            ?? Criar Instハcia
          </button>
          <button
            onClick={() => generateQRCode('REBECA', 'WhatsApp da Rebeca', rebecaNumber)}
            disabled={loading}
            className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
          >
            ?? Gerar QR Code
          </button>
        </div>
      </div>

      {/* WhatsApp ADM */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl">
            ??
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">WhatsApp do Dono da Frota</h2>
            <p className="text-sm text-gray-600">Receber notifica�臚s e relat｢rios</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">?? N｣mero do WhatsApp</label>
          <input
            type="text"
            value={admNumber}
            onChange={(e) => setAdmNumber(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="5534984039955"
          />
          <p className="mt-1 text-xs text-gray-500">Formato: 55 + DDD + N｣mero</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => createInstance('ADM', admNumber)}
            disabled={loading}
            className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            ?? Criar Instハcia
          </button>
          <button
            onClick={() => generateQRCode('ADM', 'WhatsApp do ADM', admNumber)}
            disabled={loading}
            className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
          >
            ?? Gerar QR Code
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {qrCodeModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setQrCodeModal({ show: false, title: '', number: '', instanceName: '' })}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{qrCodeModal.title}</h3>
                <p className="text-sm text-gray-600">WhatsApp: {qrCodeModal.number}</p>
              </div>
              <button
                onClick={() => setQrCodeModal({ show: false, title: '', number: '', instanceName: '' })}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ?
              </button>
            </div>

            <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4">
              {qrCodeData ? (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-xl shadow-lg inline-block">
                    <img src={qrCodeData} alt="QR Code" className="w-64 h-64" />
                  </div>
                  <div className="mt-4 text-sm text-gray-600 space-y-1">
                    <p>?? Abra o WhatsApp no celular</p>
                    <p>?? V em Configura�臚s  Aparelhos conectados</p>
                    <p>?? Toque em "Conectar aparelho"</p>
                    <p>? Escaneie este QR Code</p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-4 text-gray-600">Gerando QR Code...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
