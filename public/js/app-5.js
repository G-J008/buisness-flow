/* ============================================================
   VIEW: TEAM (manager/admin) — sales agents monthly performance
   ============================================================ */
function viewTeam(){
  const c=activeCompany(); if(!c) return emptyState('No company selected','Pick or create a company first.','shield');
  const months=dataMonths();
  const monthOpts=months.length?months:lastNMonths(1);
  return `<div class="section-head"><div><h2>Team performance</h2><div class="desc">Sales agents this period</div></div>
    <div class="head-actions"><select class="input" id="teamMonth" onchange="renderTeam()">${monthOpts.map((m,i)=>`<option value="${m}">${monthLabel(m)}</option>`).join('')}</select>
    ${can('createSales')?`<button class="btn primary" onclick="openUser('sales')">${plus()}Add sales agent</button>`:''}</div></div>
  <div id="teamCards"></div>`;
}
POST.team=()=>renderTeam();
function renderTeam(){
  const ym=val('teamMonth'); const agents=coScope(DB.users).filter(u=>u.role==='sales');
  const rows=agents.map(u=>{ const s=coScope(DB.sales).filter(x=>x.agentId===u.id&&ymKey(x.date)===ym);
    const rev=sum(s,x=>x.price), units=sum(s,saleQty); const clients=coScope(DB.clients).filter(c=>c.agentId===u.id).length;
    return {u,count:units,rev,clients,avg:units?rev/units:0}; }).sort((a,b)=>b.rev-a.rev);
  const maxRev=Math.max(1,...rows.map(r=>r.rev));
  let html='';
  if(!agents.length){ html=emptyState('No sales agents','Add a sales agent to see performance.','team'); }
  else{
    html=`<div class="grid kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[
      {lbl:'Agents',val:agents.length,sub:'active sellers'},
      {lbl:'Units sold (mo.)',val:sum(rows,r=>r.count),sub:`<i data-u>${monthLabel(ym)}</i>`},
      {lbl:'Team revenue (mo.)',val:fmt(sum(rows,r=>r.rev)),sub:`<i data-u>${monthLabel(ym)}</i>`}].map(kpiTile).join('')}</div>
    <div class="card table-card"><div class="table-tools"><div class="panel-title">Agent leaderboard · <i data-u>${monthLabel(ym)}</i></div></div>
      <div class="tbl-scroll"><table class="stack"><thead><tr><th>Agent</th><th class="num">Units</th><th class="num">Revenue</th><th class="num">Avg sale</th><th class="num">Clients</th><th style="width:180px">Share</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td class="st-head"><div class="row-flex"><span class="avatar" style="background:${avColor(r.u.name)}" data-u>${r.u.avatar?`<img src="${r.u.avatar}">`:escHtml(initials(r.u.name))}</span><div><b data-u>${escHtml(r.u.name)}</b><div class="muted" style="font-size:12px;font-weight:400" data-u>@${escHtml(r.u.username)}</div></div></div></td>
        <td class="num" data-label="Units">${r.count}</td><td class="num" data-label="Revenue" style="font-weight:600">${fmt(r.rev)}</td><td class="num" data-label="Avg sale">${fmt(r.avg)}</td><td class="num" data-label="Clients">${r.clients}</td>
        <td class="st-hide"><div class="bd-bar"><span style="width:${r.rev/maxRev*100}%;background:${avColor(r.u.name)}"></span></div></td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  document.getElementById('teamCards').innerHTML=tr(html);
}

/* ============================================================
   VIEW: ADMIN CONSOLE (admin only)
   ============================================================ */
function viewAdmin(){
  return `<div class="section-head"><div><h2>Companies</h2><div class="desc">Each company keeps its own isolated data</div></div>
    <div class="head-actions"><button class="btn primary" onclick="openCompany()">${plus()}New Company</button></div></div>
  <div class="card table-card"><div class="tbl-scroll"><table class="stack"><thead><tr><th>Company</th><th>Product type</th><th class="num">Users</th><th class="num">Inventory</th><th class="num">Sales</th><th></th></tr></thead><tbody id="adminCoBody"></tbody></table></div></div>
  <div class="section-head"><div><h2>Users & profiles</h2><div class="desc">Create admins, managers and sales agents; assign to a company</div></div>
    <div class="head-actions"><button class="btn primary" onclick="openUser()">${plus()}New Profile</button></div></div>
  <div class="card table-card"><div class="tbl-scroll"><table class="stack"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Company</th><th></th></tr></thead><tbody id="adminUserBody"></tbody></table></div></div>`;
}
POST.admin=()=>renderAdmin();
function renderAdmin(){
  document.getElementById('adminCoBody').innerHTML=tr(DB.companies.map(c=>`<tr>
    <td class="st-head"><div class="row-flex"><span class="avatar" style="border-radius:9px;background:${avColor(c.name)}" data-u>${c.logo?`<img src="${c.logo}">`:escHtml(initials(c.name))}</span><b data-u>${escHtml(c.name)}</b></div></td>
    <td data-label="Product type"><span class="tag" data-u>${escHtml(c.productType)}</span></td>
    <td class="num" data-label="Users">${DB.users.filter(u=>u.companyId===c.id).length}</td>
    <td class="num" data-label="Inventory">${DB.inventory.filter(i=>i.companyId===c.id).length}</td>
    <td class="num" data-label="Sales">${DB.sales.filter(s=>s.companyId===c.id).length}</td>
    <td class="num st-act"><button class="btn ghost sm" onclick="switchCompany('${c.id}').then(()=>go('dashboard'))">Open →</button></td></tr>`).join('')
    ||`<tr><td colspan="6" class="st-block"><div class="empty"><div class="big">No companies</div>Create your first company to begin.</div></td></tr>`);
  document.getElementById('adminUserBody').innerHTML=tr(DB.users.map(u=>{ const co=u.companyId?DB.companies.find(c=>c.id===u.companyId):null;
    return `<tr>
    <td class="st-head"><div class="row-flex"><span class="avatar" style="background:${avColor(u.name)}" data-u>${u.avatar?`<img src="${u.avatar}">`:escHtml(initials(u.name))}</span><b data-u>${escHtml(u.name)}</b></div></td>
    <td class="muted" data-label="Username"><i data-u>@${escHtml(u.username)}</i></td><td data-label="Role"><span class="role-badge role-${u.role}" style="display:inline-block" data-u>${roleLabel(u.role)}</span></td>
    <td data-label="Company">${u.companyId?`<i data-u>${escHtml(co?co.name:'—')}</i>`:'<span class="muted">All companies</span>'}</td>
    <td class="num st-act">${u.id!==session.user.id?`<button class="btn ghost sm danger" aria-label="Delete" onclick="delUser('${u.id}')">${trash()}</button>`:''}</td></tr>`; }).join(''));
}
async function delUser(id){ try{ await apiReq('DELETE','/api/users/'+id); await reload(); buildCoSwitch(); toast('Profile removed'); }catch(e){ toast(apiErr(e),'warn'); } }

/* ============================================================
   VIEW: SETTINGS / PROFILE
   ============================================================ */
function viewSettings(){
  const u=session.user; const c=activeCompany();
  let companyBlock='';
  if(can('logo')&&c){ companyBlock=`<div class="card" style="padding:22px;margin-top:18px"><h3 class="panel-title" style="margin:0 0 2px;font-size:15px">Company branding</h3><div class="hint" style="margin-bottom:16px">Shown in the sidebar and on reports</div>
    <div class="form-grid"><div class="fg full"><label>Company name</label><input id="set_coname" value="${escHtml(c.name)}"></div>
    <div class="fg"><label>Product type (what you sell)</label><input id="set_ptype" value="${escHtml(c.productType)}"></div>
    <div class="fg"><label>Company logo</label><div class="uploader"><span class="prev" id="logoPrev" style="background:${avColor(c.name)}">${c.logo?`<img src="${c.logo}">`:initials(c.name)}</span><input type="file" accept="image/*" id="logoFile" onchange="previewImg(this,'logoPrev')"></div></div></div>
    <div style="margin-top:16px"><button class="btn primary" onclick="saveCompany()">Save company</button></div></div>`; }
  return `<div class="card" style="padding:22px;max-width:640px"><h3 class="panel-title" style="margin:0 0 2px;font-size:15px">Your profile</h3><div class="hint" style="margin-bottom:16px">Personalize your account</div>
    <div class="form-grid"><div class="fg full"><label>Display name</label><input id="set_name" value="${escHtml(u.name)}"></div>
    <div class="fg full"><label>Profile picture</label><div class="uploader"><span class="prev" id="avPrev" style="background:${avColor(u.name)}">${u.avatar?`<img src="${u.avatar}">`:initials(u.name)}</span><input type="file" accept="image/*" id="avFile" onchange="previewImg(this,'avPrev')"></div></div>
    <div class="fg"><label>Username</label><input value="${escHtml(u.username)}" disabled style="opacity:.6"></div>
    <div class="fg"><label>Role</label><input value="${roleLabel(u.role)}" disabled style="opacity:.6"></div><div class="fg full"><label>Language</label><div class="lang-mini" id="setLang" style="margin-left:0"><button data-lang="es" class="${lang==='es'?'on':''}" onclick="setLang('es')">Español</button><button data-lang="en" class="${lang==='en'?'on':''}" onclick="setLang('en')">English</button></div></div></div>
    <div style="margin-top:16px"><button class="btn primary" onclick="saveProfile()">Save profile</button></div></div>
    ${companyBlock}`;
}
let pendingAvatar=null, pendingLogo=null;
function previewImg(input,prevId){ const f=input.files[0]; if(!f)return; const r=new FileReader(); r.onload=e=>{ document.getElementById(prevId).innerHTML=`<img src="${e.target.result}">`; if(prevId==='avPrev')pendingAvatar=e.target.result; else pendingLogo=e.target.result; }; r.readAsDataURL(f); }
async function saveProfile(){ try{ const r=await apiReq('PATCH','/api/profile',{name:val('set_name'),avatar:pendingAvatar!=null?pendingAvatar:undefined}); session.user.name=r.user.name; session.user.avatar=r.user.avatar; pendingAvatar=null; refreshUserCard(); toast('Profile updated'); }catch(e){ toast(apiErr(e),'warn'); } }
async function saveCompany(){ const c=activeCompany(); try{ await apiReq('PATCH','/api/companies/'+c.id,{name:val('set_coname'),productType:val('set_ptype'),logo:pendingLogo!=null?pendingLogo:undefined}); pendingLogo=null; await loadState(adminCompanyId); refreshBrand(); buildCoSwitch(); toast('Company updated'); go('settings'); }catch(e){ toast(apiErr(e),'warn'); } }

/* ============================================================
   MODALS: Sale / Expense / Revenue / Client / User / Company
   ============================================================ */
function showModalHTML(html){ document.getElementById('modalHost').innerHTML=tr(html); document.getElementById('overlay').classList.add('open'); }
function closeModal(){ document.getElementById('overlay').classList.remove('open'); document.getElementById('modalHost').innerHTML=''; }

function openSale(presetClient){
  const c=activeCompany(); if(!c){ toast('Select a company first'); return; }
  const avail=invList().filter(i=>i.status==='Available'&&invLeft(i)>0);
  if(!avail.length){ showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>No stock available</h3><p>Add ${pPlural().toLowerCase()} to inventory before registering a sale.</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-foot">${can('inventoryManage')?`<button class="btn primary" onclick="closeModal();go('inventory');openInv()">Add ${pLabel()}</button>`:'<button class="btn" onclick="closeModal()">Close</button>'}</div></div>`); return; }
  const clients=myScope(DB.clients); const inStock=lang==='es'?'en stock':'in stock';
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>Register a sale</h3><p>Pick an item from inventory — brand & price auto-fill. Sell one or several units.</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg full"><label>${pLabel()} from inventory <span class="req">*</span></label>
        <select id="s_item" onchange="onPickItem()"><option value="">Select model / SKU…</option>${avail.map(i=>`<option data-u value="${i.id}">${escHtml(`${i.brand} — ${i.model} (${i.sku}) · ${invLeft(i)} ${inStock}`)}</option>`).join('')}</select></div>
      <div class="fg"><label>Quantity <span class="req">*</span> <span class="hint" id="s_left" data-u></span></label>
        <div class="stepper"><button type="button" aria-label="−" onclick="stepQty('s_qty',-1)">−</button><input id="s_qty" inputmode="numeric" value="1" oninput="updSalePreview()"><button type="button" aria-label="+" onclick="stepQty('s_qty',1)">+</button></div></div>
      <div class="fg"><label>Unit price (PYG) <span class="req">*</span></label><input id="s_price" inputmode="numeric" oninput="updSalePreview()"></div>
      <div class="fg"><label>Sale date <span class="req">*</span></label><input type="date" id="s_date" value="${today()}"></div>
      <div class="fg"><label>Delivery method <span class="req">*</span></label><select id="s_delivery">${DELIVERIES.map(d=>`<option value="${d}">${d}</option>`).join('')}</select></div>
      <div class="fg"><label>Client</label><select id="s_client"><option value="">Walk-in (no client)</option>${clients.map(cl=>`<option data-u value="${cl.id}" ${cl.id===presetClient?'selected':''}>${escHtml(cl.name)}</option>`).join('')}</select></div>
      <div class="fg"><label>Payment <span class="req">*</span></label><select id="s_payment"><option value="Cash">Cash</option><option value="Credit">Credit</option></select></div>
      <div class="fg full derived stackd"><div><span>Sale total</span><b id="s_preview">₲ 0</b></div>${can('profitCharts')?`<div><span>Estimated profit</span><b id="s_profit">—</b></div>`:''}</div>
    </div></div>
    <div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveSale()">Save sale</button></div></div>`);
}
function stepQty(id,d){ const e=document.getElementById(id); const max=+e.dataset.max||100000; e.value=Math.max(1,Math.min(max,(parseInt2(e.value)||0)+d)); e.classList.remove('err'); e.dispatchEvent(new Event('input')); }
function onPickItem(){ const it=DB.inventory.find(i=>i.id===val('s_item')); if(!it)return;
  document.getElementById('s_price').value=it.sellPrice.toLocaleString('es-PY');
  const q=document.getElementById('s_qty'); q.dataset.max=invLeft(it); if(parseInt2(q.value)>invLeft(it)) q.value=invLeft(it);
  document.getElementById('s_left').textContent=`${invLeft(it)} ${lang==='es'?'en stock':'in stock'}`;
  updSalePreview(); }
