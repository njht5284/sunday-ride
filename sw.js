// ライド出発判断チェッカー — Service Worker
const CACHE_NAME = 'ride-check-v3';
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

// フェッチ：外部API（Open-Meteo / JMA）はSWで横取りせずブラウザに素通し
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 外部API or 別オリジンはSW非介入（respondWithしない＝通常のネットワーク動作）
  if (url.origin !== self.location.origin) {
    return;
  }

  // ページ本体はネットワーク優先：常に最新版を表示し、
  // オフライン時のみキャッシュにフォールバック（更新時の「リロード2回」を解消）
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // その他の静的ファイルはキャッシュ優先（オフライン対応）
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
