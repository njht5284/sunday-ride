// 北摂ライド天気チェッカー — Service Worker
const CACHE_NAME = 'hokusetsu-ride-v1';
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
];

// インストール：静的ファイルをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});

// アクティベート：古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// フェッチ：天気APIはネットワーク優先、静的ファイルはキャッシュ優先
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 外部API（Open-Meteo / JMA）は常にネットワーク
  if (url.hostname.includes('open-meteo.com') || url.hostname.includes('jma.go.jp')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'オフライン中です。ネットワークに接続してください。' }),
          { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // 静的ファイルはキャッシュ優先（オフライン対応）
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
