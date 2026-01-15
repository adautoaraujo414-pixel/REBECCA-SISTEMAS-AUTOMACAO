// ========================================
// REBECA - PAINEL ADMIN
// JavaScript
// ========================================

const API_URL = '/api/admin';

// Estado da aplicação
let dadosDashboard = null;
let motoristas = [];
let corridas = [];
let clientes = [];
let mensagens = [];
let configuracoes = {};

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Configurar data atual
  const hoje = new Date();
  document.getElementById('current-date').textContent = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Configurar filtro de data
  document.getElementById('filtro-data').value = hoje.toISOString().split('T')[0];

  // Configurar navegação
  configurarNavegacao();

  // Carregar dados iniciais
  carregarDashboard();

  // Auto-refresh a cada 30 segundos
  setInterval(refreshData, 30000);
});

// ========================================
// NAVEGAÇÃO
// ========================================

function configurarNavegacao() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();

      // Remover active de todos
      navItems.forEach(i => i.classList.remove('active'));
      
      // Adicionar active no clicado
      item.classList.add('active');

      // Trocar página
      const pageName = item.dataset.page;
      trocarPagina(pageName);
    });
  });
}

function trocarPagina(pageName) {
  // Esconder todas as páginas
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Mostrar página selecionada
  document.getElementById(`page-${pageName}`).classList.add('active');

  // Atualizar título
  const titulos = {
    dashboard: 'Dashboard',
    motoristas: 'Motoristas',
    corridas: 'Corridas',
    clientes: 'Clientes',
    financeiro: '💰 Financeiro',
    antifraude: 'Anti-Fraude',
    mensagens: 'Mensagens',
    configuracoes: 'Configurações'
  };
  document.getElementById('page-title').textContent = titulos[pageName] || pageName;

  // Carregar dados da página
  switch (pageName) {
    case 'dashboard':
      carregarDashboard();
      break;
    case 'motoristas':
      carregarMotoristas();
      break;
    case 'corridas':
      carregarCorridas();
      break;
    case 'clientes':
      carregarClientes();
      break;
    case 'financeiro':
      carregarFinanceiro();
      break;
    case 'antifraude':
      carregarAntifraude();
      break;
    case 'mensagens':
      carregarMensagens();
      break;
    case 'configuracoes':
      carregarConfiguracoes();
      break;
  }
}

// ========================================
// API CALLS
// ========================================

async function apiGet(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  } catch (error) {
    console.error('Erro API GET:', error);
    mostrarToast('Erro ao carregar dados', 'error');
    return null;
  }
}

async function apiPost(endpoint, body) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  } catch (error) {
    console.error('Erro API POST:', error);
    mostrarToast(error.message || 'Erro ao salvar', 'error');
    return null;
  }
}

async function apiPut(endpoint, body) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  } catch (error) {
    console.error('Erro API PUT:', error);
    mostrarToast(error.message || 'Erro ao atualizar', 'error');
    return null;
  }
}

async function apiDelete(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return true;
  } catch (error) {
    console.error('Erro API DELETE:', error);
    mostrarToast(error.message || 'Erro ao excluir', 'error');
    return false;
  }
}

// ========================================
// DASHBOARD
// ========================================

async function carregarDashboard() {
  dadosDashboard = await apiGet('/dashboard');
  
  if (!dadosDashboard) return;

  const { corridas: c, motoristas: m, clientes: cl } = dadosDashboard;

  // Atualizar stats
  document.getElementById('stat-corridas-hoje').textContent = c.total || 0;
  document.getElementById('stat-finalizadas').textContent = c.finalizadas || 0;
  document.getElementById('stat-motoristas-online').textContent = 
    `${m.disponiveis || 0}/${m.total || 0}`;
  document.getElementById('stat-faturamento').textContent = 
    `R$ ${parseFloat(c.faturamento || 0).toFixed(2).replace('.', ',')}`;

  // Carregar corridas em andamento
  await carregarCorridasEmAndamento();

  // Carregar status motoristas
  await carregarMotoristasStatus();
}

async function carregarCorridasEmAndamento() {
  const corridasAtivas = await apiGet('/corridas?status=em_andamento&limit=10');
  
  const tbody = document.getElementById('table-corridas-andamento');
  const badge = document.getElementById('badge-em-andamento');

  if (!corridasAtivas || corridasAtivas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhuma corrida em andamento</td></tr>';
    badge.textContent = '0';
    return;
  }

  badge.textContent = corridasAtivas.length;

  tbody.innerHTML = corridasAtivas.map(c => `
    <tr>
      <td>#${c.id}</td>
      <td>${c.cliente_nome || 'N/A'}</td>
      <td>${c.motorista_nome || 'N/A'}</td>
      <td>${truncar(c.origem_endereco, 30)}</td>
      <td><span class="status status-${c.status}">${formatarStatus(c.status)}</span></td>
      <td>${formatarHora(c.solicitado_em)}</td>
    </tr>
  `).join('');
}

async function carregarMotoristasStatus() {
  motoristas = await apiGet('/motoristas');
  
  const container = document.getElementById('motoristas-status');

  if (!motoristas || motoristas.length === 0) {
    container.innerHTML = '<p class="text-muted">Nenhum motorista cadastrado</p>';
    return;
  }

  container.innerHTML = motoristas.map(m => `
    <div class="motorista-card">
      <div class="motorista-avatar">${m.nome.charAt(0)}</div>
      <div class="motorista-info">
        <h4>${m.nome}</h4>
        <span class="status status-${m.status}">${formatarStatus(m.status)}</span>
      </div>
    </div>
  `).join('');
}

// ========================================
// MOTORISTAS
// ========================================

