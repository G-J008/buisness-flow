/* ============================================================
   VIEW: DASHBOARD
   ============================================================ */
function viewDashboard(){
  const c=activeCompany();
  if(!c) return emptyState('No company selected','Create a company in the Admin Console to get started.','shield');
  const months=dataMonths();
  if(!months.length) return dashHeader('')+emptyState(`No activity yet in ${c.name}`,`Register your first sale to start tracking revenue${can('profitCharts')?', expenses and profit':''}.`,'flow',true);
  const sel=months[0];
  return dashHeader(months,sel)+`<div id="dashBody"></div>`;
}
function dashHeader(months,sel){
  const salesBtn=`<button class="btn primary" onclick="openSale()">${plus()}New Sale</button>`;
  const monthSel = months&&months.length?`<select class="input" id="dashMonth" style="height:38px" onchange="renderDashBody()">${months.map(m=>`<option value="${m}" ${m===sel?'selected':''}>${monthLabel(m)}</option>`).join('')}</select>`:'';
  return `<div class="section-head"><div><h2>Business overview</h2><div class="desc" id="dashMonthLabel">${sel?monthLabel(sel)+' summary':'—'}</div></div><div class="head-actions">${monthSel}${salesBtn}</div></div>`;
}
POST.dashboard=()=>{ if(document.getElementById('dashMonth')) renderDashBody(); };
function stmtCard(a,prev){
  const base=a.salesRev+a.otherRev;
  const line=(cls,l,small,p,amt)=>`<div class="stmt-line ${cls}"><div class="l">${l}${small?`<small>${small}</small>`:''}</div>${p?`<div class="p">${p}</div>`:''}<div class="a">${amt}</div></div>`;
  const seg=(v,c)=>base>0&&v>0?`<span style="width:${Math.min(100,v/base*100)}%;background:${c}"></span>`:'';
  const soldTxt=`${a.sold} ${unitWord(a.sold,'unit')} ${lang==='es'?'en':'in'} ${a.tx} ${unitWord(a.tx,'sale')}`;
  return `<div class="card stmt">
    <div class="stmt-head"><div><div class="panel-title">Month result</div><div class="panel-sub">Profit is what remains after the cost of what you sold</div></div><div class="panel-sub" style="white-space:nowrap">${prev?delta(a.net,prev.net):''}</div></div>
    ${line('','Product sales',`<i data-u>${soldTxt}</i>`,'',fmt(a.salesRev))}
    ${line('minus','Cost of goods sold','What those units cost you','',fmt(-a.cogs))}
    ${line('sub','Gross profit','',a.salesRev?pct(a.gross,a.salesRev)+' margin':'',`<span class="${a.gross<0?'neg':''}">${fmt(a.gross)}</span>`)}
    ${a.otherRev?line('','Other revenue','','','+ '+fmt(a.otherRev)):''}
    ${line('minus','Operating expenses','Without inventory purchases','',fmt(-a.opex))}
    ${line('total','Net profit','',base?pct(a.net,base)+' of billing':'',`<span class="${a.net>=0?'pos':'neg'}">${fmt(a.net)}</span>`)}
    <div class="split" role="img" aria-label="${tr('Cost')} ${pct(a.cogs,base,0)}, ${tr('Expenses')} ${pct(a.opex,base,0)}, ${tr('Profit')} ${pct(Math.max(0,a.net),base,0)}">${seg(a.cogs,'#eda100')}${seg(a.opex,'#eb6834')}${seg(Math.max(0,a.net),'#2a78d6')}</div>
    <div class="split-key"><span><i style="background:#eda100"></i>Cost <b>${pct(a.cogs,base,0)}</b></span><span><i style="background:#eb6834"></i>Expenses <b>${pct(a.opex,base,0)}</b></span><span><i style="background:#2a78d6"></i>Profit <b>${pct(Math.max(0,a.net),base,0)}</b></span></div>
  </div>`;
}
function factsCard(title,rows){
  return `<div class="card"><div style="padding:18px 20px 2px"><div class="panel-title">${title}</div></div><div class="facts">${rows.filter(Boolean).map(r=>`<div class="fact"><div class="l">${r[0]}${r[2]?`<small>${r[2]}</small>`:''}</div><div class="a ${r[3]||''}">${r[1]}</div></div>`).join('')}</div></div>`;
}
function noCostNote(a){ return a.noCost?`<div class="note"><i data-u>${a.noCost} ${unitWord(a.noCost,'sale')}</i> have no recorded cost, so their whole price shows as profit.</div>`:''; }
function stockNow(){ const st=invList().filter(i=>invLeft(i)>0); return {units:sum(st,invLeft),cost:sum(st,i=>invLeft(i)*(+i.purchasePYG||0)),sell:sum(st,i=>invLeft(i)*(+i.sellPrice||0))}; }
const kpiTile=k=>`<div class="card kpi"><div class="lbl">${k.lbl}</div><div class="val">${k.val}</div><div class="sub">${k.sub||''}</div></div>`;
function renderDashBody(){
  const ym=document.getElementById('dashMonth').value; const a=monthAgg(ym);
  document.getElementById('dashMonthLabel').textContent=tr(monthLabel(ym)+' summary');
  const showProfit=can('profitCharts');
  const brandRev={}; revList().filter(r=>r.saleId).forEach(r=>brandRev[r.brand]=(brandRev[r.brand]||0)+r.amount);
  const brandRevMonth={}; a.rev.filter(r=>r.saleId).forEach(r=>brandRevMonth[r.brand]=(brandRevMonth[r.brand]||0)+r.amount);
  const brandRevMonthE=Object.entries(brandRevMonth).sort((x,y)=>y[1]-x[1]);
  const best=brandRevMonthE[0];
  const months=dataMonths(); const idx=months.indexOf(ym); const prev=idx>=0&&idx<months.length-1?monthAgg(months[idx+1]):null;
  const soldTile={lbl:pPlural()+' Sold (mo.)',val:a.sold,sub:prev?delta(a.sold,prev.sold):'this period'};
  const avgTile={lbl:'Avg Sale Value',val:fmt(a.avgSale),sub:'per unit'};
  const bestTile={lbl:'Best selling brand this month',val:best?`<i data-u>${escHtml(best[0])}</i>`:'—',sub:best?fmt(best[1]):''};

  let html='';
  if(showProfit){
    const st=stockNow(); const receivable=sum(coScope(DB.clients),c=>clientBalance(c.id));
    html+=noCostNote(a)+`<div class="result-row">${stmtCard(a,prev)}${factsCard('Cash and stock',[
      ['Cash flow this month',fmt(a.cash),'Revenue minus every expense, inventory purchases included',a.cash<0?'neg':''],
      ['Inventory purchases this month',fmt(a.invBuy),'Becomes cost only when the units are sold'],
      ['Receivable on credit',fmt(receivable),'What clients still owe'],
      ['Stock at cost',fmt(st.cost),`<i data-u>${st.units}</i> units available`],
      ['Current Balance',fmt(balance()),'All revenue minus all expenses to date',balance()<0?'neg':''],
    ])}</div>`;
    html+=`<div class="grid kpis">${[soldTile,avgTile,{lbl:'Avg profit per unit',val:fmt(a.sold?a.gross/a.sold:0),sub:a.salesRev?pct(a.gross,a.salesRev)+' margin':''},bestTile].map(kpiTile).join('')}</div>`;
    html+=`<div class="grid charts-row">
      <div class="card chart-card"><h3>Billing and profit</h3><div class="ch-sub">Last 6 months · PYG</div><div class="chart-wrap"><canvas id="chProfit"></canvas></div></div>
      <div class="card chart-card"><h3>Cash flow</h3><div class="ch-sub">Revenue vs every expense, inventory purchases included</div><div class="chart-wrap"><canvas id="chRevExp"></canvas></div></div></div>
      <div class="grid charts-row3" style="margin-top:16px">
      <div class="card chart-card"><h3>Sales by Brand (month)</h3><div class="ch-sub">Revenue share · ${monthLabel(ym)}</div><div class="chart-wrap md">${brandRevMonthE.length?'<canvas id="chBrandMonth"></canvas>':'<div class="empty">No sales this month</div>'}</div></div>
      <div class="card chart-card"><h3>Sales by Brand (all time)</h3><div class="ch-sub">All-time revenue share</div><div class="chart-wrap md"><canvas id="chBrand"></canvas></div></div>
      <div class="card chart-card"><h3>Delivery Methods</h3><div class="ch-sub">How ${pPlural().toLowerCase()} reach buyers</div><div class="chart-wrap md"><canvas id="chDelivery"></canvas></div></div></div>`;
  }else{
    // sales agents: their own billing only — never costs or margins
    html+=`<div class="grid kpis">${[{lbl:'Monthly billing',val:fmt(a.revSum),sub:prev?delta(a.revSum,prev.revSum):''},soldTile,avgTile,bestTile].map(kpiTile).join('')}</div>`;
    html+=`<div class="card chart-card"><h3>My Revenue Trend</h3><div class="ch-sub">Last 6 months · PYG</div><div class="chart-wrap"><canvas id="chRevOnly"></canvas></div></div>`;
  }
  html+=`<div class="section-head"><div><h2>Recent activity</h2></div><button class="btn ghost sm" onclick="go('flow')">View all</button></div><div id="recentGrid" class="grid ${showProfit?'charts-row':''}"></div>`;
  document.getElementById('dashBody').innerHTML=tr(html);

  const m6=lastNMonths(6), labels=m6.map(m=>mName(+m.split('-')[1]-1));
  if(showProfit){
    mkChart('chProfit',profitChartCfg(m6,labels));
    mkChart('chRevExp',{type:'bar',data:{labels,datasets:[{label:tr('Revenue'),data:m6.map(m=>monthAgg(m).revSum),backgroundColor:'#1baf7a',borderRadius:4,maxBarThickness:24},{label:tr('Expenses'),data:m6.map(m=>monthAgg(m).expSum),backgroundColor:'#eb6834',borderRadius:4,maxBarThickness:24}]},options:barOpts()});
    const bE=Object.entries(brandRev).sort((x,y)=>y[1]-x[1]);
    // keep each brand's colour identical in both brand charts
    const brandColor=b=>SERIES[Math.max(0,bE.findIndex(e=>e[0]===b))%SERIES.length];
    mkChart('chBrand',{type:'doughnut',data:{labels:bE.map(e=>e[0]),datasets:[{data:bE.map(e=>e[1]),backgroundColor:bE.map(e=>brandColor(e[0])),borderColor:'#fff',borderWidth:2,hoverOffset:8}]},options:donutOpts(true,true)});
    if(brandRevMonthE.length) mkChart('chBrandMonth',{type:'doughnut',data:{labels:brandRevMonthE.map(e=>e[0]),datasets:[{data:brandRevMonthE.map(e=>e[1]),backgroundColor:brandRevMonthE.map(e=>brandColor(e[0])),borderColor:'#fff',borderWidth:2,hoverOffset:8}]},options:donutOpts(true,true)});
    const dc={}; saleList().forEach(s=>dc[s.delivery]=(dc[s.delivery]||0)+saleQty(s));
    const dE=DELIVERIES.filter(d=>dc[d]).map(d=>[d,dc[d]]);
    mkChart('chDelivery',{type:'doughnut',data:{labels:dE.map(e=>tr(e[0])),datasets:[{data:dE.map(e=>e[1]),backgroundColor:['#2a78d6','#1baf7a','#eda100','#e87ba4'],borderColor:'#fff',borderWidth:2,hoverOffset:8}]},options:donutOpts(false,true)});
  }else{
    const myRev=m6.map(m=>myScope(DB.revenues).filter(r=>ymKey(r.date)===m).reduce((a,r)=>a+r.amount,0));
    mkChart('chRevOnly',{type:'line',data:{labels,datasets:[{label:tr('My revenue'),data:myRev,borderColor:'#1baf7a',backgroundColor:grad('#1baf7a'),fill:true,tension:.35,borderWidth:2,pointRadius:3.5,pointBackgroundColor:'#1baf7a',pointBorderColor:'#fff',pointBorderWidth:1.5}]},options:lineOpts()});
  }
  renderRecent(showProfit);
}
// Billing next to what was really earned: bars for billed and gross profit, a line for net profit.
function profitChartCfg(months,labels){
  return {type:'bar',data:{labels,datasets:[
    {label:tr('Billed'),data:months.map(m=>monthAgg(m).revSum),backgroundColor:'#1baf7a',borderRadius:4,maxBarThickness:24,order:1},
    {label:tr('Gross profit'),data:months.map(m=>monthAgg(m).gross),backgroundColor:'#2a78d6',borderRadius:4,maxBarThickness:24,order:1},
    {type:'line',label:tr('Net profit'),data:months.map(m=>monthAgg(m).net),borderColor:'#4a3aa7',backgroundColor:'#4a3aa7',borderWidth:2,cubicInterpolationMode:'monotone',pointRadius:3,pointBackgroundColor:'#4a3aa7',pointBorderColor:'#fff',pointBorderWidth:1.5,order:0}]},options:barOpts()};
}
function renderRecent(showProfit){
  const rev=[...myScope(DB.revenues)].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const row=(cls,t,s,amt)=>`<div class="act-row"><div class="act-main"><div class="act-title">${t}</div><div class="act-sub">${s}</div></div><div class="act-amt ${cls}">${cls==='pos'?'+ ':''}${fmt(cls==='pos'?amt:-amt)}</div></div>`;
  const revTitle=r=>{ const s=SALE_BY_ID[r.saleId]; return r.saleId?`<i data-u>${escHtml(r.brand+' '+r.model)}</i>${s?xQty(saleQty(s)):''}`:(r.description?`<i data-u>${escHtml(r.description)}</i>`:r.category); };
  let html=`<div class="card"><div style="padding:16px 20px 6px"><div class="panel-title">${showProfit?'Latest revenue':'My latest revenue'}</div></div><div class="activity">${rev.map(r=>row('pos',revTitle(r),`${r.category} · <i data-u>${fmtDate(r.date)}</i>`,r.amount)).join('')||'<div class="empty">No revenue yet</div>'}</div></div>`;
  if(showProfit){ const exp=[...expList()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
    html+=`<div class="card"><div style="padding:16px 20px 6px"><div class="panel-title">Latest expenses</div></div><div class="activity">${exp.map(e=>row('neg',e.description?`<i data-u>${escHtml(e.description)}</i>`:e.category,`${e.category} · <i data-u>${fmtDate(e.date)}</i>`,e.amount)).join('')||'<div class="empty">No expenses yet</div>'}</div></div>`; }
  document.getElementById('recentGrid').innerHTML=tr(html);
}

/* ============================================================
   VIEW: BUSINESS FLOW (ledger)
   ============================================================ */
let flowTab='all';
function viewFlow(){
  const c=activeCompany(); if(!c) return emptyState('No company selected','Pick or create a company first.','shield');
  const expBtn=can('expenses')?`<button class="btn" onclick="openExpense()">${plus()}Expense</button>`:'';
  const revBtn=can('expenses')?`<button class="btn" onclick="openRevenue()">${plus()}Revenue</button>`:'';
  const tabs=[['all','All movements'],['sale','Sales']]; if(can('expenses')){tabs.push(['expense','Expenses']);} tabs.push(['revenue','Revenue']);
  return `<div class="flow-head">
    <div class="tabs" id="flowTabs">${tabs.map(([k,l])=>`<button class="tab ${flowTab===k?'active':''}" data-tab="${k}" onclick="setFlowTab('${k}')">${l}</button>`).join('')}</div>
    <div class="flow-actions">${expBtn}${revBtn}<button class="btn primary" onclick="openSale()">${plus()}New Sale</button></div></div>
  <div class="card table-card">
    <div class="table-tools">
      <div class="field">${searchIcon()}<input class="input search" id="fSearch" placeholder="Search ${pLabel().toLowerCase()}, client…" oninput="renderLedger()"></div>
      <select class="input" id="fBrand" onchange="renderLedger()"></select>
      <select class="input" id="fDelivery" onchange="renderLedger()"><option value="">All delivery</option>${DELIVERIES.map(d=>`<option value="${d}">${d}</option>`).join('')}</select>
      <input class="input" id="fFrom" type="date" style="width:150px" oninput="renderLedger()">
      <input class="input" id="fTo" type="date" style="width:150px" oninput="renderLedger()">
      <div class="spacer"></div><button class="btn ghost sm" onclick="clearFilters()">Clear</button>
    </div>
    <div class="tbl-scroll"><table class="stack two"><thead><tr><th>Date</th><th>Type</th><th>Detail</th><th>Client</th><th>Pay</th><th class="num">Amount</th>${can('profitCharts')?'<th class="num">Profit</th>':''}<th></th></tr></thead><tbody id="ledgerBody"></tbody></table></div>
  </div>`;
}
POST.flow=()=>{ // populate brand filter
  const brands=[...new Set(saleList().map(s=>s.brand))].sort();
  document.getElementById('fBrand').innerHTML=tr('<option value="">All brands</option>')+brands.map(b=>`<option>${escHtml(b)}</option>`).join('');
  renderLedger();
};
function setFlowTab(t){ flowTab=t; document.querySelectorAll('#flowTabs .tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t)); renderLedger(); }
function clientName(id){ const c=DB.clients.find(x=>x.id===id); return c?c.name:'—'; }
function renderLedger(){
  const q=(val('fSearch')||'').toLowerCase(), fb=val('fBrand'),fd=val('fDelivery'),ff=val('fFrom'),ft=val('fTo');
  const showProfit=can('profitCharts');
  let rows=[];
  myScope(DB.revenues).forEach(r=>rows.push({kind:r.saleId?'sale':'revenue',date:r.date,type:'revenue',detail:r.saleId?`${r.brand} ${r.model}`:(r.description||''),sale:SALE_BY_ID[r.saleId],client:r.clientId?clientName(r.clientId):'',category:r.category,delivery:r.delivery||'',payment:r.payment||'',amount:r.amount,brand:r.brand||'',ref:r}));
  if(can('expenses')) expList().forEach(e=>rows.push({kind:'expense',date:e.date,type:'expense',detail:e.description||'',client:'',category:e.category,delivery:'',payment:'',amount:e.amount,brand:'',ref:e}));
  rows=rows.filter(r=>{
    if(flowTab==='sale'&&r.kind!=='sale')return false;
    if(flowTab==='revenue'&&r.type!=='revenue')return false;
    if(flowTab==='expense'&&r.type!=='expense')return false;
    if(fb&&r.brand!==fb)return false; if(fd&&r.delivery!==fd)return false;
    if(ff&&r.date<ff)return false; if(ft&&r.date>ft)return false;
    if(q&&!(`${r.detail} ${r.category} ${tr(r.category)} ${r.brand} ${r.client}`.toLowerCase().includes(q)))return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date));
  const body=document.getElementById('ledgerBody');
  if(!rows.length){ body.innerHTML=tr(`<tr><td colspan="8" class="st-block"><div class="empty"><div class="big">No movements</div>Try adjusting your filters or register a sale.</div></td></tr>`); return; }
  const canDel=can('expenses')||session.user.role!=='sales';
  body.innerHTML=tr(rows.map(r=>{ const p=r.sale&&showProfit?saleProfit(r.sale):null;
    return `<tr>
    <td data-label="Date"><span class="fig" data-u>${fmtDate(r.date)}</span></td>
    <td data-label="Type"><span class="pill ${r.type==='revenue'?'rev':'exp'}"><span class="d" style="background:${r.type==='revenue'?'#0a7d3f':'#c42f4a'}"></span>${r.kind==='sale'?'Sale':r.type[0].toUpperCase()+r.type.slice(1)}</span></td>
    <td class="st-head"><div><div>${r.detail?`<i data-u>${escHtml(r.detail)}</i>`:r.category}${r.sale?xQty(saleQty(r.sale)):''}</div>${r.detail&&r.kind!=='sale'?`<div class="cell-sub">${r.category}</div>`:''}</div></td>
    <td class="muted" data-label="Client">${r.client?`<i data-u>${escHtml(r.client)}</i>`:''}</td>
    <td data-label="Pay">${r.payment?`<span class="pill ${r.payment.toLowerCase()}">${r.payment}</span>`:''}</td>
    <td class="num" data-label="Amount" style="font-weight:600;color:${r.type==='revenue'?'#067a06':'#c42f2f'}">${r.type==='revenue'?'+ '+fmt(r.amount):fmt(-r.amount)}</td>
    ${showProfit?`<td class="num st-wide" data-label="Profit">${p==null?'':`<span><span class="${p<0?'neg':''}">${fmt(p)}</span><span class="qty">${pct(p,r.amount,0)}</span></span>`}</td>`:''}
    <td class="num st-act">${canDel&&!(r.kind==='expense'&&r.ref.inventoryId)?`<button class="btn ghost sm danger" title="Delete" aria-label="Delete" onclick="delRow('${r.kind}','${r.ref.id}')">${trash()}</button>`:''}</td>
  </tr>`; }).join(''));
}
async function delRow(kind,id){
  try{
    if(kind==='sale'){ const rev=DB.revenues.find(r=>r.id===id); const saleId=rev?rev.saleId:null; if(saleId) await apiReq('DELETE','/api/sales/'+saleId); }
    else if(kind==='revenue') await apiReq('DELETE','/api/revenues/'+id);
    else await apiReq('DELETE','/api/expenses/'+id);
    await reload(); toast('Movement deleted');
  }catch(e){ toast(apiErr(e),'warn'); }
}
function clearFilters(){ ['fSearch','fBrand','fDelivery','fFrom','fTo'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';}); renderLedger(); }

/* ============================================================
   VIEW: INVENTORY
   ============================================================ */
/* Inventory is shown as a month-end snapshot. A line holds one or more units of the same item:
   the units in stock at a date are the units bought on/before it minus the units sold up to it. */
function monthEnd(ym){ const [y,m]=ym.split('-').map(Number); return localISO(new Date(y,m,0)); }
function invCutoff(ym){ const end=monthEnd(ym), t=today(); return end<t?end:t; }
function unitsAt(i,date){
  if(!i.purchaseDate||i.purchaseDate>date) return 0;
  const ss=SALES_BY_INV[i.id]||[];
  if(!ss.length&&i.status==='Sold') return 0; // marked sold without a sale record → not in stock
  return Math.max(0,qtyOf(i)-sum(ss.filter(s=>s.date<=date),saleQty));
}
function invStockAt(date){ return invList().map(i=>({...i,_units:unitsAt(i,date)})).filter(i=>i._units>0); }
function daysBetween(a,b){ const [y1,m1,d1]=a.split('-').map(Number),[y2,m2,d2]=b.split('-').map(Number); return Math.max(0,Math.round((Date.UTC(y2,m2-1,d2)-Date.UTC(y1,m1-1,d1))/864e5)); }
function invMonths(){
  const dates=invList().map(i=>i.purchaseDate).filter(Boolean).sort(); const now=new Date(), arr=[];
  let d=new Date(now.getFullYear(),now.getMonth(),1);
  const first=dates.length?new Date(+dates[0].slice(0,4),+dates[0].slice(5,7)-1,1):d;
  while(d>=first){ arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); d=new Date(d.getFullYear(),d.getMonth()-1,1); }
  return arr; // newest first
}
function unitWord(n,w){ const W={piece:['piece','pieces','pieza','piezas'],day:['day','days','día','días'],unit:['unit','units','unidad','unidades'],sale:['sale','sales','venta','ventas']}[w]; return W[(lang==='es'?2:0)+(n===1?0:1)]; }
// status shown as it was on the snapshot date (units sold later were still available then)
function invStatusAt(i){ return i.status==='Sold' ? 'Available' : i.status; }
function isCurrentMonth(ym){ return ym===today().slice(0,7); }
function viewInventory(){
  const c=activeCompany(); if(!c) return emptyState('No company selected','Pick or create a company first.','shield');
  const months=invMonths();
  return `<div class="section-head"><div><h2>${pLabel()} inventory</h2><div class="desc" id="invDesc">Manage stock, purchase cost and status</div></div>
    <div class="head-actions"><select class="input" id="invMonth" onchange="POST.inventory()">${months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join('')}</select>
    <button class="btn" onclick="exportInventory()">${download()}Export</button><button class="btn primary" onclick="openInv()">${plus()}Add ${pLabel()}</button></div></div>
  <div class="grid charts-row3" id="invCharts"></div>
  <div class="card table-card" style="margin-top:16px">
    <div class="table-tools"><div class="panel-title" id="invTblTitle"></div><div class="spacer"></div><div class="field">${searchIcon()}<input class="input search" id="invSearch" placeholder="Search model, SKU, brand…" oninput="renderInv()"></div>
      <select class="input" id="invStatus" onchange="renderInv()"><option value="">All status</option><option value="Available">Available</option><option value="Reserved">Reserved</option></select></div>
    <div class="tbl-scroll"><table class="stack"><thead><tr><th>Item</th><th class="num">Units in stock</th><th class="num">Unit cost</th><th class="num">Unit price</th><th>Status</th><th>Purchased</th><th class="num">Days in stock</th><th></th></tr></thead><tbody id="invBody"></tbody></table></div>
  </div>`;
}
POST.inventory=()=>{
  const ym=val('invMonth')||today().slice(0,7);
  const cur=isCurrentMonth(ym);
  document.getElementById('invDesc').textContent=tr(cur?'Available pieces as of today':'Available pieces at month end')+' · '+(cur?fmtDate(today()):fmtDate(monthEnd(ym)));
  document.getElementById('invTblTitle').textContent=tr(cur?'In stock today':'In stock at month end')+(cur?'':' '+monthLabel(ym));
  renderInvCharts(); renderInv();
};
function brandAgg(items){
  const m={}; items.forEach(i=>{ const b=i.brand||'—', u=i._units; if(!m[b])m[b]={qty:0,cost:0,sell:0}; m[b].qty+=u; m[b].cost+=u*(+i.purchasePYG||0); m[b].sell+=u*(+i.sellPrice||0); });
  return m;
}
function renderInvCharts(){
  const ym=val('invMonth')||today().slice(0,7);
  const stock=invStockAt(invCutoff(ym)); const agg=brandAgg(stock);
  const tQ=sum(stock,i=>i._units), tC=sum(stock,i=>i._units*(+i.purchasePYG||0)), tS=sum(stock,i=>i._units*(+i.sellPrice||0));
  const card=(id,title,total)=>`<div class="card chart-card"><h3>${title}</h3><div class="chart-total"><i data-u>${total}</i></div><div class="chart-wrap md">${tQ?`<canvas id="${id}"></canvas>`:'<div class="empty">No stock at this date</div>'}</div></div>`;
  document.getElementById('invCharts').innerHTML=tr(
    card('chInvQty','Stock by Brand',`${tQ} ${unitWord(tQ,'unit')}`)+
    card('chInvCost','Stock Value at Cost',fmt(tC))+
    card('chInvVal','Stock Value at Sale Price',fmt(tS)));
  if(!tQ) return;
  const order=Object.entries(agg).sort((a,b)=>b[1].sell-a[1].sell).map(x=>x[0]); // same colour per brand in all 3 charts
  const draw=(id,key,money)=>{ const e=Object.entries(agg).map(([b,v])=>[b,v[key]]).sort((a,b)=>b[1]-a[1]);
    mkChart(id,{type:'doughnut',data:{labels:e.map(x=>x[0]),datasets:[{data:e.map(x=>x[1]),backgroundColor:e.map(x=>SERIES[order.indexOf(x[0])%SERIES.length]),borderColor:'#fff',borderWidth:2,hoverOffset:8}]},options:donutOpts(money,true)}); };
  draw('chInvQty','qty',false); draw('chInvCost','cost',true); draw('chInvVal','sell',true);
}
function renderInv(){
  const ym=val('invMonth')||today().slice(0,7); const cut=invCutoff(ym);
  const q=(val('invSearch')||'').toLowerCase(), st=val('invStatus');
  let inv=invStockAt(cut).filter(i=>(!st||invStatusAt(i)===st)&&(!q||`${i.brand} ${i.model} ${i.sku}`.toLowerCase().includes(q))).sort((a,b)=>a.purchaseDate.localeCompare(b.purchaseDate));
  const body=document.getElementById('invBody');
  if(!inv.length){ body.innerHTML=tr(`<tr><td colspan="8" class="st-block"><div class="empty"><div class="big">No ${pPlural().toLowerCase()}</div>Add your first item to build inventory.</div></td></tr>`); return; }
  body.innerHTML=tr(inv.map(i=>{ const d=daysBetween(i.purchaseDate,cut); const cls=d>=90?'hot':d>=45?'warm':'';
    const hasSales=(SALES_BY_INV[i.id]||[]).length>0||(+i.soldQty||0)>0, stAt=invStatusAt(i), total=qtyOf(i);
    return `<tr>
    <td class="st-head"><div><div><i data-u>${escHtml(i.brand+' '+i.model)}</i></div><div class="cell-sub"><i data-u>${escHtml(i.sku)}</i></div></div></td>
    <td class="num" data-label="Units in stock"><span data-u><b>${i._units}</b>${total>1?`<span class="qty">/ ${total}</span>`:''}</span></td>
    <td class="num" data-label="Unit cost"><div><div>${fmt(i.purchasePYG)}</div><div class="cell-sub fig">${fmtUsd(i.purchaseUSD)}</div></div></td><td class="num" data-label="Unit price" style="font-weight:600">${fmt(i.sellPrice)}</td>
    <td data-label="Status"><span class="pill ${stAt.toLowerCase()}">${stAt}</span></td><td data-label="Purchased"><span class="fig" data-u>${fmtDate(i.purchaseDate)}</span></td>
    <td class="num" data-label="Days in stock"><span class="days-badge ${cls}" data-u>${d} ${unitWord(d,'day')}</span></td>
    <td class="num st-act">${i.status!=='Sold'&&!hasSales?`<button class="btn ghost sm danger" aria-label="Delete" onclick="delInv('${i.id}')">${trash()}</button>`:''}</td></tr>`; }).join(''));
}
async function delInv(id){
  const it=DB.inventory.find(i=>i.id===id);
  if(!confirmDel(it?`${it.brand} ${it.model}`:'')) return;
  try{ await apiReq('DELETE','/api/inventory/'+id); await reload(); toast('Item removed'); }catch(e){ toast(apiErr(e),'warn'); } }
function exportInventory(){
  const ym=val('invMonth')||today().slice(0,7); const cur=isCurrentMonth(ym); const cut=invCutoff(ym);
  const inv=invStockAt(cut).sort((a,b)=>a.purchaseDate.localeCompare(b.purchaseDate)); const agg=brandAgg(inv);
  const tQ=sum(inv,i=>i._units), tC=sum(inv,i=>i._units*(+i.purchasePYG||0)), tS=sum(inv,i=>i._units*(+i.sellPrice||0));
  const label=cur?`${tr('Snapshot as of')} ${fmtDate(cut)}`:`${tr('Closing snapshot')} · ${monthLabel(ym)} (${fmtDate(cut)})`;
  const slug=activeCompany().name.toLowerCase().replace(/\s/g,'-');
  const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'pt',format:'a4'}); const W=doc.internal.pageSize.getWidth();
  doc.setFillColor(42,120,214); doc.rect(0,0,W,80,'F'); doc.setTextColor(255); doc.setFont('times','bold'); doc.setFontSize(20); doc.text(activeCompany().name,40,40);
  doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.text(tr('Inventory Report')+' — '+label,40,60); doc.setFontSize(9); doc.text(tr('Generated ')+fmtDate(today()),W-40,40,{align:'right'});
  doc.setTextColor(20); doc.setFont('times','bold'); doc.setFontSize(13); doc.text(tr('Summary by brand'),40,108);
  const sumRows=Object.entries(agg).sort((a,b)=>b[1].sell-a[1].sell).map(([b,v])=>[b,String(v.qty),pct(v.qty,tQ),fmtPdf(v.cost),pct(v.cost,tC),fmtPdf(v.sell),pct(v.sell,tS)]);
  sumRows.push([{content:'Total',styles:{fontStyle:'bold'}},{content:String(tQ),styles:{fontStyle:'bold'}},'100%',{content:fmtPdf(tC),styles:{fontStyle:'bold'}},'100%',{content:fmtPdf(tS),styles:{fontStyle:'bold'}},'100%']);
  doc.autoTable({startY:116,head:[[tr('Brand'),tr('Units'),'%',tr('Cost value'),'%',tr('Sale value'),'%']],body:sumRows,theme:'grid',headStyles:{fillColor:[42,120,214],fontSize:8.5},bodyStyles:{fontSize:8.5},margin:{left:40,right:40},columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'}}});
  doc.autoTable({startY:doc.lastAutoTable.finalY+22,head:[[tr('Brand'),tr('Model'),'SKU',tr('Units'),tr('Unit cost (USD)'),tr('Unit cost (PYG)'),tr('Unit price'),tr('Purchased'),tr('Days in stock')]],
    body:inv.map(i=>[i.brand,i.model,i.sku,String(i._units),fmtUsd(i.purchaseUSD),fmtPdf(i.purchasePYG),fmtPdf(i.sellPrice),fmtDate(i.purchaseDate),String(daysBetween(i.purchaseDate,cut))]),
    theme:'grid',headStyles:{fillColor:[60,60,60],fontSize:7.5},bodyStyles:{fontSize:7.5},margin:{left:40,right:40},columnStyles:{2:{cellWidth:'wrap'},3:{halign:'right',cellWidth:'wrap'},4:{halign:'right',cellWidth:'wrap'},5:{halign:'right',cellWidth:'wrap'},6:{halign:'right',cellWidth:'wrap'},7:{cellWidth:'wrap'},8:{halign:'right'}}});
  pdfFooter(doc);
  doc.save(`inventory-${slug}-${ym}.pdf`);
  const esc=v=>{ const t=String(v??''); return /[",\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t; };
  const csv=['Brand,Model,SKU,Units in stock,Units purchased,Unit cost USD,FX Rate,Unit cost PYG,Unit price PYG,Total cost PYG,Total sale value PYG,Status,Purchase Date,Days in stock,Snapshot date',
    ...inv.map(i=>[i.brand,i.model,i.sku,i._units,qtyOf(i),i.purchaseUSD,i.fxRate,i.purchasePYG,i.sellPrice,i._units*(+i.purchasePYG||0),i._units*(+i.sellPrice||0),invStatusAt(i),i.purchaseDate,daysBetween(i.purchaseDate,cut),cut].map(esc).join(','))].join('\n');
  const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download=`inventory-${slug}-${ym}.csv`; a.click();
  toast('Inventory exported (PDF + CSV)');
}
function pdfFooter(doc){ const n=doc.getNumberOfPages(), W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight();
  for(let p=1;p<=n;p++){ doc.setPage(p); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(150);
    doc.text(activeCompany().name+' · Argus Technology Commercial Software',40,H-24); doc.text(`${tr('Page')} ${p} / ${n}`,W-40,H-24,{align:'right'}); } }
