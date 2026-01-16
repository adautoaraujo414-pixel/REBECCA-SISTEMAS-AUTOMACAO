// ========================================
// REBECA - PAINEL MOTORISTA
// JavaScript
// ========================================

const API_URL = '/api';

// Estado
let motorista = null;
let token = null;
let corridaAtual = null;
let checkInterval = null;
let socket = null;

// ========================================
// WEBSOCKET - Receber notificações em tempo real
// ========================================

function conectarWebSocket() {
  if (socket) return;

  // Conectar ao Socket.IO
  socket = io();

  socket.on('connect', () => {
    console.log('🔌 WebSocket conectado');
    
    // Autenticar como motorista
    if (motorista && motorista.id) {
      socket.emit('auth', {
        tipo: 'motorista',
        id: motorista.id,
        nome: motorista.nome
      });
    }
  });

  // Receber nova corrida da Rebeca
  socket.on('nova-corrida', (data) => {
    console.log('🚗 NOVA CORRIDA RECEBIDA!', data);
    
    // Tocar som de notificação
    tocarSomNotificacao();
    
    // Vibrar (mobile)
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
    
    // Mostrar notificação
    mostrarNotificacaoCorrida(data);
    
    // Atualizar interface
    carregarCorridaAtual();
  });

  socket.on('disconnect', () => {
    console.log('🔌 WebSocket desconectado');
  });
}

function tocarSomNotificacao() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleGsT...');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
}

function mostrarNotificacaoCorrida(data) {
  // Criar elemento de notificação
  const notif = document.createElement('div');
  notif.className = 'notificacao-corrida';
  notif.innerHTML = `
    <div class="notif-icon">🚗</div>
    <div class="notif-content">
      <strong>NOVA CORRIDA!</strong>
      <p>${data.origem || 'Cliente aguardando'}</p>
      <small>Tempo estimado: ${data.tempo_estimado || '?'} min</small>
    </div>
  `;
  
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    box-shadow: 0 10px 40px rgba(139, 92, 246, 0.5);
    animation: slideDown 0.5s ease, pulse 1s ease infinite;
    max-width: 90%;
  `;
  
  document.body.appendChild(notif);
  
  // Remover após 10 segundos
  setTimeout(() => {
    notif.style.animation = 'slideUp 0.5s ease forwards';
    setTimeout(() => notif.remove(), 500);
  }, 10000);
}

// Adicionar CSS de animação
const styleNotif = document.createElement('style');
styleNotif.textContent = `
  @keyframes slideDown {
    from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(-100px); opacity: 0; }
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 10px 40px rgba(139, 92, 246, 0.5); }
    50% { box-shadow: 0 10px 60px rgba(139, 92, 246, 0.8); }
  }
`;
document.head.appendChild(styleNotif);

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Verificar se tem token salvo
  token = localStorage.getItem('motorista_token');
  
  if (token) {
    verificarToken();
  } else {
    mostrarLogin();
  }
});

// ========================================
// AUTENTICAÇÃO
// ========================================

function mostrarLogin() {
  document.getElementById('tela-login').classList.add('active');
  document.getElementById('tela-principal').classList.remove('active');
}

function mostrarPrincipal() {
  document.getElementById('tela-login').classList.remove('active');
  document.getElementById('tela-principal').classList.add('active');
}

async function fazerLogin(e) {
  e.preventDefault();

  const telefone = document.getElementById('login-telefone').value.replace(/\D/g, '');
  const senha = document.getElementById('login-senha').value;

  const erroEl = document.getElementById('login-erro');
  erroEl.classList.remove('show');

  try {
    const response = await fetch(`${API_URL}/auth/motorista/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, senha })
    });

    const data = await response.json();

    if (!data.success) {
      erroEl.textContent = data.error;
      erroEl.classList.add('show');
      return;
    }

    // Salvar token e dados
    token = data.data.token;
    motorista = data.data;
    localStorage.setItem('motorista_token', token);

    // Mostrar tela principal
    mostrarPrincipal();
    inicializarPainel();
    
    // Conectar WebSocket para receber corridas em tempo real
    conectarWebSocket();

  } catch (error) {
    erroEl.textContent = 'Erro de conexão';
    erroEl.classList.add('show');
  }
}

