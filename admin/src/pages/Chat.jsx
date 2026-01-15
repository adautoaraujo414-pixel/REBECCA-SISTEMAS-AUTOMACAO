import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageCircle, 
  Send, 
  User, 
  Check,
  CheckCheck,
  Loader2,
  Search,
  Radio,
  Users
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

function Chat() {
  const [loading, setLoading] = useState(true)
  const [conversas, setConversas] = useState([])
  const [conversaSelecionada, setConversaSelecionada] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [busca, setBusca] = useState('')
  const [modalBroadcast, setModalBroadcast] = useState(false)
  const [mensagemBroadcast, setMensagemBroadcast] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    carregarConversas()
    // Atualizar a cada 10 segundos
    const interval = setInterval(carregarConversas, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (conversaSelecionada) {
      carregarMensagens(conversaSelecionada.motorista_id)
    }
  }, [conversaSelecionada])

  useEffect(() => {
    scrollToBottom()
  }, [mensagens])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const carregarConversas = async () => {
    try {
      const data = await fetchAPI('/chat')
      setConversas(data.conversas || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const carregarMensagens = async (motoristaId) => {
    try {
      const data = await fetchAPI(`/chat/${motoristaId}`)
      setMensagens(data.mensagens || [])
    } catch (err) {
      console.error(err)
    }
  }

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada) return
    
    setEnviando(true)
    try {
      await fetchAPI(`/chat/${conversaSelecionada.motorista_id}`, {
        method: 'POST',
        body: JSON.stringify({ mensagem: novaMensagem })
      })
      setNovaMensagem('')
      await carregarMensagens(conversaSelecionada.motorista_id)
    } catch (err) {
      alert('Erro ao enviar')
    }
    setEnviando(false)
  }

  const enviarBroadcast = async () => {
    if (!mensagemBroadcast.trim()) return
    
    setEnviando(true)
    try {
      const data = await fetchAPI('/chat/broadcast', {
        method: 'POST',
        body: JSON.stringify({ mensagem: mensagemBroadcast })
      })
      alert(`✅ Mensagem enviada para ${data.enviados} motoristas!`)
      setMensagemBroadcast('')
      setModalBroadcast(false)
      carregarConversas()
    } catch (err) {
      alert('Erro ao enviar')
    }
    setEnviando(false)
  }

  const formatarHora = (data) => {
    return new Date(data).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const conversasFiltradas = conversas.filter(c => 
    c.motorista_nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.motorista_telefone?.includes(busca)
  )

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-4">
      {/* Lista de Conversas */}
      <div className="w-full lg:w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Chat da Frota</h2>
            <button
              onClick={() => setModalBroadcast(true)}
              className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
              title="Enviar para todos"
            >
              <Radio className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar motorista..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma conversa</p>
            </div>
          ) : (
            conversasFiltradas.map(conversa => (
              <div
                key={conversa.motorista_id}
                onClick={() => setConversaSelecionada(conversa)}
                className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${
                  conversaSelecionada?.motorista_id === conversa.motorista_id
                    ? 'bg-indigo-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 truncate">
                        {conversa.motorista_nome}
                      </span>
                      {conversa.nao_lidas > 0 && (
                        <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                          {conversa.nao_lidas}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{conversa.mensagem}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {!conversaSelecionada ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Escolha um motorista na lista para iniciar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header do Chat */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{conversaSelecionada.motorista_nome}</h3>
                <p className="text-sm text-gray-500">{conversaSelecionada.motorista_telefone}</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {mensagens.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>Nenhuma mensagem ainda</p>
                  <p className="text-sm">Envie a primeira mensagem!</p>
                </div>
              ) : (
                mensagens.map((msg, index) => {
                  const isAdmin = msg.remetente_tipo === 'admin'
                  return (
                    <div
                      key={index}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                          isAdmin
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                        }`}
                      >
                        <p className="text-sm">{msg.mensagem}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          isAdmin ? 'text-indigo-200 justify-end' : 'text-gray-400'
                        }`}>
                          {formatarHora(msg.criado_em)}
                          {isAdmin && (
                            msg.lida ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={novaMensagem}
                  onChange={e => setNovaMensagem(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={enviarMensagem}
                  disabled={!novaMensagem.trim() || enviando}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {enviando ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Broadcast */}
      {modalBroadcast && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-600" />
                Enviar para Todos
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Esta mensagem será enviada para todos os motoristas da sua frota.
              </p>
              <textarea
                value={mensagemBroadcast}
                onChange={e => setMensagemBroadcast(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setModalBroadcast(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={enviarBroadcast}
                disabled={!mensagemBroadcast.trim() || enviando}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar para Todos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat
