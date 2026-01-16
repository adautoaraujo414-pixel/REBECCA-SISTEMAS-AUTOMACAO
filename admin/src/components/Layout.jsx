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



  // Detectar se é mobile
      setIsMobile(window.innerWidth < 768)
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)

  // Carregar versão do sistema
    })
      .then(r => r.json())
      .then(data => setVersaoInfo(data.versao))


  // Fechar sidebar no mobile ao navegar
    if (isMobile) setSidebarOpen(false)

  return (
    <div className="flex h-screen overflow-hidden">
        <div 
          className="fixed inset-0 bg-black/50 z-40"
        />
      )}

      <aside 
          sidebarOpen ? 'w-64' : 'w-0 md:w-20'
      >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rebeca-500 to-rebeca-600 flex items-center justify-center shadow-lg shadow-rebeca-500/20">
              <span className="text-white font-bold text-lg">R</span>
            </div>
              <div className="animate-fade-in">
                <h1 className="font-display font-bold text-lg text-white">REBECA</h1>
                <p className="text-xs text-dark-400">Painel Admin</p>
              </div>
            )}
          </div>
          <button 
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            <NavLink
                  isActive
                    ? 'bg-rebeca-500/10 text-rebeca-400 border border-rebeca-500/20'
                    : item.highlight
                    ? 'text-rebeca-400 hover:text-white hover:bg-rebeca-500/20 border border-rebeca-500/30'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`
              }
            >
              )}
                <span className="w-2 h-2 rounded-full bg-rebeca-500 animate-pulse"></span>
              )}
            </NavLink>
          ))}
        </nav>

          <div className="p-4 border-t border-dark-700 space-y-3">
            <button 
              className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-rebeca-600 to-rebeca-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Instalar App
            </button>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-rebeca-500 animate-pulse-green"></div>
                <span className="text-sm font-medium text-white">Sistema Ativo</span>
              </div>
              <div className="flex items-center justify-between text-xs text-dark-400 mb-2">
                <span>WhatsApp</span>
                <span className="text-rebeca-400">Conectado</span>
              </div>
                <div className="flex items-center justify-between text-xs text-dark-400">
                  <span className="flex items-center gap-1">
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white mr-2"
              >
              </button>
            )}
              <>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="relative p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors">
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rebeca-500"></span>
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-rebeca-500/10 border border-rebeca-500/20">
              <span className="text-sm text-rebeca-400 font-medium">Tempo Real</span>
            </div>

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

        <main className="flex-1 overflow-auto p-4 md:p-6 bg-dark-950">
          <Outlet />
        </main>
      </div>

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rebeca-500 to-rebeca-600 flex items-center justify-center">
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
