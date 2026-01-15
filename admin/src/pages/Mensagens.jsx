import React, { useState, useEffect } from 'react'
import {
  Search,
  MessageCircle,
  Send,
  Clock,
  User,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Check,
  CheckCheck
} from 'lucide-react'

// Função para obter token
const getToken = () => localStorage.getItem('token')

// Função para fazer requisições autenticadas
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
  if (!response.ok) throw new Error('Erro na requisição')
  return response.json()
}

function Mensagens() {
  const [conversas, setConversas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busca, setBusca] = useState('')
  const [conversaSelecionada, setConversaSelecionada] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Carregar conversas da API
  const carregarConversas = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchAPI('/mensagens')
      setConversas(data.conversas || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
      setError('Erro ao carregar mensagens')
    } finally {
      setLoading(false)
    }
  }

  // Carregar mensagens de uma conversa
  const carregarMensagens = async (telefone) => {
    try {
      const data = await fetchAPI(`/mensagens/${telefone}`)
      setMensagens(data.mensagens || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
      setMensagens([])
    }
  }

  useEffect(() => {
    carregarConversas()
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(carregarConversas, 10000)
    return () => clearInterval(interval)
  }, [])

  // Quando selecionar uma conversa
  useEffect(() => {
    if (conversaSelecionada) {
      carregarMensagens(conversaSelecionada.telefone)
    }
  }, [conversaSelecionada])

  // Filtrar conversas
  const conversasFiltradas = conversas.filter(c => {
    return !busca || 
      c.telefone?.includes(busca) ||
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.ultima_mensagem?.toLowerCase().includes(busca.toLowerCase())
  })

  // Enviar mensagem
  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada) return
    
    setEnviando(true)
    try {
      await fetchAPI('/mensagens/enviar', {
        method: 'POST',
        body: JSON.stringify({
          telefone: conversaSelecionada.telefone,
          mensagem: novaMensagem
        })
      })
      setNovaMensagem('')
      carregarMensagens(conversaSelecionada.telefone)
    } catch (err) {
      alert('Erro ao enviar mensagem')
    } finally {
      setEnviando(false)
    }
  }

  // Formatar data
  const formatarData = (data) => {
    if (!data) return ''
    const d = new Date(data)
    const hoje = new Date()
    
    if (d.toDateString() === hoje.toDateString()) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  // Loading state
  if (loading && conversas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rebeca-400 mx-auto mb-2" />
          <p className="text-dark-400">Carregando mensagens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 animate-fade-in">
      {/* Lista de Conversas */}
      <div className="w-80 flex flex-col glass-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Mensagens</h2>
            <button 
              onClick={carregarConversas}
              disabled={loading}
              className="text-dark-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
            <input
              type="text"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm placeholder-dark-400 focus:border-rebeca-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-dark-400 text-sm">{error}</p>
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="p-4 text-center">
              <MessageCircle className="w-6 h-6 text-dark-500 mx-auto mb-2" />
              <p className="text-dark-400 text-sm">Nenhuma conversa</p>
            </div>
          ) : (
            conversasFiltradas.map((conversa) => (
              <div
                key={conversa.telefone}
                onClick={() => setConversaSelecionada(conversa)}
                className={`p-4 border-b border-dark-700/50 cursor-pointer transition-colors ${
                  conversaSelecionada?.telefone === conversa.telefone 
                    ? 'bg-rebeca-500/10 border-l-2 border-l-rebeca-500' 
                    : 'hover:bg-dark-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center">
                    <User size={18} className="text-dark-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white text-sm truncate">
                        {conversa.nome || conversa.telefone?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                      </p>
                      <span className="text-xs text-dark-500">{formatarData(conversa.ultima_atividade)}</span>
                    </div>
                    <p className="text-sm text-dark-400 truncate">{conversa.ultima_mensagem || 'Sem mensagens'}</p>
                  </div>
                  {conversa.nao_lidas > 0 && (
                    <span className="w-5 h-5 bg-rebeca-500 text-white text-xs rounded-full flex items-center justify-center">
                      {conversa.nao_lidas}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col glass-card rounded-2xl overflow-hidden">
        {conversaSelecionada ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 border-b border-dark-700 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center">
                <User size={18} className="text-dark-400" />
              </div>
              <div>
                <p className="font-medium text-white">
                  {conversaSelecionada.nome || conversaSelecionada.telefone?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                </p>
                <p className="text-xs text-dark-400">{conversaSelecionada.telefone}</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mensagens.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 text-dark-500 mx-auto mb-2" />
                  <p className="text-dark-400">Nenhuma mensagem</p>
                </div>
              ) : (
                mensagens.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl ${
                        msg.tipo === 'enviada'
                          ? 'bg-rebeca-500 text-white rounded-br-md'
                          : 'bg-dark-700 text-white rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm">{msg.conteudo}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs opacity-70">{formatarData(msg.criado_em)}</span>
                        {msg.tipo === 'enviada' && (
                          msg.lida ? <CheckCheck size={12} className="opacity-70" /> : <Check size={12} className="opacity-70" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-dark-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-rebeca-500 focus:outline-none"
                />
                <button
                  onClick={enviarMensagem}
                  disabled={enviando || !novaMensagem.trim()}
                  className="p-3 bg-rebeca-500 text-white rounded-xl hover:bg-rebeca-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enviando ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-dark-500 mx-auto mb-3" />
              <p className="text-dark-400">Selecione uma conversa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Mensagens
