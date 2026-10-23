const $=i=>document.getElementById(i),C=window.CONFIG||{};
const uid=()=>Math.random().toString(36).slice(2,8);
const noAccent=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic=n=>`<svg class="i"><use href="#i-${n}"/></svg>`;
const fmt=n=>n?Number(n).toLocaleString('vi-VN')+' đ':'Số tiền tự nhập';
const DEF={accounts:[],qrs:[],links:[],set:{title:C.title||'QR Hub',color:C.color||'#6366f1',mode:'dark',url:'',tok:''}};
let D;try{D=JSON.parse(localStorage.getItem('qrapp'))}catch(e){}
D=Object.assign({},DEF,D||{});D.set=Object.assign({},DEF.set,D.set);
if(C.url)D.set.url=C.url;if(C.token)D.set.tok=C.token;   // config.js luôn được ưu tiên
let banks=[],ready=!D.set.url;   // ready=false: chưa tải Sheet về thì KHÔNG được ghi đè lên Sheet
const KEY={accounts:'App_TaiKhoan',qrs:'App_QR',links:'App_Links'};
const PASS=String(C.pass||'');let unlocked=!PASS||sessionStorage.getItem('qrunlock')===PASS;

/* ---------- tiện ích ---------- */
function toast(m,err){const t=$('toast');t.textContent=m;t.className='on'+(err?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='',2400)}
function setSync(m,ok=true){$('sync').title=m;$('sync').innerHTML=`<span class="dot ${ok===null?'':ok?'ok':'err'}"></span><span>${esc(m)}</span>`}
const copy=t=>navigator.clipboard.writeText(t).then(()=>toast('Đã copy'));
function dl(u,name='qr.png'){fetch(u).then(r=>r.blob()).then(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click()}).catch(()=>window.open(u))}
const persist=()=>localStorage.setItem('qrapp',JSON.stringify(D));
function save(){D._dirty=true;persist();render();clearTimeout(save.t);if(D.set.url&&ready)save.t=setTimeout(push,1200)}
const bankName=bin=>(banks.find(b=>b.bin==bin)||{}).shortName||bin;
const accOf=id=>D.accounts.find(a=>a.id==id);

/* ---------- điều hướng ---------- */
function show(t){if(!$(t))t='bank';document.querySelectorAll('.tab,#nav button').forEach(x=>x.classList.remove('on'));$(t).classList.add('on');document.querySelector(`#nav [data-t=${t}]`).classList.add('on');history.replaceState(null,'','#'+t)}
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>show(b.dataset.t));

/* ---------- QR chuyển khoản ---------- */
const qrUrl=(a,amt,note)=>`https://img.vietqr.io/image/${a.bin}-${a.stk}-${a.template||'print'}.png?accountName=${encodeURIComponent(a.name)}&amount=${Math.floor(+amt)>0?Math.floor(+amt):''}&addInfo=${encodeURIComponent(noAccent(note||''))}`;
function drawBank(){const a=accOf($('bAcc').value),has=!!a;$('bImg').hidden=!has;$('bEmpty').hidden=has;
 if(!has){$('bInfo').innerHTML='';return}
 $('bImg').src=qrUrl(a,$('bAmt').value,$('bNote').value);
 $('bInfo').innerHTML=`<b>${esc(fmt($('bAmt').value))}</b>${esc(a.name)} · ${esc(bankName(a.bin))} · ${esc(a.stk)}${$('bNote').value?'<br>“'+esc(noAccent($('bNote').value))+'”':''}`}
['bAcc','bAmt','bNote'].forEach(i=>$(i).oninput=drawBank);
$('chips').innerHTML=[20000,50000,100000,200000,500000,1000000].map(n=>`<button data-v="${n}">${n/1000>=1000?n/1e6+'tr':n/1000+'k'}</button>`).join('');
$('chips').onclick=e=>{if(e.target.dataset.v){$('bAmt').value=e.target.dataset.v;drawBank()}};
$('bSave').onclick=()=>{if(!$('bAcc').value)return toast('Chưa có tài khoản',1);
 D.qrs.push({id:uid(),label:$('bLabel').value.trim()||'Mẫu '+(D.qrs.length+1),accId:$('bAcc').value,amount:$('bAmt').value,note:$('bNote').value});$('bLabel').value='';save();toast('Đã lưu mẫu')};