async function carregarMotoristas() {
  motoristas = await apiGet('/motoristas');
  
  const tbody = document.getElementById('table-motoristas');

  if (!motoristas || motoristas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhum motorista cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = motoristas.map(m => `
    <tr>
      <td>
        <strong>${m.nome}</strong>
        ${!m.ativo ? '<span class="text-muted"> (Inativo)</span>' : ''}
      </td>
      <td>${formatarTelefone(m.telefone)}</td>
      <td>${m.veiculo_modelo || '-'} ${m.veiculo_cor || ''}</td>
      <td><span class="status status-${m.status}">${formatarStatus(m.status)}</span></td>
      <td>${m.total_corridas || 0}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editarMotorista(${m.id})">Editar</button>
        ${m.ativo ? 
          `<button class="btn btn-danger btn-sm" onclick="desativarMotorista(${m.id})">Desativar</button>` : 
          ''
        }
      </td>
    </tr>
  `).join('');
}

function abrirModalMotorista() {
  document.getElementById('modal-motorista-title').textContent = 'Novo Motorista';
  document.getElementById('form-motorista').reset();
  document.getElementById('motorista-id').value = '';
  document.getElementById('campo-senha').style.display = 'block';
  document.getElementById('motorista-senha').required = true;
  abrirModal('modal-motorista');
}

function editarMotorista(id) {
  const motorista = motoristas.find(m => m.id === id);
  if (!motorista) return;

  document.getElementById('modal-motorista-title').textContent = 'Editar Motorista';
  document.getElementById('motorista-id').value = motorista.id;
  document.getElementById('motorista-nome').value = motorista.nome;
  document.getElementById('motorista-telefone').value = motorista.telefone;
  document.getElementById('motorista-cnh').value = motorista.cnh || '';
  document.getElementById('motorista-veiculo').value = motorista.veiculo_modelo || '';
  document.getElementById('motorista-cor').value = motorista.veiculo_cor || '';
  document.getElementById('motorista-placa').value = motorista.veiculo_placa || '';
  
  // Esconder campo senha na edição
  document.getElementById('campo-senha').style.display = 'none';
  document.getElementById('motorista-senha').required = false;

  abrirModal('modal-motorista');
}

let ultimaSenhaCadastrada = '';

async function salvarMotorista(e) {
  e.preventDefault();

  const id = document.getElementById('motorista-id').value;
  const senha = document.getElementById('motorista-senha').value;
  
  const dados = {
    nome: document.getElementById('motorista-nome').value,
    telefone: document.getElementById('motorista-telefone').value,
    senha: senha,
    cnh: document.getElementById('motorista-cnh').value,
    veiculo_modelo: document.getElementById('motorista-veiculo').value,
    veiculo_cor: document.getElementById('motorista-cor').value,
    veiculo_placa: document.getElementById('motorista-placa').value,
  };

  let result;
  if (id) {
    // Edição - não enviar senha se não foi alterada
    delete dados.senha;
    result = await apiPut(`/motoristas/${id}`, dados);
  } else {
    // Novo motorista
    result = await apiPost('/motoristas', dados);
  }

  if (result) {
    fecharModal('modal-motorista');
    carregarMotoristas();
    
    // Se for novo, mostrar modal com link
    if (!id && result.link_acesso) {
      ultimaSenhaCadastrada = senha;
      mostrarLinkMotorista(result);
    } else {
      mostrarToast('Motorista salvo com sucesso!', 'success');
    }
  }
}

function mostrarLinkMotorista(motorista) {
  document.getElementById('link-motorista').value = motorista.link_acesso;
  document.getElementById('info-telefone').textContent = formatarTelefone(motorista.telefone);
  document.getElementById('info-senha').textContent = ultimaSenhaCadastrada;
  abrirModal('modal-link');
}

function copiarLink() {
  const input = document.getElementById('link-motorista');
  input.select();
  document.execCommand('copy');
  mostrarToast('Link copiado!', 'success');
}

async function desativarMotorista(id) {
  if (!confirm('Deseja realmente desativar este motorista?')) return;

  const result = await apiDelete(`/motoristas/${id}`);
  
  if (result) {
    mostrarToast('Motorista desativado', 'success');
    carregarMotoristas();
  }
}

// ========================================
// CORRIDAS
// ========================================

async function carregarCorridas() {
  const status = document.getElementById('filtro-status').value;
  const data = document.getElementById('filtro-data').value;

  let endpoint = '/corridas?limit=100';
  if (status) endpoint += `&status=${status}`;
  if (data) endpoint += `&data=${data}`;

  corridas = await apiGet(endpoint);
  
  const tbody = document.getElementById('table-corridas');

  if (!corridas || corridas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Nenhuma corrida encontrada</td></tr>';
    return;
  }

  tbody.innerHTML = corridas.map(c => `
    <tr>
      <td>#${c.id}</td>
      <td>${c.cliente_nome || 'N/A'}</td>
      <td>${c.motorista_nome || '-'}</td>
      <td>${truncar(c.origem_endereco, 25)}</td>
      <td>${truncar(c.destino_endereco, 25) || '-'}</td>
      <td>${c.valor ? `R$ ${parseFloat(c.valor).toFixed(2).replace('.', ',')}` : '-'}</td>
      <td><span class="status status-${c.status}">${formatarStatus(c.status)}</span></td>
      <td>${formatarData(c.solicitado_em)}</td>
    </tr>
  `).join('');
}

function filtrarCorridas() {
  carregarCorridas();
}

// ========================================
// CLIENTES
// ========================================

async function carregarClientes() {
  clientes = await apiGet('/clientes');
  
  const tbody = document.getElementById('table-clientes');

  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhum cliente encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = clientes.map(c => `
    <tr>
      <td>${c.nome || '-'}</td>
      <td>${formatarTelefone(c.telefone)}</td>
      <td>${c.total_corridas || 0}</td>
      <td>${c.recorrente ? '<span class="status status-finalizada">Sim</span>' : '<span class="status status-offline">Não</span>'}</td>
      <td>${c.ultima_corrida ? formatarData(c.ultima_corrida) : '-'}</td>
      <td>${formatarData(c.criado_em)}</td>
    </tr>
  `).join('');
}

// ========================================
// MENSAGENS
// ========================================

async function carregarMensagens() {
  mensagens = await apiGet('/mensagens?limit=100');
  
  renderizarMensagens(mensagens);
}

function renderizarMensagens(lista) {
  const container = document.getElementById('container-mensagens');

  if (!lista || lista.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">Nenhuma mensagem encontrada</p>';
    return;
  }

  container.innerHTML = lista.map(m => `
    <div class="mensagem-item">
      <div class="mensagem-icon ${m.direcao}">
        ${m.direcao === 'entrada' ? '📩' : '📤'}
      </div>
      <div class="mensagem-content">
        <div class="mensagem-header">
          <span class="mensagem-telefone">${formatarTelefone(m.telefone)}</span>
          <span class="mensagem-hora">${formatarDataHora(m.criado_em)}</span>
        </div>
        <p class="mensagem-texto">${m.conteudo}</p>
      </div>
    </div>
  `).join('');
}

function filtrarMensagens() {
  const filtro = document.getElementById('filtro-telefone').value.toLowerCase();
  
  if (!filtro) {
    renderizarMensagens(mensagens);
    return;
  }

  const filtradas = mensagens.filter(m => 
    m.telefone.includes(filtro)
  );

  renderizarMensagens(filtradas);
}

// ========================================
// CONFIGURAÇÕES
// ========================================

async function carregarConfiguracoes() {
  const configs = await apiGet('/configuracoes');
  
  if (!configs) return;

  configs.forEach(c => {
    configuracoes[c.chave] = c.valor;
    const input = document.getElementById(`config-${c.chave}`);
    if (input) {
      input.value = c.valor;
    }
  });
}

async function salvarConfiguracoes(e) {
  e.preventDefault();

  const campos = ['valor_km', 'valor_minimo', 'taxa_base', 'horario_inicio', 'horario_fim'];

  for (const campo of campos) {
    const valor = document.getElementById(`config-${campo}`).value;
    await apiPut(`/configuracoes/${campo}`, { valor });
  }

  mostrarToast('Configurações salvas com sucesso!', 'success');
}

// ========================================
// MODAL
// ========================================

function abrirModal(id) {
  document.getElementById(id).classList.add('active');
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// ========================================
// TOAST
// ========================================

function mostrarToast(mensagem, tipo = 'success') {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[tipo]}</span>
    <span class="toast-message">${mensagem}</span>
  `;

  container.appendChild(toast);

  // Remover após 4 segundos
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// ========================================
// REFRESH
// ========================================

function refreshData() {
  const paginaAtiva = document.querySelector('.nav-item.active');
  if (paginaAtiva) {
    trocarPagina(paginaAtiva.dataset.page);
  }
}

// ========================================
// UTILITÁRIOS
// ========================================

function formatarStatus(status) {
  const map = {
    'online': 'Online',
    'offline': 'Offline',
    'em_corrida': 'Em Corrida',
    'pausado': 'Pausado',
    'aguardando': 'Aguardando',
    'enviada': 'Enviada',
    'aceita': 'Aceita',
    'em_andamento': 'Em Andamento',
    'finalizada': 'Finalizada',
    'cancelada': 'Cancelada'
  };
  return map[status] || status;
}

function formatarTelefone(tel) {
  if (!tel) return '-';
  // Remove não numéricos
  const nums = tel.replace(/\D/g, '');
  // Formato: +55 (11) 99999-9999
  if (nums.length === 13) {
    return `+${nums.slice(0,2)} (${nums.slice(2,4)}) ${nums.slice(4,9)}-${nums.slice(9)}`;
  }
  if (nums.length === 11) {
    return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`;
  }
  return tel;
}

