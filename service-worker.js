const CACHE_NAME = 'quiz-offshore-v1.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
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
  '/prova_11_questoes.json',
  '/prova_12_questoes.json',
  '/prova_13_questoes.json',
  '/prova_14_questoes.json',
  '/age_logo.png'
];

// Instalação - cacheia os arquivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativação - limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - serve do cache quando offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna do cache se existir
        if (response) {
          return response;
        }
        // Senão, busca da rede
        return fetch(event.request).then(response => {
          // Não cacheia se não for sucesso
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          // Clona a resposta
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
  );
});