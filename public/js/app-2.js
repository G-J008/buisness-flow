/* ============================================================
   AUTH
   ============================================================ */
function fillLogin(u,p){ document.getElementById('li_user').value=u; document.getElementById('li_pass').value=p; document.getElementById('loginErr').classList.remove('show'); }
async function doLogin(){
  const u=document.getElementById('li_user').value.trim(), p=document.getElementById('li_pass').value;
  document.getElementById('loginErr').classList.remove('show');
  try{
    await apiReq('POST','/api/auth/login',{username:u,password:p});
    await saveBrowserCredential(u,p);
    await loadState();
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    bootApp();
  }catch(e){ document.getElementById('loginErr').classList.add('show'); }
}
// Explicitly offer to save the password in the browser's password manager (Chrome/Edge/Android).
// Safari/Firefox rely on the <form> autocomplete attributes and show their own prompt.
async function saveBrowserCredential(u,p){
  try{
    if(!document.getElementById('li_remember').checked) return;
    if(window.PasswordCredential && navigator.credentials && navigator.credentials.store){
      await navigator.credentials.store(new PasswordCredential({id:u,password:p,name:u}));
    }
  }catch(e){}
}
async function logout(){ try{ await apiReq('POST','/api/auth/logout'); }catch(e){}
  try{ if(navigator.credentials&&navigator.credentials.preventSilentAccess) await navigator.credentials.preventSilentAccess(); }catch(e){}
  closeSheet(); closeModal(); session.user=null; document.getElementById('app').classList.add('hidden'); document.getElementById('login').classList.remove('hidden');
  document.getElementById('li_user').value=''; document.getElementById('li_pass').value=''; document.getElementById('loginErr').classList.remove('show'); }

/* ============================================================
   NAV / BOOT
   ============================================================ */