$('bDl').onclick=()=>$('bImg').src&&dl($('bImg').src);
$('bCp').onclick=()=>$('bImg').src&&copy($('bImg').src);
const useQR=id=>{const q=D.qrs.find(x=>x.id==id);if(!accOf(q.accId))return toast('Tài khoản của mẫu này đã bị xóa',1);$('bAcc').value=q.accId;$('bAmt').value=q.amount;$('bNote').value=q.note;drawBank();scrollTo({top:0,behavior:'smooth'})};
const delQR=id=>{D.qrs=D.qrs.filter(x=>x.id!=id);save()};

/* ---------- QR nhanh ---------- */
function mkQ(){const o=$('qOut'),v=$('qIn').value.trim();o.innerHTML='';if(!v){o.innerHTML='<div class="empty">QR sẽ hiện ở đây</div>';return}
 new QRCode(o,{text:v,width:260,height:260,correctLevel:QRCode.CorrectLevel.M})}
$('qIn').oninput=()=>{clearTimeout(mkQ.t);mkQ.t=setTimeout(mkQ,250)};
$('qClr').onclick=()=>{$('qIn').value='';mkQ()};
$('qDl').onclick=()=>{const c=$('qOut').querySelector('canvas');c?dl(c.toDataURL(),'qr-nhanh.png'):toast('Chưa có QR')};

