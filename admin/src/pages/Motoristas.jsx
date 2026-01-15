import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Car,
  Phone,
  MapPin,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
  AlertTriangle,
  XCircle,
  CheckCircle
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

function Motoristas() {
  const [motoristas, setMotoristas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')
  const [motoristaSelecionado, setMotoristaSelecionado] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    veiculo_modelo: '',
    veiculo_cor: '',
    veiculo_placa: ''
  })

  // Carregar motoristas da API
  const carregarMotoristas = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchAPI('/motoristas')
      setMotoristas(data.motoristas || [])
    } catch (err) {
      console.error('Erro ao carregar motoristas:', err)
      setError('Erro ao carregar motoristas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarMotoristas()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarMotoristas, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filtrar motoristas
  const motoristasFiltrados = motoristas.filter(m => {
    const matchStatus = filtroStatus === 'todos' || m.status === filtroStatus
    const matchBusca = !busca || 
      m.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      m.telefone?.includes(busca) ||
      m.veiculo_placa?.toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchBusca
  })

  const getStatusBadge = (status) => {
    const badges = {
      online: <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full"></span>Online</span>,
      offline: <span className="bg-dark-600/50 text-dark-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><span className="w-2 h-2 bg-dark-400 rounded-full"></span>Offline</span>,
      em_corrida: <span className="bg-rebeca-500/20 text-rebeca-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><span className="w-2 h-2 bg-rebeca-400 rounded-full animate-pulse"></span>Em Corrida</span>,
    }
    return badges[status] || badges.offline
  }

  // Adicionar motorista
  const adicionarMotorista = async () => {
    try {
      await fetchAPI('/motoristas', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      setShowModal(false)
      setFormData({ nome: '', telefone: '', veiculo_modelo: '', veiculo_cor: '', veiculo_placa: '' })
      carregarMotoristas()
    } catch (err) {
      alert('Erro ao adicionar motorista')
    }
  }

  // Ativar/Desativar motorista
  const toggleAtivoMotorista = async (id, ativo) => {
    try {
      await fetchAPI(`/motoristas/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ativo: !ativo })
      })
      carregarMotoristas()
    } catch (err) {
      alert('Erro ao atualizar motorista')
    }
  }

  // Loading state
  if (loading && motoristas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rebeca-400 mx-auto mb-2" />
          <p className="text-dark-400">Carregando motoristas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Motoristas</h2>
          <p className="text-dark-400">Gerencie os motoristas da sua frota</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={carregarMotoristas}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rebeca-500 text-white rounded-lg hover:bg-rebeca-600 transition-colors"
          >
            <Plus size={18} />
            Novo Motorista
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, placa..."
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
            <option value="todos">Todos</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="em_corrida">Em Corrida</option>
          </select>
        </div>
      </div>

      {/* Grid de Motoristas */}
      {error ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-dark-400">{error}</p>
        </div>
      ) : motoristasFiltrados.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Car className="w-8 h-8 text-dark-500 mx-auto mb-2" />
          <p className="text-dark-400">Nenhum motorista encontrado</p>
          <button 
            onClick={() => setShowModal(true)}
            className="mt-4 text-rebeca-400 hover:text-rebeca-300"
          >
            Adicionar primeiro motorista
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {motoristasFiltrados.map((motorista) => (
            <div key={motorista.id} className="glass-card rounded-2xl p-5 hover:border-rebeca-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rebeca-500 to-rebeca-600 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {motorista.nome?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{motorista.nome || 'Sem nome'}</h3>
                    <p className="text-sm text-dark-400">{motorista.telefone || '-'}</p>
                  </div>
                </div>
                {getStatusBadge(motorista.status)}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Car size={14} className="text-dark-400" />
                  <span className="text-dark-300">{motorista.veiculo_modelo} {motorista.veiculo_cor}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-dark-400">Placa:</span>
                  <span className="text-white font-mono">{motorista.veiculo_placa || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star size={14} className="text-yellow-400" />
                  <span className="text-dark-300">{motorista.nota_media?.toFixed(1) || '5.0'}</span>
                  <span className="text-dark-500">•</span>
                  <span className="text-dark-400">{motorista.total_corridas || 0} corridas</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-dark-700">
                <button 
                  onClick={() => setMotoristaSelecionado(motorista)}
                  className="flex-1 py-2 text-sm text-dark-400 hover:text-white transition-colors"
                >
                  <Eye size={16} className="inline mr-1" /> Detalhes
                </button>
                <button 
                  onClick={() => toggleAtivoMotorista(motorista.id, motorista.ativo)}
                  className={`flex-1 py-2 text-sm transition-colors ${motorista.ativo ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                >
                  {motorista.ativo ? (
                    <><XCircle size={16} className="inline mr-1" /> Desativar</>
                  ) : (
                    <><CheckCircle size={16} className="inline mr-1" /> Ativar</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Adicionar Motorista */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Novo Motorista</h3>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-400 mb-1">Nome completo</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-rebeca-500 focus:outline-none"
                  placeholder="João da Silva"
                />
              </div>
              
              <div>
                <label className="block text-sm text-dark-400 mb-1">Telefone (WhatsApp)</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-rebeca-500 focus:outline-none"
                  placeholder="14999999999"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Modelo do veículo</label>
                  <input
                    type="text"
                    value={formData.veiculo_modelo}
                    onChange={(e) => setFormData({...formData, veiculo_modelo: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-rebeca-500 focus:outline-none"
                    placeholder="Onix"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Cor</label>
                  <input
                    type="text"
                    value={formData.veiculo_cor}
                    onChange={(e) => setFormData({...formData, veiculo_cor: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-rebeca-500 focus:outline-none"
                    placeholder="Branco"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-dark-400 mb-1">Placa</label>
                <input
                  type="text"
                  value={formData.veiculo_placa}
                  onChange={(e) => setFormData({...formData, veiculo_placa: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-rebeca-500 focus:outline-none font-mono"
                  placeholder="ABC1D23"
                  maxLength={7}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarMotorista}
                  className="flex-1 py-2 px-4 bg-rebeca-500 text-white rounded-lg hover:bg-rebeca-600 transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {motoristaSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Detalhes do Motorista</h3>
              <button onClick={() => setMotoristaSelecionado(null)} className="text-dark-400 hover:text-white">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rebeca-500 to-rebeca-600 flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-2xl">
                  {motoristaSelecionado.nome?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
                </span>
              </div>
              <h4 className="text-xl font-semibold text-white">{motoristaSelecionado.nome}</h4>
              {getStatusBadge(motoristaSelecionado.status)}
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-dark-700">
                <span className="text-dark-400">Telefone</span>
                <span className="text-white">{motoristaSelecionado.telefone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-dark-700">
                <span className="text-dark-400">Veículo</span>
                <span className="text-white">{motoristaSelecionado.veiculo_modelo} {motoristaSelecionado.veiculo_cor}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-dark-700">
                <span className="text-dark-400">Placa</span>
                <span className="text-white font-mono">{motoristaSelecionado.veiculo_placa}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-dark-700">
                <span className="text-dark-400">Avaliação</span>
                <span className="text-white flex items-center gap-1">
                  <Star size={14} className="text-yellow-400" />
                  {motoristaSelecionado.nota_media?.toFixed(1) || '5.0'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-dark-700">
                <span className="text-dark-400">Total de corridas</span>
                <span className="text-white">{motoristaSelecionado.total_corridas || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-dark-400">Status</span>
                <span className="text-white">{motoristaSelecionado.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Motoristas
