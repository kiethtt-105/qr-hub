import { safeEq } from './_sec.js';

const { GITHUB_TOKEN: T, GITHUB_OWNER: O, GITHUB_REPO: R, GITHUB_BRANCH: B = 'main' } = process.env;
const url = p => `https://api.github.com/repos/${O}/${R}/contents/${p}`;
const H = { Authorization: `Bearer ${T}`, Accept: 'application/vnd.github+json', 'User-Agent': 'qr-app' };
const hint = s => ({ 401: 'GITHUB_TOKEN sai hoặc hết hạn', 403: 'Token thiếu quyền Contents hoặc bị giới hạn', 404: 'Không thấy repo/nhánh (kiểm tra GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH)', 409: 'Xung đột phiên bản, thử lại' }[s] || '');
const need = () => { const m = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'].filter(k => !process.env[k]); if (m.length) throw new Error('Thiếu biến môi trường: ' + m.join(', ')); };

export const hasKey = req => !!req.headers['x-admin-key'];
export const isAdmin = req => !!process.env.ADMIN_KEY && hasKey(req) && safeEq(req.headers['x-admin-key'], process.env.ADMIN_KEY);

let repoOk = false;
async function checkRepo() { // 404 của file chỉ hợp lệ khi repo thật sự tồn tại
  if (repoOk) return;
  const r = await fetch(`https://api.github.com/repos/${O}/${R}`, { headers: H, cache: 'no-store' });
  if (!r.ok) throw new Error(`Không truy cập được repo ${O}/${R} (${r.status}). ${hint(r.status)}`);
  repoOk = true;
}

// def = giá trị mặc định khi file chưa có. def = null: không kiểm tra kiểu dữ liệu.
export async function read(path, def) {
  need();
  const q = `${url(path)}?ref=${B}`;
  const r = await fetch(q, { headers: H, cache: 'no-store' });
  if (r.status === 404) { await checkRepo(); return { data: def }; }
  if (!r.ok) throw new Error(`GitHub read ${path}: ${r.status}. ${hint(r.status)}`);
  const j = await r.json();
  let text;
  if (j.content && j.encoding === 'base64') text = Buffer.from(j.content, 'base64').toString('utf8');
  else { // file > 1MB: lấy bản thô
    const rr = await fetch(q, { headers: { ...H, Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' });
    if (!rr.ok) throw new Error(`GitHub read ${path}: ${rr.status}`);
    text = await rr.text();
  }
  text = text.replace(/^\ufeff/, '').trim(); // bỏ BOM do Notepad/VS Code thêm
  if (!text) return { data: def, sha: j.sha };
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`${path} không phải JSON hợp lệ`); }
  if (def !== null) {
    const bad = Array.isArray(def) ? !Array.isArray(data) : (data === null || typeof data !== 'object' || Array.isArray(data));
    if (bad) throw new Error(`${path} sai cấu trúc (cần ${Array.isArray(def) ? 'mảng [ ]' : 'đối tượng { }'})`);
  }
  return { data, sha: j.sha };
}

// Đọc -> sửa -> ghi lại; thử lại 3 lần nếu bị xung đột sha
export async function update(path, def, fn, message) {
  for (let i = 0; i < 3; i++) {
    const { data, sha } = await read(path, def);
    const next = fn(data);
    const r = await fetch(url(path), {
      method: 'PUT', headers: H,
      body: JSON.stringify({ message, branch: B, sha, content: Buffer.from(JSON.stringify(next, null, 2)).toString('base64') })
    });
    if (r.ok) return next;
    if (i === 2 || ![409, 422].includes(r.status)) throw new Error(`GitHub write ${path}: ${r.status}. ${hint(r.status)}`);
  }
}
