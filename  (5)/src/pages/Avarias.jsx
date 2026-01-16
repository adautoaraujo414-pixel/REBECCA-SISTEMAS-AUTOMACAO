import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Car, 
  Clock, 
  MapPin, 
  User, 
  Phone,
  Image,
  ChevronRight,
  Loader2,
  Check,
  X,
  DollarSign,
  FileText
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

const STATUS = {
  registrada: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: '⏳' },
  em_analise: { label: 'Em Análise', color: 'bg-blue-100 text-blue-700', icon: '🔍' },
  resolvida: { label: 'Resolvida', color: 'bg-green-100 text-green-700', icon: '✅' },
  arquivada: { label: 'Arquivada', color: 'bg-gray-100 text-gray-700', icon: '📁' }
}

const TIPOS = {
  colisao: { label: 'Colisão', icon: '🚗', color: 'text-red-600' },
  furto: { label: 'Furto/Roubo', icon: '🔓', color: 'text-purple-600' },
  vandalismo: { label: 'Vandalismo', icon: '💥', color: 'text-orange-600' },
  mecanico: { label: 'Problema Mecânico', icon: '🔧', color: 'text-blue-600' },
  pneu: { label: 'Pneu Furado', icon: '🛞', color: 'text-gray-600' },
  outros: { label: 'Outros', icon: '📋', color: 'text-gray-600' }
}

