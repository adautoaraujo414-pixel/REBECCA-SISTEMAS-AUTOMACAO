import React, { useState } from 'react'
import {
  Save,
  Building2,
  Phone,
  MapPin,
  DollarSign,
  Clock,
  MessageSquare,
  Shield,
  Bell,
  Palette
} from 'lucide-react'

function Configuracoes() {
  const [config, setConfig] = useState({
    // Empresa
    nomeEmpresa: 'RadarTaxi Bauru',
    telefone: '(14) 3234-5678',
    whatsapp: '14999001234',
    cidade: 'Bauru - SP',
    // Valores
    bandeirada: '5.00',
    valorKm: '2.50',
    valorMinimo: '10.00',
    mensalidadeMotorista: '40.00',
    // Rebeca
    raioKm: '15',
    tempoResposta: '60',
    prioridadeGeo: true,
    prioridadeAvaliacao: true,
    antiFraude: true,
    semDestino: true,
    // Notificações
    notificarNovaCorrida: true,
    notificarMensalidade: true,
    notificarAlerta: true
  })

  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const handleSalvar = () => {
    setSalvando(true)
    setTimeout(() => {
      setSalvando(false)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    }, 1000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Configurações</h1>
          <p className="text-dark-400">Gerencie as configurações do sistema</p>
        </div>
        <button 
          onClick={handleSalvar}
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2.5 bg-rebeca-500 hover:bg-rebeca-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {salvando ? 'Salvando...' : salvo ? 'Salvo!' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados da Empresa */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rebeca-500/20 flex items-center justify-center">
              <Building2 size={20} className="text-rebeca-400" />
            </div>
            <h2 className="text-lg font-display font-semibold text-white">Dados da Empresa</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Nome da Empresa</label>
              <input
                type="text"
                value={config.nomeEmpresa}
                onChange={(e) => setConfig({...config, nomeEmpresa: e.target.value})}
                className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Telefone</label>
                <input
                  type="text"
                  value={config.telefone}
                  onChange={(e) => setConfig({...config, telefone: e.target.value})}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">WhatsApp</label>
                <input
                  type="text"
                  value={config.whatsapp}
                  onChange={(e) => setConfig({...config, whatsapp: e.target.value})}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Cidade</label>
              <input
                type="text"
                value={config.cidade}
                onChange={(e) => setConfig({...config, cidade: e.target.value})}
                className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
              />
            </div>
          </div>
        </div>

        {/* Valores de Corrida */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-green-400" />
            </div>
            <h2 className="text-lg font-display font-semibold text-white">Valores de Corrida</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Bandeirada (R$)</label>
                <input
                  type="text"
                  value={config.bandeirada}
                  onChange={(e) => setConfig({...config, bandeirada: e.target.value})}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Valor por KM (R$)</label>
                <input
                  type="text"
                  value={config.valorKm}
                  onChange={(e) => setConfig({...config, valorKm: e.target.value})}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Valor Mínimo (R$)</label>
                <input
                  type="text"
                  value={config.valorMinimo}
                  onChange={(e) => setConfig({...config, valorMinimo: e.target.value})}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Mensalidade Motorista (R$)</label>
                <input
                  type="text"
                  value={config.mensalidadeMotorista}
                  onChange={(e) => setConfig({...config, mensalidadeMotorista: e.target.value})}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configurações Rebeca IA */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <MessageSquare size={20} className="text-purple-400" />
            </div>
            <h2 className="text-lg font-display font-semibold text-white">Rebeca IA</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Raio de Busca (km)</label>
                <input
                  type="number"
                  value={config.raioKm}
                  onChange={(e) => setConfig({...config, raioKm: e.target.value})}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Timeout Resposta (s)</label>
                <input
                  type="number"
                  value={config.tempoResposta}
                  onChange={(e) => setConfig({...config, tempoResposta: e.target.value})}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-rebeca-500"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-dark-300">Priorizar por Geolocalização</span>
                <input
                  type="checkbox"
                  checked={config.prioridadeGeo}
                  onChange={(e) => setConfig({...config, prioridadeGeo: e.target.checked})}
                  className="w-5 h-5 rounded border-dark-600 text-rebeca-500 focus:ring-rebeca-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-dark-300">Priorizar por Avaliação</span>
                <input
                  type="checkbox"
                  checked={config.prioridadeAvaliacao}
                  onChange={(e) => setConfig({...config, prioridadeAvaliacao: e.target.checked})}
                  className="w-5 h-5 rounded border-dark-600 text-rebeca-500 focus:ring-rebeca-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-dark-300">Sistema Anti-Fraude</span>
                <input
                  type="checkbox"
                  checked={config.antiFraude}
                  onChange={(e) => setConfig({...config, antiFraude: e.target.checked})}
                  className="w-5 h-5 rounded border-dark-600 text-rebeca-500 focus:ring-rebeca-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-dark-300">Aceitar Corrida sem Destino</span>
                <input
                  type="checkbox"
                  checked={config.semDestino}
                  onChange={(e) => setConfig({...config, semDestino: e.target.checked})}
                  className="w-5 h-5 rounded border-dark-600 text-rebeca-500 focus:ring-rebeca-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Notificações */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Bell size={20} className="text-yellow-400" />
            </div>
            <h2 className="text-lg font-display font-semibold text-white">Notificações</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors">
              <div>
                <p className="text-white font-medium">Nova Corrida</p>
                <p className="text-sm text-dark-400">Notificar quando houver nova corrida</p>
              </div>
              <input
                type="checkbox"
                checked={config.notificarNovaCorrida}
                onChange={(e) => setConfig({...config, notificarNovaCorrida: e.target.checked})}
                className="w-5 h-5 rounded border-dark-600 text-rebeca-500 focus:ring-rebeca-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors">
              <div>
                <p className="text-white font-medium">Mensalidade Vencendo</p>
                <p className="text-sm text-dark-400">Alertar sobre mensalidades próximas do vencimento</p>
              </div>
              <input
                type="checkbox"
                checked={config.notificarMensalidade}
                onChange={(e) => setConfig({...config, notificarMensalidade: e.target.checked})}
                className="w-5 h-5 rounded border-dark-600 text-rebeca-500 focus:ring-rebeca-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors">
              <div>
                <p className="text-white font-medium">Alertas do Sistema</p>
                <p className="text-sm text-dark-400">Receber alertas de fraude e problemas</p>
              </div>
              <input
                type="checkbox"
                checked={config.notificarAlerta}
                onChange={(e) => setConfig({...config, notificarAlerta: e.target.checked})}
                className="w-5 h-5 rounded border-dark-600 text-rebeca-500 focus:ring-rebeca-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Status da Rebeca */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rebeca-500/20 flex items-center justify-center">
            <Shield size={20} className="text-rebeca-400" />
          </div>
          <h2 className="text-lg font-display font-semibold text-white">Status da Rebeca IA</h2>
          <span className="ml-auto px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
            ● Ativa
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-dark-800/50 text-center">
            <p className="text-2xl font-display font-bold text-white">23</p>
            <p className="text-sm text-dark-400">Corridas Hoje</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 text-center">
            <p className="text-2xl font-display font-bold text-green-400">94%</p>
            <p className="text-sm text-dark-400">Taxa Sucesso</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 text-center">
            <p className="text-2xl font-display font-bold text-rebeca-400">~45s</p>
            <p className="text-sm text-dark-400">Tempo Médio</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 text-center">
            <p className="text-2xl font-display font-bold text-white">156</p>
            <p className="text-sm text-dark-400">Mensagens</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Configuracoes
