import { read, update, isAdmin } from './_gh.js';

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sai ADMIN_KEY' });
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      const l = (await read('data/links.json', {})).data;
      return res.json(Object.entries(l).map(([code, v]) => ({ code, ...v })).sort((a, b) => String(b.created).localeCompare(String(a.created))));
    }
    if (req.method === 'DELETE') {
      const code = String(req.query.code || '');
      if (!code) return res.status(400).json({ error: 'Thiếu mã link' });
      await update('data/links.json', {}, l => { delete l[code]; return l; }, `link: xoá ${code}`);
      return res.json({ ok: true });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
}