function Avarias() {
  const [loading, setLoading] = useState(true)
  const [avarias, setAvarias] = useState([])
  const [estatisticas, setEstatisticas] = useState({})
  const [filtroStatus, setFiltroStatus] = useState('')
  const [avariaSelecionada, setAvariaSelecionada] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)

  useEffect(() => {
    carregarAvarias()
  }, [filtroStatus])

  const carregarAvarias = async () => {
    setLoading(true)
    try {
      const params = filtroStatus ? `?status=${filtroStatus}` : ''
      const data = await fetchAPI(`/avarias${params}`)
      setAvarias(data.avarias || [])
      setEstatisticas(data.estatisticas || {})
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const abrirDetalhes = async (avaria) => {
    try {
      const data = await fetchAPI(`/avarias/${avaria.id}`)
      setAvariaSelecionada(data.avaria)
      setModalAberto(true)
    } catch (err) {
      console.error(err)
    }
  }

  const atualizarStatus = async (id, status) => {
    try {
      await fetchAPI(`/avarias/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })
      carregarAvarias()
      if (avariaSelecionada?.id === id) {
        setAvariaSelecionada(prev => ({ ...prev, status }))
      }
    } catch (err) {
      alert('Erro ao atualizar')
    }
  }

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Avarias</h1>
          <p className="text-gray-600 mt-1">Colisões, furtos, problemas mecânicos e outros incidentes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <div className="text-2xl font-bold text-amber-600">{estatisticas.pendentes || 0}</div>
          <div className="text-sm text-gray-600">Pendentes</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
          <div className="text-2xl font-bold text-blue-600">{estatisticas.em_analise || 0}</div>
          <div className="text-sm text-gray-600">Em Análise</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <div className="text-2xl font-bold text-green-600">{estatisticas.resolvidas || 0}</div>
          <div className="text-sm text-gray-600">Resolvidas</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <div className="text-2xl font-bold text-red-600">
            R$ {parseFloat(estatisticas.total_prejuizo || 0).toLocaleString('pt-BR')}
          </div>
          <div className="text-sm text-gray-600">Prejuízo Total</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFiltroStatus('')}
          className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
            !filtroStatus ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas ({estatisticas.total || 0})
        </button>
        {Object.entries(STATUS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFiltroStatus(key)}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
              filtroStatus === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {val.icon} {val.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : avarias.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma avaria registrada</h3>
          <p className="text-gray-500">Sem ocorrências no momento</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {avarias.map(avaria => {
              const tipo = TIPOS[avaria.tipo] || TIPOS.outros
              const status = STATUS[avaria.status] || STATUS.registrada
              
              return (
                <div
                  key={avaria.id}
                  onClick={() => abrirDetalhes(avaria)}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className={`text-3xl ${tipo.color}`}>{tipo.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{tipo.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 truncate">{avaria.descricao}</div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {avaria.motorista_nome}
                      </span>
                      <span className="flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        {avaria.veiculo_placa}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatarData(avaria.data_ocorrencia || avaria.criado_em)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {modalAberto && avariaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">{TIPOS[avariaSelecionada.tipo]?.icon || '📋'}</span>
                {TIPOS[avariaSelecionada.tipo]?.label || 'Avaria'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">Status</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => atualizarStatus(avariaSelecionada.id, key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        avariaSelecionada.status === key
                          ? val.color.replace('100', '200')
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {val.icon} {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">Descrição</label>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-xl">{avariaSelecionada.descricao}</p>
              </div>

              {/* Motorista e Veículo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Motorista</label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium">{avariaSelecionada.motorista_nome}</div>
                      <a href={`tel:${avariaSelecionada.motorista_telefone}`} className="text-sm text-indigo-600">
                        {avariaSelecionada.motorista_telefone}
                      </a>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Veículo</label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Car className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{avariaSelecionada.veiculo_modelo}</div>
                      <div className="text-sm text-gray-600">{avariaSelecionada.veiculo_placa}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data e Local */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Data/Hora</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {formatarData(avariaSelecionada.data_ocorrencia || avariaSelecionada.criado_em)}
                  </div>
                </div>
                {avariaSelecionada.endereco_ocorrencia && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Local</label>
                    <div className="flex items-center gap-2 text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {avariaSelecionada.endereco_ocorrencia}
                    </div>
                  </div>
                )}
              </div>

              {/* Envolvidos */}
              {(avariaSelecionada.envolvidos_nome || avariaSelecionada.envolvidos_telefone) && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <label className="text-sm font-medium text-amber-700 mb-3 block">👥 Dados dos Envolvidos</label>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {avariaSelecionada.envolvidos_nome && (
                      <div><span className="text-gray-500">Nome:</span> {avariaSelecionada.envolvidos_nome}</div>
                    )}
                    {avariaSelecionada.envolvidos_telefone && (
                      <div><span className="text-gray-500">Tel:</span> {avariaSelecionada.envolvidos_telefone}</div>
                    )}
                    {avariaSelecionada.envolvidos_placa && (
                      <div><span className="text-gray-500">Placa:</span> {avariaSelecionada.envolvidos_placa}</div>
                    )}
                    {avariaSelecionada.envolvidos_seguro && (
                      <div><span className="text-gray-500">Seguro:</span> {avariaSelecionada.envolvidos_seguro}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Fotos */}
              {avariaSelecionada.fotos && avariaSelecionada.fotos.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">📷 Fotos</label>
                  <div className="flex gap-2 flex-wrap">
                    {avariaSelecionada.fotos.map((foto, i) => (
                      <img
                        key={i}
                        src={foto}
                        alt={`Foto ${i + 1}`}
                        className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                        onClick={() => window.open(foto, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Valor Prejuízo */}
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">💰 Valor do Prejuízo</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">R$</span>
                  <input
                    type="number"
                    defaultValue={avariaSelecionada.valor_prejuizo || ''}
                    placeholder="0,00"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                    onBlur={async (e) => {
                      if (e.target.value) {
                        await fetchAPI(`/avarias/${avariaSelecionada.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ valor_prejuizo: parseFloat(e.target.value) })
                        })
                      }
                    }}
                  />
                </div>
              </div>

              {/* Observações Admin */}
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">📝 Observações do Admin</label>
                <textarea
                  defaultValue={avariaSelecionada.observacoes_admin || ''}
                  placeholder="Adicione suas observações..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none"
                  onBlur={async (e) => {
                    await fetchAPI(`/avarias/${avariaSelecionada.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ observacoes_admin: e.target.value })
                    })
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Avarias
