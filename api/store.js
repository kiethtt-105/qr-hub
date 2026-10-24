import { read, update, isAdmin } from './_gh.js';
import { enc, dec } from './_sec.js';

const FILE = 'data/app.json';
const DEF = { updated: 0, accounts: [], qrs: [], set: {} };
const S = (v, n = 200) => String(v ?? '').slice(0, n);
const TPL = ['compact2', 'compact', 'qr_only', 'print'];

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sai ADMIN_KEY' });
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      const { data } = await read(FILE, null);
      if (data) {
        return res.json({
          updated: data.updated || 0,
          accounts: (data.accounts || []).map(a => ({ ...a, name: dec(a.name), stk: dec(a.stk) })),
          qrs: data.qrs || [], set: data.set || {}
        });
      }
      // Chưa có app.json: chuyển 1 tài khoản từ data/config.json đời cũ (nếu có)
      const c = (await read('data/config.json', {})).data, b = c.bank || {}, stk = dec(b.accountNo);
      return res.json({
        updated: 0, qrs: [], set: {},
        accounts: stk ? [{ id: 'acc1', name: dec(b.accountName), stk, bin: S(b.bin, 6), template: TPL.includes(c.qrTemplate) ? c.qrTemplate : 'compact2', alias: S(b.bankName, 40) }] : []
      });
    }
    if (req.method === 'PUT') {
      const b = req.body || {};
      const out = {
        updated: Date.now(),
        accounts: (Array.isArray(b.accounts) ? b.accounts : []).slice(0, 20)
          .filter(a => a && /^\d{6}$/.test(String(a.bin)) && /^[0-9A-Za-z]{4,30}$/.test(String(a.stk)))
          .map(a => ({
            id: S(a.id, 16).replace(/[^\w-]/g, '') || Math.random().toString(36).slice(2, 8),
            name: enc(S(a.name, 60)), stk: enc(String(a.stk)),
            bin: String(a.bin), template: TPL.includes(a.template) ? a.template : 'compact2', alias: S(a.alias, 40)
          })),
        qrs: (Array.isArray(b.qrs) ? b.qrs : []).slice(0, 200).filter(q => q && q.label).map(q => ({
          id: S(q.id, 16).replace(/[^\w-]/g, ''), label: S(q.label, 40), accId: S(q.accId, 16),
          amount: String(q.amount || '').replace(/\D/g, '').slice(0, 12), note: S(q.note, 50)
        })),
        set: {
          title: S(b.set?.title || 'QR Hub', 40),
          color: /^#[0-9a-f]{6}$/i.test(b.set?.color || '') ? b.set.color : '#6366f1',
          mode: b.set?.mode === 'light' ? 'light' : 'dark'
        }
      };
      await update(FILE, DEF, () => out, 'chore: cập nhật dữ liệu');
      return res.json({ updated: out.updated });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
}
