# QR Hub: QR chuyển khoản, rút gọn link, dấu trang nhanh

Toàn bộ dữ liệu là JSON trong `data/`, đọc/ghi qua GitHub API. Bí mật nằm trong biến môi trường, không nằm trong Git. Không dùng Google Sheets.

## Cài đặt
1. Đặt repo ở chế độ **Private**.
2. Vercel: Import repo, nhập các biến trong `.env.example` (Settings > Environment Variables), rồi Redeploy.
3. Ignored Build Step: `git diff --quiet HEAD^ HEAD -- . ':!data'` (commit chỉ đổi `data/` sẽ không build lại).
4. Chạy local: chép `.env.example` thành `.env`, điền giá trị, chạy `vercel dev`, mở http://localhost:3000.

## Chức năng
QR chuyển khoản (nhiều tài khoản, mẫu đã lưu, tải/sao chép/chia sẻ ảnh), QR nhanh, rút gọn link kèm QR và đếm click, nhật ký truy cập (xuất CSV), dấu trang nhanh (Ctrl+K), giao diện sáng/tối + màu nhấn.

## Bảo mật
- `.env` nằm trong `.gitignore`. Không commit file này.
- Mọi API dữ liệu yêu cầu header `x-admin-key` khớp `ADMIN_KEY`.
- Số tài khoản và tên chủ TK mã hoá AES-256-GCM (`DATA_KEY`) trong `data/app.json`. Không đổi `DATA_KEY` sau khi đã lưu dữ liệu.
- IP trong nhật ký được băm với `LOG_SALT`.

## Cấu trúc
```
index.html  sw.js  manifest.webmanifest  vercel.json  package.json
assets/   app.js  style.css  quicklinks.js
api/      _gh.js _sec.js store.js links.js logs.js shorten.js go.js env.js quicklinks.js
data/     app.json links.json logs.json quicklinks.json  (config.json: bản cũ, có thể xoá)
icon/
```
