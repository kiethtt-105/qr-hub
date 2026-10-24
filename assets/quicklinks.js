/* QR Hub - Dấu trang nhanh (Quick Links)
 * Tự chứa: không cần sửa app.js. Chỉ cần <script src="assets/quicklinks.js" defer></script>
 * Lưu: localStorage (khoá 'qh_quicklinks'). Sao lưu bằng nút Xuất / Nhập JSON.
 * Hạt giống: window.CONFIG.quickLinks = [{name, url, group}] (dùng khi chưa có dữ liệu).
 */
(() => {
  'use strict';
  const KEY = 'qh_quicklinks';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);

  /* ---------- Dữ liệu ---------- */
  let items = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const seed = (window.CONFIG && window.CONFIG.quickLinks) || [];
    return seed.map((s, i) => ({ id: uid(), name: s.name, url: s.url, group: s.group || 'Chung', color: s.color || '', pin: !!s.pin, opens: 0, order: i }));
  }
  const TS = 'qh_quicklinks_ts';
  const RO = location.hostname.endsWith('github.io'); // GitHub Pages: không có API
  const ak = () => sessionStorage.getItem('ak') || '';
  const ts = () => +localStorage.getItem(TS) || 0;
  let pushT;
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      localStorage.setItem(TS, String(Date.now()));
    } catch (e) { toast('Không lưu được: ' + e.message, true); }
    clearTimeout(pushT);
    if (ak() && !RO) pushT = setTimeout(() => push(true), 800); // tự đẩy lên data/quicklinks.json
  }
  async function api(method, body) {
    const r = await fetch('/api/quicklinks', { method, headers: { 'content-type': 'application/json', 'x-admin-key': ak() }, body: body && JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { if (r.status === 401) sessionStorage.removeItem('ak'); throw Error(j.error || 'Lỗi ' + r.status); }
    return j;
  }
  async function pull(silent) {
    try {
      const s = await api('GET');
      if (Array.isArray(s.items) && (s.updated > ts() || (!items.length && s.items.length))) {
        items = s.items;
        localStorage.setItem(KEY, JSON.stringify(items));
        localStorage.setItem(TS, String(s.updated || Date.now()));
        render();
        if (!silent) toast('Đã tải từ server');
        return 'pulled';
      }
      return 'same';
    } catch (e) { if (!silent) toast(e.message, true); return 'err'; }
  }
  async function push(silent) {
    try {
      const r = await api('PUT', { items });
      localStorage.setItem(TS, String(r.updated));
      if (!silent) toast('Đã lưu lên server');
    } catch (e) { if (!silent) toast(e.message, true); }
  }
  const normUrl = u => {
    u = u.trim();
    if (!u) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
    try {
      const p = new URL(u);
      if (!['http:', 'https:', 'tel:', 'mailto:', 'zalo:'].includes(p.protocol)) return '';
      return p.href;
    } catch { return ''; }
  };
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const icon = u => { try { return 'https://www.google.com/s2/favicons?sz=64&domain=' + new URL(u).hostname; } catch { return ''; } };

  /* ---------- Giao diện ---------- */
  const css = `
#qlBtn{position:fixed;right:24px;bottom:88px;width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;z-index:6;display:grid;place-items:center;
  background:var(--ac,var(--acc,#6366f1));color:#fff;box-shadow:0 8px 24px #0004}
#qlBtn svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
@media(max-width:860px){#qlBtn{right:14px;bottom:148px}}
#qlWrap{position:fixed;inset:0;z-index:30;display:none}
#qlWrap.on{display:block}
#qlWrap .scrim{position:absolute;inset:0;background:#0007}
#qlPanel{position:absolute;top:0;right:0;bottom:0;width:min(520px,100vw);display:flex;flex-direction:column;
  background:var(--sf,var(--card,#fff));color:var(--tx,var(--ink,#14202b));border-left:1px solid var(--bd,var(--line,#d5dce2));
  box-shadow:-12px 0 40px #0005;animation:qlIn .2s ease-out}
@keyframes qlIn{from{transform:translateX(24px);opacity:0}}
@media(prefers-reduced-motion:reduce){#qlPanel{animation:none}}
#qlPanel *{box-sizing:border-box}
#qlPanel header{margin:0}
#qlPanel header{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--bd,var(--line,#d5dce2))}
#qlPanel header h2{margin:0;font-size:18px;font-weight:700;flex:1}
#qlPanel button{font:inherit;cursor:pointer}
.qlx{border:1px solid var(--bd,var(--line,#d5dce2));background:transparent;color:inherit;border-radius:10px;padding:6px 11px;font-size:13px}
.qlx:hover{border-color:var(--ac,var(--acc,#6366f1))}
.qlx.p{background:var(--ac,var(--acc,#6366f1));border-color:var(--ac,var(--acc,#6366f1));color:#fff;font-weight:600}
.qlx.d{color:#ef4444}
#qlTools{display:flex;gap:8px;padding:12px 18px;flex-wrap:wrap}
#qlTools input{flex:1;min-width:140px}
#qlPanel input,#qlPanel select{font:inherit;color:inherit;background:var(--bg,#f3f5f7);border:1px solid var(--bd,var(--line,#d5dce2));border-radius:10px;padding:9px 12px;width:100%;outline:0}
#qlPanel input:focus-visible,#qlPanel select:focus-visible,#qlPanel button:focus-visible,.qlt:focus-visible{outline:2px solid var(--ac,var(--acc,#6366f1));outline-offset:2px}
#qlBody{flex:1;overflow:auto;padding:4px 18px 24px}
.qlg{margin-top:18px}
.qlgh{display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--mut,var(--mute,#5b6b79));font-size:13px;font-weight:600}
.qlgh span{flex:1}
.qlgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}
.qlt{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 8px 10px;text-align:center;text-decoration:none;color:inherit;
  border:1px solid var(--bd,var(--line,#d5dce2));border-radius:14px;background:var(--bg,#f3f5f7);cursor:pointer;user-select:none}
.qlt:hover{border-color:var(--ac,var(--acc,#6366f1))}
.qlt.drag{opacity:.4}.qlt.over{border-style:dashed;border-color:var(--ac,var(--acc,#6366f1))}
.qlt .ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#fff;overflow:hidden;font-weight:700;color:#fff}
.qlt .ic img{width:28px;height:28px}
.qlt b{font-size:13px;font-weight:600;line-height:1.25;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.qlt small{color:var(--mut,var(--mute,#5b6b79));font-size:11px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qlt .pin{position:absolute;left:6px;top:4px;font-size:11px}
.qlt .ed{position:absolute;right:4px;top:4px;border:0;background:transparent;color:var(--mut,var(--mute,#5b6b79));border-radius:8px;padding:2px 6px;font-size:14px;line-height:1}
.qlt .ed:hover{background:var(--bd,#0002);color:inherit}
.qlempty{padding:36px 8px;text-align:center;color:var(--mut,var(--mute,#5b6b79))}
#qlForm{display:none;position:absolute;inset:0;background:var(--sf,var(--card,#fff));padding:18px;overflow:auto;flex-direction:column;gap:12px}
#qlForm.on{display:flex}
#qlForm label{font-size:13px;color:var(--mut,var(--mute,#5b6b79));display:block;margin-bottom:4px}
#qlForm .r{display:flex;gap:8px}
#qlForm .r>*{flex:1}
#qlForm .chk{display:flex;gap:8px;align-items:center}#qlForm .chk input{width:auto}
#qlToast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#10b981;color:#fff;padding:10px 18px;border-radius:12px;font-size:14px;font-weight:600;z-index:40;display:none}
#qlToast.err{background:#ef4444}`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const bookmarkSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>';
  const btn = document.createElement('button');
  btn.id = 'qlBtn';
  btn.type = 'button';
  btn.title = 'Dấu trang nhanh (Ctrl+K)';
  btn.setAttribute('aria-label', 'Mở dấu trang nhanh');
  btn.innerHTML = bookmarkSvg;
  document.body.appendChild(btn);

  const wrap = document.createElement('div');
  wrap.id = 'qlWrap';
  wrap.innerHTML = `
<div class="scrim"></div>
<aside id="qlPanel" role="dialog" aria-modal="true" aria-label="Dấu trang nhanh">
  <header><h2>Dấu trang nhanh</h2>
    <button class="qlx p" id="qlAdd" type="button">Thêm</button>
    <button class="qlx" id="qlClose" type="button" aria-label="Đóng">✕</button></header>
  <div id="qlTools">
    <input id="qlQ" type="search" placeholder="Tìm theo tên hoặc địa chỉ… (Enter để mở)" aria-label="Tìm dấu trang">
    <button class="qlx" id="qlSync" type="button" title="Đồng bộ với data/quicklinks.json">Đồng bộ</button>
    <button class="qlx" id="qlExp" type="button">Xuất</button>
    <button class="qlx" id="qlImp" type="button">Nhập</button>
    <input id="qlFile" type="file" accept="application/json,.json" hidden>
  </div>
  <div id="qlBody"></div>
  <form id="qlForm" autocomplete="off">
    <h2 id="qlFT" style="margin:0;font-size:17px">Thêm dấu trang</h2>
    <div><label for="qlN">Tên</label><input id="qlN" required maxlength="40"></div>
    <div><label for="qlU">Địa chỉ</label><input id="qlU" required placeholder="vd: thuchi.vercel.app"></div>
    <div class="r">
      <div><label for="qlG">Nhóm</label><input id="qlG" list="qlGl" placeholder="Chung"><datalist id="qlGl"></datalist></div>
      <div><label for="qlC">Màu</label><input id="qlC" type="color" value="#6366f1" style="padding:3px;height:40px"></div>
    </div>
    <label class="chk"><input id="qlP" type="checkbox">Ghim lên đầu</label>
    <label class="chk"><input id="qlI" type="checkbox" checked>Dùng biểu tượng của trang web</label>
    <div class="r" style="margin-top:6px">
      <button class="qlx p" type="submit">Lưu</button>
      <button class="qlx" type="button" id="qlCancel">Huỷ</button>
      <button class="qlx d" type="button" id="qlDel">Xoá</button>
    </div>
  </form>
</aside>`;
  document.body.appendChild(wrap);

  const toastEl = document.createElement('div');
  toastEl.id = 'qlToast';
  toastEl.setAttribute('role', 'status');
  document.body.appendChild(toastEl);
  let tt;
  function toast(m, err) {
    toastEl.textContent = m;
    toastEl.className = err ? 'err' : '';
    toastEl.style.display = 'block';
    clearTimeout(tt);
    tt = setTimeout(() => (toastEl.style.display = 'none'), 2600);
  }

  /* ---------- Hiển thị ---------- */
  let editing = null;
  let lastFocus = null;

  function sorted(list) {
    return [...list].sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (a.order ?? 0) - (b.order ?? 0));
  }
  function visible() {
    const q = $('#qlQ').value.trim().toLowerCase();
    return sorted(items).filter(i => !q || (i.name + ' ' + i.url + ' ' + i.group).toLowerCase().includes(q));
  }
  function tile(i) {
    const ic = i.noIcon || !icon(i.url)
      ? `<div class="ic" style="background:${esc(i.color || '#6366f1')}">${esc((i.name || '?').trim().charAt(0).toUpperCase())}</div>`
      : `<div class="ic"><img src="${esc(icon(i.url))}" alt="" loading="lazy" onerror="this.parentNode.style.background='${esc(i.color || '#6366f1')}';this.parentNode.textContent='${esc((i.name || '?').trim().charAt(0).toUpperCase())}'"></div>`;
    return `<a class="qlt" draggable="true" data-id="${i.id}" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer" title="${esc(i.url)}">
      ${i.pin ? '<span class="pin" aria-label="Đã ghim">📌</span>' : ''}
      <button class="ed" type="button" data-ed="${i.id}" aria-label="Sửa ${esc(i.name)}">⋯</button>
      ${ic}<b>${esc(i.name)}</b><small>${esc(host(i.url))}</small></a>`;
  }
  function render() {
    const list = visible();
    const body = $('#qlBody');
    if (!items.length) {
      body.innerHTML = '<div class="qlempty">Chưa có dấu trang nào.<br>Bấm “Thêm” và dán địa chỉ app thu chi của bạn.</div>';
    } else if (!list.length) {
      body.innerHTML = '<div class="qlempty">Không có kết quả khớp.</div>';
    } else {
      const groups = {};
      list.forEach(i => (groups[i.group || 'Chung'] = groups[i.group || 'Chung'] || []).push(i));
      body.innerHTML = Object.keys(groups).map(g => `
        <section class="qlg"><div class="qlgh"><span>${esc(g)} (${groups[g].length})</span>
          ${groups[g].length > 1 ? `<button class="qlx" type="button" data-all="${esc(g)}">Mở cả nhóm</button>` : ''}</div>
        <div class="qlgrid" data-g="${esc(g)}">${groups[g].map(tile).join('')}</div></section>`).join('');
    }
    $('#qlGl').innerHTML = [...new Set(items.map(i => i.group || 'Chung'))].map(g => `<option value="${esc(g)}">`).join('');
  }

  /* ---------- Mở / đóng ---------- */
  function open() {
    lastFocus = document.activeElement;
    wrap.classList.add('on');
    render();
    if (ak() && !RO) pull(true);
    $('#qlQ').focus();
  }
  function close() {
    closeForm();
    wrap.classList.remove('on');
    $('#qlQ').value = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  btn.onclick = open;
  $('#qlClose').onclick = close;
  $('.scrim', wrap).onclick = close;
  $('#qlQ').addEventListener('input', render);
  $('#qlQ').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const f = visible()[0];
      if (f) openLink(f);
    }
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      wrap.classList.contains('on') ? close() : open();
    } else if (e.key === 'Escape' && wrap.classList.contains('on')) {
      $('#qlForm').classList.contains('on') ? closeForm() : close();
    }
  });

  function openLink(i) {
    i.opens = (i.opens || 0) + 1;
    i.last = Date.now();
    save();
    window.open(i.url, '_blank', 'noopener,noreferrer');
  }

  /* ---------- Click, sửa, kéo thả ---------- */
  $('#qlBody').addEventListener('click', e => {
    const ed = e.target.closest('[data-ed]');
    if (ed) { e.preventDefault(); e.stopPropagation(); return openForm(items.find(i => i.id === ed.dataset.ed)); }
    const all = e.target.closest('[data-all]');
    if (all) {
      const g = all.dataset.all;
      const list = sorted(items).filter(i => (i.group || 'Chung') === g);
      if (list.length > 4 && !confirm(`Mở ${list.length} tab cùng lúc?`)) return;
      list.forEach(openLink);
      return;
    }
    const t = e.target.closest('.qlt');
    if (t) {
      e.preventDefault();
      const i = items.find(x => x.id === t.dataset.id);
      if (i) openLink(i);
    }
  });

  let dragId = null;
  const body = $('#qlBody');
  body.addEventListener('dragstart', e => {
    const t = e.target.closest('.qlt');
    if (!t) return;
    dragId = t.dataset.id;
    t.classList.add('drag');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  body.addEventListener('dragend', () => {
    dragId = null;
    body.querySelectorAll('.drag,.over').forEach(x => x.classList.remove('drag', 'over'));
  });
  body.addEventListener('dragover', e => {
    if (!dragId) return;
    e.preventDefault();
    body.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
    const t = e.target.closest('.qlt');
    if (t && t.dataset.id !== dragId) t.classList.add('over');
  });
  body.addEventListener('drop', e => {
    if (!dragId) return;
    e.preventDefault();
    const t = e.target.closest('.qlt');
    const grid = e.target.closest('.qlgrid');
    const a = items.find(i => i.id === dragId);
    if (!a) return;
    const order = sorted(items).filter(i => i.id !== dragId);
    let idx = order.length;
    if (t) {
      const b = items.find(i => i.id === t.dataset.id);
      a.group = b.group || 'Chung';
      a.pin = b.pin;
      idx = order.findIndex(i => i.id === b.id);
    } else if (grid) {
      a.group = grid.dataset.g;
    } else return;
    order.splice(idx, 0, a);
    order.forEach((i, k) => (i.order = k));
    save();
    render();
  });

  /* ---------- Form thêm / sửa ---------- */
  function openForm(item) {
    editing = item || null;
    $('#qlFT').textContent = item ? 'Sửa dấu trang' : 'Thêm dấu trang';
    $('#qlN').value = item ? item.name : '';
    $('#qlU').value = item ? item.url : '';
    $('#qlG').value = item ? item.group || '' : '';
    $('#qlC').value = (item && item.color) || '#6366f1';
    $('#qlP').checked = !!(item && item.pin);
    $('#qlI').checked = !(item && item.noIcon);
    $('#qlDel').style.display = item ? '' : 'none';
    $('#qlForm').classList.add('on');
    $('#qlN').focus();
  }
  function closeForm() {
    $('#qlForm').classList.remove('on');
    editing = null;
  }
  $('#qlAdd').onclick = () => openForm();
  $('#qlCancel').onclick = closeForm;
  $('#qlDel').onclick = () => {
    if (!editing || !confirm(`Xoá “${editing.name}”?`)) return;
    items = items.filter(i => i.id !== editing.id);
    save(); closeForm(); render(); toast('Đã xoá');
  };
  $('#qlForm').addEventListener('submit', e => {
    e.preventDefault();
    const url = normUrl($('#qlU').value);
    if (!url) return toast('Địa chỉ không hợp lệ (cần http, https, tel hoặc mailto)', true);
    const data = {
      name: $('#qlN').value.trim(),
      url,
      group: $('#qlG').value.trim() || 'Chung',
      color: $('#qlC').value,
      pin: $('#qlP').checked,
      noIcon: !$('#qlI').checked
    };
    if (editing) Object.assign(editing, data);
    else items.push({ id: uid(), opens: 0, order: items.length, ...data });
    save(); closeForm(); render(); toast('Đã lưu');
  });

  /* ---------- Đồng bộ ---------- */
  if (RO) $('#qlSync').hidden = true;
  $('#qlSync').onclick = async () => {
    if (!ak()) {
      const k = prompt('Nhập ADMIN_KEY');
      if (!k) return;
      sessionStorage.setItem('ak', k);
    }
    const r = await pull(true);
    if (r === 'err') return toast('Sai ADMIN_KEY hoặc lỗi mạng', true);
    if (r === 'same') await push(); else toast('Đã tải từ server');
  };

  /* ---------- Xuất / Nhập ---------- */
  $('#qlExp').onclick = () => {
    const blob = new Blob([JSON.stringify({ v: 1, items }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'qrhub-quicklinks-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#qlImp').onclick = () => $('#qlFile').click();
  $('#qlFile').onchange = async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const arr = Array.isArray(j) ? j : j.items;
      if (!Array.isArray(arr)) throw Error('Sai định dạng file');
      let n = 0;
      arr.forEach(x => {
        const url = normUrl(x.url || '');
        if (!url || !x.name || items.some(i => i.url === url)) return;
        items.push({ id: uid(), name: String(x.name).slice(0, 40), url, group: x.group || 'Chung', color: x.color || '', pin: !!x.pin, noIcon: !!x.noIcon, opens: 0, order: items.length });
        n++;
      });
      save(); render(); toast(`Đã nhập ${n} dấu trang`);
    } catch (err) { toast('Không nhập được: ' + err.message, true); }
  };

  window.QuickLinks = { open, close, list: () => items.slice() };
})();
