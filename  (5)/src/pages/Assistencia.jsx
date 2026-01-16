import React, { useState, useEffect } from 'react'
import { 
  Truck, 
  Wrench, 
  Phone, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  Loader2,
  Shield,
  Zap,
  Circle
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

const TIPOS = [
  { value: 'guincho', label: 'Guincho', icon: '🚛', color: 'bg-amber-100 text-amber-700' },
  { value: 'mecanico', label: 'Mecânico', icon: '🔧', color: 'bg-blue-100 text-blue-700' },
  { value: 'borracheiro', label: 'Borracheiro', icon: '🛞', color: 'bg-pink-100 text-pink-700' },
  { value: 'eletricista', label: 'Eletricista', icon: '⚡', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'seguro', label: 'Seguradora', icon: '🛡️', color: 'bg-green-100 text-green-700' },
  { value: 'outros', label: 'Outros', icon: '📞', color: 'bg-gray-100 text-gray-700' },
]

function Assistencia() {
  const [loading, setLoading] = useState(true)
  const [contatos, setContatos] = useState([])
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    tipo: '',
    nome: '',
    telefone: '',
    telefone2: '',
    endereco: '',
    observacoes: ''
  })

  useEffect(() => {
    carregarContatos()
  }, [])

  const carregarContatos = async () => {
    setLoading(true)
    try {
      const data = await fetchAPI('/assistencia')
      setContatos(data.contatos || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const abrirModal = (contato = null) => {
    if (contato) {
      setEditando(contato.id)
      setForm({
        tipo: contato.tipo,
        nome: contato.nome,
        telefone: contato.telefone,
        telefone2: contato.telefone2 || '',
        endereco: contato.endereco || '',
        observacoes: contato.observacoes || ''
      })
    } else {
      setEditando(null)
      setForm({ tipo: '', nome: '', telefone: '', telefone2: '', endereco: '', observacoes: '' })
    }
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
    setForm({ tipo: '', nome: '', telefone: '', telefone2: '', endereco: '', observacoes: '' })
  }

  const salvar = async () => {
    try {
      if (editando) {
        await fetchAPI(`/assistencia/${editando}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        })
      } else {
        await fetchAPI('/assistencia', {
          method: 'POST',
          body: JSON.stringify(form)
        })
      }
      fecharModal()
      carregarContatos()
    } catch (err) {
      alert('Erro ao salvar')
    }
  }

  const excluir = async (id) => {
    if (!confirm('Excluir este contato?')) return
    try {
      await fetchAPI(`/assistencia/${id}`, { method: 'DELETE' })
      carregarContatos()
    } catch (err) {
      alert('Erro ao excluir')
    }
  }

  const getTipo = (tipo) => TIPOS.find(t => t.value === tipo) || TIPOS[5]

  // Agrupar por tipo
  const agrupados = TIPOS.map(tipo => ({
    ...tipo,
    contatos: contatos.filter(c => c.tipo === tipo.value)
  })).filter(g => g.contatos.length > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assistência 24h</h1>
          <p className="text-gray-600 mt-1">Contatos de guincho, mecânico, borracheiro e outros serviços</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Contato
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {TIPOS.map(tipo => {
          const count = contatos.filter(c => c.tipo === tipo.value).length
          return (
            <div key={tipo.value} className={`${tipo.color} rounded-xl p-4 text-center`}>
              <div className="text-2xl mb-1">{tipo.icon}</div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm opacity-80">{tipo.label}</div>
            </div>
          )
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : contatos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum contato cadastrado</h3>
          <p className="text-gray-500 mb-4">Adicione contatos de assistência para seus motoristas</p>
          <button
            onClick={() => abrirModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            Adicionar Primeiro Contato
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {agrupados.map(grupo => (
            <div key={grupo.value} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className={`${grupo.color} px-6 py-3 flex items-center gap-3`}>
                <span className="text-xl">{grupo.icon}</span>
                <span className="font-semibold">{grupo.label}</span>
                <span className="ml-auto bg-white/50 px-2 py-0.5 rounded-full text-sm font-medium">
                  {grupo.contatos.length}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {grupo.contatos.map(contato => (
                  <div key={contato.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{contato.nome}</div>
                      <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <a href={`tel:${contato.telefone}`} className="text-indigo-600 hover:underline">
                          📞 {contato.telefone}
                        </a>
                        {contato.telefone2 && (
                          <a href={`tel:${contato.telefone2}`} className="text-indigo-600 hover:underline">
                            📱 {contato.telefone2}
                          </a>
                        )}
                      </div>
                      {contato.endereco && (
                        <div className="text-sm text-gray-500 mt-1">📍 {contato.endereco}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirModal(contato)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => excluir(contato.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editando ? 'Editar Contato' : 'Novo Contato'}
              </h3>
              <button onClick={fecharModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {TIPOS.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  placeholder="Ex: Auto Socorro João"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={e => setForm({...form, telefone: e.target.value})}
                    placeholder="(14) 99999-0000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone 2</label>
                  <input
                    type="tel"
                    value={form.telefone2}
                    onChange={e => setForm({...form, telefone2: e.target.value})}
                    placeholder="(14) 3333-0000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={e => setForm({...form, endereco: e.target.value})}
                  placeholder="Rua, número, bairro"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm({...form, observacoes: e.target.value})}
                  placeholder="Ex: Atende 24h, aceita cartão"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={fecharModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={!form.tipo || !form.nome || !form.telefone}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Assistencia
