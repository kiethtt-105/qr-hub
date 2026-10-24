import { read, update } from './_gh.js';

export default async function handler(req, res) {
  try {
    const code = String(req.query.code || '');
    const link = (await read('data/links.json', {})).data[code];
    if (!link) return res.status(404).send('Link không tồn tại');
    try { // ghi log click; lỗi ghi log không được chặn việc chuyển hướng
      const now = new Date().toISOString();
      await update('data/links.json', {}, l => { if (l[code]) l[code].clicks = (l[code].clicks || 0) + 1; return l; }, `link: click ${code}`);
      await update('data/logs.json', [], logs => [...logs, { t: now, type: 'click', code, url: link.url, ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim(), ua: req.headers['user-agent'] || '', ref: req.headers.referer || '' }], `log: click ${code}`);
    } catch {}
    res.redirect(302, link.url);
  } catch (e) { res.status(500).send(e.message); }
}
