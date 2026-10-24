import { read, update, isAdmin, hasKey } from './_gh.js';
import { enc, dec } from './_sec.js';

const MASK = '••••';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (hasKey(req) && !isAdmin(req)) return res.status(401).json({ error: 'Sai ADMIN_KEY' });
      const cfg = (await read('data/config.json', {})).data;
      if (cfg.bank) {
        if (isAdmin(req)) { // giải mã chỉ khi có ADMIN_KEY
          cfg.bank.accountNo = dec(cfg.bank.accountNo);
          cfg.bank.accountName = dec(cfg.bank.accountName);
        } else {
          cfg.bank.accountNo = cfg.bank.accountNo ? MASK : '';
          cfg.bank.accountName = '';
          cfg.locked = true;
        }
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.json(cfg);
    }
    if (req.method === 'PUT') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Sai ADMIN_KEY' });
      const b = req.body || {};
      let saved;
      await update('data/config.json', {}, old => {
        const keep = (v, o) => (String(v || '').startsWith('•') ? o : enc(String(v || '')));
        saved = {
          bank: {
            bin: String(b.bank?.bin || ''),
            bankName: String(b.bank?.bankName || ''),
            accountNo: keep(b.bank?.accountNo, old.bank?.accountNo),
            accountName: keep(b.bank?.accountName, old.bank?.accountName)
          },
          qrTemplate: String(b.qrTemplate || 'compact2'),
          transactionTemplates: (b.transactionTemplates || []).map(t => ({ name: String(t.name), content: String(t.content) })),
          display: { title: String(b.display?.title || ''), showAmount: !!b.display?.showAmount, showAccount: !!b.display?.showAccount }
        };
        return saved;
      }, 'chore: cập nhật cấu hình');
      return res.json({ ...saved, bank: { ...saved.bank, accountNo: dec(saved.bank.accountNo), accountName: dec(saved.bank.accountName) } });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
}
