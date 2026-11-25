/* ============================================================
   ARGUS CONSTRUCCIÓN — obras, presupuestos, propuestas, calendario de pagos y base de datos.
   Written in Spanish and rendered without tr(): the substring translator would garble Spanish words.
   ============================================================ */
const isObra=()=>{ const c=activeCompany(); return !!c&&c.kind==='construction'; };
const OB=()=>DB.obra||{suppliers:[],categories:[],products:[],itemTypes:[],budgets:[],proposals:[],projects:[],tasks:[],reminders:[],payments:[],log:[]};
const isMgr=()=>can('expenses');
const oById=(list,id)=>(list||[]).find(x=>x.id===id);
const supName=id=>(oById(OB().suppliers,id)||{}).name||'—';
const catName=id=>(oById(OB().categories,id)||{}).name||'—';
const cliName=id=>(oById(DB.clients,id)||{}).name||'—';
const UNIT_L={m2:'m²',ml:'metro lineal',un:'unidad'};
const UNIT_S={m2:'/ m²',ml:'/ m',un:'c/u'};
const esc=t=>escHtml(t==null?'':t);
const fmtNum=(n,d)=>(Number(n)||0).toLocaleString('es-PY',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
const OERR={'forbidden':'No tenés permiso para esto','supplier has products':'El proveedor tiene productos: eliminalos primero','category has products':'La categoría tiene productos: movelos o eliminalos primero',
  'mark the payment as pending before changing the amount':'Marcá el pago como pendiente antes de cambiar el monto','already paid':'Ya está pagado','invalid caja':'Caja inválida','exchange rate required':'Ingresá la cotización',
  'not a construction company':'Esta empresa no es de Construcción y Obras'};
const oErr=e=>{ const m=apiErr(e); return OERR[m]||(m.endsWith(' required')?'Completá los campos obligatorios':m.startsWith('invalid ')?'Hay un dato inválido':m); };
function oToast(msg,kind){ toast(msg,kind); document.getElementById('toastMsg').textContent=msg; }
function oModal(html){ document.getElementById('modalHost').innerHTML=html; document.getElementById('overlay').classList.add('open'); }
async function oApi(method,entity,id,body){
  const path='/api/obra/'+entity+(id?'/'+id:'')+(method==='DELETE'?'?companyId='+encodeURIComponent(activeCompanyId()):'');
  return apiReq(method,path,method==='DELETE'?undefined:{companyId:activeCompanyId(),...(body||{})});
}
async function oSave(entity,id,body,msg){ try{ const r=await oApi(id?'PATCH':'POST',entity,id,body); await reload(); if(msg) oToast(msg); return r.row; }catch(e){ oToast(oErr(e),'warn'); return null; } }
async function oDelete(entity,id,what){ if(!confirm('¿Eliminar '+what+'? Esta acción no se puede deshacer.')) return false;
  try{ await oApi('DELETE',entity,id); await reload(); oToast('Eliminado'); return true; }catch(e){ oToast(oErr(e),'warn'); return false; } }
const daysTo=d=>{ if(!d) return null; const a=new Date(today()+'T00:00:00'), b=new Date(d+'T00:00:00'); return Math.round((b-a)/86400000); };
function whenTxt(d){ const n=daysTo(d); if(n==null) return ''; if(n===0) return 'hoy'; if(n===1) return 'mañana'; if(n===-1) return 'ayer'; return n>0?`en ${n} días`:`hace ${-n} días`; }
function whenBadge(d,done){ const n=daysTo(d); if(n==null||done) return ''; const cls=n<0?'hot':n<=3?'warm':''; return `<span class="days-badge ${cls}">${n<0?'Atrasado':esc(whenTxt(d))}</span>`; }
const fDate=d=>d?fmtDate(d):'—';
const oInput=(id,label,v,o)=>{ o=o||{}; return `<div class="fg ${o.full?'full':''}"><label>${label}${o.req?' <span class="req">*</span>':''}</label><input id="${id}" ${o.type?`type="${o.type}"`:''} ${o.mode?`inputmode="${o.mode}"`:''} value="${esc(v)}" placeholder="${esc(o.ph||'')}"></div>`; };
const oSel=(id,label,opts,sel,o)=>{ o=o||{}; return `<div class="fg ${o.full?'full':''}"><label>${label}${o.req?' <span class="req">*</span>':''}</label><select id="${id}" ${o.on?`onchange="${o.on}"`:''}>${o.blank!=null?`<option value="">${o.blank}</option>`:''}${opts.map(([v,l])=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`; };
const modalHead=(title,sub)=>`<div class="modal-head"><div><h3>${title}</h3>${sub?`<p>${sub}</p>`:''}</div><button class="x" onclick="closeModal()">${xIcon()}</button></div>`;
const modalFoot=(saveFn,label,extra)=>`<div class="modal-foot">${extra||''}<button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="${saveFn}">${label||'Guardar'}</button></div>`;
const tabsHTML=(cur,list,fn)=>`<div class="tabs">${list.map(([k,l])=>`<button class="tab ${cur===k?'active':''}" onclick="${fn}('${k}')">${l}</button>`).join('')}</div>`;
const sectionHead=(title,desc,actions)=>`<div class="section-head"><div><h2>${title}</h2>${desc?`<div class="desc">${desc}</div>`:''}</div><div class="head-actions">${actions||''}</div></div>`;
const clientOpts=()=>myScope(DB.clients).map(c=>[c.id,c.name]);

/* ---------- budget math (same as lib/obra-calc.ts) ---------- */
const lArea=l=>(+l.width||0)*(+l.height||0);
const lMeasure=(u,l)=>u==='m2'?lArea(l):u==='ml'?2*((+l.width||0)+(+l.height||0)):1;
function partCost(p,l){ let t=p.productId?(+p.price||0)*lMeasure(p.unit,l):0; (p.accessories||[]).forEach(a=>t+=(+a.price||0)*(+a.qty||0)); return t; }
const laborCost=l=>(+l.laborRate||0)*(l.laborMode==='m2'?lArea(l):1);
const lUnit=l=>(l.parts||[]).reduce((t,p)=>t+partCost(p,l),0)+laborCost(l);
const lTotal=l=>lUnit(l)*Math.max(1,+l.qty||1);
function smartName(l){ const b=(l.parts||[]).filter(p=>p.productName).map(p=>`${(p.label||'').toLowerCase()} ${p.productName}`.trim());
  if(!b.length) return l.baseName; return `${l.baseName} con ${b.length===1?b[0]:b.slice(0,-1).join(', ')+' y '+b[b.length-1]}`; }
const mLabel=l=>(+l.width&&+l.height)?`${fmtNum(l.width,2)} × ${fmtNum(l.height,2)} m`:'';
// k turns cost into client price. Sales agents receive prices with the margin already included.
const bFactor=b=>b.pricesIncludeMargin?1:1+(+b.marginPct||0)/100;
const bCost=b=>(b.lines||[]).reduce((t,l)=>t+lTotal(l),0);
const bPrice=b=>bCost(b)*bFactor(b);

/* ============================================================
   HOJA 1 — OBRAS EN CURSO
   ============================================================ */
let obSort='general';
const projTasks=id=>OB().tasks.filter(t=>t.projectId===id);
function projPct(p){ const t=projTasks(p.id); if(!t.length) return p.status==='done'?100:0; return Math.round(t.filter(x=>x.done).length/t.length*100); }
function projNext(p){ return projTasks(p.id).filter(t=>!t.done&&t.dueDate).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]; }
function viewObras(){
  const c=activeCompany(); if(!c) return emptyState('Sin empresa','Elegí una empresa.','shield');
  return sectionHead('Obras en curso','Estado de cada obra, próximos pagos y recordatorios',isMgr()?`<button class="btn primary" onclick="openProject()">${plus()}Nueva obra</button>`:'')
   +`<div class="obra-grid"><div>${tabsHTML(obSort,[['general','Vista general'],['age','Orden de antigüedad'],['priority','Prioridad']],'setObSort')}<div id="obList" style="margin-top:14px"></div></div><div id="obSide"></div></div>`;
}
POST.obras=()=>{ renderObList(); renderObSide(); };
function setObSort(k){ obSort=k; go('obras'); }
function renderObList(){
  let ps=OB().projects.filter(p=>p.status!=='done');
  if(obSort==='general') ps.sort((a,b)=>projPct(b)-projPct(a)||a.name.localeCompare(b.name));
  else if(obSort==='age') ps.sort((a,b)=>String(a.startDate||a.createdAt).localeCompare(String(b.startDate||b.createdAt)));
  else ps.sort((a,b)=>{ const x=projNext(a),y=projNext(b); return (x?x.dueDate:'9999').localeCompare(y?y.dueDate:'9999'); });
  const hint={general:'Ordenadas por porcentaje completado',age:'Las que empezaron hace más tiempo primero',priority:'Las que tienen tareas por vencer primero'}[obSort];
  const done=OB().projects.filter(p=>p.status==='done');
  document.getElementById('obList').innerHTML=`<div class="hint" style="margin-bottom:10px">${hint}</div>`
   +(ps.length?ps.map(projCard).join(''):`<div class="card" style="padding:40px 20px"><div class="empty"><div class="big">Sin obras en curso</div>${isMgr()?'Creá una obra o generala desde una propuesta aprobada.':'Todavía no hay obras cargadas.'}</div></div>`)
   +(done.length?`<details class="card" style="padding:14px 18px;margin-top:12px"><summary style="cursor:pointer;font-weight:600">Obras finalizadas (${done.length})</summary>${done.map(p=>`<div class="fact" style="cursor:pointer" onclick="openProject('${p.id}')"><div class="l">${esc(p.name)}<small>${esc(cliName(p.clientId))}</small></div><div class="a">${fDate(p.startDate)}</div></div>`).join('')}</details>`:'');
}
function projCard(p){
  const t=projTasks(p.id), d=t.filter(x=>x.done).length, pct=projPct(p), nx=projNext(p);
  return `<div class="card obra-card" onclick="openProject('${p.id}')">
    <div class="row-flex" style="justify-content:space-between;align-items:flex-start;gap:12px"><div style="min-width:0"><div class="obra-name">${esc(p.name)}</div>
      <div class="cell-sub">${esc([cliName(p.clientId)!=='—'?cliName(p.clientId):'',p.location].filter(Boolean).join(' · '))}${p.startDate?` · inicio ${fDate(p.startDate)}`:''}</div></div>
      <div class="obra-pct">${pct}%</div></div>
    <div class="bar"><span style="width:${pct}%"></span></div>
    <div class="row-flex" style="justify-content:space-between;gap:10px;font-size:12.5px;color:var(--ink-2)"><span>${t.length?`${d} de ${t.length} tareas terminadas`:'Sin tareas cargadas'}</span>
      ${nx?`<span>Próxima: <b style="color:var(--ink)">${esc(nx.title)}</b> · ${fDate(nx.dueDate)} ${whenBadge(nx.dueDate)}</span>`:''}</div></div>`;
}
function renderObSide(){
  let h='';
  if(isMgr()){
    const pend=dir=>OB().payments.filter(p=>p.direction===dir&&p.status!=='paid').sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
    const card=(title,dir)=>{ const l=pend(dir), p=l[0];
      return `<div class="card panel" style="margin-bottom:14px"><div class="panel-title">${title}</div>${p?`<div class="panel-big ${dir==='out'?'neg':''}">${fmt(p.amount)}</div>
        <div class="panel-note">${esc(dir==='in'?cliName(p.clientId):supName(p.supplierId))}${p.description?' · '+esc(p.description):''}</div>
        <div class="facts"><div class="fact"><div class="l">Vence</div><div class="a">${fDate(p.dueDate)} ${whenBadge(p.dueDate)}</div></div>${p.method==='cheque'?`<div class="fact"><div class="l">Cheque</div><div class="a">N° ${esc(p.chequeNumber||'—')}</div></div>`:''}
        <div class="fact"><div class="l">Total pendiente<small>${l.length} ${l.length===1?'pago':'pagos'}</small></div><div class="a">${fmt(l.reduce((t,x)=>t+(+x.amount||0),0))}</div></div></div>`
        :`<div class="panel-note" style="margin:8px 0 12px">Nada pendiente</div>`}</div>`; };
    h+=card('Próximo cobro','in')+card('Próximo pago','out')+`<button class="btn ghost sm" style="margin:-4px 0 14px" onclick="go('calendar')">Ver calendario de pagos →</button>`;
  }
  const rs=OB().reminders.filter(r=>!r.done).sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));
  const doneN=OB().reminders.filter(r=>r.done).length;
  h+=`<div class="card panel"><div class="panel-title">Recordatorios</div>
    <div class="rem-add"><input id="remText" class="input" placeholder="Nuevo recordatorio" onkeydown="if(event.key==='Enter')addReminder()"><input id="remDate" class="input" type="date" style="width:140px"><button class="btn primary sm" onclick="addReminder()">${plus()}</button></div>
    <div class="facts">${rs.map(r=>`<div class="fact"><div class="l" style="display:flex;gap:9px;align-items:flex-start"><input type="checkbox" onchange="toggleReminder('${r.id}',true)" style="margin-top:3px"><span>${esc(r.text)}${r.date?`<small>${fDate(r.date)} ${whenBadge(r.date)}</small>`:''}</span></div><div class="a"><button class="btn ghost sm danger" aria-label="Eliminar" onclick="oDelete('reminders','${r.id}','el recordatorio')">${trash()}</button></div></div>`).join('')||'<div class="panel-note" style="padding:10px 0">Sin recordatorios pendientes</div>'}</div>
    ${doneN?`<div class="hint" style="padding:8px 0">${doneN} ${doneN===1?'hecho':'hechos'} · <a href="#" onclick="clearReminders();return false">borrar hechos</a></div>`:''}</div>`;
  document.getElementById('obSide').innerHTML=h;
}
async function addReminder(){ const text=val('remText').trim(); if(!text){ document.getElementById('remText').classList.add('err'); return; } await oSave('reminders',null,{text,date:val('remDate')||null},'Recordatorio agregado'); }
async function toggleReminder(id,done){ await oSave('reminders',id,{done}); }
async function clearReminders(){ for(const r of OB().reminders.filter(r=>r.done)){ try{ await oApi('DELETE','reminders',r.id); }catch(e){} } await reload(); }

