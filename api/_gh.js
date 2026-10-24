const { GITHUB_TOKEN: T, GITHUB_OWNER: O, GITHUB_REPO: R, GITHUB_BRANCH: B = 'main' } = process.env;
const url = p => `https://api.github.com/repos/${O}/${R}/contents/${p}`;
const H = { Authorization: `Bearer ${T}`, Accept: 'application/vnd.github+json', 'User-Agent': 'qr-app' };

export const isAdmin = req => !!process.env.ADMIN_KEY && req.headers['x-admin-key'] === process.env.ADMIN_KEY;

export async function read(path, def) {
  const r = await fetch(`${url(path)}?ref=${B}`, { headers: H, cache: 'no-store' });
  if (r.status === 404) return { data: def };
  if (!r.ok) throw new Error(`GitHub read ${path}: ${r.status}`);
  const j = await r.json();
  return { data: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')), sha: j.sha };
}

// Đọc -> sửa -> ghi lại; thử lại 3 lần nếu bị xung đột sha
export async function update(path, def, fn, message) {
  for (let i = 0; i < 3; i++) {
    const { data, sha } = await read(path, def);
    const next = fn(data);
    const r = await fetch(url(path), {
      method: 'PUT', headers: H,
      body: JSON.stringify({ message, branch: B, sha, content: Buffer.from(JSON.stringify(next, null, 2)).toString('base64') })
    });
    if (r.ok) return next;
    if (i === 2 || ![409, 422].includes(r.status)) throw new Error(`GitHub write ${path}: ${r.status}`);
  }
}