function updSalePreview(){ const it=DB.inventory.find(i=>i.id===val('s_item')); const qty=parseInt2(val('s_qty')), price=parseInt2(val('s_price')), total=qty*price;
  document.getElementById('s_preview').textContent=fmt(total);
  const pe=document.getElementById('s_profit'); if(!pe) return;
  if(!it||!total){ pe.textContent='—'; pe.className=''; return; }
  const profit=total-qty*(+it.purchasePYG||0); pe.textContent=`${fmt(profit)} · ${pct(profit,total)}`; pe.className=profit<0?'neg':'pos'; }
async function saveSale(){
  const item=DB.inventory.find(i=>i.id===val('s_item')); const price=parseInt2(val('s_price')), qty=parseInt2(val('s_qty'));
  let ok=true; if(!item){document.getElementById('s_item').classList.add('err');ok=false;} if(price<=0){document.getElementById('s_price').classList.add('err');ok=false;}
  if(qty<1||(item&&qty>invLeft(item))){document.getElementById('s_qty').classList.add('err');ok=false;}
  if(!ok){ toast(item&&qty>invLeft(item)?'not enough stock':'Pick an item, a quantity and a price','warn'); return; }
  try{
    await apiReq('POST','/api/sales',{companyId:activeCompanyId(),inventoryId:item.id,unitPrice:price,quantity:qty,delivery:val('s_delivery'),clientId:val('s_client')||null,payment:val('s_payment'),date:val('s_date')});
    closeModal(); await reload(); toast('Sale registered');
  }catch(e){ toast(apiErr(e),'warn'); }
}
function openExpense(){
  if(!can('expenses')){toast('Not permitted for your role','warn');return;}
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>Add an expense</h3><p>Record money leaving the business.</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg"><label>Date <span class="req">*</span></label><input type="date" id="e_date" value="${today()}"></div>
      <div class="fg"><label>Amount (PYG) <span class="req">*</span></label><input id="e_amount" inputmode="numeric" placeholder="250.000"></div>
      <div class="fg full"><label>Category <span class="req">*</span></label><select id="e_cat">${EXP_CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div>
      <div class="fg full"><label>Description <span class="muted" style="font-weight:400">(optional)</span></label><textarea id="e_desc" placeholder="What was this for?"></textarea></div>
    </div></div><div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveExpense()">Save expense</button></div></div>`);
}
async function saveExpense(){ const amt=parseInt2(val('e_amount')); if(amt<=0){document.getElementById('e_amount').classList.add('err');toast('Enter an amount','warn');return;}
  try{ await apiReq('POST','/api/expenses',{companyId:activeCompanyId(),date:val('e_date'),amount:amt,category:val('e_cat'),description:val('e_desc').trim()}); closeModal(); await reload(); toast('Expense saved'); }catch(e){ toast(apiErr(e),'warn'); } }
function openRevenue(){
  if(!can('expenses')){toast('Not permitted for your role','warn');return;}
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>Add revenue</h3><p>Income not tied to a product sale.</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg"><label>Date <span class="req">*</span></label><input type="date" id="r_date" value="${today()}"></div>
      <div class="fg"><label>Amount (PYG) <span class="req">*</span></label><input id="r_amount" inputmode="numeric" placeholder="500.000"></div>
      <div class="fg full"><label>Category <span class="req">*</span></label><select id="r_cat">${REV_CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div>
      <div class="fg full"><label>Description <span class="muted" style="font-weight:400">(optional)</span></label><textarea id="r_desc" placeholder="Source of this revenue"></textarea></div>
    </div></div><div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveRevenue()">Save revenue</button></div></div>`);
}
async function saveRevenue(){ const amt=parseInt2(val('r_amount')); if(amt<=0){document.getElementById('r_amount').classList.add('err');toast('Enter an amount','warn');return;}
  try{ await apiReq('POST','/api/revenues',{companyId:activeCompanyId(),date:val('r_date'),amount:amt,category:val('r_cat'),description:val('r_desc').trim()}); closeModal(); await reload(); toast('Revenue saved'); }catch(e){ toast(apiErr(e),'warn'); } }

function openInv(){
  if(!can('inventoryManage')){toast('Not permitted for your role','warn');return;}
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>Add ${pLabel().toLowerCase()} to inventory</h3><p>Add one line for all the units you bought of the same item.</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg"><label>Brand <span class="req">*</span></label><input id="i_brand" placeholder="e.g. Seiko"></div>
      <div class="fg"><label>Model / number <span class="req">*</span></label><input id="i_model" placeholder="e.g. SRPB41"></div>
      <div class="fg"><label>SKU</label><input id="i_sku" placeholder="auto if blank"></div>
      <div class="fg"><label>Quantity <span class="req">*</span></label>
        <div class="stepper"><button type="button" aria-label="−" onclick="stepQty('i_qty',-1)">−</button><input id="i_qty" inputmode="numeric" value="1" oninput="updInvPreview()"><button type="button" aria-label="+" onclick="stepQty('i_qty',1)">+</button></div></div>
      <div class="fg"><label>Purchase price per unit (USD) <span class="req">*</span></label><input id="i_usd" inputmode="decimal" oninput="updInvPreview()" placeholder="180"></div>
      <div class="fg"><label>USD/PYG rate <span class="req">*</span></label><input id="i_fx" inputmode="numeric" value="7300" oninput="updInvPreview()"></div>
      <div class="fg full derived stackd"><div><span>Unit cost in <b style="font-family:inherit;font-size:inherit">PYG</b></span><b id="i_pyg">₲ 0</b></div><div><span>Total purchase</span><b id="i_total">₲ 0</b></div>
        <div class="hint">The purchase cost is recorded automatically as an expense in Business Flow.</div></div>
      <div class="fg"><label>Selling price per unit (PYG) <span class="req">*</span></label><input id="i_sell" inputmode="numeric" placeholder="1.500.000"></div>
      <div class="fg"><label>Purchase date</label><input type="date" id="i_date" value="${today()}"></div>
      <div class="fg full"><label>Status</label><select id="i_status"><option value="Available">Available</option><option value="Reserved">Reserved</option><option value="Sold">Sold</option></select></div>
    </div></div><div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveInv()">Add to inventory</button></div></div>`);
}
function updInvPreview(){ const usd=parseNum(val('i_usd')),fx=parseInt2(val('i_fx')),qty=Math.max(1,parseInt2(val('i_qty'))||1);
  document.getElementById('i_pyg').textContent=fmt(usd*fx); document.getElementById('i_total').textContent=`${fmt(Math.round(usd*fx)*qty)}${qty>1?'  ·  × '+qty:''}`; }
async function saveInv(){ const brand=val('i_brand').trim(),model=val('i_model').trim(),usd=parseNum(val('i_usd')),fx=parseInt2(val('i_fx')),sell=parseInt2(val('i_sell')),qty=parseInt2(val('i_qty'));
  let ok=true; [['i_brand',!!brand],['i_model',!!model],['i_usd',usd>0],['i_fx',fx>0],['i_sell',sell>0],['i_qty',qty>=1]].forEach(([id,v])=>{ if(!v){document.getElementById(id).classList.add('err');ok=false;} });
  if(!ok){toast('Complete the required fields','warn');return;}
  try{ await apiReq('POST','/api/inventory',{companyId:activeCompanyId(),brand,model,sku:val('i_sku').trim(),quantity:qty,purchaseUSD:usd,fxRate:fx,sellPrice:sell,status:val('i_status'),purchaseDate:val('i_date')}); closeModal(); await reload(); toast(pLabel()+' added to inventory'); }catch(e){ toast(apiErr(e),'warn'); } }

function openClient(){
  const canAssign=can('allClients'); const agents=coScope(DB.users).filter(u=>u.role==='sales');
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>New client</h3><p>Track recurring buyers and credit.</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg full"><label>Full name <span class="req">*</span></label><input id="c_name" placeholder="e.g. Roberto Duarte"></div>
      <div class="fg"><label>Phone</label><input id="c_phone" placeholder="+595 ..."></div>
      <div class="fg"><label>Email</label><input id="c_email" placeholder="name@mail.com"></div>
      ${canAssign?`<div class="fg full"><label>Assigned agent</label><select id="c_agent"><option value="${session.user.id}">${escHtml(session.user.name)} (me)</option>${agents.filter(a=>a.id!==session.user.id).map(a=>`<option data-u value="${a.id}">${escHtml(a.name)}</option>`).join('')}</select></div>`:''}
    </div></div><div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveClient()">Create client</button></div></div>`);
}
async function saveClient(){ const name=val('c_name').trim(); if(!name){document.getElementById('c_name').classList.add('err');toast('Enter a name','warn');return;}
  const agentId=can('allClients')?(val('c_agent')||session.user.id):session.user.id;
  try{ await apiReq('POST','/api/clients',{companyId:activeCompanyId(),name,phone:val('c_phone').trim(),email:val('c_email').trim(),agentId}); closeModal(); await reload(); toast('Client created'); }catch(e){ toast(apiErr(e),'warn'); } }

function openUser(presetRole){
  const isAdmin=session.user.role==='admin';
  const roles=isAdmin?['admin','manager','sales']:['sales']; // managers can only create sales
  const companies=isAdmin?DB.companies:[activeCompany()];
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>New profile</h3><p>${isAdmin?'Create any role and assign a company.':'Add a sales agent to your company.'}</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg full"><label>Full name <span class="req">*</span></label><input id="u_name" placeholder="e.g. Ana López"></div>
      <div class="fg"><label>Username <span class="req">*</span></label><input id="u_user" placeholder="analopez"></div>
      <div class="fg"><label>Password <span class="req">*</span></label><input id="u_pass" placeholder="temporary password"></div>
      <div class="fg"><label>Role <span class="req">*</span></label><select id="u_role" onchange="onRoleChange()">${roles.map(r=>`<option value="${r}" ${r===presetRole?'selected':''}>${roleLabel(r)}</option>`).join('')}</select></div>
      <div class="fg" id="u_company_fg"><label>Company <span class="req">*</span></label><select id="u_company">${companies.map(c=>c?`<option data-u value="${c.id}">${escHtml(c.name)}</option>`:'').join('')}</select></div>
    </div></div><div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveUser()">Create profile</button></div></div>`);
  onRoleChange();
}
function onRoleChange(){ const role=val('u_role'); const fg=document.getElementById('u_company_fg'); if(!fg)return; fg.style.display=role==='admin'?'none':'flex'; }
async function saveUser(){
  const name=val('u_name').trim(),username=val('u_user').trim(),pass=val('u_pass'),role=val('u_role');
  let ok=true; [['u_name',!!name],['u_user',!!username],['u_pass',!!pass]].forEach(([id,v])=>{if(!v){document.getElementById(id).classList.add('err');ok=false;}});
  if(!ok){toast('Complete the required fields','warn');return;}
  const companyId=role==='admin'?null:(session.user.role==='admin'?val('u_company'):activeCompanyId());
  try{ await apiReq('POST','/api/users',{name,username,password:pass,role,companyId}); closeModal(); await reload(); buildCoSwitch(); toast('Profile created'); }
  catch(e){ if((e.message||'').indexOf('username')>=0){document.getElementById('u_user').classList.add('err');} toast(apiErr(e),'warn'); } }

function openCompany(){
  showModalHTML(`<div class="modal"><div class="modal-head"><div><h3>New company</h3><p>Starts empty with its own isolated database.</p></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="fg full"><label>Company name <span class="req">*</span></label><input id="co_name" placeholder="e.g. Acme Electronics"></div>
      <div class="fg full"><label>Product type (what they sell) <span class="req">*</span></label><input id="co_ptype" placeholder="e.g. Watch, Phone, Shoe" value="Item"></div>
    </div><div class="hint" style="margin-top:6px">Tip: after creating, add a manager profile so they can sign in.</div></div>
    <div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveCompanyNew()">Create company</button></div></div>`);
}
async function saveCompanyNew(){ const name=val('co_name').trim(),pt=val('co_ptype').trim()||'Item'; if(!name){document.getElementById('co_name').classList.add('err');toast('Enter a name','warn');return;}
  try{ const r=await apiReq('POST','/api/companies',{name,productType:pt}); adminCompanyId=r.company.id; closeModal(); await loadState(adminCompanyId); buildCoSwitch(); refreshBrand(); toast('Company created — now add a manager'); go('admin'); }catch(e){ toast(apiErr(e),'warn'); } }
