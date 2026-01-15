// ========================================
// SERVICE WORKER - NOTIFICAÇÕES EM SEGUNDO PLANO
// Permite receber corridas mesmo com app minimizado
// VERSÃO 2.0 - ULTRA PRECISO
// ========================================

const CACHE_NAME = 'motorista-v2';
const urlsToCache = [
  '/motorista/',
  '/motorista/index.html'
];

// ========================================
// INSTALAÇÃO
// ========================================
self.addEventListener('install', function(event) {
  console.log('🔧 Service Worker: Instalando v2...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// ========================================
// ATIVAÇÃO
// ========================================
self.addEventListener('activate', function(event) {
  console.log('⚡ Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function(cacheName) {
          console.log('🗑️ Removendo cache antigo:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

// ========================================
// FETCH - Network first, cache fallback
// ========================================
self.addEventListener('fetch', function(event) {
  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request);
      })
  );
});

// ========================================
// PUSH NOTIFICATIONS (servidor envia)
// ========================================
self.addEventListener('push', function(event) {
  console.log('📨 Push Notification recebida');
  
  let data = {
    titulo: '🚗 Nova Corrida!',
    corpo: 'Você tem uma nova solicitação',
    tag: 'corrida-' + Date.now()
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.corpo = event.data.text();
    }
  }
  
  const options = {
    body: data.corpo,
    icon: '/motorista/icon-192.png',
    badge: '/motorista/badge-72.png',
    tag: data.tag,
    data: data,
    vibrate: [300, 100, 300, 100, 300, 100, 300], // Vibração intensa
    requireInteraction: true, // NÃO desaparece sozinha
    renotify: true,
    silent: false,
    actions: [
      { action: 'ver', title: '👀 VER CORRIDA' },
      { action: 'ignorar', title: '❌ Ignorar' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.titulo, options)
  );
});

// ========================================
// CLIQUE NA NOTIFICAÇÃO
// ========================================
self.addEventListener('notificationclick', function(event) {
  console.log('🖱️ Notificação clicada:', event.action);
  
  event.notification.close();
  
  if (event.action === 'ignorar') {
    return;
  }
  
  // Ação de ficar offline (do alerta de segundo plano)
  if (event.action === 'offline') {
    // Enviar mensagem para o app ficar offline
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes('/motorista')) {
            client.postMessage({
              tipo: 'FICAR_OFFLINE'
            });
          }
        }
      });
    return;
  }
  
  // Abrir/focar o app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Se já tem janela aberta, focar
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes('/motorista') && 'focus' in client) {
            // Enviar mensagem para o app
            client.postMessage({
              tipo: 'NOTIFICACAO_CLICADA',
              acao: event.action,
              dados: event.notification.data
            });
            return client.focus();
          }
        }
        // Se não tem janela, abrir nova
        if (clients.openWindow) {
          return clients.openWindow('/motorista/');
        }
      })
  );
});

// ========================================
// RECEBER MENSAGENS DO APP PRINCIPAL
// Usado para mostrar notificações locais
// ========================================
self.addEventListener('message', function(event) {
  console.log('💬 Mensagem do app:', event.data);
  
  // ========================================
  // NOVA CORRIDA - Mostrar notificação
  // ========================================
  if (event.data.tipo === 'NOVA_CORRIDA') {
    var corrida = event.data.corrida || {};
    
    var titulo = '🚗 NOVA CORRIDA!';
    var corpo = '📍 ' + (corrida.origem || 'Origem pendente');
    if (corrida.valor) {
      corpo += '\n💰 R$ ' + parseFloat(corrida.valor).toFixed(2);
    }
    if (corrida.distancia) {
      corpo += '\n📏 ' + corrida.distancia;
    }
    
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/motorista/icon-192.png',
      badge: '/motorista/badge-72.png',
      tag: 'corrida-' + (corrida.id || Date.now()),
      data: corrida,
      vibrate: [300, 100, 300, 100, 300, 100, 300],
      requireInteraction: true,
      renotify: true,
      silent: false,
      actions: [
        { action: 'aceitar', title: '✅ ACEITAR' },
        { action: 'ver', title: '👀 Ver' }
      ]
    });
  }
  
  // ========================================
  // CORRIDA CANCELADA
  // ========================================
  if (event.data.tipo === 'CORRIDA_CANCELADA') {
    self.registration.showNotification('❌ Corrida Cancelada', {
      body: event.data.motivo || 'A corrida foi cancelada',
      icon: '/motorista/icon-192.png',
      tag: 'cancelada-' + Date.now(),
      vibrate: [200, 100, 200],
      requireInteraction: false
    });
  }
  
  // ========================================
  // MENSAGEM DO ADM
  // ========================================
  if (event.data.tipo === 'MENSAGEM_ADM') {
    self.registration.showNotification('📩 Mensagem do ADM', {
      body: event.data.mensagem || 'Nova mensagem',
      icon: '/motorista/icon-192.png',
      tag: 'mensagem-' + Date.now(),
      vibrate: [200, 100, 200],
      requireInteraction: true
    });
  }
  
  // ========================================
  // ALERTA: VOLTAR À ÁREA DE TRABALHO
  // Enviado a cada 2 min quando online + segundo plano
  // ========================================
  if (event.data.tipo === 'ALERTA_VOLTAR_TRABALHO') {
    self.registration.showNotification('📍 Volte à área de trabalho', {
      body: 'Você está ONLINE mas o app está minimizado. Volte para não perder corridas!',
      icon: '/motorista/icon-192.png',
      badge: '/motorista/badge-72.png',
      tag: 'alerta-trabalho',
      vibrate: [200, 100, 200],
      requireInteraction: false, // Pode desaparecer sozinha
      silent: false,
      actions: [
        { action: 'voltar', title: '📱 Voltar ao App' },
        { action: 'offline', title: '🔴 Ficar Offline' }
      ]
    });
  }
  
  // ========================================
  // ATUALIZAR SERVICE WORKER
  // ========================================
  if (event.data.tipo === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ========================================
// FECHAR NOTIFICAÇÃO
// ========================================
self.addEventListener('notificationclose', function(event) {
  console.log('🔕 Notificação fechada:', event.notification.tag);
});

// ========================================
// BACKGROUND SYNC
// ========================================
self.addEventListener('sync', function(event) {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'sync-localizacao') {
    event.waitUntil(sincronizarLocalizacao());
  }
  
  if (event.tag === 'sync-status') {
    event.waitUntil(sincronizarStatus());
  }
});

async function sincronizarLocalizacao() {
  console.log('📍 Sincronizando localização em background...');
  // Implementar se necessário
}

async function sincronizarStatus() {
  console.log('📊 Sincronizando status em background...');
  // Implementar se necessário
}

console.log('🚀 Service Worker v2 carregado - Notificações em segundo plano ativas');

