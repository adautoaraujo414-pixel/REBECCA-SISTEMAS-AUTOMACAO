import React, { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  MapPin,
  Navigation,
  Clock,
  User,
  Car,
  DollarSign,
  Eye,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle
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

function Corridas() {
  const [corridas, setCorridas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todas')
  const [busca, setBusca] = useState('')
  const [corridaSelecionada, setCorridaSelecionada] = useState(null)

  // Carregar corridas da API
  const carregarCorridas = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchAPI('/corridas?limit=100')
      setCorridas(data.corridas || [])
    } catch (err) {
      console.error('Erro ao carregar corridas:', err)
      setError('Erro ao carregar corridas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarCorridas()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarCorridas, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filtrar corridas
  const corridasFiltradas = corridas.filter(c => {
    const matchStatus = filtroStatus === 'todas' || c.status === filtroStatus
    const matchBusca = !busca || 
      c.origem_endereco?.toLowerCase().includes(busca.toLowerCase()) ||
      c.destino_endereco?.toLowerCase().includes(busca.toLowerCase()) ||
      c.cliente_telefone?.includes(busca) ||
      c.motorista_nome?.toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchBusca
  })

  const getStatusBadge = (status) => {
    const badges = {
      aguardando: <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-medium">Aguardando</span>,
      enviada: <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium">Enviada</span>,
      aceita: <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs font-medium">Aceita</span>,
      em_andamento: <span className="bg-rebeca-500/20 text-rebeca-400 px-2 py-1 rounded-full text-xs font-medium">Em Andamento</span>,
      finalizada: <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium">Finalizada</span>,
      cancelada: <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-medium">Cancelada</span>,
    }
    return badges[status] || <span className="bg-dark-600 text-dark-400 px-2 py-1 rounded-full text-xs">{status}</span>
  }

  // Cancelar corrida
  const cancelarCorrida = async (id) => {
    if (!confirm('Tem certeza que deseja cancelar esta corrida?')) return
    
    try {
      await fetchAPI(`/corridas/${id}/cancelar`, { method: 'POST' })
      carregarCorridas()
    } catch (err) {
      alert('Erro ao cancelar corrida')
    }
  }

  // Loading state
  if (loading && corridas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rebeca-400 mx-auto mb-2" />
          <p className="text-dark-400">Carregando corridas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Corridas</h2>
          <p className="text-dark-400">Gerencie todas as corridas da sua frota</p>
        </div>
        <button 
          onClick={carregarCorridas}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por endereço, telefone, motorista..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-rebeca-500 focus:outline-none"
            />
          </div>
          
          {/* Filtro Status */}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-rebeca-500 focus:outline-none"
          >
            <option value="todas">Todas</option>
            <option value="aguardando">Aguardando</option>
            <option value="aceita">Aceitas</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="finalizada">Finalizadas</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Tabela de Corridas */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-dark-400">{error}</p>
          </div>
        ) : corridasFiltradas.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="w-8 h-8 text-dark-500 mx-auto mb-2" />
            <p className="text-dark-400">Nenhuma corrida encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Origem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Destino</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Motorista</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {corridasFiltradas.map((corrida) => (
                  <tr key={corrida.id} className="hover:bg-dark-800/30">
                    <td className="px-4 py-3 text-sm text-white">#{corrida.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white">{corrida.cliente_telefone?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) *****-$3') || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white truncate max-w-[150px]">{corrida.origem_endereco || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white truncate max-w-[150px]">{corrida.destino_endereco || 'Não informado'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white">{corrida.motorista_nome || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white">
                        {corrida.valor_final ? `R$ ${parseFloat(corrida.valor_final).toFixed(2).replace('.', ',')}` : '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(corrida.status)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-dark-400">
                        {new Date(corrida.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-dark-500">
                        {new Date(corrida.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setCorridaSelecionada(corrida)}
                          className="p-1 text-dark-400 hover:text-white transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        {['aguardando', 'enviada', 'aceita'].includes(corrida.status) && (
                          <button 
                            onClick={() => cancelarCorrida(corrida.id)}
                            className="p-1 text-dark-400 hover:text-red-400 transition-colors"
                            title="Cancelar"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detalhes */}
      {corridaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Corrida #{corridaSelecionada.id}</h3>
              <button onClick={() => setCorridaSelecionada(null)} className="text-dark-400 hover:text-white">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="text-rebeca-400" size={18} />
                <div>
                  <p className="text-xs text-dark-400">Origem</p>
                  <p className="text-white">{corridaSelecionada.origem_endereco || '-'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Navigation className="text-blue-400" size={18} />
                <div>
                  <p className="text-xs text-dark-400">Destino</p>
                  <p className="text-white">{corridaSelecionada.destino_endereco || 'Não informado'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <User className="text-purple-400" size={18} />
                <div>
                  <p className="text-xs text-dark-400">Cliente</p>
                  <p className="text-white">{corridaSelecionada.cliente_telefone || '-'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Car className="text-yellow-400" size={18} />
                <div>
                  <p className="text-xs text-dark-400">Motorista</p>
                  <p className="text-white">{corridaSelecionada.motorista_nome || 'Não atribuído'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <DollarSign className="text-green-400" size={18} />
                <div>
                  <p className="text-xs text-dark-400">Valor</p>
                  <p className="text-white">
                    {corridaSelecionada.valor_final ? `R$ ${parseFloat(corridaSelecionada.valor_final).toFixed(2)}` : 'A combinar'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="text-dark-400" size={18} />
                <div>
                  <p className="text-xs text-dark-400">Data/Hora</p>
                  <p className="text-white">
                    {new Date(corridaSelecionada.criado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-dark-700">
                <p className="text-xs text-dark-400 mb-2">Status</p>
                {getStatusBadge(corridaSelecionada.status)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Corridas
