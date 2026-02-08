const CACHE_NAME = 'pequizz-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/App.jsx', // Se estiver usando Vite, o bundle terá outro nome, mas o PWA cuida disso.
  '/source/prova_1_questoes_1_a_40.json',
  // Adicione os outros nomes de arquivos ou use uma estratégia de cache dinâmico abaixo
];

// Instalação e Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Estratégia: Tenta Rede, se falhar, vai pro Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});