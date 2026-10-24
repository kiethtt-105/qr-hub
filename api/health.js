import { read, isAdmin } from './_gh.js';
import { dec } from './_sec.js';

const FILES = [['data/app.json', null], ['data/links.json', {}], ['data/logs.json', []], ['data/quicklinks.json', { updated: 0, items: [] }]];

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sai ADMIN_KEY' });
  const env = Object.fromEntries(['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO', 'ADMIN_KEY', 'DATA_KEY', 'LOG_SALT'].map(k => [k, !!process.env[k]]));
  const files = [];
  for (const [path, def] of FILES) {
    try {
      const { data } = await read(path, def);
      if (path === 'data/app.json' && data?.accounts?.length) {
        try { dec(data.accounts[0].stk); } catch { throw new Error('DATA_KEY không khớp với dữ liệu đã mã hoá'); }
      }
      files.push({ path, ok: true, info: data === null ? 'Chưa có file, sẽ tạo khi lưu' : Array.isArray(data) ? `${data.length} mục` : `${Object.keys(data).length} khoá` });
    } catch (e) { files.push({ path, ok: false, error: e.message }); }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ env, files });
}
