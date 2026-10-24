import { read, update, isAdmin } from './_gh.js';

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sai ADMIN_KEY' });
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      const logs = (await read('data/logs.json', [])).data;
      return res.json(logs.slice(-500).reverse());
    }
    if (req.method === 'DELETE') {
      await update('data/logs.json', [], () => [], 'log: xoá toàn bộ');
      return res.json({ ok: true });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
}
