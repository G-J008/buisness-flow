/* ============================================================
   CAJAS — where the money sits (Gs / USD · bank / cash).
   Every movement shows who made it and when; edits and deletions stay in the change log.
   ============================================================ */
const fmtCur=(n,cur)=>cur==='USD'?(n<0?'−':'')+'US$ '+Math.abs(n||0).toLocaleString('es-PY',{minimumFractionDigits:2,maximumFractionDigits:2}):fmt(n);
const curName=c=>c==='USD'?(lang==='es'?'Dólares':'US dollars'):(lang==='es'?'Guaraníes':'Guaraníes');
const cajaList=()=>DB.cajas||[];
const cajaById=id=>cajaList().find(c=>c.id===id);
function cajaBalance(id){ return sum((DB.cajaMovs||[]).filter(m=>m.cajaId===id),m=>m.direction==='in'?m.amount:-m.amount); }
// Last exchange rate anyone entered (caja movements first, then inventory purchases).
function lastFx(){
  const m=[...(DB.cajaMovs||[])].filter(x=>+x.fxRate>0).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  if(m) return +m.fxRate;
  const i=[...invList()].filter(x=>+x.fxRate>0).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  return i?+i.fxRate:0;
}
const fmtFx=n=>n?Number(n).toLocaleString('es-PY',{maximumFractionDigits:2}):'—';
const fmtStamp=t=>{ if(!t) return ''; const d=new Date(t); return `${fmtDate(localISO(d))} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
const parseDec=s=>{ const t=String(s||'').trim().replace(/\s/g,''); if(!t) return 0; const n=parseFloat(t.indexOf(',')>=0?t.replace(/\./g,'').replace(',','.'):(/^\d{1,3}(\.\d{3})+$/.test(t)?t.replace(/\./g,''):t)); return isNaN(n)?0:n; };
function defaultCajaId(){ const l=cajaList(); const c=l.find(x=>x.currency==='PYG'&&x.kind==='Efectivo')||l.find(x=>x.currency==='PYG')||l[0]; return c?c.id:''; }
function cajaOptions(sel){
  return ['PYG','USD'].map(cur=>{ const l=cajaList().filter(c=>c.currency===cur); return l.length?`<optgroup label="${curName(cur)}">${l.map(c=>`<option data-u value="${c.id}" ${c.id===sel?'selected':''}>${escHtml(c.name)}</option>`).join('')}</optgroup>`:''; }).join('');
}

/* ---------- caja picker used in sale / expense / revenue / payment / inventory forms ---------- */
// The exchange rate is asked only when the money goes into or out of a USD caja.
function cajaField(p,opts){ opts=opts||{};
  if(!cajaList().length) return '';
  return `<div class="fg ${opts.full?'full':''}" id="${p}_cajafg"><label>Caja <span class="req">*</span></label><select id="${p}_caja" onchange="onCajaPick('${p}')">${cajaOptions(opts.sel||defaultCajaId())}</select></div>`
    +(opts.noFx?'':`<div class="fg" id="${p}_fxfg" style="display:none"><label>USD/PYG rate <span class="req">*</span></label><input id="${p}_fx" inputmode="decimal" value="${lastFx()?fmtFx(lastFx()):''}"></div>`);
}
function onCajaPick(p){ const c=cajaById(val(p+'_caja')); const fg=document.getElementById(p+'_fxfg'); if(fg) fg.style.display=c&&c.currency==='USD'?'flex':'none'; }
function showCajaField(p,on){ ['_cajafg','_fxfg'].forEach(k=>{ const e=document.getElementById(p+k); if(e) e.style.display=on?'flex':'none'; }); if(on) onCajaPick(p); }
// Returns {cajaId,cajaFx} or null when the rate is missing (the field is marked).
function cajaPayload(p){
  if(!cajaList().length||!document.getElementById(p+'_caja')) return {};
  const c=cajaById(val(p+'_caja')); if(!c) return {};
  if(c.currency==='PYG'||!document.getElementById(p+'_fx')) return {cajaId:c.id};
  const fx=parseDec(val(p+'_fx')); if(!(fx>0)){ document.getElementById(p+'_fx').classList.add('err'); return null; }
  return {cajaId:c.id,cajaFx:fx};
}

/* ---------- VIEW: CAJAS ---------- */
const REF_L={manual:'Manual',transfer:'Caja transfer',sale:'Sale',expense:'Expense',revenue:'Revenue',payment:'Client payment'};
function viewCajas(){
  const c=activeCompany(); if(!c) return emptyState('No company selected','Pick or create a company first.','shield');
  return `<div class="section-head"><div><h2>Cajas</h2><div class="desc">Where the business money is, in Gs and USD</div></div>
    <div class="head-actions"><button class="btn" onclick="openCajaNew()">${plus()}New caja</button><button class="btn" onclick="openTransfer()">Transfer</button><button class="btn" onclick="openCajaMov('out')">${plus()}Withdrawal</button><button class="btn primary" onclick="openCajaMov('in')">${plus()}Deposit</button></div></div>
  <div class="grid panels-3" id="cajaPanels"></div>
  <div class="card table-card" style="margin-top:16px">
    <div class="table-tools"><div class="panel-title">Movements</div><div class="spacer"></div>
      <select class="input" id="cjFilter" onchange="renderCajaMovs()"><option value="">All cajas</option>${cajaOptions('')}</select>
      <input class="input" id="cjFrom" type="date" style="width:150px" oninput="renderCajaMovs()"><input class="input" id="cjTo" type="date" style="width:150px" oninput="renderCajaMovs()"></div>
    <div class="tbl-scroll"><table class="stack"><thead><tr><th>Date</th><th>Caja</th><th>Concept</th><th class="num">Money in</th><th class="num">Money out</th><th class="num">Exchange rate</th><th>Recorded by</th><th></th></tr></thead><tbody id="cjBody"></tbody></table></div></div>
  <div class="card table-card" style="margin-top:16px">
    <div class="table-tools"><div><div class="panel-title">Change log</div><div class="hint">Every movement created, edited or deleted, with user, date and time</div></div></div>
    <div class="tbl-scroll" style="max-height:420px;overflow-y:auto"><table class="stack"><thead><tr><th>Date and time</th><th>User</th><th>Action</th><th>Detail</th></tr></thead><tbody id="cjLog"></tbody></table></div></div>`;
}
POST.cajas=()=>{ renderCajaPanels(); renderCajaMovs(); renderCajaLog(); };
function cajaPanelsHTML(compact){
  const fx=lastFx();
  const block=cur=>{ const l=cajaList().filter(c=>c.currency===cur); if(!l.length) return '';
    const tot=sum(l,c=>cajaBalance(c.id));
    return `<div class="card panel"><div class="panel-title">${curName(cur)}</div>
      <div class="panel-big ${tot<0?'neg':''}">${fmtCur(tot,cur)}</div>
      <div class="facts">${l.map(c=>{ const b=cajaBalance(c.id); return `<div class="fact"><div class="l"><i data-u>${escHtml(c.name)}</i></div><div class="a ${b<0?'neg':''}">${fmtCur(b,cur)}</div></div>`; }).join('')}</div></div>`; };
  const pyg=sum(cajaList().filter(c=>c.currency==='PYG'),c=>cajaBalance(c.id)), usd=sum(cajaList().filter(c=>c.currency==='USD'),c=>cajaBalance(c.id));
  const total=`<div class="card panel"><div class="panel-title">All cajas in Gs</div>
      <div class="panel-big">${fx?fmt(pyg+usd*fx):fmt(pyg)}</div>
      <div class="facts"><div class="fact"><div class="l">Guaraníes</div><div class="a">${fmt(pyg)}</div></div>
      <div class="fact"><div class="l">Dollars converted<small>${fx?`Exchange rate <i data-u>${fmtFx(fx)}</i> · last one entered`:'No rate entered yet'}</small></div><div class="a">${fx?fmt(usd*fx):'—'}</div></div></div></div>`;
  return compact?{pyg:block('PYG'),usd:block('USD'),total}:block('PYG')+block('USD')+total;
}
function renderCajaPanels(){ document.getElementById('cajaPanels').innerHTML=tr(cajaPanelsHTML()); }
function movConcept(m){
  const ref=REF_L[m.refType]||m.refType; // translated once, with the whole row
  let other='';
  if(m.refType==='transfer'){ const o=(DB.cajaMovs||[]).find(x=>x.transferId===m.transferId&&x.id!==m.id); const oc=o&&cajaById(o.cajaId);
    if(oc) other=`${m.direction==='out'?'→':'←'} <i data-u>${escHtml(oc.name)}</i>`; }
  return `<div><div>${m.description?`<i data-u>${escHtml(m.description)}</i>`:ref}${other?' '+other:''}</div><div class="cell-sub">${ref}</div></div>`;
}
function renderCajaMovs(){
  const f=val('cjFilter'),ff=val('cjFrom'),ft=val('cjTo');
  const rows=[...(DB.cajaMovs||[])].filter(m=>(!f||m.cajaId===f)&&(!ff||m.date>=ff)&&(!ft||m.date<=ft))
    .sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)));
  const body=document.getElementById('cjBody');
  if(!rows.length){ body.innerHTML=tr(`<tr><td colspan="8" class="st-block"><div class="empty"><div class="big">No movements</div>Cash sales, expenses and client payments land here, or load a deposit.</div></td></tr>`); return; }
  body.innerHTML=tr(rows.map(m=>{ const c=cajaById(m.cajaId)||{name:'—',currency:'PYG'}; const canDel=m.refType==='manual'||m.refType==='transfer';
    return `<tr>
    <td data-label="Date"><span class="fig" data-u>${fmtDate(m.date)}</span></td>
    <td data-label="Caja"><i data-u>${escHtml(c.name)}</i></td>
    <td class="st-head">${movConcept(m)}</td>
    <td class="num" data-label="Money in" style="color:#067a06;font-weight:600">${m.direction==='in'?fmtCur(m.amount,c.currency):''}</td>
    <td class="num" data-label="Money out" style="color:#c42f2f;font-weight:600">${m.direction==='out'?fmtCur(m.amount,c.currency):''}</td>
    <td class="num" data-label="Exchange rate"><span data-u>${fmtFx(m.fxRate)}</span></td>
    <td data-label="Recorded by" style="white-space:normal;min-width:150px"><div><div><i data-u>${escHtml(m.userName||'—')}</i></div><div class="cell-sub" data-u>${fmtStamp(m.createdAt)}</div>${m.updatedAt?`<div class="cell-sub">Edited · <i data-u>${escHtml(m.updatedByName||'')} ${fmtStamp(m.updatedAt)}</i></div>`:''}</div></td>
    <td class="num st-act"><span class="row-flex" style="justify-content:flex-end;gap:2px"><button class="btn ghost sm" title="Edit" aria-label="Edit" onclick="openMovEdit('${m.id}')">${pencil()}</button>${canDel?`<button class="btn ghost sm danger" aria-label="Delete" onclick="delCajaMov('${m.id}')">${trash()}</button>`:''}</span></td></tr>`; }).join(''));
}
const ACT_L={crear:'Created',editar:'Edited',eliminar:'Deleted',caja_crear:'Caja created',caja_editar:'Caja renamed',caja_eliminar:'Caja deleted'};
function logDetail(l){
  let d={}; try{ d=JSON.parse(l.detail||'{}'); }catch(e){}
  const desc=x=>{ if(!x) return ''; const c=cajaById(x.cajaId); const cur=c?c.currency:'PYG';
    return `<i data-u>${escHtml(c?c.name:'—')}</i> · ${x.direction==='out'?'Money out':'Money in'} <b data-u>${fmtCur(x.amount,cur)}</b> · Exchange rate <i data-u>${fmtFx(x.fxRate)}</i> · <i data-u>${fmtDate(x.date||'')}${x.description?' · '+escHtml(x.description):''}</i>`; };
  if(l.action.startsWith('caja_')) return d.before?`<i data-u>${escHtml(d.before.name)} → ${escHtml(d.after.name)}</i>`:`<i data-u>${escHtml(d.name||'')}${d.currency?' · '+d.currency:''}</i>`;
  const origin=d.refType&&d.refType!=='manual'?` <span class="muted">(${REF_L[d.refType]||d.refType})</span>`:'';
  if(l.action==='editar') return `<div><div class="muted">Before: ${desc(d.before)}</div><div>After: ${desc(d.after)}</div>${origin}</div>`;
  return `${desc(d.after||d.before)}${origin}`;
}
function renderCajaLog(){
  const rows=DB.cajaLog||[];
  document.getElementById('cjLog').innerHTML=tr(rows.map(l=>`<tr><td data-label="Date and time"><span class="fig" data-u>${fmtStamp(l.createdAt)}</span></td><td data-label="User"><i data-u>${escHtml(l.userName||'—')}</i></td>
    <td data-label="Action"><span class="pill ${l.action.indexOf('eliminar')>=0?'credit':l.action.indexOf('editar')>=0?'reserved':'cash'}">${ACT_L[l.action]||l.action}</span></td><td class="st-head" style="font-size:12.5px">${logDetail(l)}</td></tr>`).join('')
    ||'<tr><td colspan="4" class="muted st-block">No changes yet</td></tr>');
}

/* ---------- caja modals ---------- */
function openCajaNew(){
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>New caja</h3><p>For example another bank account or a petty cash box.</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg full"><label>Name <span class="req">*</span></label><input id="cn_name" placeholder="e.g. Banco Itaú Gs"></div>
      <div class="fg"><label>Currency <span class="req">*</span></label><select id="cn_cur"><option value="PYG">Guaraníes</option><option value="USD">USD</option></select></div>
      <div class="fg"><label>Type</label><select id="cn_kind"><option value="Banco">Bank</option><option value="Efectivo">Cash</option><option value="Otro">Other</option></select></div>
    </div></div><div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveCajaNew()">Create caja</button></div></div>`);
}
async function saveCajaNew(){ const name=val('cn_name').trim(); if(!name){document.getElementById('cn_name').classList.add('err');toast('Enter a name','warn');return;}
  try{ await apiReq('POST','/api/cajas',{companyId:activeCompanyId(),name,currency:val('cn_cur'),kind:val('cn_kind')}); closeModal(); await reload(); toast('Caja created'); }catch(e){ toast(apiErr(e),'warn'); } }
