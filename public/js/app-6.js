/* ============================================================
   shared render helpers
   ============================================================ */
function afterMutation(){ reload(); }
function val(id){ const e=document.getElementById(id); return e?e.value:''; }
function emptyState(title,desc,ic,withBtn){ return `<div class="card" style="padding:56px 24px"><div class="empty"><div style="width:52px;height:52px;border-radius:14px;background:var(--accent-tint);color:var(--accent-strong);display:grid;place-items:center;margin:0 auto 16px">${bigIcon(ic)}</div><div class="big" style="font-size:19px">${title}</div><div style="max-width:360px;margin:0 auto 16px">${desc}</div>${withBtn?`<button class="btn primary" style="margin:0 auto" onclick="openSale()">${plus()}Register first sale</button>`:''}</div></div>`; }

/* ---------- charts ---------- */
const charts={};
function mkChart(id,cfg){ if(charts[id])charts[id].destroy(); const el=document.getElementById(id); if(!el)return; charts[id]=new Chart(el,cfg); }
const CHART_FONT='"Instrument Sans","Source Serif 4",system-ui,sans-serif';
const calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
if(window.Chart){ if(calm) Chart.defaults.animation=false; else Chart.defaults.animation.duration=320; Chart.defaults.font.family=CHART_FONT; Chart.defaults.font.size=12; Chart.defaults.color='#898781'; }
const gridClr='rgba(11,11,11,0.07)', money2Tick=v=>fmtShort(v);
const legendLbl={sort:(a,b)=>a.datasetIndex-b.datasetIndex,boxWidth:8,boxHeight:8,usePointStyle:true,pointStyle:'circle',padding:14,color:'#52514e',font:{size:12}};
function barOpts(){return{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',align:'end',labels:legendLbl},tooltip:tt()},scales:{x:{grid:{display:false},border:{display:false}},y:{grid:{color:gridClr},border:{display:false},ticks:{callback:money2Tick,maxTicksLimit:6},beginAtZero:true}}};}
function lineOpts(){return{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:tt()},scales:{x:{grid:{display:false},border:{display:false}},y:{grid:{color:gridClr},border:{display:false},ticks:{callback:money2Tick,maxTicksLimit:6}}}};}
function donutOpts(money,bottom){return{responsive:true,maintainAspectRatio:false,cutout:'66%',plugins:{legend:{position:bottom?'bottom':'right',labels:{...legendLbl,sort:undefined,padding:11}},tooltip:{...tt(),callbacks:{label:c=>{const tot=c.dataset.data.reduce((a,b)=>a+b,0);return ` ${c.label}: ${money?fmt(c.parsed):c.parsed} (${pct(c.parsed,tot)})`;}}}}};}
function tt(){return{backgroundColor:'#0b0b0b',padding:11,cornerRadius:8,titleFont:{size:12,weight:'600'},bodyFont:{size:12.5},boxPadding:5,usePointStyle:true,callbacks:{label:c=>` ${c.dataset.label||c.label}: ${fmt(c.parsed.y!=null?c.parsed.y:c.parsed)}`}};}
function grad(hex){return c=>{const{ctx,chartArea}=c.chart;if(!chartArea)return hex+'22';const g=ctx.createLinearGradient(0,chartArea.top,0,chartArea.bottom);g.addColorStop(0,hex+'2b');g.addColorStop(1,hex+'02');return g;};}
// charts drawn before the web fonts arrive are redrawn once with the right type
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>Object.values(charts).forEach(c=>{ try{ c.update('none'); }catch(e){} }));

/* ---------- icons ---------- */
function icon(n){const p={
  wallet:'<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h.01M3 9h18"/>',
  up:'<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7h-6M21 7v6"/>',down:'<path d="M3 7l6 6 4-4 8 8"/><path d="M21 17h-6M21 17v-6"/>',
  chart:'<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="13" y="7" width="3" height="10" rx="1"/>',
  box:'<path d="M20 7l-8-4-8 4 8 4 8-4z"/><path d="M4 7v10l8 4 8-4V7"/>',
  tag:'<path d="M3 5a2 2 0 0 1 2-2h5.5a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8l-5.6 5.6a2 2 0 0 1-2.8 0l-8-8A2 2 0 0 1 3 10.5z"/><path d="M7 7h.01"/>',
  percent:'<path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  star:'<path d="M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.3 3.2L7 14.2l-5-4.8 7-.9z"/>',
  team:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'
}[n]||''; return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`; }
function navIcon(n){const p={
  grid:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  flow:'<path d="M3 6h18M7 12h10M11 18h2"/>',box:'<path d="M20 7l-8-4-8 4 8 4 8-4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
  doc:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
  team:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  cog:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
}[n]||''; return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`; }
function bigIcon(n){ return navIcon(n).replace('stroke-width="2"','stroke-width="1.7"').replace(/width="18"/,''); }
const plus=()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
const trash=()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:15px;height:15px"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
const searchIcon=()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>`;
const xIcon=()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
const download=()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

/* ---------- toast ---------- */
let toastT; function toast(msg,kind){ const t=document.getElementById('toast'); document.getElementById('toastMsg').textContent=tr(msg); t.classList.toggle('warn',kind==='warn');
  document.getElementById('toastIcon').innerHTML=kind==='warn'?'<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>':'<polyline points="20 6 9 17 4 12"/>';
  t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2600); }

/* ---------- init ---------- */
document.getElementById('overlay').addEventListener('click',e=>{ if(e.target.id==='overlay')closeModal(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape')closeModal();  });
try{ const sv=localStorage.getItem('bf_lang'); if(sv) lang=sv; }catch(e){}
applyI18n();
(async()=>{
  try{ await loadState(); document.getElementById('login').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); bootApp(); }
  catch(e){ document.getElementById('login').classList.remove('hidden'); }
})();
