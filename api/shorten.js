import { update, isAdmin } from './_gh.js';

const ip = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sai ADMIN_KEY' });
  try {
    const { url, code: custom } = req.body || {};
    let u; try { u = new URL(url); } catch { return res.status(400).json({ error: 'Link không hợp lệ' }); }
    if (!/^https?:$/.test(u.protocol)) return res.status(400).json({ error: 'Chỉ hỗ trợ http/https' });
    if (custom && !/^[A-Za-z0-9_-]{3,32}$/.test(custom)) return res.status(400).json({ error: 'Mã tuỳ chọn: 3–32 ký tự chữ/số/_/-' });

    const now = new Date().toISOString();
    let code = custom || Math.random().toString(36).slice(2, 8);
    let taken = false;
    await update('data/links.json', {}, links => {
      if (links[code]) { taken = true; return links; }
      links[code] = { url: u.href, created: now, clicks: 0 };
      return links;
    }, `link: tạo ${code}`);
    if (taken) return res.status(409).json({ error: 'Mã đã tồn tại, thử mã khác' });

    await update('data/logs.json', [], logs => [...logs, { t: now, type: 'create', code, url: u.href, ip: ip(req) }], `log: tạo ${code}`);
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    res.json({ code, short: `https://${host}/s/${code}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