async function verificarToken() {
  try {
    const response = await fetch(`${API_URL}/auth/motorista/verificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    const data = await response.json();

    if (!data.success) {
      localStorage.removeItem('motorista_token');
      mostrarLogin();
      return;
    }

    motorista = data.data;
    mostrarPrincipal();
    inicializarPainel();
    
    // Conectar WebSocket para receber corridas em tempo real
    conectarWebSocket();

  } catch (error) {
    localStorage.removeItem('motorista_token');
    mostrarLogin();
  }
}

async function fazerLogout() {
  try {
    await fetch(`${API_URL}/auth/motorista/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
  } catch (e) {}

  localStorage.removeItem('motorista_token');
  if (checkInterval) clearInterval(checkInterval);
  mostrarLogin();
}

// ========================================
// PAINEL PRINCIPAL
// ========================================

function inicializarPainel() {
  // Atualizar nome
  document.getElementById('motorista-nome').textContent = motorista.nome;

  // Atualizar status toggle
  const toggle = document.getElementById('toggle-status');
  toggle.checked = motorista.status === 'online';
  atualizarStatusUI();

  // Carregar dados
  carregarResumoFinanceiro();
  carregarPagamentos();
  carregarHistorico();
  verificarCorridaAtual();

  // Verificar corridas a cada 5 segundos
  checkInterval = setInterval(verificarCorridaAtual, 5000);

  // Atualizar localização
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(atualizarLocalizacao, null, {
      enableHighAccuracy: true,
      maximumAge: 10000
    });
  }
}

// ========================================
// STATUS
// ========================================

async function alternarStatus() {
  const toggle = document.getElementById('toggle-status');
  const online = toggle.checked;

  try {
    const response = await fetch(`${API_URL}/motorista/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ online })
    });

    const data = await response.json();

    if (data.success) {
      motorista.status = data.data.status;
      motorista.disponivel = data.data.disponivel;
      atualizarStatusUI();
      mostrarToast(online ? 'Você está online!' : 'Você está offline', 'success');
    } else {
      toggle.checked = !online;
    }

  } catch (error) {
    toggle.checked = !online;
    mostrarToast('Erro ao atualizar status', 'error');
  }
}

function atualizarStatusUI() {
  const statusTexto = document.getElementById('status-texto');
  const online = motorista.status === 'online';
  
  statusTexto.textContent = online ? 'Online' : 'Offline';
  statusTexto.className = 'status-value ' + (online ? 'online' : 'offline');

  // Mostrar/esconder mensagem de aguardando
  const semCorrida = document.getElementById('sem-corrida');
  const corridaSection = document.getElementById('corrida-section');
  
  if (!corridaAtual) {
    semCorrida.classList.remove('hidden');
    corridaSection.classList.add('hidden');
    
    if (online) {
      semCorrida.querySelector('h2').textContent = 'Aguardando corridas';
      semCorrida.querySelector('p').textContent = 'Você receberá uma notificação';
    } else {
      semCorrida.querySelector('h2').textContent = 'Você está offline';
      semCorrida.querySelector('p').textContent = 'Fique online para receber corridas';
    }
  }
}

// ========================================
// LOCALIZAÇÃO
// ========================================

async function atualizarLocalizacao(position) {
  if (!token) return;

  try {
    await fetch(`${API_URL}/motorista/localizacao`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      })
    });
  } catch (e) {}
}

// ========================================
// CORRIDA
// ========================================

async function verificarCorridaAtual() {
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/motorista/corrida-atual`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success && data.data) {
      corridaAtual = data.data;
      exibirCorrida();
    } else {
      corridaAtual = null;
      esconderCorrida();
    }

  } catch (e) {}
}

