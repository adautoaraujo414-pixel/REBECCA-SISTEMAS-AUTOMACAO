import React, { useState, useEffect } from 'react'
import { 
  MapPin, 
  User, 
  Phone, 
  Send, 
  Loader2, 
  Check,
  Navigation,
  Clock,
  Car
} from 'lucide-react'

const getToken = () => localStorage.getItem('token')

const fetchAPI = async (endpoint, options = {}) => {
  const token = getToken()
  const response = await fetch(`/api/admin${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  return response.json()
}

function NovaCorrida() {
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [corridasCriadas, setCorridasCriadas] = useState([])
  const [form, setForm] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    origem_endereco: '',
    origem_latitude: '',
    origem_longitude: '',
    destino_endereco: '',
    observacoes: ''
  })

  useEffect(() => {
    carregarCorridasManuais()
  }, [])

  const carregarCorridasManuais = async () => {
    try {
      const data = await fetchAPI('/corridas-manuais')
      setCorridasCriadas(data.corridas || [])
    } catch (err) {
      console.error(err)
    }
  }

  const capturarLocalizacao = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setForm(prev => ({
            ...prev,
            origem_latitude: pos.coords.latitude,
            origem_longitude: pos.coords.longitude
          }))
          alert('📍 Localização capturada!')
        },
        err => alert('Não foi possível obter localização')
      )
    }
  }

  const enviarCorrida = async (e) => {
    e.preventDefault()
    
    if (!form.cliente_telefone || !form.origem_endereco) {
      alert('Telefone e endereço de origem são obrigatórios!')
      return
    }

    setLoading(true)
    try {
      const data = await fetchAPI('/corrida-manual', {
        method: 'POST',
        body: JSON.stringify(form)
      })

      if (data.success) {
        setSucesso(true)
        setForm({
          cliente_nome: '',
          cliente_telefone: '',
          origem_endereco: '',
          origem_latitude: '',
          origem_longitude: '',
          destino_endereco: '',
          observacoes: ''
        })
        carregarCorridasManuais()
        setTimeout(() => setSucesso(false), 3000)
      } else {
        alert('Erro: ' + (data.error || 'Falha ao criar corrida'))
      }
    } catch (err) {
      alert('Erro de conexão')
    }
    setLoading(false)
  }

  const formatarTelefone = (tel) => {
    const nums = tel.replace(/\D/g, '')
    if (nums.length <= 2) return nums
    if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2)}`
    return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7,11)}`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nova Corrida Manual</h1>
          <p className="text-dark-400 mt-1">Solicite uma corrida que será processada pela Rebeca</p>
        </div>
      </div>

      {/* Sucesso */}
      {sucesso && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-green-400">Corrida Criada!</h3>
            <p className="text-green-400/80 text-sm">A Rebeca está buscando um motorista...</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-2">
          <form onSubmit={enviarCorrida} className="bg-dark-800 rounded-2xl p-6 space-y-5">
            {/* Cliente */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-rebeca-400" />
                Dados do Cliente
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Nome</label>
                  <input
                    type="text"
                    value={form.cliente_nome}
                    onChange={e => setForm({...form, cliente_nome: e.target.value})}
                    placeholder="Nome do cliente"
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:ring-2 focus:ring-rebeca-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Telefone *</label>
                  <input
                    type="tel"
                    value={form.cliente_telefone}
                    onChange={e => setForm({...form, cliente_telefone: formatarTelefone(e.target.value)})}
                    placeholder="(14) 99999-0000"
                    required
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:ring-2 focus:ring-rebeca-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Origem */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-400" />
                Origem (Embarque)
              </h3>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Endereço *</label>
                <input
                  type="text"
                  value={form.origem_endereco}
                  onChange={e => setForm({...form, origem_endereco: e.target.value})}
                  placeholder="Rua, número, bairro..."
                  required
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:ring-2 focus:ring-rebeca-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={capturarLocalizacao}
                  className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-xl text-dark-300 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Usar GPS
                </button>
                {form.origem_latitude && (
                  <span className="flex items-center text-sm text-green-400">
                    <Check className="w-4 h-4 mr-1" />
                    GPS capturado
                  </span>
                )}
              </div>
            </div>

            {/* Destino */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-400" />
                Destino (Opcional)
              </h3>
              <input
                type="text"
                value={form.destino_endereco}
                onChange={e => setForm({...form, destino_endereco: e.target.value})}
                placeholder="Endereço de destino (opcional)"
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:ring-2 focus:ring-rebeca-500 focus:border-transparent"
              />
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Observações</label>
              <textarea
                value={form.observacoes}
                onChange={e => setForm({...form, observacoes: e.target.value})}
                placeholder="Informações adicionais..."
                rows={2}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:ring-2 focus:ring-rebeca-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-rebeca-600 to-rebeca-500 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando para Rebeca...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Solicitar Corrida
                </>
              )}
            </button>
          </form>
        </div>

        {/* Histórico */}
        <div className="lg:col-span-1">
          <div className="bg-dark-800 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-rebeca-400" />
              Últimas Corridas Manuais
            </h3>
            
            {corridasCriadas.length === 0 ? (
              <div className="text-center py-8 text-dark-400">
                <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma corrida manual ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {corridasCriadas.slice(0, 5).map(corrida => (
                  <div
                    key={corrida.id}
                    className="p-3 bg-dark-700 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white text-sm">
                        {corrida.cliente_nome || 'Cliente'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        corrida.corrida_status === 'aceita' 
                          ? 'bg-green-500/20 text-green-400'
                          : corrida.corrida_status === 'solicitada'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-dark-600 text-dark-300'
                      }`}>
                        {corrida.corrida_status || 'Pendente'}
                      </span>
                    </div>
                    <div className="text-xs text-dark-400 truncate">
                      📍 {corrida.origem_endereco}
                    </div>
                    {corrida.motorista_nome && (
                      <div className="text-xs text-rebeca-400 mt-1">
                        🚗 {corrida.motorista_nome}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NovaCorrida