function openCajaMov(dir){
  if(!cajaList().length){ toast('Select a company first','warn'); return; }
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>${dir==='in'?'Deposit into a caja':'Withdraw from a caja'}</h3><p>The exchange rate of the day is required to record any amount.</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg full"><label>Caja <span class="req">*</span></label><select id="cm_caja" onchange="updCmCur()">${cajaOptions(defaultCajaId())}</select></div>
      <div class="fg"><label>Amount <span class="req">*</span> <span class="hint" id="cm_cur"></span></label><input id="cm_amount" inputmode="decimal"></div>
      <div class="fg"><label>USD/PYG rate <span class="req">*</span></label><input id="cm_fx" inputmode="decimal" value="${lastFx()?fmtFx(lastFx()):''}"></div>
      <div class="fg"><label>Date <span class="req">*</span></label><input type="date" id="cm_date" value="${today()}"></div>
      <div class="fg full"><label>Description <span class="req">*</span></label><input id="cm_desc" placeholder="${dir==='in'?'e.g. opening balance, owner contribution':'e.g. bank fee, owner withdrawal'}"></div>
    </div></div><div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveCajaMov('${dir}')">Save</button></div></div>`);
  updCmCur();
}
function updCmCur(){ const c=cajaById(val('cm_caja')); const e=document.getElementById('cm_cur'); if(e&&c) e.textContent=c.currency==='USD'?'US$':'₲'; }
async function saveCajaMov(dir){
  const amount=parseDec(val('cm_amount')), fx=parseDec(val('cm_fx')), desc=val('cm_desc').trim();
  let ok=true; [['cm_amount',amount>0],['cm_fx',fx>0],['cm_desc',!!desc]].forEach(([id,v])=>{ if(!v){document.getElementById(id).classList.add('err');ok=false;} });
  if(!ok){ toast('Complete the required fields','warn'); return; }
  try{ await apiReq('POST','/api/cajas/movs',{companyId:activeCompanyId(),cajaId:val('cm_caja'),direction:dir,amount,fxRate:fx,date:val('cm_date'),description:desc}); closeModal(); await reload(); toast('Movement saved'); }catch(e){ toast(apiErr(e),'warn'); }
}
function openTransfer(){
  const l=cajaList(); if(l.length<2){ toast('Select a company first','warn'); return; }
  const from=defaultCajaId(), to=(l.find(c=>c.id!==from)||{}).id;
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>Transfer between cajas</h3><p>The amount is in the currency of the source caja; the rate converts it.</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg"><label>From caja <span class="req">*</span></label><select id="tf_from" onchange="updTfPreview()">${cajaOptions(from)}</select></div>
      <div class="fg"><label>To caja <span class="req">*</span></label><select id="tf_to" onchange="updTfPreview()">${cajaOptions(to)}</select></div>
      <div class="fg"><label>Amount <span class="req">*</span> <span class="hint" id="tf_cur"></span></label><input id="tf_amount" inputmode="decimal" oninput="updTfPreview()"></div>
      <div class="fg"><label>USD/PYG rate <span class="req">*</span></label><input id="tf_fx" inputmode="decimal" value="${lastFx()?fmtFx(lastFx()):''}" oninput="updTfPreview()"></div>
      <div class="fg"><label>Date <span class="req">*</span></label><input type="date" id="tf_date" value="${today()}"></div>
      <div class="fg"><label>Description</label><input id="tf_desc" placeholder="e.g. cash deposit at the bank"></div>
      <div class="fg full derived"><span>Arrives in the destination caja</span><b id="tf_prev">—</b></div>
    </div></div><div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveTransfer()">Transfer</button></div></div>`);
  updTfPreview();
}
function convertCur(n,from,to,fx){ if(from===to) return n; return from==='USD'?n*fx:(fx?n/fx:0); }
function updTfPreview(){ const a=cajaById(val('tf_from')), b=cajaById(val('tf_to')); if(!a||!b) return;
  document.getElementById('tf_cur').textContent=a.currency==='USD'?'US$':'₲';
  const amt=parseDec(val('tf_amount')), fx=parseDec(val('tf_fx'));
  document.getElementById('tf_prev').textContent=amt?fmtCur(convertCur(amt,a.currency,b.currency,fx),b.currency):'—'; }
