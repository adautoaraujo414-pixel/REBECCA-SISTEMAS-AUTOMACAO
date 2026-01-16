import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  MapPin,
  MessageSquare,
  Settings,
  BarChart3,
  Menu,
  X,
  Bell,
  ChevronRight,
  Zap,
  MessageCircle,
  Wrench,
  AlertTriangle,
  Download,
  Smartphone,
  Monitor,
  PlusCircle
} from 'lucide-react'

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/nova-corrida', icon: PlusCircle, label: 'Nova Corrida', highlight: true },
  { path: '/motoristas', icon: Car, label: 'Motoristas' },
  { path: '/corridas', icon: MapPin, label: 'Corridas' },
  { path: '/mensagens', icon: MessageSquare, label: 'Mensagens' },
  { path: '/chat', icon: MessageCircle, label: 'Chat Frota', badge: true },
  { path: '/assistencia', icon: Wrench, label: 'Assistência' },
  { path: '/avarias', icon: AlertTriangle, label: 'Avarias' },
  { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { path: '/configuracoes', icon: Settings, label: 'Configurações' },
]

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [versaoInfo, setVersaoInfo] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const location = useLocation()

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Carregar versão do sistema
  useEffect(() => {
    fetch('/api/admin/sistema/versao', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(data => setVersaoInfo(data.versao))
      .catch(() => {})
  }, [])

  const currentPage = menuItems.find(item => item.path === location.pathname)

  // Fechar sidebar no mobile ao navegar
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Overlay mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-0 md:w-20'
        } ${isMobile ? 'fixed z-50 h-full' : ''} bg-dark-900 border-r border-dark-700 flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-dark-700 min-w-[256px] md:min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rebeca-500 to-rebeca-600 flex items-center justify-center shadow-lg shadow-rebeca-500/20">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="font-display font-bold text-lg text-white">REBECA</h1>
                <p className="text-xs text-dark-400">Painel Admin</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-rebeca-500/10 text-rebeca-400 border border-rebeca-500/20'
                    : item.highlight
                    ? 'text-rebeca-400 hover:text-white hover:bg-rebeca-500/20 border border-rebeca-500/30'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`
              }
            >
              <item.icon size={20} className="flex-shrink-0" />
              {sidebarOpen && (
                <span className="font-medium animate-fade-in flex-1">{item.label}</span>
              )}
              {item.badge && sidebarOpen && (
                <span className="w-2 h-2 rounded-full bg-rebeca-500 animate-pulse"></span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Versão e PWA */}
        {sidebarOpen && (
          <div className="p-4 border-t border-dark-700 space-y-3">
            {/* Instalar PWA */}
            <button 
              onClick={() => setShowInstallPrompt(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-rebeca-600 to-rebeca-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download size={16} />
              Instalar App
            </button>

            {/* Status do Sistema */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-rebeca-500 animate-pulse-green"></div>
                <span className="text-sm font-medium text-white">Sistema Ativo</span>
              </div>
              <div className="flex items-center justify-between text-xs text-dark-400 mb-2">
                <span>WhatsApp</span>
                <span className="text-rebeca-400">Conectado</span>
              </div>
              {versaoInfo && (
                <div className="flex items-center justify-between text-xs text-dark-400">
                  <span className="flex items-center gap-1">
                    {isMobile ? <Smartphone size={12} /> : <Monitor size={12} />}
                    {isMobile ? 'Mobile' : 'Desktop'}
                  </span>
                  <span>v{versaoInfo.versao}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            {/* Botão menu mobile */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white mr-2"
              >
                <Menu size={20} />
              </button>
            )}
            {currentPage && (
              <>
                <currentPage.icon size={20} className="text-rebeca-500" />
                <ChevronRight size={16} className="text-dark-600 hidden sm:block" />
                <h2 className="font-display font-semibold text-white">{currentPage.label}</h2>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Notificações */}
            <button className="relative p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rebeca-500"></span>
            </button>

            {/* Status em tempo real */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-rebeca-500/10 border border-rebeca-500/20">
              <Zap size={14} className="text-rebeca-400" />
              <span className="text-sm text-rebeca-400 font-medium">Tempo Real</span>
            </div>

            {/* Avatar Admin */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rebeca-500 to-rebeca-600 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">A</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-white">Admin</p>
                <p className="text-xs text-dark-400">Proprietário</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-dark-950">
          <Outlet />
        </main>
      </div>

      {/* Modal PWA Install */}
      {showInstallPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rebeca-500 to-rebeca-600 flex items-center justify-center">
              <Download size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Instalar REBECA</h3>
            <p className="text-dark-400 mb-6">
              Adicione o painel à sua tela inicial para acesso rápido, mesmo offline!
            </p>
            <div className="space-y-3 text-sm text-dark-300">
              <div className="flex items-center gap-3 text-left">
                <span className="w-6 h-6 rounded-full bg-rebeca-500/20 flex items-center justify-center text-rebeca-400">1</span>
                <span>Clique no botão de compartilhar (Safari) ou menu ⋮ (Chrome)</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <span className="w-6 h-6 rounded-full bg-rebeca-500/20 flex items-center justify-center text-rebeca-400">2</span>
                <span>Selecione "Adicionar à Tela de Início"</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <span className="w-6 h-6 rounded-full bg-rebeca-500/20 flex items-center justify-center text-rebeca-400">3</span>
                <span>Confirme e pronto!</span>
              </div>
            </div>
            <button
              onClick={() => setShowInstallPrompt(false)}
              className="mt-6 w-full py-3 bg-rebeca-600 text-white rounded-xl font-medium hover:bg-rebeca-500 transition-colors"
            >
              Entendi!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Layout