function exibirCorrida() {
  document.getElementById('sem-corrida').classList.add('hidden');
  document.getElementById('corrida-section').classList.remove('hidden');

  // Preencher dados
  document.getElementById('corrida-cliente').textContent = corridaAtual.cliente_nome || 'Cliente';
  document.getElementById('corrida-origem').textContent = corridaAtual.origem_endereco || '-';
  document.getElementById('corrida-destino').textContent = corridaAtual.destino_endereco || '-';

  // Atualizar badge
  const badge = document.querySelector('.corrida-badge');
  const statusMap = {
    'enviada': 'Nova Corrida',
    'aceita': 'A caminho do cliente',
    'em_andamento': 'Em andamento'
  };
  badge.textContent = statusMap[corridaAtual.status] || 'Corrida';

  // Atualizar ações
  renderizarAcoes();

  // Notificação sonora para nova corrida
  if (corridaAtual.status === 'enviada') {
    // Vibrar se disponível
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }
}

function renderizarAcoes() {
  const container = document.getElementById('acoes-container');
  const opcaoFinalizar = document.getElementById('opcao-finalizar-direto');

  switch (corridaAtual.status) {
    case 'enviada':
      container.innerHTML = `
        <button class="btn btn-danger" onclick="recusarCorrida()">Recusar</button>
        <button class="btn btn-success" onclick="aceitarCorrida()">Aceitar</button>
      `;
      opcaoFinalizar.classList.add('hidden');
      break;

    case 'aceita':
      if (finalizarDiretoAtivo) {
        container.innerHTML = `
          <button class="btn btn-success btn-block" onclick="finalizarCorridaDireto()">✓ Finalizar Direto</button>
        `;
      } else {
        container.innerHTML = `
          <button class="btn btn-primary btn-block" onclick="iniciarCorrida()">📍 Cheguei no local</button>
        `;
      }
      opcaoFinalizar.classList.remove('hidden');
      break;

    case 'em_andamento':
      container.innerHTML = `
        <button class="btn btn-success btn-block" onclick="finalizarCorrida()">✓ Finalizar Corrida</button>
      `;
      opcaoFinalizar.classList.add('hidden');
      break;

    default:
      container.innerHTML = '';
      opcaoFinalizar.classList.add('hidden');
  }
}

function esconderCorrida() {
  document.getElementById('corrida-section').classList.add('hidden');
  atualizarStatusUI();
}

async function aceitarCorrida() {
  if (!corridaAtual) return;

  try {
    const response = await fetch(`${API_URL}/motorista/corrida/${corridaAtual.id}/aceitar`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      mostrarToast('Corrida aceita!', 'success');
      verificarCorridaAtual();
    } else {
      mostrarToast(data.error, 'error');
    }

  } catch (error) {
    mostrarToast('Erro ao aceitar corrida', 'error');
  }
}

async function recusarCorrida() {
  if (!corridaAtual) return;

  try {
    const response = await fetch(`${API_URL}/motorista/corrida/${corridaAtual.id}/recusar`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      mostrarToast('Corrida recusada', 'success');
      corridaAtual = null;
      esconderCorrida();
    }

  } catch (error) {
    mostrarToast('Erro ao recusar corrida', 'error');
  }
}

async function iniciarCorrida() {
  if (!corridaAtual) return;

  try {
    const response = await fetch(`${API_URL}/motorista/corrida/${corridaAtual.id}/iniciar`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      mostrarToast('Corrida iniciada!', 'success');
      verificarCorridaAtual();
    }

  } catch (error) {
    mostrarToast('Erro ao iniciar corrida', 'error');
  }
}

async function finalizarCorrida() {
  if (!corridaAtual) return;

  try {
    const response = await fetch(`${API_URL}/motorista/corrida/${corridaAtual.id}/finalizar`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({})
    });

    const data = await response.json();

    if (data.success) {
      mostrarToast('Corrida finalizada!', 'success');
      corridaAtual = null;
      esconderCorrida();
      carregarGanhos();
      carregarHistorico();
    }

  } catch (error) {
    mostrarToast('Erro ao finalizar corrida', 'error');
  }
}

// ========================================
// FINANCEIRO
// ========================================