/* ---------- obra detail ---------- */
function openProject(id){
  const p=id?oById(OB().projects,id):null;
  if(!p){ if(!isMgr()) return; return editProject(null); }
  const ts=projTasks(p.id).sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));
  const prop=p.proposalId&&oById(OB().proposals,p.proposalId);
  oModal(`<div class="modal wide">${modalHead(esc(p.name),esc([cliName(p.clientId)!=='—'?cliName(p.clientId):'',p.location,p.startDate?'inicio '+fDate(p.startDate):''].filter(Boolean).join(' · ')))}
    <div class="modal-body"><div class="row-flex" style="gap:14px;align-items:center;margin-bottom:14px"><div class="obra-pct">${projPct(p)}%</div><div class="bar" style="flex:1;margin:0"><span style="width:${projPct(p)}%"></span></div></div>
    ${prop?`<div class="note">Propuesta N° ${String(prop.number).padStart(4,'0')} · ${fmt(prop.total)}</div>`:''}${p.notes?`<div class="note">${esc(p.notes)}</div>`:''}
    <div class="panel-title" style="margin-bottom:6px">Tareas</div>
    <div class="facts">${ts.map(t=>`<div class="fact"><div class="l" style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" ${t.done?'checked':''} ${isMgr()?`onchange="toggleTask('${t.id}',this.checked,'${p.id}')"`:'disabled'} style="margin-top:3px">
      <span style="${t.done?'text-decoration:line-through;color:var(--muted)':''}">${esc(t.title)}${t.dueDate?`<small>Vence ${fDate(t.dueDate)} ${whenBadge(t.dueDate,t.done)}</small>`:''}</span></div>
      <div class="a">${isMgr()?`<button class="btn ghost sm danger" aria-label="Eliminar" onclick="delTask('${t.id}','${p.id}')">${trash()}</button>`:''}</div></div>`).join('')||'<div class="panel-note" style="padding:8px 0">Sin tareas. El avance se calcula con las tareas terminadas.</div>'}</div>
    ${isMgr()?`<div class="rem-add" style="margin-top:12px"><input id="tkTitle" class="input" placeholder="Nueva tarea, ej. Instalar ventanas planta alta" onkeydown="if(event.key==='Enter')addTask('${p.id}')"><input id="tkDate" class="input" type="date" style="width:150px"><button class="btn primary sm" onclick="addTask('${p.id}')">${plus()}Tarea</button></div>`:''}
    </div>${isMgr()?`<div class="modal-foot"><button class="btn ghost danger" onclick="delProject('${p.id}')">Eliminar obra</button><span style="flex:1"></span><button class="btn" onclick="editProject('${p.id}')">Editar datos</button><button class="btn primary" onclick="finishProject('${p.id}',${p.status==='done'})">${p.status==='done'?'Reabrir obra':'Marcar finalizada'}</button></div>`:''}</div>`);
}
async function addTask(pid){ const title=val('tkTitle').trim(); if(!title){ document.getElementById('tkTitle').classList.add('err'); return; } if(await oSave('tasks',null,{projectId:pid,title,dueDate:val('tkDate')||null})) openProject(pid); }
async function toggleTask(id,done,pid){ if(await oSave('tasks',id,{done})) openProject(pid); }
async function delTask(id,pid){ if(await oDelete('tasks',id,'la tarea')) openProject(pid); }
async function finishProject(id,reopen){ if(await oSave('projects',id,{status:reopen?'active':'done'},reopen?'Obra reabierta':'Obra finalizada')) closeModal(); }
async function delProject(id){ if(await oDelete('projects',id,'la obra y sus tareas')) closeModal(); }
function editProject(id,preset){
  const p=(id&&oById(OB().projects,id))||preset||{};
  oModal(`<div class="modal">${modalHead(id?'Editar obra':'Nueva obra','El avance se calcula con las tareas terminadas.')}
    <div class="modal-body"><div class="form-grid">${oInput('pj_name','Nombre de la obra',p.name,{full:1,req:1,ph:'ej. Residencia Benítez'})}
    ${oSel('pj_client','Cliente',clientOpts(),p.clientId,{blank:'Sin cliente'})}${oInput('pj_loc','Ubicación',p.location,{ph:'ej. Ciudad del Este, km 7'})}
    ${oInput('pj_start','Fecha de inicio',p.startDate||today(),{type:'date'})}<div class="fg full"><label>Notas</label><textarea id="pj_notes" rows="2">${esc(p.notes)}</textarea></div></div></div>
    ${modalFoot(`saveProject('${id||''}')`,id?'Guardar':'Crear obra')}</div>`);
  window._pjPreset=preset||null;
}
async function saveProject(id){
  const name=val('pj_name').trim(); if(!name){ document.getElementById('pj_name').classList.add('err'); oToast('Ingresá el nombre','warn'); return; }
  const body={name,clientId:val('pj_client')||null,location:val('pj_loc'),startDate:val('pj_start')||null,notes:val('pj_notes')};
  if(!id&&window._pjPreset){ body.proposalId=window._pjPreset.proposalId||null; body.budgetId=window._pjPreset.budgetId||null; }
  const r=await oSave('projects',id||null,body,id?'Obra actualizada':'Obra creada'); if(r){ closeModal(); if(!id) go('obras'); }
}

/* ============================================================
   HOJA 3 — PRESUPUESTOS
   ============================================================ */
