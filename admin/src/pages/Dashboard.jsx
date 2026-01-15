import React, { useState, useEffect } from 'react'
import {
  Car,
  MapPin,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Navigation,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import StatCard from '../components/StatCard'

// Função para obter token
const getToken = () => localStorage.getItem('token')

// Função para fazer requisições autenticadas
const fetchAPI = async (endpoint) => {
  const token = getToken()
  const response = await fetch(`/api/admin${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  if (!response.ok) throw new Error('Erro na requisição')
  return response.json()
}

function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Estados para dados reais
  const [stats, setStats] = useState({
    corridasHoje: 0,
    motoristasOnline: 0,
    faturamentoHoje: 0,
    tempoMedioEspera: '0 min',
  })
  const [corridasHoje, setCorridasHoje] = useState([])
  const [motoristasAtivos, setMotoristasAtivos] = useState([])
  const [corridasRecentes, setCorridasRecentes] = useState([])
  const [alertas, setAlertas] = useState([])

  // Carregar dados da API
  const carregarDados = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Buscar estatísticas
      const statsData = await fetchAPI('/dashboard')
      setStats({
        corridasHoje: statsData.corridas_hoje || 0,
        motoristasOnline: statsData.motoristas_online || 0,
        faturamentoHoje: statsData.faturamento_hoje || 0,
        tempoMedioEspera: statsData.tempo_medio_espera || '0 min',
      })
      
      // Buscar motoristas
      const motoristasData = await fetchAPI('/motoristas')
      const ativos = (motoristasData.motoristas || []).filter(m => m.status === 'online' || m.status === 'em_corrida')
      setMotoristasAtivos(ativos)
      
      // Buscar corridas recentes
      const corridasData = await fetchAPI('/corridas?limit=10')
      setCorridasRecentes(corridasData.corridas || [])
      
      // Montar dados do gráfico por hora
      const graficoData = montarGraficoPorHora(corridasData.corridas || [])
      setCorridasHoje(graficoData)
      
      // Buscar alertas
      try {
        const alertasData = await fetchAPI('/alertas')
        setAlertas(alertasData.alertas || [])
      } catch (e) {
        setAlertas([])
      }
      
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      setError('Erro ao carregar dados. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }
  
  // Montar dados do gráfico agrupando por hora
  const montarGraficoPorHora = (corridas) => {
    const hoje = new Date().toDateString()
    const corridasHoje = corridas.filter(c => new Date(c.criado_em).toDateString() === hoje)
    
    const porHora = {}
    for (let i = 6; i <= 23; i++) {
      porHora[`${i.toString().padStart(2, '0')}:00`] = 0
    }
    
    corridasHoje.forEach(c => {
      const hora = new Date(c.criado_em).getHours()
      const chave = `${hora.toString().padStart(2, '0')}:00`
      if (porHora[chave] !== undefined) {
        porHora[chave]++
      }
    })
    
    return Object.entries(porHora).map(([hora, corridas]) => ({ hora, corridas }))
  }

  useEffect(() => {
    carregarDados()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarDados, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status) => {
    const badges = {
      online: <span className="status-online px-2 py-1 rounded-full text-xs font-medium">Online</span>,
      offline: <span className="status-offline px-2 py-1 rounded-full text-xs font-medium">Offline</span>,
      em_corrida: <span className="status-em-corrida px-2 py-1 rounded-full text-xs font-medium">Em Corrida</span>,
      aguardando: <span className="status-aguardando px-2 py-1 rounded-full text-xs font-medium">Aguardando</span>,
      aceita: <span className="status-em-corrida px-2 py-1 rounded-full text-xs font-medium">Aceita</span>,
      em_andamento: <span className="status-em-corrida px-2 py-1 rounded-full text-xs font-medium">Em Andamento</span>,
      finalizada: <span className="status-finalizada px-2 py-1 rounded-full text-xs font-medium">Finalizada</span>,
      cancelada: <span className="status-cancelada px-2 py-1 rounded-full text-xs font-medium">Cancelada</span>,
    }
    return badges[status] || badges.offline
  }
  
  // Loading state
  if (loading && corridasRecentes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rebeca-400 mx-auto mb-2" />
          <p className="text-dark-400">Carregando dados...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error && corridasRecentes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-dark-400 mb-4">{error}</p>
          <button 
            onClick={carregarDados}
            className="px-4 py-2 bg-rebeca-500 text-white rounded-lg hover:bg-rebeca-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold text-white">Dashboard</h2>
        <button 
          onClick={carregarDados}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-dark-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Corridas Hoje"
          value={stats.corridasHoje}
          icon={MapPin}
          color="rebeca"
        />
        <StatCard
          title="Motoristas Online"
          value={stats.motoristasOnline}
          icon={Car}
          color="blue"
        />
        <StatCard
          title="Faturamento Hoje"
          value={`R$ ${stats.faturamentoHoje.toFixed(2).replace('.', ',')}`}
          icon={DollarSign}
          color="yellow"
        />
        <StatCard
          title="Tempo Médio Espera"
          value={stats.tempoMedioEspera}
          icon={Clock}
          color="purple"
        />
      </div>

      {/* Gráfico + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Corridas */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-display font-semibold text-white">Corridas por Hora</h3>
              <p className="text-sm text-dark-400">Hoje</p>
            </div>
          </div>
          <div className="h-64">
            {corridasHoje.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={corridasHoje}>
                  <defs>
                    <linearGradient id="colorCorridas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="hora" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="corridas" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCorridas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-dark-400">
                Nenhuma corrida registrada hoje
              </div>
            )}
          </div>
        </div>

        {/* Alertas */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-display font-semibold text-white mb-4">Alertas</h3>
          <div className="space-y-3">
            {alertas.length > 0 ? alertas.map((alerta) => (
              <div 
                key={alerta.id}
                className={`p-4 rounded-xl border ${
                  alerta.tipo === 'aviso' 
                    ? 'bg-yellow-500/10 border-yellow-500/20' 
                    : 'bg-green-500/10 border-green-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {alerta.tipo === 'aviso' ? (
                    <AlertTriangle size={18} className="text-yellow-400 mt-0.5" />
                  ) : (
                    <CheckCircle size={18} className="text-green-400 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm text-white">{alerta.mensagem}</p>
                    <p className="text-xs text-dark-400 mt-1">{alerta.tempo}</p>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-dark-400 text-sm text-center py-4">Nenhum alerta</p>
            )}
          </div>
        </div>
      </div>

      {/* Motoristas + Corridas Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Motoristas Ativos */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold text-white">Motoristas Ativos</h3>
            <span className="text-sm text-dark-400">{motoristasAtivos.length} online</span>
          </div>
          <div className="space-y-3">
            {motoristasAtivos.length > 0 ? motoristasAtivos.map((motorista) => (
              <div 
                key={motorista.id}
                className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rebeca-500 to-rebeca-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {motorista.nome?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{motorista.nome || 'Motorista'}</p>
                    <p className="text-sm text-dark-400">{motorista.veiculo_modelo} {motorista.veiculo_cor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-dark-400">{motorista.total_corridas || 0} corridas</p>
                  </div>
                  {getStatusBadge(motorista.status)}
                </div>
              </div>
            )) : (
              <p className="text-dark-400 text-sm text-center py-4">Nenhum motorista online</p>
            )}
          </div>
        </div>

        {/* Corridas Recentes */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold text-white">Corridas Recentes</h3>
            <a href="/corridas" className="text-sm text-rebeca-400 hover:text-rebeca-300">Ver todas</a>
          </div>
          <div className="space-y-3">
            {corridasRecentes.length > 0 ? corridasRecentes.slice(0, 5).map((corrida) => (
              <div 
                key={corrida.id}
                className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
                    <Navigation size={18} className="text-dark-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{corrida.origem_endereco?.substring(0, 30) || 'Origem'}...</p>
                    <p className="text-xs text-dark-400">
                      {corrida.cliente_telefone?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) *****-$3') || 'Cliente'} - 
                      {new Date(corrida.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {corrida.valor_final && (
                    <span className="text-sm font-medium text-white">
                      R$ {parseFloat(corrida.valor_final).toFixed(2).replace('.', ',')}
                    </span>
                  )}
                  {getStatusBadge(corrida.status)}
                </div>
              </div>
            )) : (
              <p className="text-dark-400 text-sm text-center py-4">Nenhuma corrida registrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
