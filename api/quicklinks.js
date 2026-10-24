import { read, update, isAdmin } from './_gh.js';

const FILE = 'data/quicklinks.json';
const okUrl = u => { try { return ['http:', 'https:', 'tel:', 'mailto:', 'zalo:'].includes(new URL(u).protocol); } catch { return false; } };

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sai ADMIN_KEY' });
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return res.json((await read(FILE, { updated: 0, items: [] })).data);
    }
    if (req.method === 'PUT') {
      const raw = Array.isArray(req.body?.items) ? req.body.items.slice(0, 500) : null;
      if (!raw) return res.status(400).json({ error: 'Thiếu danh sách items' });
      const items = raw.filter(i => i && i.name && okUrl(String(i.url))).map((i, k) => ({
        id: String(i.id || Math.random().toString(36).slice(2, 10)).slice(0, 16),
        name: String(i.name).slice(0, 40),
        url: String(i.url).slice(0, 2000),
        group: String(i.group || 'Chung').slice(0, 40),
        color: /^#[0-9a-f]{6}$/i.test(i.color || '') ? i.color : '',
        pin: !!i.pin,
        noIcon: !!i.noIcon,
        opens: Math.max(0, Number(i.opens) || 0),
        order: Number.isFinite(+i.order) ? +i.order : k,
        last: Number(i.last) || 0
      }));
      const out = { updated: Date.now(), items };
      await update(FILE, { updated: 0, items: [] }, () => out, 'chore: cập nhật dấu trang');
      return res.json({ updated: out.updated, count: items.length });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
}