let curBudgetId=null;
function viewBudgets(){
  const c=activeCompany(); if(!c) return emptyState('Sin empresa','Elegí una empresa.','shield');
  const bs=OB().budgets;
  return sectionHead('Presupuestos','Cada ítem se calcula con medidas, productos del proveedor, accesorios y mano de obra',`<button class="btn primary" onclick="newBudget()">${plus()}Nuevo presupuesto</button>`)
   +`<div class="card table-card"><div class="tbl-scroll"><table class="stack"><thead><tr><th>N°</th><th>Presupuesto</th><th>Cliente</th><th class="num">Ítems</th>${isMgr()?'<th class="num">Costo</th><th class="num">Margen</th>':''}<th class="num">Precio al cliente</th><th>Actualizado</th><th></th></tr></thead><tbody>
   ${bs.map(b=>`<tr style="cursor:pointer" onclick="openBudget('${b.id}')"><td data-label="N°"><b>${String(b.number).padStart(4,'0')}</b></td>
     <td class="st-head"><div><b>${esc(b.title||b.projectName||'Sin título')}</b><div class="cell-sub">${esc(b.location||'')}</div></div></td><td data-label="Cliente">${esc(cliName(b.clientId))}</td>
     <td class="num" data-label="Ítems">${(b.lines||[]).reduce((t,l)=>t+(+l.qty||1),0)}</td>${isMgr()?`<td class="num" data-label="Costo">${fmt(bCost(b))}</td><td class="num" data-label="Margen">${fmtNum(b.marginPct,1)}%</td>`:''}
     <td class="num" data-label="Precio"><b>${fmt(bPrice(b))}</b></td><td data-label="Actualizado">${fmtStamp(b.updatedAt||b.createdAt)}</td>
     <td class="num st-act"><span class="row-flex" style="justify-content:flex-end;gap:2px" onclick="event.stopPropagation()"><button class="btn ghost sm" onclick="dupBudget('${b.id}')">Duplicar</button><button class="btn ghost sm danger" aria-label="Eliminar" onclick="oDelete('budgets','${b.id}','el presupuesto ${b.number}')">${trash()}</button></span></td></tr>`).join('')
     ||`<tr><td colspan="9" class="st-block"><div class="empty"><div class="big">Sin presupuestos</div>${OB().products.length?'Creá el primero.':'Primero cargá proveedores y productos en Base de datos.'}</div></td></tr>`}
   </tbody></table></div></div>`;
}
async function newBudget(){ const r=await oSave('budgets',null,{title:'',lines:[]}); if(r){ curBudgetId=r.id; go('budget'); } }
async function dupBudget(id){ const b=oById(OB().budgets,id); if(!b) return;
  // a sales agent's copy is re-priced from the database on the server; the margin stays as configured
  const r=await oSave('budgets',null,{title:(b.title||'Presupuesto')+' (copia)',clientId:b.clientId,projectName:b.projectName,location:b.location,marginPct:b.marginPct,notes:b.notes,lines:b.lines.map(l=>({...l,id:undefined,laborRate:l.laborRate}))},'Presupuesto duplicado'); if(r){ curBudgetId=r.id; go('budget'); } }
function openBudget(id){ curBudgetId=id; go('budget'); }
function viewBudget(){
  const b=oById(OB().budgets,curBudgetId); if(!b) return viewBudgets();
  const k=bFactor(b);
  return sectionHead(`Presupuesto N° ${String(b.number).padStart(4,'0')}`,'Los precios se toman de la base de datos al guardar cada ítem',`<button class="btn ghost" onclick="go('budgets')">← Presupuestos</button><button class="btn" onclick="newProposal('${b.id}')">Generar propuesta</button><button class="btn primary" onclick="pickItemType()">${plus()}Agregar ítem</button>`)
   +`<div class="card" style="padding:18px 20px;margin-bottom:16px"><div class="form-grid four">${oInput('bg_title','Título',b.title,{ph:'ej. Casa Benítez – aberturas'})}${oSel('bg_client','Cliente',clientOpts(),b.clientId,{blank:'Sin cliente'})}
     ${oInput('bg_proj','Nombre del proyecto',b.projectName)}${oInput('bg_loc','Ubicación',b.location)}${isMgr()?oInput('bg_margin','Margen %',fmtNum(b.marginPct,1),{mode:'decimal'}):''}
     <div class="fg ${isMgr()?'':'full'}" style="justify-content:flex-end"><button class="btn" onclick="saveBudgetHead()">Guardar datos</button></div></div></div>
   <div class="card table-card"><div class="tbl-scroll"><table class="stack"><thead><tr><th>Ítem</th><th>Medidas</th><th class="num">Cant.</th><th class="num">Precio unit.</th><th class="num">Total</th><th></th></tr></thead><tbody>
   ${(b.lines||[]).map((l,i)=>`<tr><td class="st-head"><div><b>${esc(smartName(l))}</b><div class="cell-sub">${(l.parts||[]).filter(p=>p.productId).map(p=>esc(supName(p.supplierId))).filter((v,j,a)=>a.indexOf(v)===j).join(', ')}${(l.parts||[]).some(p=>(p.accessories||[]).length)?' · con accesorios':''} · mano de obra ${l.laborMode==='m2'?'por m²':'por ítem'}</div></div></td>
     <td data-label="Medidas">${esc(mLabel(l))||'—'}${lArea(l)?`<div class="cell-sub">${fmtNum(lArea(l),2)} m²</div>`:''}</td>
     <td class="num" data-label="Cant."><input class="input qty-in" type="number" min="1" value="${l.qty}" onchange="setLineQty(${i},this.value)"></td>
     <td class="num" data-label="Precio unit.">${fmt(lUnit(l)*k)}</td><td class="num" data-label="Total"><b>${fmt(lTotal(l)*k)}</b></td>
     <td class="num st-act"><span class="row-flex" style="justify-content:flex-end;gap:2px"><button class="btn ghost sm" onclick="openLine(${i})">Editar</button><button class="btn ghost sm" onclick="dupLine(${i})">Duplicar</button><button class="btn ghost sm danger" aria-label="Eliminar" onclick="delLine(${i})">${trash()}</button></span></td></tr>`).join('')
     ||'<tr><td colspan="6" class="st-block"><div class="empty"><div class="big">Sin ítems</div>Tocá “Agregar ítem” para cargar el primero.</div></td></tr>'}
   </tbody></table></div>
   <div class="facts budget-tot">${isMgr()?`<div class="fact"><div class="l">Costo (materiales + mano de obra)</div><div class="a">${fmt(bCost(b))}</div></div><div class="fact"><div class="l">Margen ${fmtNum(b.marginPct,1)}%</div><div class="a">${fmt(bPrice(b)-bCost(b))}</div></div>`:''}
     <div class="fact total"><div class="l">Precio al cliente</div><div class="a">${fmt(bPrice(b))}</div></div></div></div>`;
}
const curBudget=()=>oById(OB().budgets,curBudgetId);
async function saveBudgetLines(lines,msg){ return oSave('budgets',curBudgetId,{lines},msg); }
async function saveBudgetHead(){ const body={title:val('bg_title'),clientId:val('bg_client')||null,projectName:val('bg_proj'),location:val('bg_loc')};
  if(isMgr()) body.marginPct=parseDec(val('bg_margin')); await oSave('budgets',curBudgetId,body,'Datos guardados'); }
async function setLineQty(i,v){ const b=curBudget(); const lines=b.lines.map(l=>({...l})); lines[i].qty=Math.max(1,parseInt(v)||1); await saveBudgetLines(lines); }
async function dupLine(i){ const b=curBudget(); const lines=b.lines.map(l=>({...l})); lines.splice(i+1,0,{...JSON.parse(JSON.stringify(b.lines[i])),id:undefined}); await saveBudgetLines(lines,'Ítem duplicado'); }
async function delLine(i){ if(!confirm('¿Quitar este ítem del presupuesto?')) return; const b=curBudget(); const lines=b.lines.filter((_,j)=>j!==i); await saveBudgetLines(lines,'Ítem quitado'); }

/* ---------- item editor: measures, products per part, accessories, labour ---------- */
let LE=null, LEi=null;
function pickItemType(){
  const ts=OB().itemTypes;
  oModal(`<div class="modal">${modalHead('Agregar ítem','Elegí el tipo de ítem; después cargás medidas y materiales.')}
    <div class="modal-body"><div class="pick-list">${ts.map(t=>`<button class="pick" onclick="startLine('${t.id}')"><b>${esc(t.name)}</b><span>${(t.parts||[]).map(p=>esc(p.label)).join(' · ')||'Sin partes definidas'}</span></button>`).join('')}
    <button class="pick" onclick="startLine('')"><b>Ítem libre</b><span>Sin plantilla: definís las partes ahora</span></button></div>
    ${ts.length?'':'<div class="note" style="margin-top:12px">Podés crear tipos de ítem (ej. Puerta mano amiga: vidrio + perfil) en Base de datos → Tipos de ítem.</div>'}</div></div>`);
}
function startLine(typeId){
  const t=typeId?oById(OB().itemTypes,typeId):null;
  LE={itemTypeId:typeId||undefined,baseName:t?t.name:'',width:'',height:'',qty:1,laborMode:t?t.laborMode||'item':'item',laborRate:t?+t.laborRate||0:0,
    parts:t?(t.parts||[]).map(p=>({label:p.label,categoryId:p.categoryId,accessories:[]})):[{label:'Vidrio',categoryId:(OB().categories.find(c=>/vidri/i.test(c.name))||{}).id,accessories:[]}]};
  LEi=null; renderLE();
}
function openLine(i){ const b=curBudget(); LE=JSON.parse(JSON.stringify(b.lines[i])); LEi=i;
  (LE.parts||[]).forEach(p=>{ p.accessories=p.accessories||[]; if(p.productId&&!p.supplierId){ const pr=oById(OB().products,p.productId); if(pr) p.supplierId=pr.supplierId; } }); renderLE(); }
