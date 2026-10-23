// Apps Script gắn vào Google Sheet: Tiện ích mở rộng > Apps Script
const TOKEN = 'doi-mat-khau-nay';   // phải trùng với token trong app
const SCHEMA = {
  App_TaiKhoan: ['id','name','stk','bin','template'],
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
  const s = sh_(n), h = SCHEMA[n], last = s.getLastRow();
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
  const d = {}; Object.keys(SCHEMA).forEach(n=>d[n]=read_(n));
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
