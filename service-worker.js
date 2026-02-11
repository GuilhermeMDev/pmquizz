// --- MUDEI A VERSÃO AQUI PARA FORÇAR ATUALIZAÇÃO ---
const CACHE_NAME = 'quiz-offshore-v2.1';

const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/age_logo.png'
  // REMOVI OS JSONS DAQUI PROPOSITALMENTE
  // Vamos deixar os JSONs serem cacheados dinamicamente ou buscados na rede
  // para evitar que fiquem presos em versões antigas.
];

// Instalação
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto - Instalando v2.0');
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