# QR Hub: QR chuyển khoản, rút gọn link, dấu trang nhanh

Dữ liệu lưu trong `data/*.json`, đọc/ghi qua GitHub API. Bí mật nằm trong biến môi trường, không nằm trong Git.

## Cài đặt
1. Đặt repo ở chế độ **Private**.
2. Vercel: Import repo, nhập các biến trong `.env.example` (Settings > Environment Variables), rồi Redeploy.
3. Ignored Build Step: `git diff --quiet HEAD^ HEAD -- . ':!data'` (commit chỉ đổi `data/` sẽ không build lại).
4. Chạy local: chép `.env.example` thành `.env`, điền giá trị, chạy `vercel dev`.

## Bảo mật
- `.env` đã nằm trong `.gitignore`. Không commit file này.
- Số tài khoản và tên chủ TK được mã hoá (AES-256-GCM, khoá `DATA_KEY`) trước khi ghi vào `data/config.json`. Không đổi `DATA_KEY` sau khi đã lưu dữ liệu.
- IP trong log được băm với `LOG_SALT`.
- Không dùng Google Sheets/Apps Script. Toàn bộ dữ liệu là JSON trong `data/`.

## Cấu trúc
```
index.html  sw.js  manifest.webmanifest  vercel.json  package.json
assets/   config.js (công khai)  quicklinks.js  (app.js, style.css nếu dùng)
api/      _gh.js _sec.js config.js go.js shorten.js env.js quicklinks.js
data/     config.json links.json logs.json quicklinks.json
icon/
```
