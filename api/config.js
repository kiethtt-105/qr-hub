import { read, update, isAdmin } from './_gh.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return res.json((await read('data/config.json', {})).data);
    if (req.method === 'PUT') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Sai ADMIN_KEY' });
      const b = req.body || {};
      const cfg = {
        bank: { bin: String(b.bank?.bin || ''), bankName: String(b.bank?.bankName || ''), accountNo: String(b.bank?.accountNo || ''), accountName: String(b.bank?.accountName || '') },
        qrTemplate: String(b.qrTemplate || 'compact2'),
        transactionTemplates: (b.transactionTemplates || []).map(t => ({ name: String(t.name), content: String(t.content) })),
        display: { title: String(b.display?.title || ''), showAmount: !!b.display?.showAmount, showAccount: !!b.display?.showAccount }
      };
      await update('data/config.json', {}, () => cfg, 'chore: cập nhật cấu hình');
      return res.json(cfg);
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
}