async function carregarResumoFinanceiro() {
  try {
    const response = await fetch(`${API_URL}/motorista/pagamentos/resumo`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      const { saldo, hoje, semana } = data.data;

      // Saldo atual
      document.getElementById('saldo-atual').textContent = formatarMoeda(saldo);

      // Hoje
      document.getElementById('ganho-hoje').textContent = formatarMoeda(hoje.entradas);
      document.getElementById('corridas-hoje').textContent = `- R$ ${hoje.saidas.toFixed(2).replace('.', ',')} saídas`;

      // Semana
      document.getElementById('ganho-semana').textContent = formatarMoeda(semana.entradas);
      document.getElementById('corridas-semana').textContent = `- R$ ${semana.saidas.toFixed(2).replace('.', ',')} saídas`;
    }

  } catch (e) {
    // Fallback para ganhos antigos
    carregarGanhosLegado();
  }
}

async function carregarGanhosLegado() {
  try {
    const response = await fetch(`${API_URL}/motorista/ganhos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      const { hoje, semana } = data.data;

      document.getElementById('saldo-atual').textContent = 
        formatarMoeda(parseFloat(semana.total));

      document.getElementById('ganho-hoje').textContent = 
        formatarMoeda(parseFloat(hoje.total));
      document.getElementById('corridas-hoje').textContent = 
        `${hoje.corridas} corrida${hoje.corridas != 1 ? 's' : ''}`;

      document.getElementById('ganho-semana').textContent = 
        formatarMoeda(parseFloat(semana.total));
      document.getElementById('corridas-semana').textContent = 
        `${semana.corridas} corrida${semana.corridas != 1 ? 's' : ''}`;
    }

  } catch (e) {}
}

async function carregarPagamentos() {
  try {
    const response = await fetch(`${API_URL}/motorista/pagamentos?limite=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    const lista = document.getElementById('pagamentos-lista');

    if (!data.success || data.data.length === 0) {
      lista.innerHTML = '<p class="text-muted">Nenhuma movimentação ainda</p>';
      return;
    }

    lista.innerHTML = data.data.map(p => `
      <div class="pagamento-item">
        <div class="pagamento-icon ${p.tipo}">
          ${p.tipo === 'entrada' ? '📥' : '📤'}
        </div>
        <div class="pagamento-info">
          <div class="pagamento-descricao">${p.descricao || (p.tipo === 'entrada' ? 'Recebimento' : 'Pagamento')}</div>
          <div class="pagamento-data">${formatarData(p.criado_em)}</div>
        </div>
        <div class="pagamento-valor ${p.tipo}">
          ${p.tipo === 'entrada' ? '+' : '-'} ${formatarMoeda(parseFloat(p.valor))}
        </div>
      </div>
    `).join('');

  } catch (e) {
    document.getElementById('pagamentos-lista').innerHTML = 
      '<p class="text-muted">Erro ao carregar</p>';
  }
}

// ========================================
// HISTÓRICO
// ========================================

async function carregarHistorico() {
  try {
    const response = await fetch(`${API_URL}/motorista/historico?limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      const lista = document.getElementById('historico-lista');

      if (data.data.length === 0) {
        lista.innerHTML = '<p class="text-muted">Nenhuma corrida ainda</p>';
        return;
      }

      lista.innerHTML = data.data.map(c => `
        <div class="historico-item">
          <div class="historico-info">
            <div class="historico-endereco">${truncar(c.origem_endereco, 30)}</div>
            <div class="historico-data">${formatarData(c.finalizado_em || c.solicitado_em)}</div>
          </div>
          <div class="historico-valor">
            ${c.valor ? `R$ ${parseFloat(c.valor).toFixed(2).replace('.', ',')}` : '-'}
          </div>
        </div>
      `).join('');
    }

  } catch (e) {}
}

// ========================================
// UTILITÁRIOS
// ========================================

function mostrarToast(mensagem, tipo = 'success') {
  let container = document.querySelector('.toast-container');
  
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `
    <span>${tipo === 'success' ? '✅' : '❌'}</span>
    <span>${mensagem}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

function formatarData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatarMoeda(valor) {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function truncar(texto, max) {
  if (!texto) return '-';
  if (texto.length <= max) return texto;
  return texto.substring(0, max) + '...';
}

// ========================================
// MODAL DE PAGAMENTO
// ========================================

function abrirModalPagamento(tipo) {
  document.getElementById('pagamento-tipo').value = tipo;
  document.getElementById('modal-pagamento-titulo').textContent = 
    tipo === 'entrada' ? '📥 Registrar Entrada' : '📤 Registrar Saída';
  document.getElementById('pagamento-valor').value = '';
  document.getElementById('pagamento-descricao').value = '';
  document.getElementById('btn-salvar-pagamento').className = 
    tipo === 'entrada' ? 'btn btn-entrada' : 'btn btn-saida';
  document.getElementById('modal-pagamento').classList.add('active');
}

function fecharModalPagamento() {
  document.getElementById('modal-pagamento').classList.remove('active');
}

async function salvarPagamento(e) {
  e.preventDefault();

  const tipo = document.getElementById('pagamento-tipo').value;
  const valor = parseFloat(document.getElementById('pagamento-valor').value);
  const descricao = document.getElementById('pagamento-descricao').value;

  if (!valor || valor <= 0) {
    mostrarToast('Valor inválido', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/motorista/pagamentos/${tipo}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ valor, descricao })
    });

    const data = await response.json();

    if (data.success) {
      mostrarToast(tipo === 'entrada' ? 'Entrada registrada!' : 'Saída registrada!', 'success');
      fecharModalPagamento();
      carregarResumoFinanceiro();
      carregarPagamentos();
    } else {
      mostrarToast(data.error || 'Erro ao salvar', 'error');
    }

  } catch (error) {
    mostrarToast('Erro de conexão', 'error');
  }
}

// ========================================
// FILA DE CORRIDAS
// ========================================

let filaAtual = null;

async function verificarFila() {
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/motorista/fila`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success && data.data) {
      filaAtual = data.data;
      mostrarFila();
    } else {
      filaAtual = null;
      esconderFila();
    }

  } catch (error) {
    console.error('Erro verificar fila:', error);
  }
}

function mostrarFila() {
  if (!filaAtual) return;

  document.getElementById('fila-section').classList.remove('hidden');
  document.getElementById('fila-cliente').textContent = filaAtual.cliente_nome || 'Cliente';
  document.getElementById('fila-origem').textContent = truncar(filaAtual.origem_endereco, 40) || 'Origem';
  document.getElementById('fila-destino').textContent = truncar(filaAtual.destino_endereco, 40) || 'Destino';
  document.getElementById('fila-distancia').textContent = `${(filaAtual.distancia_km || 0).toFixed(1)} km`;

  // Vibrar para alertar
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
}

function esconderFila() {
  document.getElementById('fila-section').classList.add('hidden');
}

async function aceitarFila() {
  if (!filaAtual) return;

  try {
    const response = await fetch(`${API_URL}/motorista/fila/${filaAtual.id}/aceitar`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      mostrarToast('Corrida aceita da fila!', 'success');
      esconderFila();
      verificarCorridaAtual();
    } else {
      mostrarToast(data.error, 'error');
    }

  } catch (error) {
    mostrarToast('Erro ao aceitar', 'error');
  }
}

async function recusarFila() {
  if (!filaAtual) return;

  try {
    const response = await fetch(`${API_URL}/motorista/fila/${filaAtual.id}/recusar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ motivo: 'Recusou da fila' })
    });

    const data = await response.json();

    if (data.success) {
      mostrarToast('Corrida recusada', 'success');
      esconderFila();
      // Verificar se tem outra na fila
      setTimeout(verificarFila, 2000);
    } else {
      mostrarToast(data.error, 'error');
    }

  } catch (error) {
    mostrarToast('Erro ao recusar', 'error');
  }
}

