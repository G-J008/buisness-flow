/* ============================================================
   VIEW: CLIENTS
   ============================================================ */
function viewClients(){
  const c=activeCompany(); if(!c) return emptyState('No company selected','Pick or create a company first.','shield');
  const scopeNote=can('allClients')?'All company clients':'Your clients';
  return `<div class="section-head"><div><h2>Clients</h2><div class="desc">${scopeNote} · recurring buyers & credit statements</div></div>
    <div class="head-actions"><button class="btn primary" onclick="openClient()">${plus()}New Client</button></div></div>
  <div class="card table-card"><div class="table-tools"><div class="field">${searchIcon()}<input class="input search" id="clSearch" placeholder="Search client…" oninput="renderClients()"></div><div class="spacer"></div></div>
    <div class="tbl-scroll"><table class="stack"><thead><tr><th>Client</th><th>Contact</th><th>Agent</th><th class="num">Purchases</th><th class="num">Total spent</th><th class="num">Paid</th><th class="num">Credit balance</th><th></th></tr></thead><tbody id="clBody"></tbody></table></div></div>`;
}
POST.clients=()=>renderClients();
function agentName(id){ const u=DB.users.find(x=>x.id===id); return u?u.name:'—'; }
function renderClients(){
  const q=(val('clSearch')||'').toLowerCase();
  let cls=myScope(DB.clients).filter(c=>!q||c.name.toLowerCase().includes(q)).sort((a,b)=>clientTotal(b.id)-clientTotal(a.id));
  const body=document.getElementById('clBody');
  if(!cls.length){ body.innerHTML=tr(`<tr><td colspan="8" class="st-block"><div class="empty"><div class="big">No clients yet</div>Create a client to track recurring purchases and credit.</div></td></tr>`); return; }
  body.innerHTML=tr(cls.map(c=>{ const bal=clientBalance(c.id), cnt=coScope(DB.sales).filter(s=>s.clientId===c.id).length, paid=clientPaid(c.id);
    return `<tr style="cursor:pointer" onclick="openStatement('${c.id}')">
      <td class="st-head"><div class="row-flex"><span class="avatar" style="background:${avColor(c.name)}" data-u>${escHtml(initials(c.name))}</span><b data-u>${escHtml(c.name)}</b></div></td>
      <td class="muted" data-label="Contact">${c.phone?`<i data-u>${escHtml(c.phone)}</i>`:''}</td><td class="muted" data-label="Agent"><i data-u>${escHtml(agentName(c.agentId))}</i></td>
      <td class="num" data-label="Purchases">${cnt}</td><td class="num" data-label="Total spent" style="font-weight:600">${fmt(clientTotal(c.id))}</td>
      <td class="num muted" data-label="Paid">${paid>0?fmt(paid):''}</td>
      <td class="num" data-label="Credit balance" style="font-weight:600;color:${bal>0?'#c98500':'#898781'}">${bal>0?fmt(bal):''}</td>
      <td class="num st-hide"><button class="btn ghost sm" onclick="event.stopPropagation();openStatement('${c.id}')">Statement →</button></td></tr>`;}).join(''));
}
function openStatement(cid){
  const c=DB.clients.find(x=>x.id===cid); if(!c) return;
  const purchases=coScope(DB.sales).filter(s=>s.clientId===cid).sort((a,b)=>b.date.localeCompare(a.date));
  const total=clientTotal(cid), credit=clientBalance(cid), paid=clientPaid(cid), creditSold=clientCreditSold(cid);
  const pays=[...clientPayments(cid)].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)));
  // monthly totals
  const byMonth={}; purchases.forEach(s=>byMonth[ymKey(s.date)]=(byMonth[ymKey(s.date)]||0)+s.price);
  const monthsHtml=Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,v])=>`<tr><td class="st-head" data-u>${monthLabel(m)}</td><td class="num" data-label="Total">${fmt(v)}</td></tr>`).join('')||'<tr><td class="muted st-block" colspan="2">No purchases</td></tr>';
  const rows=purchases.map(s=>`<tr><td data-label="Date"><span class="fig" data-u>${fmtDate(s.date)}</span></td><td class="st-head"><i data-u>${escHtml(s.brand+' '+s.model)}</i>${xQty(saleQty(s))}</td><td data-label="Pay">${s.payment?`<span class="pill ${s.payment.toLowerCase()}">${s.payment}</span>`:''}</td><td class="num" data-label="Amount">${fmt(s.price)}</td></tr>`).join('')||'<tr><td colspan="4" class="muted st-block">No purchases yet</td></tr>';
  const payRows=pays.map(p=>`<tr><td data-label="Date"><span class="fig" data-u>${fmtDate(p.date)}</span></td><td class="muted" data-label="Note">${p.note?`<i data-u>${escHtml(p.note)}</i>`:''}</td><td class="num" data-label="Amount" style="font-weight:600;color:#067a06">${fmt(p.amount)}</td><td class="num st-act"><button class="btn ghost sm danger" title="Delete" onclick="delPayment('${p.id}','${cid}')">${trash()}</button></td></tr>`).join('')||'<tr><td colspan="4" class="muted st-block">No payments yet</td></tr>';
  const payForm=credit>0?`<div class="pay-form">
      <div class="fg"><label>Payment date <span class="req">*</span></label><input type="date" id="p_date" value="${today()}"></div>
      <div class="fg"><label>Amount paid <span class="req">*</span></label><input id="p_amount" inputmode="numeric" placeholder="${Math.round(credit).toLocaleString('es-PY')}"></div>
      <div class="fg"><label>Note <span class="muted" style="font-weight:400">(optional)</span></label><input id="p_note" placeholder="e.g. transfer, cash…"></div>
      <button class="btn primary" style="height:40px" onclick="savePayment('${cid}')">${plus()}Register payment</button></div>`
    :`<div class="hint" style="margin-top:8px">This client has no pending credit balance.</div>`;
  showModalHTML(`<div class="modal wide" style="max-width:760px">
    <div class="modal-head"><div class="row-flex"><span class="avatar" style="width:44px;height:44px;font-size:15px;background:${avColor(c.name)}" data-u>${escHtml(initials(c.name))}</span><div><h3 data-u>${escHtml(c.name)}</h3><p><i data-u>${escHtml([c.phone,c.email].filter(Boolean).join(' · '))}</i> Agent: <i data-u>${escHtml(agentName(c.agentId))}</i></p></div></div><button class="x" onclick="closeModal()">${xIcon()}</button></div>
    <div class="modal-body">
      <div class="grid stat-4" style="margin-bottom:18px">
        <div class="card rs" style="padding:14px 16px"><div class="lbl">Total spent</div><div class="val">${fmt(total)}</div><div class="hint">${purchases.length} · Purchases</div></div>
        <div class="card rs" style="padding:14px 16px"><div class="lbl">Credit sold</div><div class="val">${fmt(creditSold)}</div></div>
        <div class="card rs" style="padding:14px 16px;border-top:3px solid #1baf7a"><div class="lbl">Paid</div><div class="val" style="color:#067a06">${fmt(paid)}</div></div>
        <div class="card rs" style="padding:14px 16px;border-top:3px solid ${credit>0?'#c98500':'#e1e0d9'}"><div class="lbl">Credit balance</div><div class="val" style="color:${credit>0?'#c98500':'inherit'}">${fmt(credit)}</div></div>
      </div>
      <div style="margin-bottom:18px"><div class="panel-title">Client payments</div>
        <div class="hint" style="margin-bottom:8px">Payments only reduce this client's credit balance; the revenue was recorded with the credit sale.</div>
        <div class="card table-card"><div class="tbl-scroll" style="max-height:220px;overflow-y:auto"><table class="stack"><thead><tr><th>Date</th><th>Note</th><th class="num">Amount</th><th></th></tr></thead><tbody>${payRows}</tbody></table></div></div>
        ${payForm}
      </div>
      <div class="grid two-col">
        <div><div class="panel-title" style="margin-bottom:8px">Purchase history</div><div class="card table-card"><div class="tbl-scroll"><table class="stack"><thead><tr><th>Date</th><th>${pLabel()}</th><th>Pay</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>
        <div><div class="panel-title" style="margin-bottom:8px">Purchases by month</div><div class="card table-card"><div class="tbl-scroll"><table class="stack"><thead><tr><th>Month</th><th class="num">Total</th></tr></thead><tbody>${monthsHtml}</tbody></table></div></div></div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn ghost" onclick="closeModal()">Close</button><button class="btn primary" onclick="closeModal();openSale('${cid}')">${plus()}New sale for client</button></div>
  </div>`);
}
function confirmDel(what){ return confirm(lang==='es'?`¿Eliminar ${what}?`:`Delete ${what}?`); }
function escHtml(t){ return String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
async function savePayment(cid){
  const amt=parseInt2(val('p_amount')); const date=val('p_date');
  if(amt<=0||!date){ if(amt<=0)document.getElementById('p_amount').classList.add('err'); toast('Enter an amount','warn'); return; }
  try{
    await apiReq('POST','/api/payments',{companyId:activeCompanyId(),clientId:cid,amount:amt,date,note:val('p_note').trim()});
    await reload(); openStatement(cid); toast('Payment registered');
  }catch(e){ toast(apiErr(e),'warn'); }
}
async function delPayment(id,cid){
  const p=DB.payments.find(x=>x.id===id); if(!confirmDel(p?fmt(p.amount):'')) return;
  try{ await apiReq('DELETE','/api/payments/'+id); await reload(); openStatement(cid); toast('Payment removed'); }
  catch(e){ toast(apiErr(e),'warn'); }
}

/* ============================================================
   VIEW: MONTHLY REPORTS
   ============================================================ */
function viewReports(){
  const c=activeCompany(); if(!c) return emptyState('No company selected','Pick or create a company first.','shield');
  const months=dataMonths();
  if(!months.length) return emptyState('No data to report','Register sales and expenses first.','doc');
  return `<div class="section-head"><div><h2>Monthly report</h2><div class="desc">Billing, real profit and cash, month by month</div></div>
    <div class="head-actions"><select class="input" id="repMonth" onchange="renderReport()">${months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join('')}</select>
    <button class="btn primary" onclick="exportReportPDF()">${download()}Export PDF</button></div></div>
  <div id="repBody"></div>`;
}
POST.reports=()=>renderReport();
function reportData(ym){
  const a=monthAgg(ym); const months=dataMonths(); const idx=months.indexOf(ym); const prev=idx>=0&&idx<months.length-1?monthAgg(months[idx+1]):null;
  const bm={}; a.sal.forEach(s=>{ const b=s.brand||'—'; const o=bm[b]||(bm[b]={brand:b,units:0,rev:0,cost:0}); o.units+=saleQty(s); o.rev+=+s.price||0; o.cost+=saleCost(s); });
  const brands=Object.values(bm).map(o=>({...o,profit:o.rev-o.cost})).sort((x,y)=>y.profit-x.profit);
  const sales=[...a.sal].sort((x,y)=>x.date.localeCompare(y.date)).map(s=>({s,qty:saleQty(s),rev:+s.price||0,cost:saleCost(s),profit:saleProfit(s)}));
  const group=(list,key,v)=>{ const m={}; list.forEach(x=>{ const k=key(x)||'—'; m[k]=(m[k]||0)+(+v(x)||0); }); return Object.entries(m).sort((x,y)=>y[1]-x[1]); };
  const cut=invCutoff(ym); const stock=invStockAt(cut);
  return {ym,a,prev,brands,sales,cut,
    opexCats:group(a.exp.filter(e=>!isInvPurchase(e)),e=>e.category,e=>e.amount),
    revCats:group(a.rev,r=>r.category,r=>r.amount),
    pay:group(a.sal,s=>s.payment,s=>s.price), deliv:group(a.sal,s=>s.delivery,s=>s.price),
    clients:group(a.sal.filter(s=>s.clientId),s=>clientName(s.clientId),s=>s.price).slice(0,5),
    agents:group(a.sal,s=>agentName(s.agentId),s=>s.price),
    creditSold:sum(a.sal.filter(s=>s.payment==='Credit'),s=>s.price),
    collected:sum(coScope(DB.payments).filter(p=>ymKey(p.date)===ym),p=>p.amount),
    stockUnits:sum(stock,i=>i._units), stockCost:sum(stock,i=>i._units*(+i.purchasePYG||0)), stockSell:sum(stock,i=>i._units*(+i.sellPrice||0))};
}
function marginCell(profit,rev){ const m=rev?Math.max(0,Math.min(100,profit/rev*100)):0;
  return `<span class="margin-cell"><span class="bd-bar st-hide"><span style="width:${m}%;background:${profit<0?'#d03b3b':'#2a78d6'}"></span></span><span class="${profit<0?'neg':''}">${pct(profit,rev)}</span></span>`; }
// label → amount rows with a share bar; `user` marks labels typed by people (never translated)
function shareRows(entries,total,color,user){
  if(!entries.length) return `<tr><td class="st-block muted" style="padding:22px 18px">No entries</td></tr>`;
  return entries.map(([k,v],i)=>`<tr><td class="st-head" style="width:38%">${user?`<i data-u>${escHtml(k)}</i>`:k}</td><td class="num" data-label="Amount" style="font-weight:600">${fmt(v)}</td><td class="st-hide" style="width:30%"><div class="bd-bar"><span style="width:${total?Math.max(0,v/total*100):0}%;background:${typeof color==='function'?color(i):color}"></span></div></td><td class="num muted" data-label="Share" style="width:60px">${pct(v,total,0)}</td></tr>`).join('');
}
const panelHead=(t,s)=>`<div class="table-tools" style="display:block"><div class="panel-title">${t}</div>${s?`<div class="panel-sub">${s}</div>`:''}</div>`;
function renderReport(){
  const R=reportData(val('repMonth')); const a=R.a, p=R.prev; const cur=isCurrentMonth(R.ym);
  const d=(c,v)=>p?delta(c,v):'';
  const tiles=[
    {lbl:'Units sold',val:a.sold,sub:d(a.sold,p&&p.sold)},
    {lbl:'Avg sale per unit',val:fmt(a.avgSale),sub:d(a.avgSale,p&&p.avgSale)},
    {lbl:'Avg profit per unit',val:fmt(a.sold?a.gross/a.sold:0),sub:d(a.sold?a.gross/a.sold:0,p&&(p.sold?p.gross/p.sold:0))},
    {lbl:'Gross margin',val:pct(a.gross,a.salesRev),sub:'of product sales'}];
  const brandRows=R.brands.map(b=>`<tr><td class="st-head"><i data-u>${escHtml(b.brand)}</i></td><td class="num" data-label="Units">${b.units}</td><td class="num" data-label="Billed">${fmt(b.rev)}</td><td class="num muted" data-label="Cost">${fmt(b.cost)}</td><td class="num" data-label="Profit" style="font-weight:600"><span class="${b.profit<0?'neg':''}">${fmt(b.profit)}</span></td><td class="num" data-label="Margin">${marginCell(b.profit,b.rev)}</td></tr>`).join('');
  const saleRows=R.sales.map(x=>`<tr><td data-label="Date"><span class="fig" data-u>${fmtDate(x.s.date)}</span></td><td class="st-head"><i data-u>${escHtml(x.s.brand+' '+x.s.model)}</i>${xQty(x.qty)}</td><td class="muted" data-label="Client">${x.s.clientId?`<i data-u>${escHtml(clientName(x.s.clientId))}</i>`:''}</td><td data-label="Pay">${x.s.payment?`<span class="pill ${x.s.payment.toLowerCase()}">${x.s.payment}</span>`:''}</td><td class="num" data-label="Billed">${fmt(x.rev)}</td><td class="num muted" data-label="Cost">${x.cost?fmt(x.cost):'<span class="tag">No cost recorded</span>'}</td><td class="num" data-label="Profit" style="font-weight:600"><span class="${x.profit<0?'neg':''}">${fmt(x.profit)}</span></td><td class="num" data-label="Margin">${marginCell(x.profit,x.rev)}</td></tr>`).join('');
  const none=`<tr><td class="st-block muted" colspan="8" style="padding:22px 18px">No sales this month</td></tr>`;
  const totalRow=(lead)=>`<tfoot><tr>${lead}<td class="num" data-label="Billed">${fmt(a.salesRev)}</td><td class="num" data-label="Cost">${fmt(a.cogs)}</td><td class="num" data-label="Profit"><span class="${a.gross<0?'neg':''}">${fmt(a.gross)}</span></td><td class="num" data-label="Margin">${pct(a.gross,a.salesRev)}</td></tr></tfoot>`;
  const howRows=shareRows(R.pay,a.salesRev,i=>['#1baf7a','#eda100'][i%2])+shareRows(R.deliv,a.salesRev,'#2a78d6');
  const html=noCostNote(a)+`<div class="result-row">${stmtCard(a,p)}${factsCard('Cash and credit',[
      ['Cash flow this month',fmt(a.cash),'Revenue minus every expense, inventory purchases included',a.cash<0?'neg':''],
      ['Inventory purchases this month',fmt(a.invBuy),'Becomes cost only when the units are sold'],
      ['Credit sold this month',fmt(R.creditSold)],
      ['Collected from clients this month',fmt(R.collected),'Payments received on credit sales'],
      [cur?'Stock today':'Stock at month end',fmt(R.stockCost),`<i data-u>${R.stockUnits} ${unitWord(R.stockUnits,'unit')} · ${fmt(R.stockSell)}</i> at sale price`],
    ])}</div>
  <div class="grid kpis">${tiles.map(kpiTile).join('')}</div>
  <div class="card table-card">${panelHead('Profit by brand',"Where the month's profit came from")}
    <div class="tbl-scroll"><table class="stack two"><thead><tr><th>Brand</th><th class="num">Units</th><th class="num">Billed</th><th class="num">Cost</th><th class="num">Profit</th><th class="num">Margin</th></tr></thead><tbody>${brandRows||none}</tbody>${R.brands.length?totalRow(`<td class="st-head">Total</td><td class="num" data-label="Units">${a.sold}</td>`):''}</table></div></div>
  <div class="card table-card" style="margin-top:16px">${panelHead('Sales detail','Each sale with its cost and its real profit')}
    <div class="tbl-scroll"><table class="stack two"><thead><tr><th>Date</th><th>Item</th><th>Client</th><th>Pay</th><th class="num">Billed</th><th class="num">Cost</th><th class="num">Profit</th><th class="num">Margin</th></tr></thead><tbody>${saleRows||none}</tbody>${R.sales.length?totalRow(`<td class="st-head" colspan="4">Total</td>`):''}</table></div></div>
  <div class="grid charts-row" style="margin-top:16px">
    <div class="card table-card">${panelHead('Operating expenses by category','Inventory purchases are not here: they count as cost when sold')}<div class="tbl-scroll"><table class="stack"><tbody>${shareRows(R.opexCats,a.opex,i=>SERIES[(i+1)%SERIES.length])}</tbody></table></div></div>
    <div class="card table-card">${panelHead('How it was sold','By payment and delivery method')}<div class="tbl-scroll"><table class="stack"><tbody>${R.sales.length?howRows:none}</tbody></table></div></div>
  </div>
  <div class="grid charts-row" style="margin-top:16px">
    <div class="card table-card">${panelHead('Top clients','By billing this month')}<div class="tbl-scroll"><table class="stack"><tbody>${R.clients.length?shareRows(R.clients,a.salesRev,'#2a78d6',true):`<tr><td class="st-block muted" style="padding:22px 18px">No client sales this month</td></tr>`}</tbody></table></div></div>
    <div class="card table-card">${panelHead('By agent','Billing per sales agent')}<div class="tbl-scroll"><table class="stack"><tbody>${R.agents.length?shareRows(R.agents,a.salesRev,'#4a3aa7',true):none}</tbody></table></div></div>
  </div>
  <div class="section-head"><div><h2>Last 12 months</h2><div class="desc">Billing, gross profit and net profit</div></div></div>
  <div class="card chart-card"><div class="chart-wrap md" style="margin-top:0"><canvas id="chRepTrend"></canvas></div></div>`;
  document.getElementById('repBody').innerHTML=tr(html);
  const m12=lastNMonths(12);
  mkChart('chRepTrend',profitChartCfg(m12,m12.map(m=>mName(+m.split('-')[1]-1))));
}
function exportReportPDF(){
  const R=reportData(val('repMonth')); const a=R.a, ym=R.ym; const co=activeCompany(); const T=tr;
  const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'pt',format:'a4'}); const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight(), M=40;
  const base=a.salesRev+a.otherRev;
  doc.setFillColor(42,120,214); doc.rect(0,0,W,84,'F'); doc.setTextColor(255);
  doc.setFont('times','bold'); doc.setFontSize(21); doc.text(co.name,M,42);
  doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.text(T('Monthly report')+' · '+monthLabel(ym),M,62);
  doc.setFontSize(9); doc.text(T('Generated ')+fmtDate(today()),W-M,42,{align:'right'});
  let y=116;
  const head=t=>{ if(y>H-130){ doc.addPage(); y=56; } doc.setTextColor(20); doc.setFont('times','bold'); doc.setFontSize(13); doc.text(T(t),M,y); y+=8; };
  const R_=i=>({halign:'right'});
  const tbl=(cols,body,right,extra)=>{ const cs={}; (right||[]).forEach(i=>cs[i]=R_());
    doc.autoTable({startY:y,head:cols?[cols.map(c=>T(c))]:undefined,body,theme:'plain',margin:{left:M,right:M,bottom:44},
      styles:{font:'helvetica',fontSize:9,textColor:[30,30,30],cellPadding:{top:5,bottom:5,left:6,right:6},lineColor:[226,226,226],lineWidth:{bottom:.5,top:0,left:0,right:0}},
      headStyles:{textColor:[125,125,125],fontStyle:'normal',fontSize:8.5,lineColor:[30,30,30],lineWidth:{bottom:.8,top:0,left:0,right:0}},
      didParseCell:d=>{ if(d.section==='head'&&cs[d.column.index]) d.cell.styles.halign='right'; },
      columnStyles:cs,...(extra||{})}); y=doc.lastAutoTable.finalY+26; };
  const B=(t,o)=>({content:t,styles:{fontStyle:'bold',...(o||{})}});
  const neg=v=>v<0?{textColor:[196,47,47]}:{};

  head('Month result');
  const st=[[T('Product sales')+`  (${a.sold} ${unitWord(a.sold,'unit')})`,'',fmtPdf(a.salesRev)],
    ['- '+T('Cost of goods sold'),'',fmtPdf(-a.cogs)],
    [B('= '+T('Gross profit')),B(pct(a.gross,a.salesRev)),B(fmtPdf(a.gross),neg(a.gross))]];
  if(a.otherRev) st.push(['+ '+T('Other revenue'),'',fmtPdf(a.otherRev)]);
  st.push(['- '+T('Operating expenses'),'',fmtPdf(-a.opex)]);
  st.push([B('= '+T('Net profit'),{fontSize:11}),B(pct(a.net,base),{fontSize:11}),B(fmtPdf(a.net),{fontSize:11,textColor:a.net<0?[196,47,47]:[42,120,214]})]);
  tbl(['Concept','Margin','Amount'],st,[1,2]);

  head('Cash and credit');
  tbl(null,[[T('Cash flow this month'),fmtPdf(a.cash)],[T('Inventory purchases this month'),fmtPdf(a.invBuy)],[T('Credit sold this month'),fmtPdf(R.creditSold)],[T('Collected from clients this month'),fmtPdf(R.collected)],
    [T(isCurrentMonth(ym)?'Stock today':'Stock at month end')+`  (${R.stockUnits} ${unitWord(R.stockUnits,'unit')})`,fmtPdf(R.stockCost)]],[1]);

  if(R.brands.length){ head('Profit by brand');
    tbl(['Brand','Units','Billed','Cost','Profit','Margin'],[...R.brands.map(b=>[b.brand,String(b.units),fmtPdf(b.rev),fmtPdf(b.cost),{content:fmtPdf(b.profit),styles:neg(b.profit)},pct(b.profit,b.rev)]),
      [B('Total'),B(String(a.sold)),B(fmtPdf(a.salesRev)),B(fmtPdf(a.cogs)),B(fmtPdf(a.gross),neg(a.gross)),B(pct(a.gross,a.salesRev))]],[1,2,3,4,5]); }

  if(R.sales.length){ head('Sales detail');
    tbl(['Date','Item','Client','Pay','Billed','Cost','Profit','Margin'],[...R.sales.map(x=>[fmtDate(x.s.date),`${x.s.brand} ${x.s.model}${x.qty>1?' x'+x.qty:''}`,x.s.clientId?clientName(x.s.clientId):'',T(x.s.payment||''),fmtPdf(x.rev),x.cost?fmtPdf(x.cost):'-',{content:fmtPdf(x.profit),styles:neg(x.profit)},pct(x.profit,x.rev)]),
      [B('Total'),'','','',B(fmtPdf(a.salesRev)),B(fmtPdf(a.cogs)),B(fmtPdf(a.gross),neg(a.gross)),B(pct(a.gross,a.salesRev))]],[4,5,6,7],{styles:{font:'helvetica',fontSize:8.2,textColor:[30,30,30],cellPadding:{top:4.5,bottom:4.5,left:5,right:5},lineColor:[226,226,226],lineWidth:{bottom:.5,top:0,left:0,right:0}}}); }

  const cat=(title,entries,total)=>{ if(!entries.length) return; head(title);
    tbl(['Category','Amount','Share'],[...entries.map(([k,v])=>[T(k),fmtPdf(v),pct(v,total)]),[B('Total'),B(fmtPdf(total)),B(pct(1,1))]],[1,2]); };
  cat('Operating expenses by category',R.opexCats,a.opex);
  cat('Revenue by category',R.revCats,a.revSum);
  if(R.sales.length){ head('How it was sold');
    tbl(['Concept','Amount','Share'],[...R.pay,...R.deliv].map(([k,v])=>[T(k),fmtPdf(v),pct(v,a.salesRev)]),[1,2]); }
  if(R.clients.length){ head('Top clients'); tbl(['Client','Amount','Share'],R.clients.map(([k,v])=>[k,fmtPdf(v),pct(v,a.salesRev)]),[1,2]); }

  head('Last 12 months summary');
  tbl(['Month','Billed','Cost','Gross profit','Operating expenses','Net profit','Cash flow'],lastNMonths(12).map(m=>{ const x=monthAgg(m); return [monthLabel(m),fmtPdf(x.revSum),fmtPdf(x.cogs),fmtPdf(x.gross),fmtPdf(x.opex),{content:fmtPdf(x.net),styles:{fontStyle:'bold',...neg(x.net)}},{content:fmtPdf(x.cash),styles:neg(x.cash)}]; }),[1,2,3,4,5,6],{styles:{font:'helvetica',fontSize:8.2,textColor:[30,30,30],cellPadding:{top:4.5,bottom:4.5,left:5,right:5},lineColor:[226,226,226],lineWidth:{bottom:.5,top:0,left:0,right:0}}});
  pdfFooter(doc);
  doc.save(`report-${co.name.toLowerCase().replace(/\s/g,'-')}-${ym}.pdf`); toast('PDF report downloaded');
}