const NAV=[
  {id:'dashboard',label:'Dashboard',group:'Overview',icon:'grid',show:()=>true},
  {id:'flow',label:'Business Flow',group:'Modules',icon:'flow',show:()=>true},
  {id:'inventory',label:'Inventory',group:'Modules',icon:'box',show:()=>can('inventoryManage')},
  {id:'clients',label:'Clients',group:'Modules',icon:'users',show:()=>true},
  {id:'reports',label:'Monthly Reports',group:'Modules',icon:'doc',show:()=>can('reports')},
  {id:'team',label:'Team',group:'Management',icon:'team',show:()=>can('team')},
  {id:'admin',label:'Admin Console',group:'Management',icon:'shield',show:()=>can('adminConsole')},
  {id:'settings',label:'Profile & Settings',group:'Account',icon:'cog',show:()=>true},
];
let currentView='dashboard';
function bootApp(){
  buildNav(); buildCoSwitch(); refreshUserCard(); refreshBrand();
  // sales can't see profit charts / balance
  document.getElementById('balChip').style.display = can('profitCharts')?'flex':'none';
  go(session.user.role==='admin' && !DB.companies.length ? 'admin' : 'dashboard');
}
const SHORT={dashboard:['Home','Panel'],flow:['Flow','Flujo'],reports:['Reports','Reportes'],inventory:['Stock','Inventario'],clients:['Clients','Clientes'],team:['Team','Equipo'],admin:['Admin','Admin'],settings:['Settings','Ajustes'],more:['More','Más']};
const shortLabel=id=>SHORT[id][lang==='es'?1:0];
function mobilePrimary(){ const ids=can('reports')?['dashboard','flow','reports','inventory']:['dashboard','flow','clients']; return NAV.filter(n=>ids.includes(n.id)&&n.show()).sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id)); }
function buildNav(){
  const items=NAV.filter(n=>n.show());
  let html=''; let grp=null;
  items.forEach(n=>{ if(n.group!==grp){ grp=n.group; html+=`<div class="nav-label">${grp}</div>`; }
    html+=`<button class="nav-item" data-view="${n.id}" onclick="go('${n.id}')">${navIcon(n.icon)}${n.label}</button>`; });
  document.getElementById('nav').innerHTML=tr(html);
  // phone: the sections used every day sit in the bar, everything else is one tap away under "More"
  document.getElementById('mobileNav').innerHTML=mobilePrimary().map(n=>`<button data-view="${n.id}" onclick="go('${n.id}')">${navIcon(n.icon)}<span>${shortLabel(n.id)}</span></button>`).join('')
    +`<button data-view="more" onclick="openSheet()">${navIcon('more')}<span>${shortLabel('more')}</span></button>`;
  const u=session.user;
  document.getElementById('sheet').innerHTML=`<div class="grab"></div>
    <div class="usercard"><div class="av" style="background:${avColor(u.name)}">${u.avatar?`<img src="${u.avatar}">`:initials(u.name)}</div>
      <div class="info"><div class="nm">${escHtml(u.name)}</div><div class="rl">${roleLabel(u.role)}</div></div>
      <button class="btn sm" onclick="logout()">${tr('Sign out')}</button></div>`
    +tr(items.map(n=>`<button class="nav-item" data-view="${n.id}" onclick="go('${n.id}')">${navIcon(n.icon)}${n.label}</button>`).join(''))
    +`<div class="sheet-row"><span>${tr('Language')}</span><div class="lang-mini" id="sheetLang"><button data-lang="es" onclick="setLang('es')">Español</button><button data-lang="en" onclick="setLang('en')">English</button></div></div>`;
  document.querySelectorAll('#sheetLang button').forEach(b=>b.classList.toggle('on',b.dataset.lang===lang));
  markNav();
}
function markNav(){ const v=currentView; const prim=mobilePrimary().map(n=>n.id);
  document.querySelectorAll('#nav .nav-item,#sheet .nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  document.querySelectorAll('#mobileNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v||(b.dataset.view==='more'&&!prim.includes(v)))); }
function openSheet(){ document.getElementById('sheetWrap').classList.add('open'); }
function closeSheet(){ document.getElementById('sheetWrap').classList.remove('open'); }
function buildCoSwitch(){
  const el=document.getElementById('coSwitch');
  if(session.user.role==='admin'){
    el.innerHTML=`<span class="role-badge role-admin">Admin</span>`+
      (DB.companies.length?`<select onchange="switchCompany(this.value)">${DB.companies.map(c=>`<option value="${c.id}" ${c.id===adminCompanyId?'selected':''}>${escHtml(c.name)}</option>`).join('')}</select>`:'');
  }else{
    el.innerHTML=`<span class="role-badge role-${session.user.role}">${roleLabel(session.user.role)}</span>`;
  }
}
async function switchCompany(id){ adminCompanyId=id; try{ await loadState(id); }catch(e){} refreshBrand(); buildCoSwitch(); go(currentView); }
function refreshUserCard(){ const u=session.user;
  document.getElementById('ucAv').style.background=avColor(u.name);
  document.getElementById('ucAv').innerHTML=u.avatar?`<img src="${u.avatar}">`:initials(u.name);
  document.getElementById('ucName').textContent=u.name;
  document.getElementById('ucRole').textContent=roleLabel(u.role);
}
function refreshBrand(){ const c=activeCompany();
  document.getElementById('brandName').textContent=c?c.name:'Argus Technology';
  document.getElementById('brandSub').textContent=c?(c.productType+(lang==='es'?' · negocio':' business')):'Commercial Software';
  document.getElementById('brandLogo').innerHTML=c&&c.logo?`<img src="${c.logo}" alt="">`:MARK;
}
const MARK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 19.5 12 4.5l7.5 15"/><circle cx="12" cy="15" r="1.7" fill="currentColor" stroke="none"/></svg>';

const TITLES={dashboard:'Dashboard',flow:'Business Flow',inventory:'Inventory',clients:'Clients',reports:'Monthly Reports',team:'Team Performance',admin:'Admin Console',settings:'Profile & Settings'};
function go(v){
  const nav=NAV.find(n=>n.id===v); if(nav&&!nav.show()){ v='dashboard'; }
  currentView=v;
  markNav(); closeSheet();
  document.getElementById('viewTitle').innerHTML=`<span class="t-full">${escHtml(tr(TITLES[v]||''))}</span><span class="t-short">${escHtml(SHORT[v]?shortLabel(v):tr(TITLES[v]||''))}</span>`;
  refreshBalance();
  const c=document.getElementById('content');
  if(v==='dashboard') c.innerHTML=tr(viewDashboard());
  else if(v==='flow') c.innerHTML=tr(viewFlow());
  else if(v==='inventory') c.innerHTML=tr(viewInventory());
  else if(v==='clients') c.innerHTML=tr(viewClients());
  else if(v==='reports') c.innerHTML=tr(viewReports());
  else if(v==='team') c.innerHTML=tr(viewTeam());
  else if(v==='admin') c.innerHTML=tr(viewAdmin());
  else if(v==='settings') c.innerHTML=tr(viewSettings());
  // post-render hooks (charts, listeners)
  if(POST[v]) POST[v]();
  window.scrollTo(0,0);
}
const POST={};

/* ============================================================
   AGGREGATES (scoped to active company)
   ============================================================ */
const revList=()=>coScope(DB.revenues);
const expList=()=>coScope(DB.expenses);
const saleList=()=>coScope(DB.sales);
const invList=()=>coScope(DB.inventory);
const totalRevenue=()=>revList().reduce((a,r)=>a+r.amount,0);
const totalExpenses=()=>expList().reduce((a,e)=>a+e.amount,0);
const balance=()=>totalRevenue()-totalExpenses();
/* A month, read three ways:
   billing  = what was invoiced (sales + other revenue)
   profit   = sales − cost of the units sold − operating expenses (the real margin)
   cash     = revenue − every expense, inventory purchases included                     */
function monthAgg(ym){
  if(_agg[ym]) return _agg[ym];
  const rev=revList().filter(r=>ymKey(r.date)===ym), exp=expList().filter(e=>ymKey(e.date)===ym), sal=saleList().filter(s=>ymKey(s.date)===ym);
  const revSum=sum(rev,r=>r.amount), expSum=sum(exp,e=>e.amount);
  const salesRev=sum(rev.filter(r=>r.saleId),r=>r.amount), otherRev=revSum-salesRev;
  const cogs=sum(sal,saleCost), gross=salesRev-cogs;
  const invBuy=sum(exp.filter(isInvPurchase),e=>e.amount), opex=expSum-invBuy;
  const net=gross+otherRev-opex, units=sum(sal,saleQty);
  return _agg[ym]={rev,exp,sal,revSum,expSum,salesRev,otherRev,cogs,gross,invBuy,opex,net,cash:revSum-expSum,
    profit:net,sold:units,tx:sal.length,avgSale:units?salesRev/units:0,noCost:sal.filter(s=>!saleUnitCost(s)).length};
}
function dataMonths(){ // months from first transaction to now (empty if no data)
  const dates=[...revList(),...expList()].map(x=>x.date).sort();
  if(!dates.length) return [];
  const first=new Date(dates[0].slice(0,7)+'-01'), now=new Date(); const arr=[];
  let d=new Date(now.getFullYear(),now.getMonth(),1);
  while(d>=first){ arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); d=new Date(d.getFullYear(),d.getMonth()-1,1); }
  return arr; // newest first
}
function lastNMonths(n){ const now=new Date(),arr=[]; for(let i=n-1;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);} return arr; }
function clientCreditSold(cid){ return sum(coScope(DB.sales).filter(s=>s.clientId===cid&&s.payment==='Credit'),s=>s.price); }
function clientPayments(cid){ return coScope(DB.payments).filter(p=>p.clientId===cid); }
function clientPaid(cid){ return clientPayments(cid).reduce((a,p)=>a+p.amount,0); }
function clientBalance(cid){ // outstanding credit = credit sales − payments received
  return Math.max(0,clientCreditSold(cid)-clientPaid(cid));
}
function clientTotal(cid){ return coScope(DB.sales).filter(s=>s.clientId===cid).reduce((a,s)=>a+s.price,0); }

/* ---------- balance chip ---------- */
function refreshBalance(){ if(!can('profitCharts'))return; const b=balance(),pos=b>=0;
  document.getElementById('balVal').textContent=fmt(b);
  document.getElementById('balVal').className='val '+(pos?'pos':'neg');
  document.getElementById('balDot').className='dot '+(pos?'pos':'neg'); }
