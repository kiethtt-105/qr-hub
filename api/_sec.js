import crypto from 'node:crypto';

// Khoá mã hoá 32 byte lấy từ biến môi trường DATA_KEY (chuỗi bất kỳ, nên dài ≥ 32 ký tự ngẫu nhiên)
const key = () => {
  if (!process.env.DATA_KEY) throw new Error('Thiếu biến môi trường DATA_KEY');
  return crypto.createHash('sha256').update(process.env.DATA_KEY).digest();
};

const PREFIX = 'enc:v1:';

// AES-256-GCM: đầu ra dạng enc:v1:<base64(iv|tag|ciphertext)>
export const enc = s => {
  if (!s) return '';
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const d = Buffer.concat([c.update(String(s), 'utf8'), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), d]).toString('base64');
};

// Giá trị cũ chưa mã hoá (không có tiền tố) được trả về nguyên trạng để tương thích dữ liệu cũ
export const dec = s => {
  if (!s || !String(s).startsWith(PREFIX)) return s || '';
  const b = Buffer.from(String(s).slice(PREFIX.length), 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
};

// So sánh chuỗi không lộ thời gian xử lý (chống dò mật khẩu)
export const safeEq = (a, b) => {
  const h = x => crypto.createHash('sha256').update(String(x ?? '')).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};

export const clientIp = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim();

// Chỉ lưu bản băm có muối: vẫn đếm được người truy cập duy nhất nhưng không truy ngược ra IP
export const hashIp = req => {
  const ip = clientIp(req);
  if (!ip) return '';
  return crypto.createHash('sha256').update((process.env.LOG_SALT || '') + ip).digest('hex').slice(0, 12);
};

export const originOf = u => { try { return new URL(u).origin; } catch { return ''; } };
