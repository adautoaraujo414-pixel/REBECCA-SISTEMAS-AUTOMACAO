import React, { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Car,
  Users,
  DollarSign,
  Clock,
  Star,
  FileText,
  Filter
} from 'lucide-react'

function Relatorios() {
  const [periodo, setPeriodo] = useState('semana')
  const [tipoRelatorio, setTipoRelatorio] = useState('geral')

  // Dados mockados
  const dadosGerais = {
    corridas: { valor: 312, trend: 12, up: true },
    faturamento: { valor: 8450, trend: 8, up: true },
    motoristas: { valor: 8, trend: 2, up: true },
    avaliacao: { valor: 4.8, trend: 0.1, up: true }
  }

  const corridasPorDia = [
    { dia: 'Seg', corridas: 42, faturamento: 1120 },
    { dia: 'Ter', corridas: 38, faturamento: 980 },
    { dia: 'Qua', corridas: 51, faturamento: 1350 },
    { dia: 'Qui', corridas: 45, faturamento: 1200 },
    { dia: 'Sex', corridas: 58, faturamento: 1480 },
    { dia: 'Sáb', corridas: 62, faturamento: 1620 },
    { dia: 'Dom', corridas: 16, faturamento: 700 }
  ]

  const topMotoristas = [
    { nome: 'João Silva', corridas: 52, faturamento: 1380, avaliacao: 4.9 },
    { nome: 'Maria Santos', corridas: 48, faturamento: 1250, avaliacao: 4.8 },
    { nome: 'Carlos Oliveira', corridas: 45, faturamento: 1180, avaliacao: 4.7 },
    { nome: 'Ana Paula', corridas: 42, faturamento: 1100, avaliacao: 4.9 },
    { nome: 'Pedro Lima', corridas: 38, faturamento: 980, avaliacao: 4.6 }
  ]

  const maxCorridas = Math.max(...corridasPorDia.map(d => d.corridas))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Relatórios</h1>
          <p className="text-dark-400">Análise de desempenho da frota</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
          >
            <option value="hoje">Hoje</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mês</option>
            <option value="ano">Este Ano</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-rebeca-500 hover:bg-rebeca-600 text-white rounded-xl font-medium transition-colors">
            <Download size={18} />
            Exportar
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rebeca-500/20 flex items-center justify-center">
              <Car size={20} className="text-rebeca-400" />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${dadosGerais.corridas.up ? 'text-green-400' : 'text-red-400'}`}>
              {dadosGerais.corridas.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {dadosGerais.corridas.trend}%
            </span>
          </div>
          <p className="text-2xl font-display font-bold text-white">{dadosGerais.corridas.valor}</p>
          <p className="text-sm text-dark-400">Corridas</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-green-400" />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${dadosGerais.faturamento.up ? 'text-green-400' : 'text-red-400'}`}>
              {dadosGerais.faturamento.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {dadosGerais.faturamento.trend}%
            </span>
          </div>
          <p className="text-2xl font-display font-bold text-white">R$ {dadosGerais.faturamento.valor.toLocaleString()}</p>
          <p className="text-sm text-dark-400">Faturamento</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users size={20} className="text-blue-400" />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${dadosGerais.motoristas.up ? 'text-green-400' : 'text-red-400'}`}>
              {dadosGerais.motoristas.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              +{dadosGerais.motoristas.trend}
            </span>
          </div>
          <p className="text-2xl font-display font-bold text-white">{dadosGerais.motoristas.valor}</p>
          <p className="text-sm text-dark-400">Motoristas Ativos</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Star size={20} className="text-yellow-400" />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${dadosGerais.avaliacao.up ? 'text-green-400' : 'text-red-400'}`}>
              {dadosGerais.avaliacao.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              +{dadosGerais.avaliacao.trend}
            </span>
          </div>
          <p className="text-2xl font-display font-bold text-white">{dadosGerais.avaliacao.valor}</p>
          <p className="text-sm text-dark-400">Avaliação Média</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Corridas por Dia */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-semibold text-white">Corridas por Dia</h2>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rebeca-500"></span>
              <span className="text-sm text-dark-400">Corridas</span>
            </div>
          </div>
          
          <div className="flex items-end justify-between h-48 gap-2">
            {corridasPorDia.map((dia, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-rebeca-500/80 rounded-t-lg transition-all hover:bg-rebeca-500"
                  style={{ height: `${(dia.corridas / maxCorridas) * 100}%` }}
                ></div>
                <span className="text-xs text-dark-400 mt-2">{dia.dia}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Motoristas */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-semibold text-white">Top Motoristas</h2>
            <span className="text-sm text-dark-400">Esta semana</span>
          </div>
          
          <div className="space-y-4">
            {topMotoristas.map((motorista, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  index === 1 ? 'bg-gray-400/20 text-gray-400' :
                  index === 2 ? 'bg-amber-600/20 text-amber-600' :
                  'bg-dark-700 text-dark-400'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{motorista.nome}</p>
                  <p className="text-sm text-dark-400">{motorista.corridas} corridas</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-400">R$ {motorista.faturamento}</p>
                  <p className="text-sm text-yellow-400">★ {motorista.avaliacao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela Detalhada */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-lg font-display font-semibold text-white">Detalhamento por Dia</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left p-4 text-sm font-medium text-dark-400">Dia</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Corridas</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Faturamento</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Ticket Médio</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Variação</th>
              </tr>
            </thead>
            <tbody>
              {corridasPorDia.map((dia, index) => (
                <tr key={index} className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors">
                  <td className="p-4 font-medium text-white">{dia.dia}</td>
                  <td className="p-4 text-white">{dia.corridas}</td>
                  <td className="p-4 text-green-400">R$ {dia.faturamento.toLocaleString()}</td>
                  <td className="p-4 text-white">R$ {(dia.faturamento / dia.corridas).toFixed(2)}</td>
                  <td className="p-4">
                    {index > 0 ? (
                      <span className={`flex items-center gap-1 text-sm ${
                        dia.corridas > corridasPorDia[index-1].corridas ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {dia.corridas > corridasPorDia[index-1].corridas ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {Math.abs(dia.corridas - corridasPorDia[index-1].corridas)}
                      </span>
                    ) : (
                      <span className="text-dark-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tipos de Relatório */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-display font-semibold text-white mb-6">Exportar Relatórios</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors text-center group">
            <FileText size={32} className="mx-auto mb-2 text-dark-400 group-hover:text-rebeca-400 transition-colors" />
            <p className="font-medium text-white">Faturamento</p>
            <p className="text-xs text-dark-400">Diário, Semanal, Mensal</p>
          </button>
          <button className="p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors text-center group">
            <Car size={32} className="mx-auto mb-2 text-dark-400 group-hover:text-rebeca-400 transition-colors" />
            <p className="font-medium text-white">Corridas</p>
            <p className="text-xs text-dark-400">Por motorista, período</p>
          </button>
          <button className="p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors text-center group">
            <Users size={32} className="mx-auto mb-2 text-dark-400 group-hover:text-rebeca-400 transition-colors" />
            <p className="font-medium text-white">Motoristas</p>
            <p className="text-xs text-dark-400">Performance, ranking</p>
          </button>
          <button className="p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors text-center group">
            <BarChart3 size={32} className="mx-auto mb-2 text-dark-400 group-hover:text-rebeca-400 transition-colors" />
            <p className="font-medium text-white">Completo</p>
            <p className="text-xs text-dark-400">Todos os dados</p>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Relatorios
