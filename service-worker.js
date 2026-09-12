// =====================================================
//  PMQuizz Service Worker — Estratégia Profissional
//  Nunca mais altere versão manualmente.
//
//  Estratégias por tipo de arquivo:
//  • HTML / CSS / JS   → Network-First  (sempre atualizado quando online)
//  • Imagens / Ícones  → Cache-First    (estáticos, raramente mudam)
//  • JSONs das provas  → Stale-While-Revalidate (rápido + se auto-atualiza)
// =====================================================

const CACHE_NAME = 'quiz-pm-v2.0';

// Arquivos para pré-cachear na instalação (offline garantido desde o primeiro acesso)
const PRE_CACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/age_logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/fig1_solda.svg',
  '/prova_1_questoes.json',
  '/prova_2_questoes.json',
  '/prova_3_questoes.json',
  '/prova_4_questoes.json',
  '/prova_5_questoes.json',
  '/prova_6_questoes.json',
  '/prova_7_questoes.json',
  '/prova_8_questoes.json',
  '/prova_9_questoes.json',
  '/prova_10_questoes.json',
  '/prova_11_questoes.json'
];

// --- INSTALAÇÃO: pré-cacheia tudo de uma vez ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Instalando PMQuizz v2.0 — pré-cacheando arquivos...');
        return cache.addAll(PRE_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Instalação concluída. App disponível offline.');
      })
  );
  // Ativa o novo SW imediatamente, sem esperar as abas fecharem
  self.skipWaiting();
});

// --- ATIVAÇÃO: remove caches de versões antigas e avisa clientes ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Removendo cache antigo:', name);
            return caches.delete(name);
          })
      ))
      .then(() => {
        // Avisa todas as abas abertas que há uma nova versão
        // Isso dispara o reload automático no app (ver script de registro em index.html)
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
  // Assume controle de todas as abas abertas imediatamente
  self.clients.claim();
});

// --- FETCH: estratégia por tipo de arquivo ---
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições de outras origens (analytics, CDNs externos, etc.)
  if (url.origin !== location.origin) return;

  const path = url.pathname;

  // 1. JSONs das provas → Stale-While-Revalidate
  //    Serve do cache na hora (rápido), e atualiza o cache em segundo plano.
  //    Na próxima abertura, já tem a versão mais nova.
  if (path.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 2. Imagens e ícones → Cache-First
  //    Raramente mudam. Serve do cache, só vai à rede se não tiver.
  if (/\.(png|jpg|jpeg|svg|webp|gif|ico)$/i.test(path)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 3. App shell (HTML, CSS, JS, manifest) → Network-First
  //    SEMPRE tenta buscar a versão mais recente da rede.
  //    Se estiver offline (a bordo), serve do cache.
  //    Resultado: app sempre atualizado quando tem internet, funciona offline.
  event.respondWith(networkFirst(request));
});

// =====================================================
//  FUNÇÕES DE ESTRATÉGIA
// =====================================================

// Network-First: tenta rede → fallback cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Se a resposta for válida, atualiza o cache
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Sem internet → serve do cache
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback final: retorna a página principal (evita tela em branco)
    return caches.match('/index.html');
  }
}

// Cache-First: serve cache → fallback rede
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Recurso não disponível offline.', { status: 503 });
  }
}

// Stale-While-Revalidate: serve cache imediatamente + atualiza em background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Dispara atualização em background (sem esperar)
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  // Retorna do cache se disponível (resposta imediata), senão aguarda a rede
  return cached || fetchPromise;
}