/* ---------- Rút gọn link ---------- */
const shortOf=c=>`${D.set.url}?s=${encodeURIComponent(c)}`;
$('lAdd').onclick=()=>{let u=$('lUrl').value.trim(),c=$('lCode').value.trim().replace(/[^\w-]/g,'');
 if(!u)return toast('Nhập link gốc',1);if(!/^https?:\/\//i.test(u))u='https://'+u;
 if(!c)c=uid();if(D.links.some(l=>l.code==c))return toast('Mã “'+c+'” đã tồn tại');
 D.links.unshift({code:c,url:u,clicks:0,created:new Date().toISOString().slice(0,10)});$('lUrl').value=$('lCode').value='';save()};
const delLink=c=>{D.links=D.links.filter(l=>l.code!=c);save()};

/* ---------- Tài khoản ---------- */
$('aAdd').onclick=()=>{const name=noAccent($('aName').value.trim()).toUpperCase(),stk=$('aStk').value.replace(/\s/g,'');
 if(!name||!stk)return toast('Nhập tên chủ TK và số TK');if(!/^[0-9A-Za-z]+$/.test(stk))return toast('Số TK không hợp lệ');
 D.accounts.push({id:uid(),name,stk,bin:$('aBin').value,template:$('aTpl').value});$('aName').value=$('aStk').value='';save();toast('Đã thêm')};
const delAcc=id=>{const n=D.qrs.filter(q=>q.accId==id).length;if(!confirm('Xóa tài khoản này'+(n?` và ${n} mẫu QR liên quan`:'')+'?'))return;
 D.accounts=D.accounts.filter(a=>a.id!=id);D.qrs=D.qrs.filter(q=>q.accId!=id);save()};

/* ---------- Kết nối Google Sheet ---------- */
async function api(body,act){
 const u=D.set.url;if(!u)throw new Error('Chưa nhập URL Web App');
 if(!D.set.tok)throw new Error('Chưa nhập Token. Nhập vào ô Token (hoặc điền trong config.js), phải trùng TOKEN trong Code.gs');
 let res;try{res=body?await fetch(u,{method:'POST',body:JSON.stringify({token:D.set.tok,data:body})}):await fetch(`${u}?token=${encodeURIComponent(D.set.tok)}${act?'&action='+act:''}`)}
 catch(e){throw new Error('Không truy cập được URL. Kiểm tra: URL kết thúc bằng /exec và Web App được triển khai với quyền “Bất kỳ ai”')}
 let j;try{j=await res.json()}catch(e){throw new Error('URL không trả về dữ liệu. Có thể sai URL, hoặc chưa triển khai “Phiên bản mới” sau khi sửa Code.gs')}
 if(j.error)throw new Error(j.error=='Sai token'?'Token không khớp với TOKEN trong Code.gs':j.error);return j}
const hhmm=()=>new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
async function push(){setSync('Đang đồng bộ…',null);
 const data={};for(const k in KEY)data[KEY[k]]=D[k];data.App_Settings=['title','color','mode'].map(key=>({key,value:D.set[key]}));
 try{await api(data);ready=true;D._dirty=false;persist();setSync('Đã đồng bộ lúc '+hhmm());return true}catch(e){setSync(e.message,false);toast(e.message,1);return false}}
async function pull(initial){
 if(initial&&D._dirty){ready=true;return push()}   // có thay đổi chưa đẩy: ưu tiên đẩy, không để Sheet ghi đè
 setSync('Đang tải…',null);
 try{const r=await api();
  if((r.Banks||[]).length){window.sheetBanks=true;banks=r.Banks;fillBanks()}
  const total=Object.values(KEY).reduce((n,k)=>n+(r[k]||[]).length,0);
  if(initial&&!total&&!D.accounts.length){ready=true;const n=await importLegacy(true);if(n)toast('Đã nhập '+n+' mục từ Sheet cũ');setSync('Đã đồng bộ lúc '+hhmm());return true}
  if(initial&&!total&&(D.accounts.length||D.qrs.length||D.links.length)){ready=true;return push()}
  const S=x=>String(x??'');
  D.accounts=(r.App_TaiKhoan||[]).map(x=>({id:S(x.id),name:S(x.name),stk:S(x.stk),bin:S(x.bin),template:S(x.template)||'print',alias:S(x.alias)}));
  D.qrs=(r.App_QR||[]).map(x=>({id:S(x.id),label:S(x.label),accId:S(x.accId),amount:S(x.amount),note:S(x.note)}));
  D.links=(r.App_Links||[]).map(x=>({code:S(x.code),url:S(x.url),clicks:Number(x.clicks)||0,created:S(x.created)}));
  (r.App_Settings||[]).forEach(s=>{if(['title','color','mode'].includes(s.key)&&s.value!=='')D.set[s.key]=String(s.value)});
  ready=true;persist();theme();render();setSync('Đã đồng bộ lúc '+hhmm());if(!initial)toast('Đã tải từ Sheet');return true}
 catch(e){setSync(e.message,false);if(!initial)toast(e.message,1);return false}}
$('sync').onclick=()=>show('set');

/* ---------- Cài đặt ---------- */
const COLORS=['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#10b981','#0ea5e9'];
function theme(){document.documentElement.style.setProperty('--ac',D.set.color);document.body.classList.toggle('light',D.set.mode=='light');
 $('ttl').textContent=$('ftt').textContent=document.title=D.set.title;
 document.querySelectorAll('#seg button').forEach(b=>b.classList.toggle('on',b.dataset.m==D.set.mode));
 document.querySelectorAll('#sw button[data-c]').forEach(b=>b.classList.toggle('on',b.dataset.c==D.set.color))}
$('sw').innerHTML=COLORS.map(c=>`<button data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')+'<input type="color" id="swc" title="Màu tùy chọn">';
$('sw').onclick=e=>{if(e.target.dataset.c){D.set.color=e.target.dataset.c;theme();persist()}};
$('swc').oninput=e=>{D.set.color=e.target.value;theme();persist()};
$('seg').onclick=e=>{const b=e.target.closest('button');if(b){D.set.mode=b.dataset.m;theme();persist()}};
function readSet(){D.set.title=$('sTitle').value||'QR Hub';D.set.url=$('sUrl').value.trim();D.set.tok=$('sTok').value.trim()}
$('sSave').onclick=()=>{readSet();theme();save();toast('Đã lưu cài đặt')};
$('sTest').onclick=async()=>{readSet();persist();const b=$('cn');b.className='cn';b.textContent='Đang kiểm tra…';
 try{const r=await api();b.className='cn ok';b.textContent=`Kết nối thành công · ${(r.App_TaiKhoan||[]).length} tài khoản · ${(r.App_QR||[]).length} mẫu QR · ${(r.App_Links||[]).length} link trên Sheet`;setSync('Đã kết nối Sheet')}
 catch(e){b.className='cn bad';b.textContent=e.message;setSync(e.message,false)}};
$('sPull').onclick=()=>{readSet();if(D._dirty&&!confirm('Có thay đổi chưa đẩy lên Sheet. Tải về sẽ ghi đè chúng. Tiếp tục?'))return;pull(false)};
$('sPush').onclick=()=>{readSet();persist();push().then(ok=>ok&&toast('Đã đẩy lên Sheet'))};
$('sExp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,1)],{type:'application/json'}));a.download='qr-hub-backup.json';a.click()};
$('sImp').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const x=JSON.parse(t);['accounts','qrs','links'].forEach(k=>D[k]=x[k]||[]);save();toast('Đã nhập dữ liệu')}catch(err){toast('File không hợp lệ',1)}})};

/* ---------- Nhập từ Sheet cũ (TaiKhoan / Quick - QR) ---------- */
async function importLegacy(silent){
 try{const r=await api(null,'import');const idmap={};let na=0,nq=0;
  (r.accounts||[]).forEach(a=>{const ex=D.accounts.find(x=>x.bin==a.bin&&x.stk==a.stk);if(ex){if(!ex.alias&&a.alias)ex.alias=a.alias;idmap[a.id]=ex.id;return}D.accounts.push(a);idmap[a.id]=a.id;na++});
  if((r.banks||[]).length){window.sheetBanks=true;banks=r.banks;fillBanks()}
  (r.qrs||[]).forEach(q=>{q.accId=idmap[q.accId]||q.accId;if(D.qrs.some(x=>x.label==q.label&&x.accId==q.accId&&String(x.amount)==String(q.amount)))return;D.qrs.push(q);nq++});
  if(na||nq){ready=true;save()}
  if(!silent)toast(na||nq?`Đã nhập ${na} tài khoản, ${nq} mẫu QR từ Sheet`:'Không có dữ liệu mới trong Sheet cũ',!(na||nq));
  return na+nq}catch(e){if(!silent)toast(e.message,1);return 0}}
$('sImpL').onclick=()=>{readSet();persist();importLegacy(false)};
$('bImp').onclick=()=>importLegacy(false);
$('bGo').onclick=()=>show('acc');

/* ---------- Khóa tab Cài đặt (mật khẩu trong config.js) ---------- */
function applyLock(){$('lock').hidden=unlocked;$('setBody').hidden=!unlocked;$('lkIc').hidden=unlocked}
function tryUnlock(){if($('pIn').value===PASS){unlocked=true;sessionStorage.setItem('qrunlock',PASS);$('pIn').value='';applyLock();render()}else{toast('Sai mật khẩu',1);$('pIn').select()}}
$('pOk').onclick=tryUnlock;$('pIn').onkeydown=e=>{if(e.key=='Enter')tryUnlock()};
$('sLock').onclick=()=>{if(!PASS)return toast('Chưa đặt pass trong config.js',1);unlocked=false;sessionStorage.removeItem('qrunlock');applyLock();toast('Đã khóa Cài đặt')};

/* ---------- Chẩn đoán Sheet + tự thử lại khi có mạng ---------- */
$('sScan').onclick=async()=>{readSet();persist();const b=$('cn');b.className='cn';b.textContent='Đang quét Sheet…';
 try{const r=await api(null,'scan');b.className='cn ok';
  b.textContent=`Tìm thấy ${r.accounts} tài khoản · ${r.qrs} mẫu QR · ${r.banks} ngân hàng (tab Banks)\n`+r.sheets.map(s=>`• ${s.name} (${s.rows} dòng × ${s.cols} cột)\n    ${s.head.slice(0,2).join('\n    ')}`).join('\n')}
 catch(e){b.className='cn bad';b.textContent=e.message}};
window.addEventListener('online',()=>{if(D.set.url)D._dirty?push():pull(true)});

/* ---------- Hiển thị ---------- */
function render(){
 const cur=$('bAcc').value;$('bAcc').innerHTML=D.accounts.map(a=>`<option value="${esc(a.id)}">${a.alias?esc(a.alias)+' — ':''}${esc(a.name)} · ${esc(bankName(a.bin))} ${esc(a.stk)}</option>`).join('')||'<option value="">Chưa có tài khoản</option>';if(accOf(cur))$('bAcc').value=cur;
 $('qrList').innerHTML=D.qrs.map(q=>{const a=accOf(q.accId);return`<div class="item"><div class="t"><b>${esc(q.label)}</b><small>${a?esc(fmt(q.amount))+' · '+esc(a.name):'⚠ tài khoản đã xóa'}${q.note?' · '+esc(q.note):''}</small></div><div class="acts"><button class="btn" onclick="useQR('${q.id}')">${ic('check')}Dùng</button><button class="btn x" onclick="delQR('${q.id}')">${ic('trash')}</button></div></div>`}).join('')||'<div class="none">Chưa có mẫu nào.</div>';
 $('aList').innerHTML=D.accounts.map(a=>`<div class="item"><div class="t"><b>${a.alias?esc(a.alias)+' — ':''}${esc(a.name)}</b><small>${esc(bankName(a.bin))} · ${esc(a.stk)}</small></div><button class="btn x" onclick="delAcc('${a.id}')">${ic('trash')}Xóa</button></div>`).join('')||'<div class="none">Chưa có tài khoản.</div>';
 $('lWarn').hidden=!!D.set.url;
 $('lList').innerHTML=D.links.map(l=>`<div class="item"><div class="t"><b>${esc(l.code)} <span style="font-weight:400;color:var(--mut)">· ${l.clicks} lượt</span></b><small>${esc(l.url)}</small></div><div class="acts"><button class="btn" ${D.set.url?'':'disabled'} onclick="copy(shortOf('${esc(l.code)}'))">${ic('copy')}Copy</button><button class="btn x" onclick="delLink('${esc(l.code)}')">${ic('trash')}</button></div></div>`).join('')||'<div class="none">Chưa có link nào.</div>';
 if(document.activeElement.closest('#set')===null)Object.entries({sTitle:'title',sColor:'color',sUrl:'url',sTok:'tok'}).forEach(([i,k])=>$(i).value=D.set[k]||'');
 drawBank()}

/* ---------- Khởi động ---------- */
const FALLBACK=[['VCB','970436'],['MB','970422'],['MoMo','970432'],['ACB','970416'],['TCB','970407'],['BIDV','970418'],['CTG','970415'],['TPB','970423'],['VPB','970432']].map(([shortName,bin])=>({shortName,bin}));
function fillBanks(){const c=$('aBin').value;$('aBin').innerHTML=banks.map(b=>`<option value="${b.bin}">${esc(b.shortName)}${b.name?' - '+esc(b.name):''}</option>`).join('');if(c)$('aBin').value=c;render()}
applyLock();theme();show(location.hash.slice(1)||'bank');render();mkQ();
banks=FALLBACK;fillBanks();
fetch('https://api.vietqr.io/v2/banks').then(r=>r.json()).then(j=>{if(window.sheetBanks)return;banks=j.data.filter(b=>b.bin);fillBanks()}).catch(()=>{});
$('lUrl').onkeydown=$('lCode').onkeydown=e=>{if(e.key=='Enter')$('lAdd').click()};
D.set.url?pull(true):setSync('Chưa kết nối Sheet',null);
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey)return;const b=document.querySelectorAll('#nav button')[+e.key-1];if(b)b.click()});
$('fab').onclick=()=>D.set.url?(D._dirty?push().then(ok=>ok&&toast('Đã đẩy lên Sheet')):pull(false)):(show('set'),toast('Điền URL Web App trước',1));
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js');
