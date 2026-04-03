const CACHE_NAME = 'penmako-v2';  // 版本号更新到v2
const ASSETS = [
  './',
  './index.html',
  './style.css',    // 新增
  './app.js',       // 新增
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// 安装：预缓存资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('缓存资源:', ASSETS);
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 拦截请求：优先缓存，网络兜底
self.addEventListener('fetch', event => {
  // 只缓存同源请求
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        // 返回缓存或从网络获取
        return cached || fetch(event.request).then(response => {
          // 只缓存成功的GET请求
          if (response.status === 200 && event.request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // 网络失败时，如果是HTML请求，返回首页
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});