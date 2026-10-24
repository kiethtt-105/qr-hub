const V='qrhub-v9',SHELL=['./','index.html','assets/style.css','assets/app.js','assets/quicklinks.js','manifest.webmanifest','icon/icon.svg'];
// Mỗi file nạp riêng: thiếu một file không làm hỏng việc cài service worker
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return; // API/CDN: để trình duyệt tự xử lý
  if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/s/')||u.pathname.startsWith('/data/'))return; // không cache API, link rút gọn, dữ liệu
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request)));
});
