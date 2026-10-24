// Chỉ trả về thông tin giao diện KHÔNG nhạy cảm. Không bao giờ thêm token/mật khẩu vào đây.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({ title: process.env.APP_TITLE || 'QR Hub', color: process.env.APP_COLOR || '#6366f1' });
}
