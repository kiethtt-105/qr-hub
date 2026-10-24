(() => {
'use strict';
const $ = i => document.getElementById(i), QA = s => [...document.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 8);
const noAccent = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (+n ? Number(n).toLocaleString('vi-VN') + ' đ' : 'Số tiền tự nhập');
const hhmm = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const IC = {
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v1M14 20h1M20 18v3h-3"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  mark: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>',
  log: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  set: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  dl: '<path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 11 7.6-4M8.2 13l7.6 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>'
};
const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const TABS = [
  ['qr', 'QR chuyển khoản', 'qr', 'Q', 'Chuyển khoản'], ['quick', 'QR nhanh', 'zap', 'N', 'QR nhanh'], ['link', 'Rút gọn link', 'link', 'L', 'Rút gọn'],
  ['acc', 'Tài khoản', 'user', 'T', 'Tài khoản'], ['mark', 'Dấu trang', 'mark', 'B', 'Dấu trang'], ['log', 'Nhật ký', 'log', 'K', 'Nhật ký'], ['set', 'Cài đặt', 'set', 'C', 'Cài đặt']
];

/* ---------- trạng thái ---------- */
let key = sessionStorage.getItem('ak') || '', ready = false, dirty = false, banks = [], eid = null;
const D = { accounts: [], qrs: [], set: { title: 'QR Hub', color: '#0f8a6a', mode: 'light' } };
try { Object.assign(D.set, JSON.parse(localStorage.getItem('qh_set') || '{}')); } catch {}
let logs = [], links = [], logFilter = 'all';

function toast(m, err) { const t = $('toast'); t.textContent = m; t.className = 'on' + (err ? ' err' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = ''), 2600); }
function setSync(m, ok) { const s = $('sync'); s.title = m; s.innerHTML = `<span class="dot ${ok === null ? '' : ok === false ? 'err' : 'ok'}"></span><span>${esc(m)}</span>`; }
const copyTxt = (t, m = 'Đã sao chép') => navigator.clipboard.writeText(t).then(() => toast(m)).catch(() => toast('Không sao chép được', true));
async function dl(u, name = 'qr.png') {
  try { const b = await (await fetch(u)).blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  catch { window.open(u, '_blank'); toast('Ảnh mở ở tab mới, hãy lưu từ đó'); }
}
async function copyImg(u) {
  try { const b = await (await fetch(u)).blob(); await navigator.clipboard.write([new ClipboardItem({ [b.type || 'image/png']: b })]); toast('Đã sao chép ảnh'); }
  catch { copyTxt(u, 'Đã sao chép link ảnh'); }
}
async function shareImg(u) {
  try { const b = await (await fetch(u)).blob(), f = new File([b], 'qr.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) return await navigator.share({ files: [f] }); } catch {}
  if (navigator.share) return navigator.share({ url: u, title: 'QR chuyển khoản' }).catch(() => {});
  copyTxt(u, 'Đã sao chép link ảnh');
}

/* ---------- API ---------- */
async function api(u, m = 'GET', b) {
  const r = await fetch(u, { method: m, headers: { 'content-type': 'application/json', 'x-admin-key': key }, body: b === undefined ? undefined : JSON.stringify(b) });
  const raw = await r.text(); let j = null; try { j = JSON.parse(raw); } catch {}
  if (!r.ok) {
    if (r.status === 401) lockUI('Sai hoặc thiếu ADMIN_KEY');
    throw Error((j && j.error) || (r.status === 404 ? 'Không tìm thấy API. Hãy chạy bằng "vercel dev", không dùng Live Server.' : 'Lỗi ' + r.status));
  }
  if (j === null) throw Error('Máy chủ trả về dữ liệu không phải JSON');
  return j;
}
async function push() {
  if (!ready) return;
  try { await api('/api/store', 'PUT', { accounts: D.accounts, qrs: D.qrs, set: D.set }); dirty = false; setSync('Đã lưu lúc ' + hhmm()); }
  catch (e) { setSync(e.message, false); toast(e.message, true); }
}
function save() { dirty = true; persistSet(); render(); clearTimeout(save.t); save.t = setTimeout(push, 800); setSync('Đang lưu…', null); }
function persistSet() { try { localStorage.setItem('qh_set', JSON.stringify(D.set)); } catch {} }
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- khoá ---------- */
function lockUI(msg) {
  ready = false; $('lock').hidden = false; $('views').hidden = true; $('nav').style.visibility = 'hidden';
  $('lockMsg').textContent = msg || 'Dữ liệu được mã hoá. Cần ADMIN_KEY để mở.'; setSync('Đang khoá', false);
  if (!lockUI.f) { lockUI.f = 1; $('pIn').focus(); }
}
function normalize(s) { // ràng buộc dữ liệu: kiểu, trùng id, khoá ngoại
  s = s && typeof s === 'object' ? s : {}; let fixed = 0; const ids = new Set(), qids = new Set();
  const accounts = (Array.isArray(s.accounts) ? s.accounts : []).filter(a => { const ok = a && /^\d{6}$/.test(String(a.bin)) && /^[0-9A-Za-z]{4,30}$/.test(String(a.stk)); if (!ok) fixed++; return ok; })
    .map(a => { let id = String(a.id || ''); if (!id || ids.has(id)) { id = uid(); fixed++; } ids.add(id); return { id, name: String(a.name || ''), stk: String(a.stk), bin: String(a.bin), template: ['compact2', 'compact', 'qr_only', 'print'].includes(a.template) ? a.template : 'compact2', alias: String(a.alias || '') }; });
  const qrs = (Array.isArray(s.qrs) ? s.qrs : []).filter(q => { const ok = q && q.label && ids.has(String(q.accId)); if (!ok) fixed++; return ok; })
    .map(q => { let id = String(q.id || ''); if (!id || qids.has(id)) { id = uid(); fixed++; } qids.add(id); return { id, label: String(q.label), accId: String(q.accId), amount: String(q.amount || '').replace(/\D/g, ''), note: String(q.note || '') }; });
  return { accounts, qrs, set: s.set && typeof s.set === 'object' ? s.set : {}, fixed };
}
async function unlock(k) {
  key = k; $('pOk').disabled = true; $('lockMsg').textContent = 'Đang tải dữ liệu…'; setSync('Đang tải…', null);
  try {
    const c = normalize(await api('/api/store'));
    D.accounts = c.accounts; D.qrs = c.qrs; Object.assign(D.set, c.set);
    if (D.set.color === '#6366f1') D.set.color = '#0f8a6a';
    sessionStorage.setItem('ak', k); persistSet(); theme(); render(); // dữ liệu xong mới hiển thị giao diện
    ready = true; $('lock').hidden = true; $('views').hidden = false; $('nav').style.visibility = '';
    $('pIn').value = ''; setSync('Đã kết nối', true);
    show(location.hash.slice(1) || 'qr');
    if (c.fixed) { toast('Đã sửa ' + c.fixed + ' mục dữ liệu không hợp lệ'); save(); }
  } catch (e) { key = ''; sessionStorage.removeItem('ak'); lockUI(e.message); }
  $('pOk').disabled = false;
}
$('pOk').onclick = () => $('pIn').value && unlock($('pIn').value);
$('pIn').onkeydown = e => { if (e.key === 'Enter') $('pOk').click(); };

/* ---------- giao diện ---------- */
const COLORS = ['#0f8a6a', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#d97706', '#475569'];
function theme() {
  document.documentElement.style.setProperty('--ac', D.set.color);
  document.body.classList.toggle('dark', D.set.mode === 'dark');
  $('ttl').textContent = $('ftt').textContent = D.set.title; document.title = D.set.title;
  if (document.activeElement !== $('sTitle')) $('sTitle').value = D.set.title;
  QA('#seg button').forEach(b => b.classList.toggle('on', b.dataset.m === D.set.mode));
  QA('#sw button[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === D.set.color));
}
$('nav').innerHTML = TABS.map(([id, name, i, k, short]) => `<button type="button" data-t="${id}" title="${name} (Alt+${k})" aria-keyshortcuts="Alt+${k}">${ic(i)}<span>${short}</span><em>Alt+${k}</em></button>`).join('');
$('nav').onclick = e => {
  const b = e.target.closest('button'); if (!b || !ready) return;
  if (b.dataset.t === 'mark') return window.QuickLinks && window.QuickLinks.open();
  show(b.dataset.t);
};
function show(t) {
  if (!document.getElementById('t-' + t)) t = 'qr';
  QA('.tab').forEach(x => x.classList.toggle('on', x.id === 't-' + t));
  QA('#nav button').forEach(x => x.classList.toggle('on', x.dataset.t === t));
  history.replaceState(null, '', '#' + t);
  if (t === 'link') loadLinks(); if (t === 'log') loadLogs();
}

const head = (h, p) => `<header><h1>${h}</h1><p>${p}</p></header>`;
$('views').innerHTML = `
<section class="tab" id="t-qr">${head('QR chuyển khoản', 'Chọn tài khoản, nhập số tiền và nội dung để tạo mã VietQR.')}
 <div class="grid"><div class="card">
  <h4>${ic('qr')}Thông tin thanh toán</h4>
  <div class="f"><label for="bAcc">Tài khoản nhận</label><select id="bAcc"></select></div>
  <div class="f"><label for="bAmt">Số tiền <small>(Alt+A để nhập nhanh, để trống nếu người chuyển tự nhập)</small></label><div class="amt"><input id="bAmt" type="number" min="0" inputmode="numeric" placeholder="0"><span>đ</span></div><div class="chips" id="chips"></div></div>
  <div class="f"><label for="bNote">Nội dung <small>(tự bỏ dấu, tối đa 50 ký tự)</small></label><input id="bNote" maxlength="50"></div>
  <div class="sep"></div>
  <div class="inline"><input id="bLabel" placeholder="Tên mẫu, ví dụ: Học phí tháng" aria-label="Tên mẫu"><button class="btn" id="bSave" type="button">${ic('plus')}Lưu mẫu</button></div>
  <div class="sep"></div><h4>Mẫu đã lưu</h4><div id="qrList"></div>
 </div>
 <div class="card prev"><div class="qrbox"><img id="bImg" alt="Mã QR chuyển khoản" hidden><div class="empty" id="bEmpty"><p>Chưa có tài khoản</p><button class="btn p" id="bGo" type="button">Thêm tài khoản</button></div></div>
  <div class="info" id="bInfo"></div>
  <div class="inline wrap c"><button class="btn p" id="bDl" type="button">${ic('dl')}Tải ảnh</button><button class="btn" id="bCp" type="button">${ic('copy')}Sao chép</button><button class="btn" id="bSh" type="button">${ic('share')}Chia sẻ</button></div>
 </div></div></section>

<section class="tab" id="t-quick">${head('QR nhanh', 'Tạo mã QR từ link, văn bản, WiFi hoặc bất kỳ nội dung nào.')}
 <div class="grid"><div class="card"><h4>${ic('zap')}Nội dung</h4>
  <div class="f"><label for="qIn">Dán nội dung vào đây</label><textarea id="qIn" rows="6" placeholder="https://… hoặc WIFI:T:WPA;S:tenwifi;P:matkhau;;"></textarea></div>
  <div class="inline"><button class="btn p" id="qDl" type="button">${ic('dl')}Tải ảnh</button><button class="btn" id="qClr" type="button">Xoá</button></div></div>
  <div class="card prev"><div class="qrbox" id="qOut"><div class="empty">QR sẽ hiện ở đây</div></div></div></div></section>

<section class="tab" id="t-link">${head('Rút gọn link', 'Link rút gọn có đếm lượt click và ghi nhật ký truy cập.')}
 <div class="card"><h4>${ic('link')}Tạo link mới</h4>
  <div class="row3"><div class="f"><label for="lUrl">Link gốc</label><input id="lUrl" type="url" placeholder="https://…"></div>
   <div class="f"><label for="lCode">Mã tuỳ chọn <small>(bỏ trống để tự tạo)</small></label><input id="lCode" maxlength="32"></div>
   <button class="btn p" id="lAdd" type="button">Rút gọn</button></div>
  <div class="cn" id="lOut" hidden></div></div>
 <div class="card"><h4>${ic('log')}Link đã tạo</h4><div id="lList"><p class="none">Đang tải…</p></div></div></section>

<section class="tab" id="t-acc">${head('Tài khoản ngân hàng', 'Số tài khoản và tên chủ tài khoản được mã hoá trước khi lưu.')}
 <div class="card"><h4>${ic('user')}<span id="aTitle">Thêm tài khoản</span></h4>
  <div class="row2"><div class="f"><label for="aAlias">Tên gợi nhớ</label><input id="aAlias" maxlength="40" placeholder="Vietcombank cá nhân"></div>
   <div class="f"><label for="aBin">Ngân hàng</label><select id="aBin"></select></div></div>
  <div class="row2"><div class="f"><label for="aStk">Số tài khoản</label><input id="aStk" inputmode="numeric" autocomplete="off"></div>
   <div class="f"><label for="aName">Tên chủ tài khoản</label><input id="aName" autocomplete="off" placeholder="NGUYEN VAN A"></div></div>
  <div class="f"><label for="aTpl">Kiểu mã QR</label><select id="aTpl"><option value="compact2">Gọn có thông tin (compact2)</option><option value="compact">Gọn (compact)</option><option value="qr_only">Chỉ mã QR</option><option value="print">In đầy đủ (print)</option></select></div>
  <div class="inline"><button class="btn p" id="aAdd" type="button">Thêm tài khoản</button><button class="btn" id="aCancel" type="button" hidden>Huỷ sửa</button></div></div>
 <div class="card"><h4>Danh sách</h4><div id="accList"></div></div></section>

<section class="tab" id="t-log">${head('Nhật ký', 'Lượt click link rút gọn và thao tác tạo link. IP chỉ lưu dạng băm.')}
 <div class="card"><div class="cn" id="lgStat">Đang tải…</div>
  <div class="inline wrap" style="align-items:center;justify-content:space-between"><div class="seg" id="lgSeg"><button data-f="all" class="on" type="button">Tất cả</button><button data-f="click" type="button">Click</button><button data-f="create" type="button">Tạo link</button></div>
   <div class="inline"><button class="btn" id="lgCsv" type="button">${ic('dl')}Tải CSV</button><button class="btn x" id="lgClr" type="button">${ic('trash')}Xoá nhật ký</button></div></div>
  <div class="sep"></div><div id="lgList"></div></div></section>

<section class="tab" id="t-set">${head('Cài đặt', 'Giao diện, sao lưu và khoá.')}
 <div class="card"><h4>${ic('set')}Giao diện</h4>
  <div class="f"><label for="sTitle">Tên ứng dụng</label><input id="sTitle" maxlength="40"></div>
  <div class="row2"><div class="f"><label>Chế độ</label><div class="seg" id="seg"><button data-m="dark" type="button">Tối</button><button data-m="light" type="button">Sáng</button></div></div>
   <div class="f"><label>Màu nhấn</label><div class="sw" id="sw"></div></div></div></div>
 <div class="card"><h4>${ic('dl')}Sao lưu</h4>
  <p class="none">File sao lưu chứa số tài khoản ở dạng chữ thường. Hãy cất ở nơi an toàn, đừng commit lên Git.</p>
  <div class="inline wrap"><button class="btn" id="sExp" type="button">Xuất JSON</button><label class="btn" style="margin:0">Nhập JSON<input id="sImp" type="file" accept=".json,application/json" hidden></label>
   <button class="btn x" id="sLock" type="button">Khoá lại</button></div></div>
 <div class="card"><h4>${ic('log')}Chẩn đoán dữ liệu</h4><p class="none" style="margin-bottom:12px">Kiểm tra biến môi trường và khả năng đọc các file JSON trên GitHub.</p>
  <button class="btn p" id="hRun" type="button">Kiểm tra</button><div id="hOut" style="margin-top:12px"></div></div></section>`;

$('sw').innerHTML = COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" title="${c}" aria-label="Màu ${c}"></button>`).join('') + '<input type="color" id="swc" title="Màu tuỳ chọn" aria-label="Màu tuỳ chọn">';
$('sw').onclick = e => { const c = e.target.dataset.c; if (c) { D.set.color = c; theme(); save(); } };
$('swc').oninput = e => { D.set.color = e.target.value; theme(); };
$('swc').onchange = () => save();
$('seg').onclick = e => { const b = e.target.closest('button'); if (b) { D.set.mode = b.dataset.m; theme(); save(); } };
$('sTitle').onchange = e => { D.set.title = e.target.value.trim() || 'QR Hub'; theme(); save(); };
$('hRun').onclick = async () => {
  const o = $('hOut'); o.innerHTML = '<p class="none">Đang kiểm tra…</p>';
  try {
    const h = await api('/api/health'), row = (n, sub, ok, y, no) => `<div class="item"><div class="t"><b>${esc(n)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div><span class="${ok ? 'okc' : 'x'}">${ok ? y : no}</span></div>`;
    o.innerHTML = Object.entries(h.env).map(([k, v]) => row(k, '', v, 'Có', 'THIẾU')).join('') + h.files.map(f => row(f.path, f.ok ? f.info : f.error, f.ok, 'Đọc được', 'Lỗi')).join('');
  } catch (e) { o.innerHTML = `<p class="none x">${esc(e.message)}</p>`; }
};
$('sLock').onclick = async () => { if (dirty) await push(); key = ''; sessionStorage.removeItem('ak'); lockUI('Đã khoá.'); };
$('sExp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ accounts: D.accounts, qrs: D.qrs }, null, 1)], { type: 'application/json' })); a.download = 'qr-hub-backup.json'; a.click(); };
$('sImp').onchange = e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  f.text().then(t => { try { const x = JSON.parse(t); if (!confirm('Thay toàn bộ tài khoản và mẫu QR hiện tại bằng file này?')) return; D.accounts = x.accounts || []; D.qrs = x.qrs || []; save(); toast('Đã nhập dữ liệu'); } catch { toast('File không hợp lệ', true); } });
};

/* ---------- ngân hàng ---------- */
async function getBanks() {
  try { const c = JSON.parse(localStorage.getItem('vietqr_banks') || 'null'); if (c && Date.now() - c.t < 6048e5) return c.d; } catch {}
  const j = await (await fetch('https://api.vietqr.io/v2/banks')).json();
  try { localStorage.setItem('vietqr_banks', JSON.stringify({ t: Date.now(), d: j.data })); } catch {}
  return j.data;
}
const bankName = bin => (banks.find(b => b.bin === bin) || {}).shortName || bin;
function fillBanks() { $('aBin').innerHTML = banks.map(b => `<option value="${esc(b.bin)}">${esc(b.shortName)} - ${esc(b.name)}</option>`).join('') || '<option value="">Không tải được danh sách, kiểm tra mạng</option>'; }
const FALLBACK = [['970436', 'Vietcombank'], ['970415', 'VietinBank'], ['970418', 'BIDV'], ['970405', 'Agribank'], ['970407', 'Techcombank'], ['970422', 'MB'], ['970416', 'ACB'], ['970432', 'VPBank'], ['970423', 'TPBank'], ['970403', 'Sacombank'], ['970437', 'HDBank'], ['970441', 'VIB'], ['970443', 'SHB'], ['970448', 'OCB'], ['970426', 'MSB'], ['970440', 'SeABank'], ['970431', 'Eximbank'], ['970449', 'LPBank'], ['970428', 'Nam A Bank'], ['970409', 'Bac A Bank']].map(([bin, n]) => ({ bin, shortName: n, name: n + ' (danh sách dự phòng)' }));
getBanks().then(b => { banks = b && b.length ? b : FALLBACK; fillBanks(); render(); }).catch(() => { banks = FALLBACK; fillBanks(); render(); });

/* ---------- QR chuyển khoản ---------- */
const accOf = id => D.accounts.find(a => a.id === id);
function qrUrl(a, amt, note) {
  const q = new URLSearchParams({ accountName: a.name, addInfo: noAccent(note || '').slice(0, 50) });
  const n = Math.floor(+amt); if (n > 0) q.set('amount', n);
  return `https://img.vietqr.io/image/${a.bin}-${a.stk}-${a.template || 'compact2'}.png?${q}`;
}
function drawBank() {
  const a = accOf($('bAcc').value), has = !!a;
  $('bImg').hidden = !has; $('bEmpty').hidden = has;
  if (!has) { $('bInfo').innerHTML = ''; return; }
  $('bImg').src = qrUrl(a, $('bAmt').value, $('bNote').value);
  $('bInfo').innerHTML = `<b>${esc(fmt($('bAmt').value))}</b>${esc(a.name)} · ${esc(bankName(a.bin))} · ${esc(a.stk)}${$('bNote').value ? '<br>“' + esc(noAccent($('bNote').value)) + '”' : ''}`;
}
['bAcc', 'bAmt', 'bNote'].forEach(i => $(i).addEventListener('input', drawBank));
$('chips').innerHTML = [20000, 50000, 100000, 200000, 500000, 1000000].map(n => `<button type="button" data-v="${n}">${n >= 1e6 ? n / 1e6 + ' triệu' : n / 1000 + 'k'}</button>`).join('');
$('chips').onclick = e => { if (e.target.dataset.v) { $('bAmt').value = e.target.dataset.v; drawBank(); } };
$('bGo').onclick = () => show('acc');
$('bDl').onclick = () => $('bImg').src && !$('bImg').hidden && dl($('bImg').src, 'qr-chuyen-khoan.png');
$('bCp').onclick = () => $('bImg').src && !$('bImg').hidden && copyImg($('bImg').src);
$('bSh').onclick = () => $('bImg').src && !$('bImg').hidden && shareImg($('bImg').src);
$('bSave').onclick = () => {
  if (!$('bAcc').value) return toast('Chưa có tài khoản', true);
  D.qrs.push({ id: uid(), label: $('bLabel').value.trim() || 'Mẫu ' + (D.qrs.length + 1), accId: $('bAcc').value, amount: $('bAmt').value, note: $('bNote').value });
  $('bLabel').value = ''; save(); toast('Đã lưu mẫu');
};

/* ---------- QR nhanh ---------- */
let qrLib;
const loadQR = () => qrLib || (qrLib = new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; s.onload = ok; s.onerror = () => no(Error('Không tải được thư viện QR')); document.head.appendChild(s); }));
async function mkQ() {
  const o = $('qOut'), v = $('qIn').value.trim(); o.innerHTML = '';
  if (!v) { o.innerHTML = '<div class="empty">QR sẽ hiện ở đây</div>'; return; }
  try { await loadQR(); new QRCode(o, { text: v, width: 260, height: 260, correctLevel: QRCode.CorrectLevel.M }); } catch (e) { o.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
$('qIn').oninput = () => { clearTimeout(mkQ.t); mkQ.t = setTimeout(mkQ, 250); };
$('qClr').onclick = () => { $('qIn').value = ''; mkQ(); };
$('qDl').onclick = () => { const c = $('qOut').querySelector('canvas'); c ? dl(c.toDataURL(), 'qr-nhanh.png') : toast('Chưa có mã QR', true); };

/* ---------- rút gọn link ---------- */
const qrOfText = t => 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=12&data=' + encodeURIComponent(t);
const shortOf = c => `${location.origin}/s/${c}`;
$('lAdd').onclick = async () => {
  let u = $('lUrl').value.trim(); if (!u) return toast('Nhập link gốc', true);
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  const b = $('lAdd'); b.disabled = true;
  try {
    const r = await api('/api/shorten', 'POST', { url: u, code: $('lCode').value.trim() || undefined });
    const o = $('lOut'); o.hidden = false; o.className = 'cn ok'; o.innerHTML = `<a href="${esc(r.short)}" target="_blank" rel="noopener" style="color:inherit">${esc(r.short)}</a>`;
    copyTxt(r.short, 'Đã tạo và sao chép link'); $('lUrl').value = $('lCode').value = ''; loadLinks();
  } catch (e) { const o = $('lOut'); o.hidden = false; o.className = 'cn bad'; o.textContent = e.message; }
  b.disabled = false;
};
async function loadLinks() {
  if (!ready) return;
  const n = loadLinks.n = (loadLinks.n || 0) + 1; $('lList').innerHTML = '<p class="none">Đang tải…</p>';
  try { const r = await api('/api/links'); if (n !== loadLinks.n) return; links = Array.isArray(r) ? r : []; }
  catch (e) { if (n === loadLinks.n) $('lList').innerHTML = `<p class="none x">${esc(e.message)}</p><button class="btn" data-a="retryLinks" style="margin-top:8px">Thử lại</button>`; return; }
  $('lList').innerHTML = links.map(l => `<div class="item"><div class="t"><b>${esc(shortOf(l.code))}</b><small>${esc(l.url)} · ${l.clicks || 0} click · ${esc(String(l.created || '').slice(0, 10))}</small></div>
   <div class="acts"><button class="btn" data-a="cpLink" data-id="${esc(l.code)}" aria-label="Sao chép link">${ic('copy')}</button><button class="btn" data-a="qrLink" data-id="${esc(l.code)}" aria-label="Tải mã QR">${ic('qr')}</button><button class="btn x" data-a="delLink" data-id="${esc(l.code)}" aria-label="Xoá link">${ic('trash')}</button></div></div>`).join('') || '<p class="none">Chưa có link nào.</p>';
}

/* ---------- tài khoản ---------- */
function resetAcc() { eid = null; ['aAlias', 'aStk', 'aName'].forEach(i => ($(i).value = '')); $('aAdd').textContent = 'Thêm tài khoản'; $('aTitle').textContent = 'Thêm tài khoản'; $('aCancel').hidden = true; }
$('aCancel').onclick = resetAcc;
$('aAdd').onclick = () => {
  const name = noAccent($('aName').value.trim()).toUpperCase(), stk = $('aStk').value.replace(/\s/g, '');
  if (!name || !stk) return toast('Nhập tên chủ tài khoản và số tài khoản', true);
  if (!/^[0-9A-Za-z]{4,30}$/.test(stk)) return toast('Số tài khoản không hợp lệ', true);
  if (!$('aBin').value) return toast('Chưa chọn ngân hàng', true);
  const o = { id: eid || uid(), name, stk, bin: $('aBin').value, template: $('aTpl').value, alias: $('aAlias').value.trim().slice(0, 40) };
  if (eid) D.accounts = D.accounts.map(a => (a.id === eid ? o : a)); else D.accounts.push(o);
  resetAcc(); save(); toast('Đã lưu tài khoản');
};

/* ---------- nhật ký ---------- */
async function loadLogs() {
  if (!ready) return;
  const n = loadLogs.n = (loadLogs.n || 0) + 1; $('lgStat').className = 'cn'; $('lgStat').textContent = 'Đang tải…'; $('lgList').innerHTML = '';
  try { const r = await api('/api/logs'); if (n !== loadLogs.n) return; logs = Array.isArray(r) ? r : []; }
  catch (e) { if (n === loadLogs.n) { $('lgStat').className = 'cn bad'; $('lgStat').textContent = e.message; $('lgList').innerHTML = '<button class="btn" data-a="retryLogs">Thử lại</button>'; } return; }
  drawLogs();
}
function drawLogs() {
  const list = logs.filter(l => logFilter === 'all' || l.type === logFilter);
  $('lgStat').className = 'cn';
  $('lgStat').textContent = `${logs.filter(l => l.type === 'click').length} lượt click · ${logs.filter(l => l.type === 'create').length} link đã tạo · hiển thị tối đa 500 mục gần nhất`;
  $('lgList').innerHTML = list.map(l => `<div class="item"><div class="t"><b>${l.type === 'click' ? 'Click' : 'Tạo link'} · ${esc(l.code)}</b><small>${esc((isNaN(new Date(l.t)) ? String(l.t || '') : new Date(l.t).toLocaleString('vi-VN')))} · ${esc(l.ip || 'ẩn danh')}${l.ref ? ' · từ ' + esc(l.ref) : ''}</small><small>${esc(l.url)}</small></div></div>`).join('') || '<p class="none">Chưa có dữ liệu.</p>';
}
$('lgSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; logFilter = b.dataset.f; QA('#lgSeg button').forEach(x => x.classList.toggle('on', x === b)); drawLogs(); };
$('lgCsv').onclick = () => {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = 'time,type,code,url,ip,ref\n' + logs.map(l => [l.t, l.type, l.code, l.url, l.ip, l.ref].map(q).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = 'nhat-ky.csv'; a.click();
};
$('lgClr').onclick = async () => { if (!confirm('Xoá toàn bộ nhật ký? Không thể khôi phục.')) return; try { await api('/api/logs', 'DELETE'); logs = []; drawLogs(); toast('Đã xoá nhật ký'); } catch (e) { toast(e.message, true); } };

/* ---------- hiển thị chung ---------- */
function render() {
  const cur = $('bAcc').value;
  $('bAcc').innerHTML = D.accounts.map(a => `<option value="${esc(a.id)}">${a.alias ? esc(a.alias) + ' — ' : ''}${esc(a.name)} · ${esc(bankName(a.bin))} ${esc(a.stk)}</option>`).join('') || '<option value="">Chưa có tài khoản</option>';
  if (accOf(cur)) $('bAcc').value = cur;
  $('qrList').innerHTML = D.qrs.map(q => { const a = accOf(q.accId); return `<div class="item"><div class="t"><b>${esc(q.label)}</b><small>${a ? esc(fmt(q.amount)) + ' · ' + esc(a.name) : 'Tài khoản đã bị xoá'}${q.note ? ' · ' + esc(q.note) : ''}</small></div>
   <div class="acts"><button class="btn" data-a="useQR" data-id="${esc(q.id)}">Dùng</button><button class="btn x" data-a="delQR" data-id="${esc(q.id)}" aria-label="Xoá mẫu">${ic('trash')}</button></div></div>`; }).join('') || '<p class="none">Chưa có mẫu nào.</p>';
  $('accList').innerHTML = D.accounts.map(a => `<div class="item"><div class="t"><b>${esc(a.alias || a.name)}</b><small>${esc(a.name)} · ${esc(bankName(a.bin))} · ${esc(a.stk)}</small></div>
   <div class="acts"><button class="btn" data-a="editAcc" data-id="${esc(a.id)}" aria-label="Sửa">${ic('edit')}</button><button class="btn x" data-a="delAcc" data-id="${esc(a.id)}" aria-label="Xoá">${ic('trash')}</button></div></div>`).join('') || '<p class="none">Chưa có tài khoản nào.</p>';
  drawBank();
}

const ACT = {
  useQR(id) { const q = D.qrs.find(x => x.id === id); if (!q || !accOf(q.accId)) return toast('Tài khoản của mẫu này đã bị xoá', true); $('bAcc').value = q.accId; $('bAmt').value = q.amount; $('bNote').value = q.note; drawBank(); scrollTo({ top: 0, behavior: 'smooth' }); },
  delQR(id) { D.qrs = D.qrs.filter(x => x.id !== id); save(); },
  editAcc(id) { const a = accOf(id); if (!a) return; eid = id; $('aAlias').value = a.alias || ''; $('aStk').value = a.stk; $('aName').value = a.name; $('aBin').value = a.bin; $('aTpl').value = a.template || 'compact2'; $('aAdd').textContent = 'Lưu thay đổi'; $('aTitle').textContent = 'Sửa tài khoản'; $('aCancel').hidden = false; $('aAlias').focus(); },
  delAcc(id) { const n = D.qrs.filter(q => q.accId === id).length; if (!confirm('Xoá tài khoản này' + (n ? ` và ${n} mẫu QR liên quan` : '') + '?')) return; D.accounts = D.accounts.filter(a => a.id !== id); D.qrs = D.qrs.filter(q => q.accId !== id); if (eid === id) resetAcc(); save(); },
  retryLinks() { loadLinks(); },
  retryLogs() { loadLogs(); },
  cpLink(c) { copyTxt(shortOf(c)); },
  qrLink(c) { dl(qrOfText(shortOf(c)), `qr-${c}.png`); },
  async delLink(c) { if (!confirm(`Xoá link ${c}?`)) return; try { await api('/api/links?code=' + encodeURIComponent(c), 'DELETE'); loadLinks(); toast('Đã xoá link'); } catch (e) { toast(e.message, true); } }
};
document.body.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && ACT[b.dataset.a]) ACT[b.dataset.a](b.dataset.id); });
$('sync').onclick = () => ready && show('set');

/* ---------- phím tắt: Alt + chữ cái ---------- */
const KEYS = { KeyQ: 'qr', KeyN: 'quick', KeyL: 'link', KeyT: 'acc', KeyK: 'log', KeyC: 'set' };
document.addEventListener('keydown', e => {
  if (!e.altKey || e.ctrlKey || e.metaKey || !ready) return;
  if (e.code === 'KeyB') { e.preventDefault(); return window.QuickLinks && window.QuickLinks.open(); }
  if (e.code === 'KeyA') { e.preventDefault(); show('qr'); $('bAmt').focus(); $('bAmt').select(); return; }
  if (KEYS[e.code]) { e.preventDefault(); show(KEYS[e.code]); }
});

/* ---------- khởi động ---------- */
theme(); setSync('Đang khoá', false);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (key) unlock(key); else lockUI();
})();