// ========================================
// CONFIGURAÇÕES DO MOTORISTA
// ========================================

let configMotorista = null;

async function carregarConfiguracoes() {
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/motorista/configuracoes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      configMotorista = data.data;
      atualizarUIConfiguracoes();
    }

  } catch (error) {
    console.error('Erro carregar configurações:', error);
  }
}

function atualizarUIConfiguracoes() {
  if (!configMotorista) return;

  document.getElementById('modo-endereco').value = configMotorista.modo_endereco || 'automatico';
  alternarModoEndereco();

  if (configMotorista.endereco_base) {
    document.getElementById('endereco-base-texto').textContent = `📍 ${configMotorista.endereco_base}`;
  }
}

function alternarModoEndereco() {
  const modo = document.getElementById('modo-endereco').value;

  document.getElementById('endereco-manual-container').classList.add('hidden');
  document.getElementById('endereco-base-info').classList.add('hidden');

  if (modo === 'manual') {
    document.getElementById('endereco-manual-container').classList.remove('hidden');
  } else if (modo === 'base') {
    document.getElementById('endereco-base-info').classList.remove('hidden');
  }

  // Salvar preferência
  if (token && configMotorista) {
    salvarConfiguracoesSilencioso({ modo_endereco: modo });
  }
}

async function definirEnderecoManual() {
  const endereco = document.getElementById('endereco-manual').value;

  if (!endereco) {
    mostrarToast('Digite um endereço', 'error');
    return;
  }

  // TODO: Geocodificar endereço para obter coordenadas
  mostrarToast('Endereço definido!', 'success');
}