async function saveTransfer(){
  const amount=parseDec(val('tf_amount')), fx=parseDec(val('tf_fx'));
  let ok=true; [['tf_amount',amount>0],['tf_fx',fx>0]].forEach(([id,v])=>{ if(!v){document.getElementById(id).classList.add('err');ok=false;} });
  if(val('tf_from')===val('tf_to')){ document.getElementById('tf_to').classList.add('err'); ok=false; }
  if(!ok){ toast('Complete the required fields','warn'); return; }
  try{ await apiReq('POST','/api/cajas/transfer',{companyId:activeCompanyId(),fromId:val('tf_from'),toId:val('tf_to'),amount,fxRate:fx,date:val('tf_date'),description:val('tf_desc').trim()}); closeModal(); await reload(); toast('Transfer saved'); }catch(e){ toast(apiErr(e),'warn'); }
}
function openMovEdit(id){
  const m=(DB.cajaMovs||[]).find(x=>x.id===id); if(!m) return; const c=cajaById(m.cajaId)||{currency:'PYG'};
  const manual=m.refType==='manual', transfer=m.refType==='transfer';
  const amtStr=c.currency==='USD'?String(m.amount).replace('.',','):Math.round(m.amount).toLocaleString('es-PY');
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>Edit movement</h3><p>${manual||transfer?'The previous values stay in the change log.':'This movement comes from a sale, expense or payment: its amount follows the origin. You can move it to another caja or correct the rate.'}</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg full"><label>Caja</label>${transfer?`<input value="${escHtml(c.name)}" disabled style="opacity:.6">`:`<select id="me_caja">${cajaOptions(m.cajaId)}</select>`}</div>
      <div class="fg"><label>Amount ${c.currency==='USD'?'(US$)':'(₲)'}</label><input id="me_amount" inputmode="decimal" value="${amtStr}" ${manual||transfer?'':'disabled style="opacity:.6"'}></div>
      <div class="fg"><label>USD/PYG rate</label><input id="me_fx" inputmode="decimal" value="${m.fxRate?fmtFx(m.fxRate):''}"></div>
      <div class="fg"><label>Date</label><input type="date" id="me_date" value="${m.date}" ${manual||transfer?'':'disabled style="opacity:.6"'}></div>
      <div class="fg"><label>Description</label><input id="me_desc" value="${escHtml(m.description||'')}"></div>
    </div></div><div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveMovEdit('${m.id}')">Save changes</button></div></div>`);
}
async function saveMovEdit(id){
  const m=(DB.cajaMovs||[]).find(x=>x.id===id); if(!m) return;
  const body={fxRate:parseDec(val('me_fx')),description:val('me_desc').trim()};
  if(document.getElementById('me_caja')) body.cajaId=val('me_caja');
  if(m.refType==='manual'||m.refType==='transfer'){ body.amount=parseDec(val('me_amount')); body.date=val('me_date');
    if(!(body.amount>0)){ document.getElementById('me_amount').classList.add('err'); toast('Enter an amount','warn'); return; } }
  try{ await apiReq('PATCH','/api/cajas/movs/'+id,body); closeModal(); await reload(); toast('Movement updated'); }catch(e){ toast(apiErr(e),'warn'); }
}
async function delCajaMov(id){
  const m=(DB.cajaMovs||[]).find(x=>x.id===id); const c=m&&cajaById(m.cajaId);
  if(!confirmDel(m?fmtCur(m.amount,c?c.currency:'PYG'):'')) return;
  try{ await apiReq('DELETE','/api/cajas/movs/'+id); await reload(); toast('Movement deleted'); }catch(e){ toast(apiErr(e),'warn'); }
}
function pencil(){ return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'; }
