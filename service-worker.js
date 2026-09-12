// --- VERSÃO PM QUIZZ ---
const CACHE_NAME = 'quiz-pm-v2.0';

const urlsToCache = [
  '/',
  '/index.html',
  '/style.css?v=4.0',
  '/script.js?v=4.0',
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

// Instalação
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto - Instalando v1.0 PM');
        return cache.addAll(urlsToCache);
      })
  );
  // Força o SW a ativar imediatamente
  self.skipWaiting();
});

// Ativação - Limpa caches antigos (ESSA PARTE É CRUCIAL)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Estratégia Melhorada
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Se for um arquivo JSON (questões), TENTA REDE PRIMEIRO, depois cache
  // Isso garante que se você corrigir uma questão, o usuário baixa na hora.
  if (requestUrl.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
           // Se deu certo baixar, atualiza o cache e retorna
           const responseToCache = networkResponse.clone();
           caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
           return networkResponse;
        })
        .catch(() => {
           // Se deu erro (offline), tenta pegar do cache
           return caches.match(event.request);
        })
    );
  } 
  // Para outros arquivos (CSS, JS, Imagens), mantém Cache First para velocidade
  else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
    );
  }
});
