// Chỉ chứa giá trị công khai. Mọi bí mật (token, ADMIN_KEY, DATA_KEY) nằm trong biến môi trường trên Vercel.
window.CONFIG = { title: 'QR Hub', color: '#6366f1' };
fetch('/api/env').then(r => (r.ok ? r.json() : null)).then(e => { if (e) Object.assign(window.CONFIG, e); }).catch(() => {});
