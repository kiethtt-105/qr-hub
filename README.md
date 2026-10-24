# QR chuyển khoản & rút gọn link
Dữ liệu lưu trong `data/*.json` và đọc/ghi qua GitHub API. Không dùng Google Sheets.
1. GitHub Pages: Settings > Pages > Deploy from branch > main / root (bản chỉ xem).
2. Vercel: Import repo, nhập 5 biến trong `.env.example`. Settings > Git > Ignored Build Step:
   `git diff --quiet HEAD^ HEAD -- . ':!data'`  (commit chỉ đổi data/ sẽ không build lại)