function abrirConfiguracoes() {
  if (configMotorista) {
    document.getElementById('config-modo-endereco').value = configMotorista.modo_endereco || 'automatico';
    document.getElementById('config-endereco-base').value = configMotorista.endereco_base || '';
    document.getElementById('config-raio-maximo').value = configMotorista.raio_maximo_km || 10;
    document.getElementById('config-aceitar-auto').checked = configMotorista.aceitar_fila_auto || false;
  }
  document.getElementById('modal-configuracoes').classList.add('active');
}

function fecharModalConfiguracoes() {
  document.getElementById('modal-configuracoes').classList.remove('active');
}

async function salvarConfiguracoes() {
  const configs = {
    modo_endereco: document.getElementById('config-modo-endereco').value,
    endereco_base: document.getElementById('config-endereco-base').value,
    raio_maximo_km: parseFloat(document.getElementById('config-raio-maximo').value),
    aceitar_fila_auto: document.getElementById('config-aceitar-auto').checked
  };

  try {
    const response = await fetch(`${API_URL}/motorista/configuracoes`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(configs)
    });

    const data = await response.json();

    if (data.success) {
      configMotorista = data.data;
      mostrarToast('Configurações salvas!', 'success');
      fecharModalConfiguracoes();
      atualizarUIConfiguracoes();
    } else {
      mostrarToast(data.error, 'error');
    }

  } catch (error) {
    mostrarToast('Erro ao salvar', 'error');
  }
}

async function salvarConfiguracoesSilencioso(configs) {
  try {
    await fetch(`${API_URL}/motorista/configuracoes`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(configs)
    });
  } catch (error) {
    console.error('Erro salvar config:', error);
  }
}

// ========================================
// FINALIZAR DIRETO
// ========================================

let finalizarDiretoAtivo = false;

function toggleFinalizarDireto() {
  finalizarDiretoAtivo = document.getElementById('check-finalizar-direto').checked;
  renderizarAcoes();
}

async function finalizarCorridaDireto() {
  if (!corridaAtual) return;

  try {
    const response = await fetch(`${API_URL}/motorista/corrida/${corridaAtual.id}/finalizar-direto`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ valor: corridaAtual.valor })
    });

    const data = await response.json();

    if (data.success) {
      mostrarToast('Corrida finalizada!', 'success');
      corridaAtual = null;
      finalizarDiretoAtivo = false;
      esconderCorrida();
      carregarHistorico();
      carregarResumoFinanceiro();
      carregarPagamentos();
      verificarFila();
    } else {
      mostrarToast(data.error, 'error');
    }

  } catch (error) {
    mostrarToast('Erro ao finalizar', 'error');
  }
}

// Adicionar verificação de fila ao loop principal
setInterval(() => {
  if (token && motorista && motorista.status === 'online') {
    verificarFila();
  }
}, 15000); // A cada 15 segundos