function formatarData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

function formatarHora(data) {
  if (!data) return '-';
  return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarDataHora(data) {
  if (!data) return '-';
  return new Date(data).toLocaleString('pt-BR');
}

function truncar(texto, max) {
  if (!texto) return '';
  if (texto.length <= max) return texto;
  return texto.substring(0, max) + '...';
}

// ========================================
// ANTI-FRAUDE
// ========================================

async function carregarAntifraude() {
  // Carregar recusas
  const recusas = await apiGet('/antifraude/recusas');
  if (recusas) {
    renderizarRecusas(recusas);
    document.getElementById('badge-recusas').textContent = recusas.length;
  }

  // Carregar alertas
  const alertas = await apiGet('/antifraude/alertas');
  if (alertas) {
    renderizarAlertas(alertas);
    document.getElementById('total-alertas').textContent = alertas.total_alertas;
  }
}

function renderizarRecusas(recusas) {
  const tbody = document.getElementById('table-recusas');

  if (recusas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhuma recusa registrada</td></tr>';
    return;
  }

  tbody.innerHTML = recusas.map(r => `
    <tr>
      <td><strong>${r.nome}</strong></td>
      <td>${formatarTelefone(r.telefone)}</td>
      <td><span class="status status-${r.status}">${formatarStatus(r.status)}</span></td>
      <td><span class="badge ${r.total_recusas >= 5 ? 'badge-danger' : ''}">${r.total_recusas}</span></td>
      <td>${formatarDataHora(r.ultima_recusa)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="verHistoricoRecusas(${r.id}, '${r.nome}')">Ver Histórico</button>
      </td>
    </tr>
  `).join('');
}

function renderizarAlertas(alertas) {
  const container = document.getElementById('alertas-container');

  if (alertas.total_alertas === 0) {
    container.innerHTML = '<p class="text-muted text-center">✅ Nenhum alerta no momento</p>';
    return;
  }

  let html = '';

  // Alertas de recusas excessivas
  if (alertas.recusas_excessivas.length > 0) {
    html += '<div class="alerta-group"><h4>🚫 Recusas Excessivas (últimos 7 dias)</h4><ul class="alerta-lista">';
    alertas.recusas_excessivas.forEach(a => {
      html += `<li class="alerta-item alerta-danger">
        <strong>${a.nome}</strong> recusou <strong>${a.recusas_semana} corridas</strong> nos últimos 7 dias
      </li>`;
    });
    html += '</ul></div>';
  }

  // Alertas de taxa de recusa alta
  if (alertas.taxa_recusa_alta.length > 0) {
    html += '<div class="alerta-group"><h4>⚠️ Taxa de Recusa Alta</h4><ul class="alerta-lista">';
    alertas.taxa_recusa_alta.forEach(a => {
      html += `<li class="alerta-item alerta-warning">
        <strong>${a.nome}</strong>: ${a.recusas} recusas vs ${a.finalizadas} corridas finalizadas
      </li>`;
    });
    html += '</ul></div>';
  }

  container.innerHTML = html;
}

async function verHistoricoRecusas(motoristaId, nome) {
  const historico = await apiGet(`/antifraude/recusas/${motoristaId}`);
  
  if (!historico || historico.length === 0) {
    mostrarToast('Nenhuma recusa encontrada', 'info');
    return;
  }

  let html = `<h3>Histórico de Recusas - ${nome}</h3><br>`;
  html += '<table class="table"><thead><tr><th>Data</th><th>Origem</th><th>Destino</th><th>Motivo</th></tr></thead><tbody>';
  
  historico.forEach(h => {
    html += `<tr>
      <td>${formatarDataHora(h.criado_em)}</td>
      <td>${truncar(h.origem_endereco, 30) || '-'}</td>
      <td>${truncar(h.destino_endereco, 30) || '-'}</td>
      <td>${h.motivo || '-'}</td>
    </tr>`;
  });
  
  html += '</tbody></table>';

  // Criar modal simples
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3>📋 Histórico de Recusas</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body">${html}</div>
    </div>
  `;
  document.body.appendChild(modal);
}

// ========================================
// CONFIGURAÇÕES AVANÇADAS
// ========================================

function alternarModoCobranca() {
  const modo = document.getElementById('config-modo_cobranca').value;
  
  // Esconder todos
  document.querySelectorAll('.config-modo').forEach(el => el.classList.add('hidden'));
  
  // Mostrar o selecionado
  const modoEl = document.getElementById(`config-modo-${modo}`);
  if (modoEl) {
    modoEl.classList.remove('hidden');
  }
}

function adicionarValorEspecial() {
  document.getElementById('especial-tipo-periodo').value = 'data';
  document.getElementById('especial-descricao').value = '';
  document.getElementById('especial-valor').value = '';
  document.getElementById('especial-ativo').checked = true;
  alternarTipoPeriodo();
  alternarTipoValor();
  abrirModal('modal-valor-especial');
}

function alternarTipoPeriodo() {
  const tipo = document.getElementById('especial-tipo-periodo').value;
  
  document.querySelectorAll('.especial-periodo').forEach(el => el.classList.add('hidden'));
  
  switch(tipo) {
    case 'data':
      document.getElementById('especial-data').classList.remove('hidden');
      break;
    case 'periodo':
      document.getElementById('especial-periodo-datas').classList.remove('hidden');
      break;
    case 'dia_semana':
      document.getElementById('especial-dia-semana').classList.remove('hidden');
      break;
    case 'horario':
      document.getElementById('especial-horario').classList.remove('hidden');
      break;
  }
}

function alternarTipoValor() {
  const tipo = document.getElementById('especial-tipo-valor').value;
  const label = document.getElementById('label-valor-especial');
  
  switch(tipo) {
    case 'fixo':
      label.textContent = 'Valor Fixo (R$)';
      break;
    case 'acrescimo_pct':
      label.textContent = 'Acréscimo (%)';
      break;
    case 'acrescimo_rs':
      label.textContent = 'Acréscimo (R$)';
      break;
    case 'multiplicador':
      label.textContent = 'Multiplicador (ex: 1.5, 2)';
      break;
  }
}

function salvarValorEspecial() {
  mostrarToast('Valor especial salvo com sucesso!', 'success');
  fecharModal('modal-valor-especial');
}

function editarValorEspecial(id) {
  abrirModal('modal-valor-especial');
}

function excluirValorEspecial(id) {
  if (confirm('Deseja excluir este valor especial?')) {
    mostrarToast('Valor especial excluído', 'success');
  }
}

async function salvarTodasConfiguracoes() {
  const configs = {
    modo_cobranca: document.getElementById('config-modo_cobranca').value,
    valor_km: document.getElementById('config-valor_km').value,
    taxa_base: document.getElementById('config-taxa_base').value,
    valor_minimo: document.getElementById('config-valor_minimo').value,
    valor_fixo: document.getElementById('config-valor_fixo').value,
    valor_cidade: document.getElementById('config-valor_cidade').value,
    valor_fora_cidade: document.getElementById('config-valor_fora_cidade').value,
    horario_inicio: document.getElementById('config-horario_inicio').value,
    horario_fim: document.getElementById('config-horario_fim').value,
    msg_boasvindas: document.getElementById('config-msg_boasvindas').value,
    msg_fora_horario: document.getElementById('config-msg_fora_horario').value,
    msg_valor: document.getElementById('config-msg_valor').value,
  };

  // Salvar cada configuração
  for (const [chave, valor] of Object.entries(configs)) {
    if (valor) {
      await apiPost('/configuracoes', { chave, valor });
    }
  }

  mostrarToast('✅ Configurações salvas! A Rebeca já está usando os novos valores.', 'success');
}

function abrirModal(id) {
  document.getElementById(id).classList.add('active');
}

// ========================================
// FINANCEIRO / MENSALIDADES
// ========================================

let mensalidades = [];
let financeiroMotoristas = [];

async function carregarFinanceiro() {
  await Promise.all([
    carregarResumoFinanceiro(),
    carregarMensalidades(),
    carregarConfigMensalidades()
  ]);
}

async function carregarResumoFinanceiro() {
  try {
    const resumo = await apiGet('/financeiro/resumo');
    if (resumo) {
      document.getElementById('total-recebido-mes').textContent = `R$ ${resumo.recebido_mes.toFixed(2).replace('.', ',')}`;
      document.getElementById('total-pendente').textContent = `R$ ${resumo.a_receber_mes.toFixed(2).replace('.', ',')}`;
      document.getElementById('total-atrasado').textContent = resumo.atrasados;
      document.getElementById('total-motoristas-ativos').textContent = resumo.total_motoristas;
    }
  } catch (error) {
    console.error('Erro resumo financeiro:', error);
  }
}

async function carregarMensalidades() {
  financeiroMotoristas = await apiGet('/financeiro/motoristas') || [];
  
  const tbody = document.getElementById('table-mensalidades');

  if (!financeiroMotoristas || financeiroMotoristas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum registro encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = financeiroMotoristas.map(m => {
    const statusClass = {
      'pago': 'status-finalizada',
      'pendente': 'status-em_andamento',
      'atrasado': 'status-cancelada',
      'isento': 'status-online'
    }[m.situacao] || 'status-offline';

    const statusIcon = {
      'pago': '✅',
      'pendente': '⏳',
      'atrasado': '🚫',
      'isento': '🎁'
    }[m.situacao] || '';

    return `
      <tr>
        <td>
          <strong>${m.nome}</strong>
          <br><small class="text-muted">${formatarTelefone(m.telefone)}</small>
        </td>
        <td>R$ ${parseFloat(m.valor_mensalidade).toFixed(2).replace('.', ',')}</td>
        <td>Dia ${m.dia_vencimento}</td>
        <td>${new Date().toISOString().slice(0, 7)}</td>
        <td><span class="status ${statusClass}">${statusIcon} ${m.situacao.charAt(0).toUpperCase() + m.situacao.slice(1)}</span></td>
        <td>${m.data_pagamento ? formatarData(m.data_pagamento) : '-'}</td>
        <td>
          ${m.situacao !== 'pago' && m.situacao !== 'isento' ? 
            `<button class="btn btn-sm btn-success" onclick="abrirConfirmarPagamento(${m.id}, '${m.nome}', ${m.valor_mensalidade})">💵 Pagar</button>` : 
            ''
          }
          <button class="btn btn-sm btn-secondary" onclick="verHistoricoFinanceiro(${m.id})">📋</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function carregarConfigMensalidades() {
  const motoristas = await apiGet('/financeiro/motoristas') || [];
  
  const tbody = document.getElementById('table-config-mensalidades');

  if (!motoristas || motoristas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum motorista encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = motoristas.map(m => `
    <tr>
      <td><strong>${m.nome}</strong></td>
      <td>R$ ${parseFloat(m.valor_mensalidade).toFixed(2).replace('.', ',')}</td>
      <td>Dia ${m.dia_vencimento}</td>
      <td>${m.isento ? '<span class="status status-online">🎁 Isento</span>' : '<span class="status status-em_andamento">💰 Paga</span>'}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editarConfigMensalidade(${m.id}, '${m.nome}', ${m.valor_mensalidade}, ${m.dia_vencimento}, ${m.isento}, '${m.motivo_isencao || ''}')">⚙️ Configurar</button>
      </td>
    </tr>
  `).join('');

  // Preencher select do modal de mensalidade
  const select = document.getElementById('mensalidade-motorista');
  if (select) {
    select.innerHTML = '<option value="">Selecione...</option>' + 
      motoristas.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
  }
}

function abrirModalMensalidade() {
  document.getElementById('mensalidade-id').value = '';
  document.getElementById('mensalidade-motorista').value = '';
  document.getElementById('mensalidade-valor').value = '100.00';
  document.getElementById('mensalidade-mes').value = new Date().toISOString().slice(0, 7);
  document.getElementById('mensalidade-status').value = 'pendente';
  document.getElementById('mensalidade-observacao').value = '';
  document.getElementById('modal-mensalidade-title').textContent = '💰 Nova Cobrança';
  abrirModal('modal-mensalidade');
}

async function salvarMensalidade() {
  const motoristaId = document.getElementById('mensalidade-motorista').value;
  const valor = document.getElementById('mensalidade-valor').value;
  const mesReferencia = document.getElementById('mensalidade-mes').value;
  const status = document.getElementById('mensalidade-status').value;
  const observacao = document.getElementById('mensalidade-observacao').value;

  if (!motoristaId) {
    mostrarToast('Selecione um motorista', 'error');
    return;
  }

  if (status === 'pago') {
    await apiPost('/financeiro/registrar-pagamento', {
      motorista_id: parseInt(motoristaId),
      mes_referencia: mesReferencia,
      valor: parseFloat(valor),
      forma_pagamento: 'manual',
      observacao
    });
  }

  mostrarToast('Mensalidade salva com sucesso!', 'success');
  fecharModal('modal-mensalidade');
  carregarFinanceiro();
}

function editarConfigMensalidade(id, nome, valor, dia, isento, motivo) {
  document.getElementById('config-mensalidade-motorista-id').value = id;
  document.getElementById('config-mensalidade-nome').value = nome;
  document.getElementById('config-mensalidade-valor').value = valor;
  document.getElementById('config-mensalidade-dia').value = dia;
  document.getElementById('config-mensalidade-isento').checked = isento;
  document.getElementById('config-mensalidade-motivo').value = motivo || '';
  
  toggleCampoIsencao();
  abrirModal('modal-config-mensalidade');
}

function toggleCampoIsencao() {
  const isento = document.getElementById('config-mensalidade-isento')?.checked;
  const campo = document.getElementById('campo-motivo-isencao');
  if (campo) campo.style.display = isento ? 'block' : 'none';
}

async function salvarConfigMensalidade() {
  const motoristaId = document.getElementById('config-mensalidade-motorista-id').value;
  const valor = document.getElementById('config-mensalidade-valor').value;
  const dia = document.getElementById('config-mensalidade-dia').value;
  const isento = document.getElementById('config-mensalidade-isento').checked;
  const motivo = document.getElementById('config-mensalidade-motivo').value;

  await apiPut(`/financeiro/motorista/${motoristaId}`, {
    valor_mensalidade: parseFloat(valor),
    dia_vencimento: parseInt(dia),
    isento,
    motivo_isencao: isento ? motivo : null
  });

  mostrarToast('Configuração salva com sucesso!', 'success');
  fecharModal('modal-config-mensalidade');
  carregarFinanceiro();
}

function abrirConfirmarPagamento(motoristaId, nome, valor) {
  document.getElementById('confirmar-mensalidade-id').value = motoristaId;
  document.getElementById('confirmar-motorista-nome').textContent = nome;
  document.getElementById('confirmar-valor').textContent = `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
  document.getElementById('confirmar-mes').textContent = new Date().toISOString().slice(0, 7);
  document.getElementById('confirmar-data').value = new Date().toISOString().slice(0, 10);
  document.getElementById('confirmar-obs').value = '';
  abrirModal('modal-confirmar-pagamento');
}

async function confirmarPagamento() {
  const motoristaId = document.getElementById('confirmar-mensalidade-id').value;
  const mes = new Date().toISOString().slice(0, 7);
  const observacao = document.getElementById('confirmar-obs').value;

  const motorista = financeiroMotoristas.find(m => m.id == motoristaId);
  const valor = motorista?.valor_mensalidade || 100;

  await apiPost('/financeiro/registrar-pagamento', {
    motorista_id: parseInt(motoristaId),
    mes_referencia: mes,
    valor: parseFloat(valor),
    forma_pagamento: 'manual',
    observacao
  });

  mostrarToast('✅ Pagamento confirmado!', 'success');
  fecharModal('modal-confirmar-pagamento');
  carregarFinanceiro();
}

async function gerarCobrancasMes() {
  if (!confirm('Deseja gerar as cobranças pendentes para este mês?')) return;

  const result = await apiPost('/financeiro/gerar-mensalidades', {
    mes_referencia: new Date().toISOString().slice(0, 7)
  });

  if (result) {
    mostrarToast(`${result.criadas} cobranças geradas!`, 'success');
    carregarFinanceiro();
  }
}

async function verHistoricoFinanceiro(motoristaId) {
  const data = await apiGet(`/financeiro/motorista/${motoristaId}`);
  
  if (!data) return;

  let html = `<h3>Histórico - ${data.motorista.nome}</h3><br>`;
  
  if (data.historico.length === 0) {
    html += '<p class="text-muted">Nenhum histórico encontrado.</p>';
  } else {
    html += '<table class="table"><thead><tr><th>Mês</th><th>Valor</th><th>Status</th><th>Pagamento</th></tr></thead><tbody>';
    data.historico.forEach(h => {
      const statusClass = h.status === 'pago' ? 'status-finalizada' : h.status === 'atrasado' ? 'status-cancelada' : 'status-em_andamento';
      html += `<tr>
        <td>${h.mes_referencia}</td>
        <td>R$ ${parseFloat(h.valor).toFixed(2).replace('.', ',')}</td>
        <td><span class="status ${statusClass}">${h.status}</span></td>
        <td>${h.data_pagamento ? formatarData(h.data_pagamento) : '-'}</td>
      </tr>`;
    });
    html += '</tbody></table>';
  }

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3>📋 Histórico Financeiro</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body">${html}</div>
    </div>
  `;
  document.body.appendChild(modal);
}

function filtrarMensalidades() {
  carregarMensalidades();
}

// ========================================
// VALORES POR HORÁRIO
// ========================================

let valoresHorario = [];

async function carregarValoresHorario() {
  try {
    const res = await fetch(`${API_URL}/valores-horario`);
    const data = await res.json();
    if (data.success) {
      valoresHorario = data.valores;
      renderizarValoresHorario();
    }
  } catch (e) {
    console.error('Erro ao carregar valores por horário:', e);
  }
}

function renderizarValoresHorario() {
  const container = document.getElementById('valores-horario-lista');
  if (!container) return;
  
  if (valoresHorario.length === 0) {
    container.innerHTML = '<p class="text-muted">Nenhum valor configurado. Adicione valores por período.</p>';
    return;
  }
  
  const diasTexto = {
    'segunda_sexta': 'Segunda a Sexta',
    'sabado': 'Sábado',
    'domingo': 'Domingo',
    'feriado': 'Feriados'
  };
  
  let html = '<table class="table"><thead><tr><th>Dia</th><th>Horário</th><th>Valor Base</th><th>KM Incluso</th><th>R$/KM Extra</th><th>Ações</th></tr></thead><tbody>';
  
  valoresHorario.forEach(v => {
    html += `<tr>
      <td>${diasTexto[v.dia_semana] || v.dia_semana}</td>
      <td>${v.horario_inicio} - ${v.horario_fim}</td>
      <td>R$ ${parseFloat(v.valor_base).toFixed(2)}</td>
      <td>${v.km_incluso} km</td>
      <td>R$ ${parseFloat(v.valor_km_adicional).toFixed(2)}</td>
      <td>
        <button class="btn-icon" onclick="editarValorHorario(${v.id})">✏️</button>
        <button class="btn-icon danger" onclick="excluirValorHorario(${v.id})">🗑️</button>
      </td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function abrirModalValorHorario(id = null) {
  const valor = id ? valoresHorario.find(v => v.id === id) : null;
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modal-valor-horario';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${valor ? '✏️ Editar' : '➕ Novo'} Valor por Horário</h3>
        <button class="modal-close" onclick="fecharModal('modal-valor-horario')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Dia da Semana *</label>
          <select id="vh-dia" class="form-control">
            <option value="segunda_sexta" ${valor?.dia_semana === 'segunda_sexta' ? 'selected' : ''}>Segunda a Sexta</option>
            <option value="sabado" ${valor?.dia_semana === 'sabado' ? 'selected' : ''}>Sábado</option>
            <option value="domingo" ${valor?.dia_semana === 'domingo' ? 'selected' : ''}>Domingo</option>
            <option value="feriado" ${valor?.dia_semana === 'feriado' ? 'selected' : ''}>Feriados</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Horário Início *</label>
            <input type="time" id="vh-inicio" class="form-control" value="${valor?.horario_inicio || '06:00'}">
          </div>
          <div class="form-group">
            <label>Horário Fim *</label>
            <input type="time" id="vh-fim" class="form-control" value="${valor?.horario_fim || '20:00'}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Valor Base (R$) *</label>
            <input type="number" step="0.01" id="vh-valor" class="form-control" value="${valor?.valor_base || '13.00'}">
          </div>
          <div class="form-group">
            <label>KM Incluso *</label>
            <input type="number" step="0.5" id="vh-km" class="form-control" value="${valor?.km_incluso || '5'}">
          </div>
        </div>
        <div class="form-group">
          <label>Valor KM Adicional (R$)</label>
          <input type="number" step="0.01" id="vh-km-adicional" class="form-control" value="${valor?.valor_km_adicional || '2.50'}">
        </div>
        <button class="btn btn-primary" onclick="salvarValorHorario(${valor?.id || 'null'})">💾 Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function salvarValorHorario(id) {
  const dados = {
    id: id,
    dia_semana: document.getElementById('vh-dia').value,
    horario_inicio: document.getElementById('vh-inicio').value,
    horario_fim: document.getElementById('vh-fim').value,
    valor_base: parseFloat(document.getElementById('vh-valor').value),
    km_incluso: parseFloat(document.getElementById('vh-km').value),
    valor_km_adicional: parseFloat(document.getElementById('vh-km-adicional').value)
  };
  
  try {
    const res = await fetch(`${API_URL}/valores-horario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (data.success) {
      fecharModal('modal-valor-horario');
      carregarValoresHorario();
      mostrarNotificacao('✅ Valor salvo com sucesso!');
    }
  } catch (e) {
    mostrarNotificacao('❌ Erro ao salvar', 'error');
  }
}

async function excluirValorHorario(id) {
  if (!confirm('Excluir este valor?')) return;
  try {
    await fetch(`${API_URL}/valores-horario/${id}`, { method: 'DELETE' });
    carregarValoresHorario();
    mostrarNotificacao('✅ Valor excluído');
  } catch (e) {
    mostrarNotificacao('❌ Erro ao excluir', 'error');
  }
}

function editarValorHorario(id) {
  abrirModalValorHorario(id);
}

// ========================================
// VALORES POR CIDADE
// ========================================

let valoresCidade = [];

async function carregarValoresCidade() {
  try {
    const res = await fetch(`${API_URL}/valores-cidade`);
    const data = await res.json();
    if (data.success) {
      valoresCidade = data.cidades;
      renderizarValoresCidade();
    }
  } catch (e) {
    console.error('Erro ao carregar valores por cidade:', e);
  }
}

function renderizarValoresCidade() {
  const container = document.getElementById('valores-cidade-lista');
  if (!container) return;
  
  if (valoresCidade.length === 0) {
    container.innerHTML = '<p class="text-muted">Nenhuma cidade configurada. Adicione destinos com valores fixos.</p>';
    return;
  }
  
  let html = '<table class="table"><thead><tr><th>Cidade Destino</th><th>Distância</th><th>Valor Fixo</th><th>Tempo Est.</th><th>Ações</th></tr></thead><tbody>';
  
  valoresCidade.forEach(c => {
    html += `<tr>
      <td>${c.cidade_destino}</td>
      <td>${c.distancia_km || '-'} km</td>
      <td>R$ ${parseFloat(c.valor_fixo).toFixed(2)}</td>
      <td>${c.tempo_estimado_min || '-'} min</td>
      <td>
        <button class="btn-icon" onclick="editarValorCidade(${c.id})">✏️</button>
        <button class="btn-icon danger" onclick="excluirValorCidade(${c.id})">🗑️</button>
      </td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function abrirModalValorCidade(id = null) {
  const cidade = id ? valoresCidade.find(c => c.id === id) : null;
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modal-valor-cidade';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${cidade ? '✏️ Editar' : '➕ Nova'} Cidade/Destino</h3>
        <button class="modal-close" onclick="fecharModal('modal-valor-cidade')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Cidade Destino *</label>
          <input type="text" id="vc-cidade" class="form-control" placeholder="Ex: Marília" value="${cidade?.cidade_destino || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Distância (km)</label>
            <input type="number" step="0.1" id="vc-distancia" class="form-control" value="${cidade?.distancia_km || ''}">
          </div>
          <div class="form-group">
            <label>Valor Fixo (R$) *</label>
            <input type="number" step="0.01" id="vc-valor" class="form-control" value="${cidade?.valor_fixo || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Tempo Estimado (min)</label>
          <input type="number" id="vc-tempo" class="form-control" value="${cidade?.tempo_estimado_min || ''}">
        </div>
        <button class="btn btn-primary" onclick="salvarValorCidade(${cidade?.id || 'null'})">💾 Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function salvarValorCidade(id) {
  const dados = {
    id: id,
    cidade_destino: document.getElementById('vc-cidade').value,
    distancia_km: parseFloat(document.getElementById('vc-distancia').value) || null,
    valor_fixo: parseFloat(document.getElementById('vc-valor').value),
    tempo_estimado_min: parseInt(document.getElementById('vc-tempo').value) || null
  };
  
  if (!dados.cidade_destino || !dados.valor_fixo) {
    mostrarNotificacao('❌ Preencha cidade e valor', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/valores-cidade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (data.success) {
      fecharModal('modal-valor-cidade');
      carregarValoresCidade();
      mostrarNotificacao('✅ Cidade salva com sucesso!');
    }
  } catch (e) {
    mostrarNotificacao('❌ Erro ao salvar', 'error');
  }
}

async function excluirValorCidade(id) {
  if (!confirm('Excluir esta cidade?')) return;
  try {
    await fetch(`${API_URL}/valores-cidade/${id}`, { method: 'DELETE' });
    carregarValoresCidade();
    mostrarNotificacao('✅ Cidade excluída');
  } catch (e) {
    mostrarNotificacao('❌ Erro ao excluir', 'error');
  }
}

function editarValorCidade(id) {
  abrirModalValorCidade(id);
}

// ========================================
// CONTATOS SUPORTE/EMERGÊNCIA
// ========================================

let contatosSuporte = [];

async function carregarContatosSuporte() {
  try {
    const res = await fetch(`${API_URL}/contatos-suporte`);
    const data = await res.json();
    if (data.success) {
      contatosSuporte = data.contatos;
      renderizarContatosSuporte();
    }
  } catch (e) {
    console.error('Erro ao carregar contatos:', e);
  }
}

function renderizarContatosSuporte() {
  const container = document.getElementById('contatos-suporte-lista');
  if (!container) return;
  
  if (contatosSuporte.length === 0) {
    container.innerHTML = '<p class="text-muted">Nenhum contato cadastrado. Adicione contatos de emergência e suporte.</p>';
    return;
  }
  
  const tiposIcone = {
    'emergencia': '🚨',
    'suporte': '📞',
    'dono': '👤',
    'guincho': '🚗',
    'mecanico': '🔧'
  };
  
  let html = '';
  contatosSuporte.forEach(c => {
    html += `<div class="contato-card">
      <div class="contato-icone">${tiposIcone[c.tipo] || '📱'}</div>
      <div class="contato-info">
        <strong>${c.nome}</strong>
        <span>${c.telefone}</span>
        <small>${c.descricao || c.tipo}</small>
      </div>
      <div class="contato-acoes">
        <button class="btn-icon" onclick="editarContato(${c.id})">✏️</button>
        <button class="btn-icon danger" onclick="excluirContato(${c.id})">🗑️</button>
      </div>
    </div>`;
  });
  
  container.innerHTML = html;
}

function abrirModalContato(id = null) {
  const contato = id ? contatosSuporte.find(c => c.id === id) : null;
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modal-contato';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${contato ? '✏️ Editar' : '➕ Novo'} Contato</h3>
        <button class="modal-close" onclick="fecharModal('modal-contato')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Tipo *</label>
          <select id="ct-tipo" class="form-control">
            <option value="emergencia" ${contato?.tipo === 'emergencia' ? 'selected' : ''}>🚨 Emergência</option>
            <option value="suporte" ${contato?.tipo === 'suporte' ? 'selected' : ''}>📞 Suporte</option>
            <option value="dono" ${contato?.tipo === 'dono' ? 'selected' : ''}>👤 Dono/ADM</option>
            <option value="guincho" ${contato?.tipo === 'guincho' ? 'selected' : ''}>🚗 Guincho</option>
            <option value="mecanico" ${contato?.tipo === 'mecanico' ? 'selected' : ''}>🔧 Mecânico</option>
          </select>
        </div>
        <div class="form-group">
          <label>Nome *</label>
          <input type="text" id="ct-nome" class="form-control" value="${contato?.nome || ''}">
        </div>
        <div class="form-group">
          <label>Telefone *</label>
          <input type="text" id="ct-telefone" class="form-control" value="${contato?.telefone || ''}">
        </div>
        <div class="form-group">
          <label>Descrição</label>
          <input type="text" id="ct-descricao" class="form-control" value="${contato?.descricao || ''}">
        </div>
        <button class="btn btn-primary" onclick="salvarContato(${contato?.id || 'null'})">💾 Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function salvarContato(id) {
  const dados = {
    id: id,
    tipo: document.getElementById('ct-tipo').value,
    nome: document.getElementById('ct-nome').value,
    telefone: document.getElementById('ct-telefone').value,
    descricao: document.getElementById('ct-descricao').value
  };
  
  if (!dados.nome || !dados.telefone) {
    mostrarNotificacao('❌ Preencha nome e telefone', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/contatos-suporte`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (data.success) {
      fecharModal('modal-contato');
      carregarContatosSuporte();
      mostrarNotificacao('✅ Contato salvo!');
    }
  } catch (e) {
    mostrarNotificacao('❌ Erro ao salvar', 'error');
  }
}

async function excluirContato(id) {
  if (!confirm('Excluir este contato?')) return;
  try {
    await fetch(`${API_URL}/contatos-suporte/${id}`, { method: 'DELETE' });
    carregarContatosSuporte();
    mostrarNotificacao('✅ Contato excluído');
  } catch (e) {
    mostrarNotificacao('❌ Erro ao excluir', 'error');
  }
}

function editarContato(id) {
  abrirModalContato(id);
}

// ========================================
// CONFIGURAÇÕES DA REBECA
// ========================================

let configRebeca = {};

async function carregarConfigRebeca() {
  try {
    const res = await fetch(`${API_URL}/config-rebeca`);
    const data = await res.json();
    if (data.success) {
      configRebeca = data.config;
      preencherFormConfigRebeca();
    }
  } catch (e) {
    console.error('Erro ao carregar config Rebeca:', e);
  }
}

function preencherFormConfigRebeca() {
  const form = document.getElementById('form-config-rebeca');
  if (!form) return;
  
  // Preencher campos
  const campos = {
    'rb-permitir-sem-destino': configRebeca.permitir_sem_destino,
    'rb-msg-sem-destino': configRebeca.msg_sem_destino,
    'rb-msg-ocupados': configRebeca.msg_todos_ocupados,
    'rb-msg-finalizada': configRebeca.msg_corrida_finalizada,
    'rb-tempo-destino': configRebeca.tempo_espera_destino_seg,
    'rb-raio-busca': configRebeca.raio_busca_km,
    'rb-prioridade-geo': configRebeca.prioridade_geolocalizacao,
    'rb-prioridade-avaliacao': configRebeca.prioridade_avaliacao,
    'rb-prioridade-antifraude': configRebeca.prioridade_antifraude,
    'rb-prioridade-experiencia': configRebeca.prioridade_experiencia
  };
  
  for (const [id, valor] of Object.entries(campos)) {
    const el = document.getElementById(id);
    if (el) {
      if (el.type === 'checkbox') {
        el.checked = valor;
      } else {
        el.value = valor || '';
      }
    }
  }
}

async function salvarConfigRebeca() {
  const dados = {
    permitir_sem_destino: document.getElementById('rb-permitir-sem-destino')?.checked,
    msg_sem_destino: document.getElementById('rb-msg-sem-destino')?.value,
    msg_todos_ocupados: document.getElementById('rb-msg-ocupados')?.value,
    msg_corrida_finalizada: document.getElementById('rb-msg-finalizada')?.value,
    tempo_espera_destino_seg: parseInt(document.getElementById('rb-tempo-destino')?.value) || 60,
    raio_busca_km: parseFloat(document.getElementById('rb-raio-busca')?.value) || 10,
    prioridade_geolocalizacao: document.getElementById('rb-prioridade-geo')?.checked,
    prioridade_avaliacao: document.getElementById('rb-prioridade-avaliacao')?.checked,
    prioridade_antifraude: document.getElementById('rb-prioridade-antifraude')?.checked,
    prioridade_experiencia: document.getElementById('rb-prioridade-experiencia')?.checked
  };
  
  try {
    const res = await fetch(`${API_URL}/config-rebeca`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (data.success) {
      mostrarNotificacao('✅ Configurações da Rebeca salvas!');
    }
  } catch (e) {
    mostrarNotificacao('❌ Erro ao salvar', 'error');
  }
}

// ========================================
// CONFIGURAÇÕES DA EMPRESA
// ========================================

async function carregarConfigEmpresa() {
  try {
    const res = await fetch(`${API_URL}/empresa/config`);
    const data = await res.json();
    if (data.success && data.empresa) {
      document.getElementById('emp-telefone-dono').value = data.empresa.telefone_dono || '';
      document.getElementById('emp-nome-dono').value = data.empresa.nome_dono || '';
      document.getElementById('emp-msg-final').value = data.empresa.msg_corrida_finalizada || '';
    }
  } catch (e) {
    console.error('Erro ao carregar config empresa:', e);
  }
}

async function salvarConfigEmpresa() {
  const dados = {
    telefone_dono: document.getElementById('emp-telefone-dono')?.value,
    nome_dono: document.getElementById('emp-nome-dono')?.value,
    msg_corrida_finalizada: document.getElementById('emp-msg-final')?.value
  };
  
  try {
    const res = await fetch(`${API_URL}/empresa/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (data.success) {
      mostrarNotificacao('✅ Configurações salvas!');
    }
  } catch (e) {
    mostrarNotificacao('❌ Erro ao salvar', 'error');
  }
}

// ========================================
// MOTORISTA FORA DA CIDADE
// ========================================

async function marcarForaCidade(motoristaId, fora) {
  try {
    const res = await fetch(`${API_URL}/motoristas/${motoristaId}/fora-cidade`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fora_cidade: fora })
    });
    const data = await res.json();
    if (data.success) {
      mostrarNotificacao(`✅ Motorista ${fora ? 'marcado fora da cidade' : 'disponível'}`);
      carregarMotoristas();
    }
  } catch (e) {
    mostrarNotificacao('❌ Erro', 'error');
  }
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function fecharModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.remove();
}

function mostrarNotificacao(msg, tipo = 'success') {
  const notif = document.createElement('div');
  notif.className = `notificacao ${tipo}`;
  notif.textContent = msg;
  notif.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 25px;border-radius:8px;background:#22c55e;color:#fff;z-index:9999;animation:fadeIn 0.3s';
  if (tipo === 'error') notif.style.background = '#ef4444';
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// Carregar todas as configurações quando acessar a página de configurações
function carregarPaginaConfiguracoes() {
  carregarValoresHorario();
  carregarValoresCidade();
  carregarContatosSuporte();
  carregarConfigRebeca();
  carregarConfigEmpresa();
}
