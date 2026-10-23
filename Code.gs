// Apps Script gắn vào Google Sheet: Tiện ích mở rộng > Apps Script
const TOKEN = 'doi-mat-khau-nay';   // phải trùng với token trong app
const SCHEMA = {
  App_TaiKhoan: ['id','name','stk','bin','template','alias'],
  App_QR:       ['id','label','accId','amount','note'],
  App_Links:    ['code','url','clicks','created'],
  App_Settings: ['key','value']
};
function sh_(n){
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName(n);
  if(!s){
    s = ss.insertSheet(n);
    s.getRange(1,1,s.getMaxRows(),SCHEMA[n].length).setNumberFormat('@'); // text: giữ số 0 đầu của STK
    s.getRange(1,1,1,SCHEMA[n].length).setValues([SCHEMA[n]]).setFontWeight('bold');
    s.setFrozenRows(1);
  }
  return s;
}
function read_(n){
  const v = sh_(n).getDataRange().getValues(), h = v.shift();
  return v.filter(r=>String(r[0])!=='').map(r=>Object.fromEntries(h.map((k,i)=>[k,String(r[i])])));
}
function write_(n, rows){
  const s = sh_(n), h = SCHEMA[n];
  if(n==='App_Links'){ // giữ số click do Apps Script đếm, không để app ghi đè bằng số cũ
    const old = {}; read_(n).forEach(r=>old[r.code]=Number(r.clicks)||0);
    rows = rows.map(o=>Object.assign({},o,{clicks:Math.max(old[o.code]||0, Number(o.clicks)||0)}));
  }
  s.getRange(1,1,1,h.length).setNumberFormat('@').setValues([h]).setFontWeight('bold');
  const last = s.getLastRow();
  if(last>1) s.getRange(2,1,last-1,h.length).clearContent();
  if(!rows.length) return;
  if(s.getMaxRows()<rows.length+1) s.insertRowsAfter(s.getMaxRows(), rows.length+1-s.getMaxRows());
  s.getRange(2,1,rows.length,h.length).setNumberFormat('@')
   .setValues(rows.map(o=>h.map(k=>String(o[k]==null?'':o[k]))));
}
const out_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
function doGet(e){
  const p = e.parameter;
  if(p.s){ // link rút gọn: ?s=ma
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try{
      const rows = read_('App_Links'), i = rows.findIndex(r=>r.code==p.s);
      if(i<0 || !/^https?:\/\//i.test(rows[i].url)) return HtmlService.createHtmlOutput('Link không tồn tại');
      sh_('App_Links').getRange(i+2,3).setValue(String(Number(rows[i].clicks||0)+1));
      const u = rows[i].url.replace(/"/g,'%22').replace(/</g,'%3C');
      return HtmlService.createHtmlOutput(
        '<p style="font-family:sans-serif;font-size:18px;padding:20px">Đang chuyển hướng… <a id="a" target="_top" href="'+u+'">Bấm vào đây nếu không tự chuyển</a></p><script>document.getElementById("a").click()</script>');
    } finally { lock.releaseLock(); }
  }
  if(p.token!==TOKEN) return out_({error:'Sai token'});
  if(p.action==='import') return out_(legacy_());
  if(p.action==='scan') return out_(scan_());
  const d = {}; Object.keys(SCHEMA).forEach(n=>d[n]=read_(n)); d.Banks = banks_();
  return out_(d);
}
function doPost(e){
  const b = JSON.parse(e.postData.contents);
  if(b.token!==TOKEN) return out_({error:'Sai token'});
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{ Object.keys(b.data).forEach(n=>{ if(SCHEMA[n]) write_(n, b.data[n]); }); }
  finally { lock.releaseLock(); }
  return out_({ok:true});
}

// ===== Đọc dữ liệu từ các tab cũ (TaiKhoan, Quick - QR, MauHienThi, Banks...) =====
function norm_(s){ return String(s).toLowerCase().replace(/[^a-z0-9]/g,''); }
function parseVQ_(u){
  const m = /img\.vietqr\.io\/image\/(\d+)-([A-Za-z0-9]+)-(\w+)\.png\??([^\s"')]*)/.exec(String(u));
  if(!m) return null;
  const q = {};
  (m[4]||'').split('&').forEach(kv=>{
    const i = kv.indexOf('='); if(i<1) return;
    try{ q[kv.slice(0,i)] = decodeURIComponent(kv.slice(i+1).replace(/\+/g,' ')); }catch(e){ q[kv.slice(0,i)] = kv.slice(i+1); }
  });
  return {bin:m[1], stk:m[2], tpl:m[3], name:q.accountName||'', amount:q.amount||'', note:q.addInfo||''};
}
function banks_(){ // tab Banks: cột bin + shortName/code/name
  const s = SpreadsheetApp.getActive().getSheetByName('Banks'); if(!s) return [];
  const v = s.getDataRange().getValues();
  const hr = v.findIndex(r=>r.some(c=>norm_(c)==='bin')); if(hr<0) return [];
  const h = v[hr].map(norm_), ix = n=>h.indexOf(n), iB = ix('bin');
  const iS = [ix('shortname'),ix('short'),ix('code'),ix('name')].find(i=>i>=0);
  const iN = [ix('name'),ix('fullname')].find(i=>i>=0);
  return v.slice(hr+1).filter(r=>String(r[iB]).trim()).map(r=>({bin:String(r[iB]).trim(), shortName:String(iS>=0?r[iS]:r[iB]), name:(iN>=0&&iN!==iS)?String(r[iN]):''}));
}
function legacy_(){
  const ss = SpreadsheetApp.getActive(), accs = [], qrs = [], seen = {};
  const addAcc = (name,stk,bin,tpl,alias)=>{
    stk = String(stk).trim(); bin = String(bin).trim(); if(!stk||!bin) return '';
    const k = bin+'-'+stk;
    if(!seen[k]){ seen[k] = {id:'l'+accs.length+Math.random().toString(36).slice(2,5), name:String(name||'').trim(), stk:stk, bin:bin, template:tpl||'print', alias:String(alias||'').trim()}; accs.push(seen[k]); }
    else if(alias && !seen[k].alias) seen[k].alias = String(alias).trim();
    return seen[k].id;
  };
  // 1) Tab TaiKhoan: cột Name (mã gợi nhớ, vd TTT), Name_A (tên chủ TK), STK, BIN, Template
  const t = ss.getSheetByName('TaiKhoan');
  if(t){
    const v = t.getDataRange().getValues();
    const hr = v.findIndex(r=>r.some(c=>norm_(c)==='stk'));
    if(hr>=0){
      const h = v[hr].map(norm_), ix = n=>h.indexOf(n);
      const iS = ix('stk'), iB = ix('bin'), iK = ix('name');
      const iN = [ix('namea'),ix('accountname'),ix('tentk')].find(i=>i>=0);
      const iT = [ix('template'),ix('mauhienthi')].find(i=>i>=0);
      for(let r=hr+1;r<v.length;r++){
        const row = v[r];
        if(iB>=0 && String(row[iS])!=='' && String(row[iB])!=='')
          addAcc(iN>=0?row[iN]:(iK>=0?row[iK]:''), row[iS], row[iB], iT>=0?row[iT]:'', (iN>=0&&iK>=0)?row[iK]:'');
      }
    }
  }
  // 2) Các tab còn lại: quét link VietQR trong ô, công thức, hyperlink
  ss.getSheets().forEach(sh=>{
    if(/^App_|^Banks$|Câu trả lời/i.test(sh.getName())) return;
    const rg = sh.getDataRange(), vals = rg.getValues(), fs = rg.getFormulas(), rt = rg.getRichTextValues();
    vals.forEach((row,r)=>{
      let vq = null, label = '';
      row.forEach((c,ci)=>{
        const cand = [String(c), fs[r][ci]||'', (rt[r][ci] && rt[r][ci].getLinkUrl()) || ''];
        if(!vq) cand.some(s=>{ const p = parseVQ_(s); if(p){ vq = p; return true; } return false; });
        const s = String(c).trim();
        if(!label && s && !/^https?:/i.test(s) && s.toLowerCase()!=='link' && !/^[\d.,\s]+(đ|vnd)?$/i.test(s)) label = s;
      });
      if(!vq) return;
      const id = addAcc(vq.name, vq.stk, vq.bin, vq.tpl, '');
      if(vq.amount) qrs.push({id:'q'+qrs.length+Math.random().toString(36).slice(2,5), label:label||('Mẫu '+(qrs.length+1)), accId:id, amount:vq.amount, note:vq.note});
    });
  });
  return {accounts:accs, qrs:qrs, banks:banks_()};
}
function scan_(){ // chẩn đoán: liệt kê tab + 2 dòng đầu
  const sheets = SpreadsheetApp.getActive().getSheets().map(sh=>{
    const r = Math.min(sh.getLastRow(),4), c = Math.min(sh.getLastColumn(),8);
    const head = (r&&c) ? sh.getRange(1,1,r,c).getDisplayValues().map(x=>x.map(y=>String(y).slice(0,28)).join(' | ')) : [];
    return {name:sh.getName(), rows:sh.getLastRow(), cols:sh.getLastColumn(), head:head};
  });
  const l = legacy_();
  return {sheets:sheets, accounts:l.accounts.length, qrs:l.qrs.length, banks:l.banks.length};
}
