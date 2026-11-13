// 離線快取：程式、字型與用過的筆順資料存在裝置裡，教室網路不穩時仍可練習。
// 更新筆順資料或字型後，請把 VERSION 改成新的值，舊快取才會清掉。
const VERSION = 'v1';
const CACHE = 'hanzi-free-practice-' + VERSION;
const scope = new URL(self.registration.scope).pathname;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('hanzi-free-practice-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));

const store = async (request, response) => {
  if (response && response.ok && response.type === 'basic') { const cache = await caches.open(CACHE); await cache.put(request, response.clone()); }
  return response;
};
// 先連網路，連不上才用快取：首頁與老師的共用設定檔要盡量拿到最新的。
async function networkFirst(request, key) {
  try { return await store(key, await fetch(request)); }
  catch (error) { const cached = await caches.match(key); if (cached) return cached; throw error; }
}
// 先用快取：筆順資料、字型、打包後的程式檔很少變動。
async function cacheFirst(request, key) {
  const cached = await caches.match(key);
  return cached || store(key, await fetch(request));
}

self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(scope)) return;
  // 快取時不看網址參數，派課連結（?book=…）離線也開得起來。
  const key = url.origin + url.pathname;
  if (request.mode === 'navigate') event.respondWith(networkFirst(request, url.origin + scope));
  else if (url.pathname.endsWith('/class-settings.json')) event.respondWith(networkFirst(request, key));
  else event.respondWith(cacheFirst(request, key));
});