const prodOf=(sup,cat)=>OB().products.filter(p=>(!sup||p.supplierId===sup)&&(!cat||p.categoryId===cat));
const supsFor=cat=>OB().suppliers.filter(s=>OB().products.some(p=>p.supplierId===s.id&&(!cat||p.categoryId===cat)));
// Prices shown here are what the product costs (managers) or the client price (sales agents).
const priceTxt=p=>`${fmt(p.price)} ${UNIT_S[p.unit]||''}`;
function renderLE(){
  const cats=OB().categories.map(c=>[c.id,c.name]);
  const accCat=(OB().categories.find(c=>/acces/i.test(c.name))||{}).id;
  const partHTML=(p,i)=>{ const sups=supsFor(p.categoryId); const prods=prodOf(p.supplierId,p.categoryId);
    return `<div class="le-part"><div class="le-row">
      <div class="fg"><label>Parte</label><input value="${esc(p.label)}" placeholder="ej. Vidrio" onchange="LE.parts[${i}].label=this.value;updLE()"></div>
      <div class="fg"><label>Categoría</label><select onchange="LE.parts[${i}].categoryId=this.value;LE.parts[${i}].supplierId='';LE.parts[${i}].productId='';renderLE()"><option value="">—</option>${cats.map(([v,l])=>`<option value="${v}" ${v===p.categoryId?'selected':''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="fg"><label>Proveedor</label><select onchange="LE.parts[${i}].supplierId=this.value;LE.parts[${i}].productId='';renderLE()"><option value="">Elegí…</option>${sups.map(s=>`<option value="${s.id}" ${s.id===p.supplierId?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="fg grow"><label>Producto</label><select onchange="pickProd(${i},this.value)"><option value="">${p.supplierId?'Elegí…':'Primero el proveedor'}</option>${prods.map(x=>`<option value="${x.id}" ${x.id===p.productId?'selected':''}>${esc(x.name)} — ${priceTxt(x)}</option>`).join('')}</select></div>
      <div class="le-sub" id="lePart${i}"></div><button class="btn ghost sm danger" aria-label="Quitar parte" onclick="LE.parts.splice(${i},1);renderLE()">${trash()}</button></div>
      ${(p.accessories||[]).map((a,j)=>{ const ap=prodOf(a.supplierId,accCat).length?prodOf(a.supplierId,accCat):prodOf(a.supplierId).filter(x=>x.unit==='un');
        return `<div class="le-row acc"><div class="fg"><label>Accesorio · proveedor</label><select onchange="LE.parts[${i}].accessories[${j}].supplierId=this.value;LE.parts[${i}].accessories[${j}].productId='';renderLE()"><option value="">Elegí…</option>${supsFor(accCat).concat(accCat?[]:OB().suppliers).filter((s,k,arr)=>arr.indexOf(s)===k).map(s=>`<option value="${s.id}" ${s.id===a.supplierId?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="fg grow"><label>Accesorio</label><select onchange="pickAcc(${i},${j},this.value)"><option value="">Elegí…</option>${ap.map(x=>`<option value="${x.id}" ${x.id===a.productId?'selected':''}>${esc(x.name)} — ${fmt(x.price)} c/u</option>`).join('')}</select></div>
        <div class="fg" style="max-width:90px"><label>Cantidad</label><input type="number" min="0" step="1" value="${a.qty||1}" oninput="LE.parts[${i}].accessories[${j}].qty=+this.value||0;updLE()"></div>
        <div class="le-sub" id="leAcc${i}_${j}"></div><button class="btn ghost sm danger" aria-label="Quitar accesorio" onclick="LE.parts[${i}].accessories.splice(${j},1);renderLE()">${trash()}</button></div>`; }).join('')}
      <button class="btn ghost sm" onclick="LE.parts[${i}].accessories.push({qty:1});renderLE()">${plus()}Accesorio para ${esc((p.label||'esta parte').toLowerCase())}</button></div>`; };
  oModal(`<div class="modal wide">${modalHead(LEi==null?'Nuevo ítem':'Editar ítem','Los accesorios van siempre por cantidad. La mano de obra puede ser por ítem o por m².')}
    <div class="modal-body"><div class="form-grid four">${`<div class="fg full"><label>Nombre del ítem <span class="req">*</span></label><input id="le_name" value="${esc(LE.baseName)}" placeholder="ej. Puerta mano amiga" oninput="LE.baseName=this.value;updLE()"></div>`}
      <div class="fg"><label>Ancho (m)</label><input inputmode="decimal" value="${LE.width===''?'':fmtNum(LE.width,2)}" placeholder="1,20" oninput="LE.width=parseDec(this.value);updLE()"></div>
      <div class="fg"><label>Alto (m)</label><input inputmode="decimal" value="${LE.height===''?'':fmtNum(LE.height,2)}" placeholder="2,10" oninput="LE.height=parseDec(this.value);updLE()"></div>
      <div class="fg"><label>Cantidad</label><input type="number" min="1" value="${LE.qty}" oninput="LE.qty=Math.max(1,parseInt(this.value)||1);updLE()"></div>
      <div class="fg derived"><span>Superficie</span><b id="leArea">—</b></div></div>
    <div class="panel-title" style="margin:18px 0 8px">Materiales</div>${LE.parts.map(partHTML).join('')}
    <button class="btn sm" onclick="LE.parts.push({label:'',accessories:[]});renderLE()">${plus()}Agregar parte (vidrio, perfil…)</button>
    <div class="panel-title" style="margin:18px 0 8px">Mano de obra</div>
    <div class="form-grid four"><div class="fg"><label>Se cobra</label><select onchange="LE.laborMode=this.value;updLE()"><option value="item" ${LE.laborMode!=='m2'?'selected':''}>Por ítem</option><option value="m2" ${LE.laborMode==='m2'?'selected':''}>Por m²</option></select></div>
      <div class="fg"><label>Valor ${isMgr()?'(costo)':''}</label><input inputmode="numeric" value="${Math.round(LE.laborRate||0)?fmtNum(LE.laborRate):''}" oninput="LE.laborRate=parseDec(this.value);updLE()"></div><div class="fg derived"><span>Mano de obra por ítem</span><b id="leLabor">—</b></div></div>
    <div class="le-sum"><div><div class="hint">Así sale en el presupuesto</div><div id="leSmart" class="le-smart"></div></div>
      <div class="facts"><div class="fact"><div class="l">${isMgr()?'Costo por ítem':'Precio por ítem'}</div><div class="a" id="leUnit">—</div></div><div class="fact total"><div class="l">${isMgr()?'Costo total':'Total'} (× <span id="leQty">1</span>)</div><div class="a" id="leTot">—</div></div></div></div>
    </div>${modalFoot('saveLE()',LEi==null?'Agregar al presupuesto':'Guardar ítem')}</div>`);
  updLE();
}
function pickProd(i,id){ const pr=oById(OB().products,id); const p=LE.parts[i];
  if(pr){ p.productId=pr.id; p.productName=pr.name; p.unit=pr.unit; p.price=+pr.price; p.supplierId=pr.supplierId; p.categoryId=pr.categoryId; } else { p.productId=''; p.productName=''; p.price=0; } updLE(); }
function pickAcc(i,j,id){ const pr=oById(OB().products,id); const a=LE.parts[i].accessories[j];
  if(pr){ a.productId=pr.id; a.name=pr.name; a.price=+pr.price; a.supplierId=pr.supplierId; } else { a.productId=''; a.price=0; } updLE(); }
function updLE(){ const set=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
  set('leArea',lArea(LE)?fmtNum(lArea(LE),2)+' m²':'—'); set('leLabor',fmt(laborCost(LE)));
  LE.parts.forEach((p,i)=>{ set('lePart'+i,p.productId?`${fmt((+p.price||0)*lMeasure(p.unit,LE))}`+(p.unit!=='un'?` · ${fmtNum(lMeasure(p.unit,LE),2)} ${p.unit==='m2'?'m²':'m'}`:''):'');
    (p.accessories||[]).forEach((a,j)=>set(`leAcc${i}_${j}`,a.productId?fmt((+a.price||0)*(+a.qty||0)):'')); });
  set('leSmart',smartName(LE)||'—'); set('leUnit',fmt(lUnit(LE))); set('leQty',LE.qty); set('leTot',fmt(lTotal(LE))); }
async function saveLE(){
  if(!String(LE.baseName||'').trim()){ document.getElementById('le_name').classList.add('err'); oToast('Ingresá el nombre del ítem','warn'); return; }
  if(LE.parts.some(p=>p.productId)&&!(+LE.width&&+LE.height)&&LE.parts.some(p=>p.productId&&p.unit!=='un')){ oToast('Ingresá ancho y alto: hay materiales por m² o metro','warn'); return; }
  const b=curBudget(); const lines=b.lines.map(l=>({...l})); const line={...LE,width:+LE.width||0,height:+LE.height||0};
  if(LEi==null) lines.push(line); else lines[LEi]=line;
  if(await saveBudgetLines(lines,LEi==null?'Ítem agregado':'Ítem actualizado')) closeModal();
}

/* ============================================================
   HOJA 2 — PROPUESTAS COMERCIALES
   ============================================================ */
const propNo=p=>String(p.number).padStart(4,'0');
function viewProposals(){
  const c=activeCompany(); if(!c) return emptyState('Sin empresa','Elegí una empresa.','shield');
  const ps=OB().proposals;
  const missing=['ruc','contact','email'].filter(k=>!c[k]);
  return sectionHead('Propuestas comerciales','Formato estándar con el logo de la empresa; los trabajos salen del presupuesto elegido',`<button class="btn primary" onclick="newProposal()">${plus()}Nueva propuesta</button>`)
   +(missing.length&&isMgr()?`<div class="note">Faltan datos fijos de la empresa para la propuesta (${missing.map(k=>({ruc:'RUC',contact:'contacto',email:'email'})[k]).join(', ')}). Cargalos en <a href="#" onclick="go('settings');return false">Perfil y Ajustes</a>.</div>`:'')
   +`<div class="card table-card"><div class="tbl-scroll"><table class="stack"><thead><tr><th>N°</th><th>Cliente</th><th>Proyecto</th><th>Fecha</th><th class="num">Total</th><th></th></tr></thead><tbody>
   ${ps.map(p=>{ const obra=OB().projects.find(x=>x.proposalId===p.id);
     return `<tr style="cursor:pointer" onclick="openProposal('${p.id}')"><td data-label="N°"><b>${propNo(p)}</b></td><td class="st-head"><div><b>${esc(p.clientName||'—')}</b>${p.clientRuc?`<div class="cell-sub">RUC ${esc(p.clientRuc)}</div>`:''}</div></td>
     <td data-label="Proyecto">${esc(p.projectName||'—')}${obra?`<div class="cell-sub">Obra creada</div>`:''}</td><td data-label="Fecha">${fDate(p.date)}</td><td class="num" data-label="Total"><b>${fmt(p.total)}</b></td>
     <td class="num st-act"><span class="row-flex" style="justify-content:flex-end;gap:2px" onclick="event.stopPropagation()"><button class="btn ghost sm" onclick="proposalPDF('${p.id}')">PDF</button><button class="btn ghost sm danger" aria-label="Eliminar" onclick="oDelete('proposals','${p.id}','la propuesta ${propNo(p)}')">${trash()}</button></span></td></tr>`; }).join('')
     ||`<tr><td colspan="6" class="st-block"><div class="empty"><div class="big">Sin propuestas</div>Se generan desde un presupuesto.</div></td></tr>`}</tbody></table></div></div>`;
}
function newProposal(budgetId){
  const bs=OB().budgets.filter(b=>(b.lines||[]).length);
  if(!bs.length){ oToast('Primero armá un presupuesto con ítems','warn'); return; }
  oModal(`<div class="modal">${modalHead('Nueva propuesta','Los trabajos, el cliente y el proyecto se copian del presupuesto. Después podés ajustar cualquier dato.')}
    <div class="modal-body"><div class="form-grid">${oSel('np_budget','Presupuesto',bs.map(b=>[b.id,`N° ${String(b.number).padStart(4,'0')} · ${b.title||b.projectName||'Sin título'} · ${fmt(bPrice(b))}`]),budgetId||bs[0].id,{full:1,req:1})}
    ${oInput('np_terms','Términos de pago','50% al aprobar, 50% al finalizar la obra',{full:1})}${oInput('np_time','Plazo estimado después de la aprobación','',{full:1,ph:'ej. 20 días hábiles'})}</div></div>
    ${modalFoot('saveNewProposal()','Generar propuesta')}</div>`);
}
async function saveNewProposal(){ const r=await oSave('proposals',null,{budgetId:val('np_budget'),paymentTerms:val('np_terms'),estimatedTime:val('np_time')},'Propuesta generada'); if(r){ go('proposals'); openProposal(r.id); } }
let PE=null;
function openProposal(id){ const p=oById(OB().proposals,id); if(!p) return; PE=JSON.parse(JSON.stringify(p)); PE.items=PE.items||[]; renderPE(); }
function renderPE(){ const p=PE; const obra=OB().projects.find(x=>x.proposalId===p.id);
  oModal(`<div class="modal wide">${modalHead(`Propuesta N° ${propNo(p)}`,'Datos variables de esta propuesta. Los datos fijos de la empresa se cargan en Perfil y Ajustes.')}
    <div class="modal-body"><div class="form-grid four">${oInput('pe_cname','Cliente',p.clientName,{full:0})}${oInput('pe_cruc','RUC del cliente',p.clientRuc)}${oInput('pe_proj','Proyecto',p.projectName)}${oInput('pe_loc','Ubicación del proyecto',p.location)}${oInput('pe_date','Fecha',p.date,{type:'date'})}</div>
    <div class="panel-title" style="margin:16px 0 8px">Trabajos</div>
    <table class="pe-items"><thead><tr><th>Descripción</th><th style="width:80px">Cant.</th><th style="width:150px">Precio unit.</th><th style="width:140px;text-align:right">Total</th><th style="width:40px"></th></tr></thead><tbody>
    ${p.items.map((it,i)=>`<tr><td><textarea rows="2" oninput="PE.items[${i}].description=this.value">${esc(it.description)}</textarea></td><td><input type="number" min="1" value="${it.qty}" oninput="PE.items[${i}].qty=Math.max(1,parseInt(this.value)||1);updPE()"></td>
      <td><input inputmode="numeric" value="${fmtNum(it.unitPrice)}" oninput="PE.items[${i}].unitPrice=parseDec(this.value);updPE()"></td><td style="text-align:right" id="peT${i}"></td><td><button class="btn ghost sm danger" aria-label="Quitar" onclick="PE.items.splice(${i},1);renderPE()">${trash()}</button></td></tr>`).join('')}
    </tbody></table><button class="btn ghost sm" style="margin-top:6px" onclick="PE.items.push({description:'',qty:1,unitPrice:0});renderPE()">${plus()}Agregar trabajo</button>
    <div class="facts budget-tot"><div class="fact total"><div class="l">Total</div><div class="a" id="peTot"></div></div></div>
    <div class="form-grid">${oInput('pe_terms','Términos de pago',p.paymentTerms,{full:1})}${oInput('pe_time','Plazo estimado después de la aprobación',p.estimatedTime,{full:1})}
    <div class="fg full"><label>Datos bancarios</label><textarea id="pe_bank" rows="3">${esc(p.bankDetails)}</textarea></div><div class="fg full"><label>Notas</label><textarea id="pe_notes" rows="2">${esc(p.notes)}</textarea></div></div></div>
    <div class="modal-foot">${isMgr()?(obra?`<span class="hint">Obra creada: ${esc(obra.name)}</span>`:`<button class="btn" onclick="projectFromProposal()">Aprobada: crear obra</button>`):''}<span style="flex:1"></span><button class="btn" onclick="savePE(true)">Guardar y descargar PDF</button><button class="btn primary" onclick="savePE(false)">Guardar</button></div></div>`);
  updPE();
}
function updPE(){ let t=0; PE.items.forEach((it,i)=>{ const v=(+it.qty||1)*(+it.unitPrice||0); t+=v; const e=document.getElementById('peT'+i); if(e) e.textContent=fmt(v); }); const e=document.getElementById('peTot'); if(e) e.textContent=fmt(t); return t; }
async function savePE(pdf){
  const items=PE.items.map(it=>({description:String(it.description||'').trim(),qty:Math.max(1,+it.qty||1),unitPrice:Math.round(+it.unitPrice||0),total:Math.round((+it.unitPrice||0)*Math.max(1,+it.qty||1))})).filter(it=>it.description||it.unitPrice);
  const body={clientName:val('pe_cname'),clientRuc:val('pe_cruc'),projectName:val('pe_proj'),location:val('pe_loc'),date:val('pe_date')||null,items,paymentTerms:val('pe_terms'),estimatedTime:val('pe_time'),bankDetails:val('pe_bank'),notes:val('pe_notes')};
  const r=await oSave('proposals',PE.id,body,'Propuesta guardada'); if(r){ closeModal(); if(pdf) proposalPDF(r.id); }
}
function projectFromProposal(){ const p=PE; closeModal(); editProject(null,{name:p.projectName||('Obra '+(p.clientName||'')),clientId:p.clientId,location:p.location,startDate:today(),proposalId:p.id,budgetId:p.budgetId}); }

// Standard proposal: logo + fixed company details, client and project, works, total, terms, bank details, signatures.
function proposalPDF(id){
  const p=oById(OB().proposals,id); const c=activeCompany(); if(!p||!c) return;
  const { jsPDF }=window.jspdf; const doc=new jsPDF({unit:'mm',format:'a4'}); const W=210, M=16;
  let y=M;
  if(c.logo){ try{ const fmtImg=/^data:image\/png/.test(c.logo)?'PNG':'JPEG'; const ip=doc.getImageProperties(c.logo); const h=18, w=Math.min(50,ip.width/ip.height*h); doc.addImage(c.logo,fmtImg,M,y,w,h); }catch(e){} }
  doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text(c.name||'',W-M,y+5,{align:'right'});
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(80);
  [c.ruc?'RUC '+c.ruc:'',c.contact||'',c.email||''].filter(Boolean).forEach((t,i)=>doc.text(t,W-M,y+11+i*4.5,{align:'right'}));
  y+=30; doc.setDrawColor(200); doc.line(M,y,W-M,y); y+=9;
  doc.setTextColor(20); doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text('PROPUESTA COMERCIAL',M,y);
  doc.setFontSize(10); doc.text('N° '+propNo(p),W-M,y,{align:'right'}); y+=5;
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(90); doc.text('Fecha: '+(p.date?fmtDate(p.date):fmtDate(today())),W-M,y,{align:'right'}); y+=8;
  const kv=(k,v,x,yy)=>{ doc.setFont('helvetica','bold'); doc.setTextColor(90); doc.setFontSize(8); doc.text(k.toUpperCase(),x,yy); doc.setFont('helvetica','normal'); doc.setTextColor(20); doc.setFontSize(10); doc.text(doc.splitTextToSize(v||'—',85),x,yy+5); };
  kv('Cliente',p.clientName,M,y); kv('RUC del cliente',p.clientRuc,W/2+4,y); y+=14; kv('Proyecto',p.projectName,M,y); kv('Ubicación',p.location,W/2+4,y); y+=16;
  doc.autoTable({startY:y,margin:{left:M,right:M},head:[['Descripción','Cant.','Precio unit.','Total']],
    body:(p.items||[]).map(it=>[it.description,String(it.qty),fmtPdf(it.unitPrice),fmtPdf(it.total)]),
    foot:[[{content:'TOTAL',colSpan:3,styles:{halign:'right'}},fmtPdf(p.total)]],
    styles:{font:'helvetica',fontSize:9,cellPadding:2.4,textColor:20},headStyles:{fillColor:[42,120,214],textColor:255},footStyles:{fillColor:[240,243,248],textColor:20,fontStyle:'bold'},
    columnStyles:{1:{halign:'center',cellWidth:16},2:{halign:'right',cellWidth:32},3:{halign:'right',cellWidth:34}},
    didParseCell:d=>{ if(d.section==='head'&&d.column.index>0) d.cell.styles.halign=d.column.index===1?'center':'right'; }});
  y=doc.lastAutoTable.finalY+10;
  const block=(title,text)=>{ if(!text) return; const lines=doc.splitTextToSize(text,W-2*M); if(y+8+lines.length*4.5>270){ doc.addPage(); y=M; }
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(90); doc.text(title.toUpperCase(),M,y); doc.setFont('helvetica','normal'); doc.setTextColor(20); doc.setFontSize(10); doc.text(lines,M,y+5); y+=8+lines.length*4.5; };
  block('Términos de pago',p.paymentTerms); block('Plazo estimado después de la aprobación',p.estimatedTime); block('Datos bancarios',p.bankDetails); block('Notas',p.notes);
  if(y>240){ doc.addPage(); y=M+20; } else y=Math.max(y+18,250);
  doc.setDrawColor(120); doc.line(M,y,M+70,y); doc.line(W-M-70,y,W-M,y); doc.setFontSize(9); doc.setTextColor(80);
  doc.text('Firma y aclaración',M,y+5); doc.text(c.name||'Empresa',M,y+9.5); doc.text('Firma y aclaración',W-M-70,y+5); doc.text('Cliente: '+(p.clientName||''),W-M-70,y+9.5);
  doc.save(`Propuesta-${propNo(p)}-${(p.clientName||'cliente').replace(/[^\w\-]+/g,'_')}.pdf`);
}

/* ============================================================
   HOJA 4 — CALENDARIO DE PAGOS
   ============================================================ */
let calTab='in';
const METHOD_L={efectivo:'Efectivo',transferencia:'Transferencia',cheque:'Cheque'};
function viewCalendar(){
  const c=activeCompany(); if(!c) return emptyState('Sin empresa','Elegí una empresa.','shield');
  const pend=d=>OB().payments.filter(p=>p.direction===d&&p.status!=='paid');
  const sumA=l=>l.reduce((t,p)=>t+(+p.amount||0),0);
  const in30=l=>l.filter(p=>{ const n=daysTo(p.dueDate); return n!=null&&n<=30; });
  const cheques=OB().payments.filter(p=>p.method==='cheque'&&p.status!=='paid');
  return sectionHead('Calendario de pagos','Cobros a clientes y pagos a proveedores. Al marcar pagado se elige la caja y queda el movimiento.',`<button class="btn" onclick="openCPay(null,'out')">${plus()}Pago a proveedor</button><button class="btn primary" onclick="openCPay(null,'in')">${plus()}Cobro a cliente</button>`)
   +`<div class="grid panels-3">
     <div class="card panel"><div class="panel-title">Por cobrar</div><div class="panel-big">${fmt(sumA(pend('in')))}</div><div class="facts"><div class="fact"><div class="l">Vence en 30 días o antes</div><div class="a">${fmt(sumA(in30(pend('in'))))}</div></div><div class="fact"><div class="l">Atrasado</div><div class="a neg">${fmt(sumA(pend('in').filter(p=>daysTo(p.dueDate)<0)))}</div></div></div></div>
     <div class="card panel"><div class="panel-title">Por pagar</div><div class="panel-big neg">${fmt(sumA(pend('out')))}</div><div class="facts"><div class="fact"><div class="l">Vence en 30 días o antes</div><div class="a">${fmt(sumA(in30(pend('out'))))}</div></div><div class="fact"><div class="l">Atrasado</div><div class="a neg">${fmt(sumA(pend('out').filter(p=>daysTo(p.dueDate)<0)))}</div></div></div></div>
     <div class="card panel"><div class="panel-title">Cheques pendientes</div><div class="panel-big neg">${fmt(sumA(cheques.filter(p=>p.direction==='out')))}</div><div class="panel-note">Emitidos por debitar${cheques.some(p=>p.direction==='in')?` · recibidos por depositar ${fmt(sumA(cheques.filter(p=>p.direction==='in')))}`:''}</div><div class="facts">${cheques.slice().sort((a,b)=>String(a.chequeDate||a.dueDate).localeCompare(String(b.chequeDate||b.dueDate))).slice(0,4).map(p=>`<div class="fact"><div class="l">${p.direction==='in'?'Recibido':'Emitido'} N° ${esc(p.chequeNumber||'—')} · ${esc(p.direction==='in'?cliName(p.clientId):supName(p.supplierId))}<small>${fDate(p.chequeDate||p.dueDate)} ${whenBadge(p.chequeDate||p.dueDate)}</small></div><div class="a">${fmt(p.amount)}</div></div>`).join('')||'<div class="panel-note">Sin cheques pendientes</div>'}</div></div></div>
   ${tabsHTML(calTab,[['in','A cobrar'],['out','A pagar'],['paid','Pagados'],['log','Registro de cambios']],'setCalTab')}<div class="card table-card" style="margin-top:12px" id="calBody"></div>`;
}
POST.calendar=()=>renderCal();
function setCalTab(k){ calTab=k; go('calendar'); }
function renderCal(){
  const el=document.getElementById('calBody');
  if(calTab==='log'){ const ls=OB().log.filter(l=>l.entity==='payments');
    el.innerHTML=`<div class="tbl-scroll" style="max-height:520px;overflow-y:auto"><table class="stack"><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${ls.map(l=>`<tr><td data-label="Fecha">${fmtStamp(l.createdAt)}</td><td data-label="Usuario">${esc(l.userName)}</td><td data-label="Acción"><span class="pill ${l.action==='eliminar'?'credit':l.action==='editar'?'reserved':'cash'}">${esc({crear:'Cargado',editar:'Editado',eliminar:'Eliminado',pagado:'Pagado',pendiente:'Vuelto a pendiente'}[l.action]||l.action)}</span></td><td class="st-head" style="font-size:12.5px">${payLogDetail(l)}</td></tr>`).join('')||'<tr><td colspan="4" class="muted st-block">Sin cambios todavía</td></tr>'}</tbody></table></div>`; return; }
  let ps=OB().payments.filter(p=>calTab==='paid'?p.status==='paid':(p.direction===calTab&&p.status!=='paid'));
  ps.sort((a,b)=>calTab==='paid'?String(b.paidAt).localeCompare(String(a.paidAt)):String(a.dueDate).localeCompare(String(b.dueDate)));
  let lastM='';
  el.innerHTML=`<div class="tbl-scroll"><table class="stack"><thead><tr><th>${calTab==='paid'?'Pagado':'Vence'}</th><th>${calTab==='in'?'Cliente':calTab==='out'?'Proveedor':'Cliente / proveedor'}</th><th>Obra · detalle</th><th>Forma</th><th class="num">Monto</th><th></th></tr></thead><tbody>
  ${ps.map(p=>{ const d=calTab==='paid'?p.paidAt:p.dueDate; const m=String(d||'').slice(0,7); const head=m!==lastM?`<tr class="month-row"><td colspan="6">${m?monthLabel(m):'Sin fecha'}</td></tr>`:''; lastM=m; const obra=p.projectId&&oById(OB().projects,p.projectId);
    return head+`<tr><td data-label="Fecha">${fDate(d)} ${calTab==='paid'?'':whenBadge(p.dueDate)}</td><td class="st-head"><b>${esc(p.direction==='in'?cliName(p.clientId):supName(p.supplierId))}</b>${calTab==='paid'?`<div class="cell-sub">${p.direction==='in'?'Cobro':'Pago'}</div>`:''}</td>
    <td data-label="Detalle" style="white-space:normal">${esc([obra?obra.name:'',p.description].filter(Boolean).join(' · '))||'—'}</td><td data-label="Forma">${METHOD_L[p.method]||'—'}${p.method==='cheque'?`<div class="cell-sub">N° ${esc(p.chequeNumber||'—')} · débito ${fDate(p.chequeDate)}</div>`:''}</td>
    <td class="num" data-label="Monto" style="white-space:nowrap"><b class="${p.direction==='out'?'neg':''}">${fmt(p.amount)}</b></td>
    <td class="num st-act"><span class="row-flex" style="justify-content:flex-end;gap:2px">${p.status==='paid'?`<button class="btn ghost sm" onclick="unpayCPay('${p.id}')">Volver a pendiente</button>`:`<button class="btn sm" onclick="openPayCPay('${p.id}')">Marcar ${p.direction==='in'?'cobrado':'pagado'}</button>`}<button class="btn ghost sm" title="Editar" aria-label="Editar" onclick="openCPay('${p.id}')">${pencil()}</button><button class="btn ghost sm danger" aria-label="Eliminar" onclick="oDelete('payments','${p.id}','este ${p.direction==='in'?'cobro':'pago'}')">${trash()}</button></span></td></tr>`; }).join('')
    ||`<tr><td colspan="6" class="st-block"><div class="empty"><div class="big">Nada por acá</div>${calTab==='paid'?'Todavía no hay pagos marcados.':'Cargá un '+(calTab==='in'?'cobro':'pago')+' con su vencimiento.'}</div></td></tr>`}</tbody></table></div>`;
}
function payLogDetail(l){ let d={}; try{ d=JSON.parse(l.detail||'{}'); }catch(e){}
  const s=x=>x?`${x.direction==='in'?'Cobro':'Pago'} · ${esc(x.direction==='in'?cliName(x.clientId):supName(x.supplierId))} · <b>${fmt(x.amount)}</b> · vence ${fDate(x.dueDate)} · ${METHOD_L[x.method]||''}${x.method==='cheque'?' N° '+esc(x.chequeNumber||'—')+' débito '+fDate(x.chequeDate):''}${x.status==='paid'?' · pagado '+fDate(x.paidAt):''}`:'';
  if(l.action==='editar'||l.action==='pagado'||l.action==='pendiente') return `<div class="muted">Antes: ${s(d.before)}</div><div>Después: ${s(d.after)}</div>`;
  return s(d.after||d.before); }
function openCPay(id,dir){
  const p=id?oById(OB().payments,id):{direction:dir,method:'transferencia',dueDate:today()};
  const d=p.direction, paid=p.status==='paid';
  oModal(`<div class="modal">${modalHead((id?'Editar ':'Nuevo ')+(d==='in'?'cobro a cliente':'pago a proveedor'),paid?'Está pagado: para cambiar el monto, primero volvelo a pendiente.':'Cada carga o cambio queda en el registro.')}
    <div class="modal-body"><div class="form-grid">
    ${d==='in'?oSel('cp_who','Cliente',clientOpts(),p.clientId,{req:1,blank:'Elegí…'}):oSel('cp_who','Proveedor',OB().suppliers.map(s=>[s.id,s.name]),p.supplierId,{req:1,blank:'Elegí…'})}
    ${oSel('cp_proj','Obra',OB().projects.map(x=>[x.id,x.name]),p.projectId,{blank:'Sin obra'})}
    <div class="fg"><label>Monto (₲) <span class="req">*</span></label><input id="cp_amount" inputmode="numeric" value="${p.amount?fmtNum(p.amount):''}" ${paid?'disabled style="opacity:.6"':''}></div>
    ${oInput('cp_due','Vencimiento (plazo)',p.dueDate,{type:'date',req:1})}
    ${oSel('cp_method','Forma de pago',[['transferencia','Transferencia'],['efectivo','Efectivo'],['cheque','Cheque']],p.method,{on:'onCpMethod()'})}
    ${oInput('cp_desc','Detalle',p.description,{ph:d==='in'?'ej. Anticipo 50%':'ej. Vidrios planta baja'})}
    <div class="fg" id="cp_chq1">${''}<label>N° de cheque</label><input id="cp_chqno" value="${esc(p.chequeNumber||'')}"></div><div class="fg" id="cp_chq2"><label>Fecha a debitarse</label><input id="cp_chqdate" type="date" value="${esc(p.chequeDate||p.dueDate||'')}"></div>
    </div></div>${modalFoot(`saveCPay('${id||''}','${d}')`,id?'Guardar':'Cargar')}</div>`);
  onCpMethod();
}
function onCpMethod(){ const on=val('cp_method')==='cheque'; ['cp_chq1','cp_chq2'].forEach(i=>document.getElementById(i).style.display=on?'flex':'none'); }
async function saveCPay(id,d){
  const who=val('cp_who'), amount=parseDec(val('cp_amount')), due=val('cp_due'); const p=id?oById(OB().payments,id):null;
  let ok=true; [['cp_who',!!who],['cp_due',!!due]].concat(p&&p.status==='paid'?[]:[['cp_amount',amount>0]]).forEach(([k,v])=>{ if(!v){ document.getElementById(k).classList.add('err'); ok=false; } });
  if(!ok){ oToast('Completá los campos obligatorios','warn'); return; }
  const cheque=val('cp_method')==='cheque';
  const body={direction:d,projectId:val('cp_proj')||null,description:val('cp_desc'),dueDate:due,method:val('cp_method'),chequeNumber:cheque?val('cp_chqno'):null,chequeDate:cheque?(val('cp_chqdate')||due):null};
  body[d==='in'?'clientId':'supplierId']=who;
  if(!(p&&p.status==='paid')) body.amount=amount; else delete body.direction;
  if(await oSave('payments',id||null,body,id?'Cambios guardados':'Cargado en el calendario')) closeModal();
}
function openPayCPay(id){ const p=oById(OB().payments,id); if(!p) return;
  oModal(`<div class="modal">${modalHead(p.direction==='in'?'Marcar cobrado':'Marcar pagado',`${esc(p.direction==='in'?cliName(p.clientId):supName(p.supplierId))} · ${fmt(p.amount)}`)}
    <div class="modal-body"><div class="form-grid">${oInput('pp_date','Fecha',today(),{type:'date'})}${cajaField('pp')}</div></div>${modalFoot(`savePayCPay('${id}')`,'Confirmar')}</div>`);
  onCajaPick('pp'); }
async function savePayCPay(id){ const cj=cajaPayload('pp'); if(!cj){ oToast('Ingresá la cotización','warn'); return; }
  try{ await apiReq('POST','/api/obra/payments/'+id+'/pay',{companyId:activeCompanyId(),paidAt:val('pp_date'),...cj}); closeModal(); await reload(); oToast('Listo: movimiento registrado en la caja'); }catch(e){ oToast(oErr(e),'warn'); } }
async function unpayCPay(id){ if(!confirm('¿Volver a pendiente? Se quita el movimiento de la caja (queda en el registro).')) return;
  try{ await apiReq('DELETE','/api/obra/payments/'+id+'/pay?companyId='+encodeURIComponent(activeCompanyId())); await reload(); oToast('Vuelto a pendiente'); }catch(e){ oToast(oErr(e),'warn'); } }

/* ============================================================
   HOJA 5 — BASE DE DATOS: proveedores, productos, categorías, tipos de ítem
   ============================================================ */
let dbTab='suppliers', dbSup='', dbCat='';
function viewObraDb(){
  const c=activeCompany(); if(!c) return emptyState('Sin empresa','Elegí una empresa.','shield');
  const act={suppliers:`<button class="btn primary" onclick="openSupplier()">${plus()}Nuevo proveedor</button>`,products:`<button class="btn primary" onclick="openProduct()">${plus()}Nuevo producto</button>`,categories:'',itemtypes:`<button class="btn primary" onclick="openItemType()">${plus()}Nuevo tipo de ítem</button>`}[dbTab];
  return sectionHead('Base de datos','Proveedores, sus productos con precio y los tipos de ítem que usás en los presupuestos',act)
   +tabsHTML(dbTab,[['suppliers','Proveedores'],['products','Productos y precios'],['categories','Categorías'],['itemtypes','Tipos de ítem']],'setDbTab')+`<div id="dbBody" style="margin-top:12px"></div>`;
}
POST.obradb=()=>renderDb();
function setDbTab(k){ dbTab=k; go('obradb'); }
const agoDays=t=>t?Math.floor((Date.now()-new Date(t).getTime())/86400000):null;
function renderDb(){
  const el=document.getElementById('dbBody'); const O=OB();
  if(dbTab==='suppliers'){
    el.innerHTML=`<div class="card table-card"><div class="tbl-scroll"><table class="stack"><thead><tr><th>Proveedor</th><th>Contacto</th><th class="num">Productos</th><th>Precios actualizados</th><th></th></tr></thead><tbody>
    ${O.suppliers.map(s=>{ const n=O.products.filter(p=>p.supplierId===s.id).length; const ago=agoDays(s.pricesUpdatedAt);
      return `<tr><td class="st-head"><b>${esc(s.name)}</b>${s.notes?`<div class="cell-sub">${esc(s.notes)}</div>`:''}</td><td data-label="Contacto">${esc([s.contact,s.phone].filter(Boolean).join(' · '))||'—'}</td><td class="num" data-label="Productos">${n}</td>
      <td data-label="Actualizado">${s.pricesUpdatedAt?`${fmtStamp(s.pricesUpdatedAt)} <span class="days-badge ${ago>60?'hot':ago>30?'warm':''}">${ago===0?'hoy':'hace '+ago+(ago===1?' día':' días')}</span>`:'<span class="muted">Sin precios</span>'}</td>
      <td class="num st-act"><span class="row-flex" style="justify-content:flex-end;gap:2px"><button class="btn ghost sm" onclick="dbSup='${s.id}';dbCat='';setDbTab('products')">Ver precios</button><button class="btn ghost sm" onclick="openSupplier('${s.id}')">Editar</button><button class="btn ghost sm danger" aria-label="Eliminar" onclick="oDelete('suppliers','${s.id}','el proveedor')">${trash()}</button></span></td></tr>`; }).join('')
      ||'<tr><td colspan="5" class="st-block"><div class="empty"><div class="big">Sin proveedores</div>Cargá el primero, ej. “Proveedor Alpha”.</div></td></tr>'}</tbody></table></div></div>`;
  } else if(dbTab==='products'){
    const ps=O.products.filter(p=>(!dbSup||p.supplierId===dbSup)&&(!dbCat||p.categoryId===dbCat)).sort((a,b)=>supName(a.supplierId).localeCompare(supName(b.supplierId))||catName(a.categoryId).localeCompare(catName(b.categoryId))||a.name.localeCompare(b.name));
    el.innerHTML=`<div class="card table-card"><div class="table-tools"><select class="input" onchange="dbSup=this.value;renderDb()"><option value="">Todos los proveedores</option>${O.suppliers.map(s=>`<option value="${s.id}" ${s.id===dbSup?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
      <select class="input" onchange="dbCat=this.value;renderDb()"><option value="">Todas las categorías</option>${O.categories.map(c=>`<option value="${c.id}" ${c.id===dbCat?'selected':''}>${esc(c.name)}</option>`).join('')}</select><div class="spacer"></div><span class="hint">Cambiá el precio y presioná Enter para guardarlo</span></div>
      <div class="tbl-scroll"><table class="stack"><thead><tr><th>Producto</th><th>Proveedor</th><th>Categoría</th><th>Unidad</th><th class="num">Precio (₲)</th><th>Actualizado</th><th></th></tr></thead><tbody>
      ${ps.map(p=>`<tr><td class="st-head"><b>${esc(p.name)}</b></td><td data-label="Proveedor">${esc(supName(p.supplierId))}</td><td data-label="Categoría">${esc(catName(p.categoryId))}</td><td data-label="Unidad">${UNIT_L[p.unit]||p.unit}</td>
        <td class="num" data-label="Precio"><input class="input price-in" inputmode="numeric" value="${fmtNum(p.price)}" onkeydown="if(event.key==='Enter')this.blur()" onchange="savePrice('${p.id}',this.value)"></td><td data-label="Actualizado">${fmtStamp(p.updatedAt)}</td>
        <td class="num st-act"><span class="row-flex" style="justify-content:flex-end;gap:2px"><button class="btn ghost sm" onclick="openProduct('${p.id}')">Editar</button><button class="btn ghost sm danger" aria-label="Eliminar" onclick="oDelete('products','${p.id}','el producto')">${trash()}</button></span></td></tr>`).join('')
      ||`<tr><td colspan="7" class="st-block"><div class="empty"><div class="big">Sin productos${dbSup||dbCat?' con este filtro':''}</div>${O.suppliers.length&&O.categories.length?'Cargá los productos de cada proveedor con su precio.':'Primero creá un proveedor y una categoría.'}</div></td></tr>`}</tbody></table></div></div>`;
  } else if(dbTab==='categories'){
    el.innerHTML=`<div class="card panel" style="max-width:620px"><div class="panel-title">Categorías</div><div class="hint">Agrupan los productos: al elegir “Vidrio” en un presupuesto solo aparecen los vidrios del proveedor.</div>
      <div class="rem-add" style="margin-top:12px"><input id="catName" class="input" placeholder="ej. Vidrios, Perfiles, Accesorios" onkeydown="if(event.key==='Enter')addCategory()"><button class="btn primary sm" onclick="addCategory()">${plus()}Agregar</button></div>
      <div class="facts">${O.categories.map(c=>`<div class="fact"><div class="l">${esc(c.name)}<small>${O.products.filter(p=>p.categoryId===c.id).length} productos</small></div><div class="a"><button class="btn ghost sm" onclick="renameCategory('${c.id}')">Renombrar</button><button class="btn ghost sm danger" aria-label="Eliminar" onclick="oDelete('categories','${c.id}','la categoría')">${trash()}</button></div></div>`).join('')||'<div class="panel-note" style="padding:10px 0">Sin categorías</div>'}</div>
      ${O.categories.length?'':`<button class="btn sm" style="margin-top:10px" onclick="seedCategories()">Crear Vidrios, Perfiles y Accesorios</button>`}</div>`;
  } else {
    el.innerHTML=`<div class="card table-card"><div class="tbl-scroll"><table class="stack"><thead><tr><th>Tipo de ítem</th><th>Partes</th><th>Mano de obra</th><th></th></tr></thead><tbody>
    ${O.itemTypes.map(t=>`<tr><td class="st-head"><b>${esc(t.name)}</b></td><td data-label="Partes">${(t.parts||[]).map(p=>`${esc(p.label)} <span class="muted">(${esc(catName(p.categoryId))})</span>`).join(', ')||'—'}</td>
      <td data-label="Mano de obra">${+t.laborRate?`${fmt(t.laborRate)} ${t.laborMode==='m2'?'por m²':'por ítem'}`:'—'}</td><td class="num st-act"><span class="row-flex" style="justify-content:flex-end;gap:2px"><button class="btn ghost sm" onclick="openItemType('${t.id}')">Editar</button><button class="btn ghost sm danger" aria-label="Eliminar" onclick="oDelete('itemtypes','${t.id}','el tipo de ítem')">${trash()}</button></span></td></tr>`).join('')
      ||'<tr><td colspan="4" class="st-block"><div class="empty"><div class="big">Sin tipos de ítem</div>Ej. “Puerta mano amiga” con las partes Vidrio y Perfil, o “Espejo” con solo Vidrio.</div></td></tr>'}</tbody></table></div></div>`;
  }
}
function openSupplier(id){ const s=(id&&oById(OB().suppliers,id))||{};
  oModal(`<div class="modal">${modalHead(id?'Editar proveedor':'Nuevo proveedor')}<div class="modal-body"><div class="form-grid">${oInput('sp_name','Nombre',s.name,{full:1,req:1})}${oInput('sp_contact','Contacto',s.contact)}${oInput('sp_phone','Teléfono',s.phone)}<div class="fg full"><label>Notas</label><textarea id="sp_notes" rows="2">${esc(s.notes)}</textarea></div></div></div>${modalFoot(`saveSupplier('${id||''}')`)}</div>`); }
async function saveSupplier(id){ const name=val('sp_name').trim(); if(!name){ document.getElementById('sp_name').classList.add('err'); return; }
  if(await oSave('suppliers',id||null,{name,contact:val('sp_contact'),phone:val('sp_phone'),notes:val('sp_notes')},id?'Proveedor actualizado':'Proveedor creado')) closeModal(); }
function openProduct(id){ const p=(id&&oById(OB().products,id))||{supplierId:dbSup,categoryId:dbCat,unit:'m2'};
  if(!OB().suppliers.length||!OB().categories.length){ oToast('Primero creá un proveedor y una categoría','warn'); return; }
  oModal(`<div class="modal">${modalHead(id?'Editar producto':'Nuevo producto','El precio de cada producto queda con su fecha de actualización.')}<div class="modal-body"><div class="form-grid">
    ${oSel('pd_sup','Proveedor',OB().suppliers.map(s=>[s.id,s.name]),p.supplierId,{req:1})}${oSel('pd_cat','Categoría',OB().categories.map(c=>[c.id,c.name]),p.categoryId,{req:1})}
    ${oInput('pd_name','Producto',p.name,{full:1,req:1,ph:'ej. Fumé 6 mm'})}${oSel('pd_unit','Se cotiza por',[['m2','Metro cuadrado (m²)'],['ml','Metro lineal (perímetro)'],['un','Unidad']],p.unit)}
    <div class="fg"><label>Precio (₲) <span class="req">*</span></label><input id="pd_price" inputmode="numeric" value="${p.price!=null?fmtNum(p.price):''}"></div></div></div>${modalFoot(`saveProduct('${id||''}')`)}</div>`); }
async function saveProduct(id){ const name=val('pd_name').trim(), price=parseDec(val('pd_price'));
  let ok=true; [['pd_name',!!name],['pd_price',val('pd_price').trim()!==''&&price>=0]].forEach(([k,v])=>{ if(!v){ document.getElementById(k).classList.add('err'); ok=false; } }); if(!ok) return;
  if(await oSave('products',id||null,{supplierId:val('pd_sup'),categoryId:val('pd_cat'),name,unit:val('pd_unit'),price},id?'Producto actualizado':'Producto creado')) closeModal(); }
async function savePrice(id,v){ const price=parseDec(v); const p=oById(OB().products,id); if(!p||price===+p.price) return; await oSave('products',id,{price},'Precio actualizado'); }
async function addCategory(){ const name=val('catName').trim(); if(!name){ document.getElementById('catName').classList.add('err'); return; } await oSave('categories',null,{name},'Categoría creada'); }
async function seedCategories(){ for(const n of ['Vidrios','Perfiles','Accesorios']){ try{ await oApi('POST','categories',null,{name:n}); }catch(e){} } await reload(); oToast('Categorías creadas'); }
async function renameCategory(id){ const c=oById(OB().categories,id); const n=prompt('Nuevo nombre',c.name); if(n&&n.trim()) await oSave('categories',id,{name:n.trim()},'Categoría renombrada'); }
let ITE=null;
function openItemType(id){ const t=(id&&oById(OB().itemTypes,id))||{name:'',parts:[{label:'Vidrio',categoryId:(OB().categories.find(c=>/vidri/i.test(c.name))||{}).id},{label:'Perfil',categoryId:(OB().categories.find(c=>/perfil/i.test(c.name))||{}).id}],laborMode:'item',laborRate:0};
  ITE={id:id||'',...JSON.parse(JSON.stringify(t))}; renderITE(); }
function renderITE(){ const cats=OB().categories;
  oModal(`<div class="modal">${modalHead(ITE.id?'Editar tipo de ítem':'Nuevo tipo de ítem','Es la plantilla: al agregarlo a un presupuesto aparecen estas partes para elegir proveedor y producto.')}<div class="modal-body"><div class="form-grid">
    <div class="fg full"><label>Nombre <span class="req">*</span></label><input id="it_name" value="${esc(ITE.name)}" placeholder="ej. Puerta mano amiga" oninput="ITE.name=this.value"></div></div>
    <div class="panel-title" style="margin:14px 0 6px">Partes</div>${ITE.parts.map((p,i)=>`<div class="le-row"><div class="fg"><label>Parte</label><input value="${esc(p.label)}" placeholder="ej. Vidrio" oninput="ITE.parts[${i}].label=this.value"></div>
      <div class="fg grow"><label>Categoría de productos</label><select onchange="ITE.parts[${i}].categoryId=this.value"><option value="">—</option>${cats.map(c=>`<option value="${c.id}" ${c.id===p.categoryId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
      <button class="btn ghost sm danger" aria-label="Quitar" onclick="ITE.parts.splice(${i},1);renderITE()">${trash()}</button></div>`).join('')}
    <button class="btn ghost sm" onclick="ITE.parts.push({label:'',categoryId:''});renderITE()">${plus()}Agregar parte</button>
    <div class="form-grid" style="margin-top:14px"><div class="fg"><label>Mano de obra</label><select onchange="ITE.laborMode=this.value"><option value="item" ${ITE.laborMode!=='m2'?'selected':''}>Por ítem</option><option value="m2" ${ITE.laborMode==='m2'?'selected':''}>Por m²</option></select></div>
      <div class="fg"><label>Valor sugerido (₲)</label><input inputmode="numeric" value="${+ITE.laborRate?fmtNum(ITE.laborRate):''}" oninput="ITE.laborRate=parseDec(this.value)"></div></div></div>${modalFoot('saveITE()')}</div>`); }
async function saveITE(){ if(!String(ITE.name).trim()){ document.getElementById('it_name').classList.add('err'); return; }
  const body={name:ITE.name.trim(),parts:ITE.parts.filter(p=>String(p.label||'').trim()).map(p=>({label:p.label.trim(),categoryId:p.categoryId||null})),laborMode:ITE.laborMode,laborRate:+ITE.laborRate||0};
  if(await oSave('itemtypes',ITE.id||null,body,ITE.id?'Tipo de ítem actualizado':'Tipo de ítem creado')) closeModal(); }

/* ---------- clients for a construction company ---------- */
function viewObraClients(){
  const cls=myScope(DB.clients).slice().sort((a,b)=>a.name.localeCompare(b.name));
  return sectionHead('Clientes',can('allClients')?'Todos los clientes de la empresa':'Tus clientes',`<button class="btn primary" onclick="openClient()">${plus()}Nuevo cliente</button>`)
   +`<div class="card table-card"><div class="tbl-scroll"><table class="stack"><thead><tr><th>Cliente</th><th>RUC</th><th>Contacto</th><th class="num">Presupuestos</th><th class="num">Obras</th></tr></thead><tbody>
   ${cls.map(c=>`<tr><td class="st-head"><b>${esc(c.name)}</b></td><td data-label="RUC">${esc(c.ruc||'—')}</td><td data-label="Contacto">${esc([c.phone,c.email].filter(Boolean).join(' · '))||'—'}</td>
     <td class="num" data-label="Presupuestos">${OB().budgets.filter(b=>b.clientId===c.id).length}</td><td class="num" data-label="Obras">${OB().projects.filter(p=>p.clientId===c.id).length}</td></tr>`).join('')
     ||'<tr><td colspan="5" class="st-block"><div class="empty"><div class="big">Sin clientes</div>Los datos del cliente se usan en presupuestos y propuestas.</div></td></tr>'}</tbody></table></div></div>`;
}
