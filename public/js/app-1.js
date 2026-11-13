/* ============================================================
   Argus Technology Commercial Software — multi-company, role-based.
   Data lives on the server (/api); this file is the whole client.
   Currency: PYG primary; USD only for inventory purchase cost.
   ============================================================ */
const EXP_CATS=['Administrative','Sales','Marketing','Equipment','Shipping','Commissions'];
const REV_CATS=['Product Sales','Other Revenue'];
const DELIVERIES=['Local pickup','Local delivery','Nationwide shipping','Door-to-door shipping'];
const SERIES=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#4a3aa7','#008300','#e34948'];
const AV_COLORS=['#2a78d6','#eb6834','#1baf7a','#4a3aa7','#e87ba4','#c98500','#0a7d3f'];
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_ES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

/* ============================================================
   i18n — Spanish (default) / English via substring translation
   ============================================================ */
let lang='es';
function mName(i){ return (lang==='es'?MONTHS_ES:MONTHS)[i]; }
const ROLE_L={admin:{en:'Admin',es:'Admin'},manager:{en:'Manager',es:'Gerente'},sales:{en:'Sales',es:'Vendedor'}};
function roleLabel(r){ return (ROLE_L[r]||{en:r,es:r})[lang]; }
const ES={
  // v4 — quantity, real profit, reports, mobile
  "Sign out":"Cerrar sesión","View all":"Ver todo","Name":"Nombre","e.g. Watch, Phone, Shoe":"ej. Reloj, Celular, Zapato","e.g. ":"ej. ","Unit cost":"Costo unit.","More":"Más","Sections":"Secciones",
  "Month result":"Resultado del mes","Profit is what remains after the cost of what you sold":"La ganancia es lo que queda después del costo de lo que vendiste",
  "Product sales":"Ventas de productos","Cost of goods sold":"Costo de lo vendido","What those units cost you":"Lo que te costaron esas unidades",
  "Gross profit":"Ganancia bruta","Other revenue":"Otros ingresos","Operating expenses":"Gastos operativos","Without inventory purchases":"Sin compras de inventario",
  " margin":" de margen"," of billing":" de la facturación","Cost":"Costo","Profit":"Ganancia",
  "Cash and stock":"Caja y stock","Cash flow this month":"Flujo de caja del mes","Revenue minus every expense, inventory purchases included":"Ingresos menos todos los gastos, incluidas las compras de inventario",
  "Inventory purchases this month":"Compras de inventario del mes","Becomes cost only when the units are sold":"Pasa a ser costo recién cuando se venden las unidades",
  "Receivable on credit":"Por cobrar a crédito","What clients still owe":"Lo que los clientes aún deben","Stock at cost":"Stock a costo",
  "All revenue minus all expenses to date":"Todos los ingresos menos todos los gastos a la fecha",
  "Monthly billing":"Facturación del mes","Avg profit per unit":"Ganancia promedio por unidad","Best selling brand this month":"Marca más vendida del mes","per unit":"por unidad",
  "Billing and profit":"Facturación y ganancia","Billed":"Facturado","Cash flow":"Flujo de caja","Revenue vs every expense, inventory purchases included":"Ingresos vs todos los gastos, incluidas compras de inventario",
  "No cost recorded":"Sin costo registrado",
  "Monthly report":"Reporte mensual","Billing, real profit and cash, month by month":"Facturación, ganancia real y caja, mes a mes",
  "Cash and credit":"Caja y crédito","Credit sold this month":"Vendido a crédito en el mes","Collected from clients this month":"Cobrado a clientes en el mes","Payments received on credit sales":"Pagos recibidos por ventas a crédito",
  "Stock at month end":"Stock al cierre del mes","Stock today":"Stock a hoy","at sale price":"a precio de venta",
  "Units sold":"Unidades vendidas","Avg sale per unit":"Venta promedio por unidad","Gross margin":"Margen bruto","Net margin":"Margen neto","of product sales":"de las ventas de productos",
  "Profit by brand":"Ganancia por marca","Where the month's profit came from":"De dónde salió la ganancia del mes",
  "Sales detail":"Detalle de ventas","Each sale with its cost and its real profit":"Cada venta con su costo y su ganancia real",
  "Item":"Artículo","Units":"Unidades","Margin":"Margen","No sales this month":"Sin ventas este mes",
  "Operating expenses by category":"Gastos operativos por categoría","Inventory purchases are not here: they count as cost when sold":"Las compras de inventario no van aquí: cuentan como costo al venderse",
  "How it was sold":"Cómo se vendió","By payment and delivery method":"Por forma de pago y entrega",
  "Top clients":"Mejores clientes","By billing this month":"Por facturación del mes","By agent":"Por vendedor","Billing per sales agent":"Facturación por vendedor","No client sales this month":"Sin ventas a clientes este mes",
  "Last 12 months":"Últimos 12 meses","Billing, gross profit and net profit":"Facturación, ganancia bruta y ganancia neta",
  "Result":"Resultado","Concept":"Concepto","Last 12 months summary":"Resumen de los últimos 12 meses","Page":"Página",
  " have no recorded cost, so their whole price shows as profit.":" no tienen costo registrado, por eso todo su precio figura como ganancia.",
  "Loss":"Pérdida",
  "Quantity":"Cantidad","Units purchased":"Unidades compradas","Unit price (PYG)":"Precio por unidad (PYG)","Unit cost in":"Costo por unidad en","Total purchase":"Compra total",
  "Selling price per unit (PYG)":"Precio de venta por unidad (PYG)","Purchase price per unit (USD)":"Precio de compra por unidad (USD)",
  "Sale total":"Total de la venta","Estimated profit":"Ganancia estimada","in stock":"en stock",
  "Pick an item from inventory — brand & price auto-fill. Sell one or several units.":"Elige un artículo del inventario — marca y precio se completan solos. Puedes vender una o varias unidades.",
  "Add one line for all the units you bought of the same item.":"Carga en una sola línea todas las unidades que compraste del mismo artículo.",
  "not enough stock":"No hay stock suficiente","quantity required":"Cantidad requerida","this item has sales — delete the sales first":"Este artículo tiene ventas — elimina primero las ventas",
  "Sale registered":"Venta registrada","Pick an item, a quantity and a price":"Elige un artículo, una cantidad y un precio",
  "Units in stock":"Unidades en stock","Unit cost (USD)":"Costo unit. (USD)","Unit cost (PYG)":"Costo unit. (PYG)","Unit price":"Precio unit.",
  "Units in Stock":"Unidades en Stock","Stock value":"Valor del stock","Total cost":"Costo total","Total sale value":"Valor total de venta",
  "units sold (mo.)":"unidades vendidas (mes)","Units sold (mo.)":"Unidades vendidas (mes)","units available":"unidades disponibles",
  "Current Balance = Total Revenue − Total Expenses":"Saldo actual = ingresos totales − gastos totales (flujo de caja, no ganancia)",
  " · Argus Technology Commercial Software":" · Argus Technology Commercial Software",
  "Price":"Precio",
  // v3 additions
  "Save password in this browser":"Guardar contraseña en este navegador",
  "Inventory Purchase":"Compra de inventario",
  "Client payments":"Pagos del cliente","Client payment":"Pago de cliente","Register payment":"Registrar pago","Payment registered":"Pago registrado","Payment removed":"Pago eliminado",
  "Paid":"Pagado","Payment date":"Fecha de pago","Note":"Nota","e.g. transfer, cash…":"ej. transferencia, efectivo…","No payments yet":"Sin pagos aún",
  "Credit sold":"Vendido a crédito","Amount paid":"Monto pagado","payment exceeds credit balance":"El pago supera el saldo a crédito","invalid client":"Cliente inválido",
  "Payments only reduce this client's credit balance; the revenue was recorded with the credit sale.":"Los pagos solo descuentan el saldo a crédito del cliente; el ingreso ya se registró con la venta a crédito.",
  "This client has no pending credit balance.":"Este cliente no tiene saldo a crédito pendiente.",
  "this expense comes from an inventory item — delete the item instead":"Este gasto proviene de una pieza del inventario — elimina la pieza",
  "Stock by Brand":"Inventario por Marca","Stock Value at Cost":"Valor de Inventario a Costo","Stock Value at Sale Price":"Valor de Inventario a Precio de Venta",
  "Available pieces at month end":"Piezas disponibles al cierre del mes","Available pieces as of today":"Piezas disponibles a hoy",
  "Days in stock":"Días en inventario",
  "In stock at month end":"En stock al cierre de","In stock today":"En stock hoy",
  "The purchase cost is recorded automatically as an expense in Business Flow.":"El costo de compra se registra automáticamente como gasto en el Flujo del Negocio.",
  "Closing snapshot":"Corte al cierre","Snapshot as of":"Corte al","Summary by brand":"Resumen por marca","Qty":"Cant.","Cost value":"Valor a costo","Sale value":"Valor a venta",
  "Sales by Brand (month)":"Ventas por Marca (mes)","Sales by Brand (all time)":"Ventas por Marca (histórico)","Revenue share · ":"Participación de ingresos · ","All-time revenue share":"Participación histórica de ingresos","No sales this month":"Sin ventas este mes","No stock at this date":"Sin stock a esta fecha",
"Cost USD":"Costo USD","Cost PYG":"Costo PYG","Sell PYG":"Venta PYG","Watches sold":"Vendidos","Purchase Date":"Fecha de compra","FX Rate":"Cotización",
  // login
  "Ingresa a tu espacio de trabajo":"Ingresa a tu espacio de trabajo",
  "Sign in to your business workspace":"Ingresa a tu espacio de trabajo",
  "Username":"Usuario","Password":"Contraseña","Sign in":"Iniciar sesión",
  "Incorrect username or password.":"Usuario o contraseña incorrectos.",
  // groups & nav
  "Overview":"Resumen","Modules":"Módulos","Management":"Gestión","Account":"Cuenta","Settings":"Ajustes",
  "Dashboard":"Panel","Business Flow":"Flujo del Negocio","Inventory":"Inventario","Clients":"Clientes",
  "Monthly Reports":"Reportes Mensuales","Team":"Equipo","Admin Console":"Consola de Admin","Profile & Settings":"Perfil y Ajustes",
  "Team Performance":"Rendimiento del Equipo",
  // balance
  "Current Balance":"Saldo Actual",
  // dashboard
  "Business overview":"Resumen del negocio","summary":"resumen","Business overview ":"Resumen del negocio ",
  "Revenue − Expenses":"Ingresos − Gastos","this period":"este período","available":"disponibles",
  "Monthly Revenue":"Ingresos del Mes","Monthly Expenses":"Gastos del Mes","Monthly Profit":"Ganancia del Mes",
  "Avg Sale Value":"Venta Promedio","Avg Profit Margin":"Margen Promedio","Best Selling Brand":"Marca Más Vendida",
  "Sold (mo.)":"Vendidos (mes)","in Stock":"en Stock","per ":"por ","vs prev":"vs ant.",
  // charts
  "Revenue vs Expenses":"Ingresos vs Gastos","Last 6 months · PYG":"Últimos 6 meses · PYG",
  "Net profit trend · PYG":"Tendencia de ganancia · PYG","Sales by Brand":"Ventas por Marca","Revenue share":"Participación de ingresos",
  "Delivery Methods":"Métodos de Entrega","reach buyers":"llegan al cliente","How ":"Cómo ",
  "My Revenue Trend":"Mi Tendencia de Ingresos",
  // recent
  "Recent activity":"Actividad reciente","View all →":"Ver todo →","Latest revenue":"Últimos ingresos",
  "My latest revenue":"Mis últimos ingresos","Latest expenses":"Últimos gastos","No revenue yet":"Sin ingresos aún","No expenses yet":"Sin gastos aún",
  // flow
  "All movements":"Todos los movimientos","New Sale":"Nueva Venta","All brands":"Todas las marcas",
  "All delivery":"Toda entrega","All categories":"Todas las categorías","Clear":"Limpiar",
  ", client…":", cliente…","Search ":"Buscar ","No movements":"Sin movimientos",
  "Try adjusting your filters or register a sale.":"Ajusta los filtros o registra una venta.",
  // table headers / enums
  "Date":"Fecha","Type":"Tipo","Detail":"Detalle","Client":"Cliente","Clients":"Clientes","Category":"Categoría","Pay":"Pago","Amount":"Monto",
  "Brand":"Marca","Model":"Modelo","Status":"Estado","Purchased":"Comprado","Contact":"Contacto","Agent":"Agente",
  "Cost (USD)":"Costo (USD)","Cost (PYG)":"Costo (PYG)","Sell (PYG)":"Venta (PYG)",
  "Sales":"Ventas","Expenses":"Gastos","Revenue":"Ingresos","Expense":"Gasto","Sale":"Venta",
  "Available":"Disponible","Reserved":"Reservado","Sold":"Vendido","Cash":"Contado","Credit":"Crédito",
  "Local pickup":"Retiro local","Local delivery":"Entrega local","Nationwide shipping":"Envío nacional","Door-to-door shipping":"Envío puerta a puerta",
  // categories
  "Administrative":"Administrativo","Equipment":"Equipamiento","Shipping":"Envíos","Commissions":"Comisiones",
  "Product Sales":"Ventas de Productos","Other Revenue":"Otros Ingresos",
  // inventory
  "inventory":"inventario","Manage stock, purchase cost and status":"Gestiona stock, costo y estado","Export":"Exportar",
  "Add ":"Agregar ","All status":"Todos los estados","Search model, SKU, brand…":"Buscar modelo, SKU, marca…",
  "Inventory by Brand":"Inventario por Marca","Quantity share":"Participación por cantidad",
  "Inventory Value by Brand":"Valor de Inventario por Marca","Based on selling prices · PYG":"Según precios de venta · PYG",
  "No ":"Sin ","Add your first item to build inventory.":"Agrega tu primer artículo al inventario.","Item removed":"Artículo eliminado",
  // clients
  "All company clients":"Todos los clientes","Your clients":"Tus clientes",
  " · recurring buyers & credit statements":" · compradores frecuentes y crédito","New Client":"Nuevo Cliente",
  "Search client…":"Buscar cliente…","Purchases":"Compras","Total spent":"Total gastado","Credit balance":"Saldo a crédito",
  "Statement →":"Estado de cuenta →","No clients yet":"Sin clientes aún",
  "Create a client to track recurring purchases and credit.":"Crea un cliente para seguir compras y crédito.",
  "Purchase history":"Historial de compras","Purchases by month":"Compras por mes","New sale for client":"Nueva venta para cliente",
  "Close":"Cerrar","No purchases yet":"Sin compras aún","No purchases":"Sin compras","Month":"Mes",
  // reports
  "Monthly financial report":"Reporte financiero mensual","Revenue, expenses and net profit":"Ingresos, gastos y ganancia neta",
  "No data to report":"Sin datos para reportar","Register sales and expenses first.":"Registra ventas y gastos primero.",
  "Total Revenue":"Ingresos Totales","Total Expenses":"Gastos Totales","Net Profit":"Ganancia Neta",
  "Revenue by category":"Ingresos por categoría","Expenses by category":"Gastos por categoría",
  "12-month trend":"Tendencia 12 meses","Net profit across the year":"Ganancia neta del año",
  "transactions":"transacciones","margin":"margen","Net profit":"Ganancia neta","My revenue":"Mis ingresos","Export PDF":"Exportar PDF","No entries":"Sin registros",
  // team
  "Team performance":"Rendimiento del equipo","Sales agents this period":"Vendedores este período","Add sales agent":"Agregar vendedor",
  "Agents":"Agentes","active sellers":"vendedores activos","sold (mo.)":"vendidos (mes)","Team revenue (mo.)":"Ingresos del equipo (mes)",
  "Agent leaderboard · ":"Ranking de agentes · ","sold":"vendidos","Avg sale":"Venta prom.","Share":"Participación",
  "No sales agents":"Sin vendedores","Add a sales agent to see performance.":"Agrega un vendedor para ver su rendimiento.",
  // admin
  "Companies":"Empresas","Each company keeps its own isolated data":"Cada empresa tiene sus propios datos","New Company":"Nueva Empresa",
  "Company":"Empresa","Product type":"Tipo de producto","Users":"Usuarios","Open →":"Abrir →",
  "No companies":"Sin empresas","Create your first company to begin.":"Crea tu primera empresa para comenzar.",
  "Users & profiles":"Usuarios y perfiles","Create admins, managers and sales agents; assign to a company":"Crea admins, gerentes y vendedores; asígnalos a una empresa",
  "New Profile":"Nuevo Perfil","User":"Usuario","Role":"Rol","All companies":"Todas las empresas",
  // settings
  "Your profile":"Tu perfil","Personalize your account":"Personaliza tu cuenta","Display name":"Nombre visible",
  "Profile picture":"Foto de perfil","Save profile":"Guardar perfil","Company branding":"Marca de la empresa",
  "Shown in the sidebar and on reports":"Se muestra en el menú y en los reportes","Company name":"Nombre de la empresa",
  "Product type (what you sell)":"Tipo de producto (qué vendes)","Company logo":"Logo de la empresa","Save company":"Guardar empresa","Language":"Idioma",
  // sale modal
  "Register a sale":"Registrar una venta","Pick an item from inventory — brand & price auto-fill.":"Elige un artículo del inventario — marca y precio se completan solos.",
  "from inventory":"del inventario","Select model / SKU…":"Elige modelo / SKU…","Selling price (PYG)":"Precio de venta (PYG)","editable":"editable",
  "Sale date":"Fecha de venta","Delivery method":"Método de entrega","Walk-in (no client)":"Sin cliente","Payment":"Pago",
  "Creates revenue in":"Crea ingreso en","Save sale":"Guardar venta","Cancel":"Cancelar",
  "No stock available":"Sin stock disponible","to inventory before":"al inventario antes",
  // expense/revenue modal
  "Add an expense":"Agregar un gasto","Record money leaving the business.":"Registra dinero que sale del negocio.",
  "Amount (PYG)":"Monto (PYG)","Description":"Descripción","(optional)":"(opcional)","What was this for?":"¿Para qué fue?","Save expense":"Guardar gasto",
  "Add revenue":"Agregar ingreso","Income not tied to a product sale.":"Ingreso no ligado a una venta.","Source of this revenue":"Origen de este ingreso","Save revenue":"Guardar ingreso",
  // inventory modal
  "to inventory":"al inventario","Purchase cost in USD converts to PYG.":"El costo en USD se convierte a PYG.","Model / number":"Modelo / número",
  "auto if blank":"auto si vacío","Purchase date":"Fecha de compra","Purchase price (USD)":"Precio de compra (USD)","USD/PYG rate":"Cotización USD/PYG",
  "Purchase price in":"Precio de compra en","(auto)":"(auto)","Add to inventory":"Agregar al inventario",
  // client modal
  "New client":"Nuevo cliente","Track recurring buyers and credit.":"Sigue compradores frecuentes y crédito.","Full name":"Nombre completo",
  "Phone":"Teléfono","Assigned agent":"Agente asignado","(me)":"(yo)","Create client":"Crear cliente",
  // user modal
  "New profile":"Nuevo perfil","Create any role and assign a company.":"Crea cualquier rol y asigna una empresa.","Add a sales agent to your company.":"Agrega un vendedor a tu empresa.",
  "temporary password":"contraseña temporal","Create profile":"Crear perfil",
  // company modal
  "New company":"Nueva empresa","Starts empty with its own isolated database.":"Inicia vacía con su propia base de datos.",
  "Product type (what they sell)":"Tipo de producto (qué venden)","Tip: after creating, add a manager profile so they can sign in.":"Consejo: luego crea un perfil de gerente para que pueda ingresar.","Create company":"Crear empresa",
  // empty states
  "No company selected":"Sin empresa seleccionada","Create a company in the Admin Console to get started.":"Crea una empresa en la Consola de Admin para comenzar.",
  "Pick or create a company first.":"Elige o crea una empresa primero.","No activity yet in":"Sin actividad aún en",
  "Register your first sale to start tracking revenue":"Registra tu primera venta para ver ingresos",", expenses and profit":", gastos y ganancia","Register first sale":"Registrar primera venta",
  // toasts
  "Sale registered · ":"Venta registrada · "," marked sold":" marcado como vendido","Expense saved":"Gasto guardado","Revenue saved":"Ingreso guardado",
  " added to inventory":" agregado al inventario","Client created":"Cliente creado","Profile created":"Perfil creado","Profile removed":"Perfil eliminado",
  "Company created — now add a manager":"Empresa creada — ahora agrega un gerente","Movement deleted":"Movimiento eliminado",
  "Profile updated":"Perfil actualizado","Company updated":"Empresa actualizada","Inventory exported (PDF + CSV)":"Inventario exportado (PDF + CSV)","PDF report downloaded":"Reporte PDF descargado",
  "Select a company first":"Selecciona una empresa primero","Not permitted for your role":"No permitido para tu rol",
  "Complete the required fields":"Completa los campos requeridos","Enter an amount":"Ingresa un monto","Enter a name":"Ingresa un nombre",
  "Username already exists":"El usuario ya existe","Pick an item and enter a price":"Elige un artículo e ingresa un precio",
  "item already sold":"El artículo ya fue vendido","invalid item":"Artículo inválido","no company":"Sin empresa","username exists":"El usuario ya existe","company required":"Empresa requerida","name required":"Nombre requerido","amount required":"Monto requerido","price required":"Precio requerido","brand & model required":"Marca y modelo requeridos","missing fields":"Faltan campos","cannot delete yourself":"No puedes eliminarte a ti mismo","cannot delete the last admin":"No se puede eliminar el último admin","this revenue comes from a sale — delete the sale instead":"Este ingreso proviene de una venta — elimina la venta","not found":"No encontrado","forbidden":"No permitido",
  // pdf
  "Monthly Financial Report":"Reporte Financiero Mensual","Inventory Report":"Reporte de Inventario","Generated ":"Generado ","Share":"Parte","Total":"Total",
};
let _re=null;
function trText(t){
  if(!t||!t.trim()) return t;
  if(!_re){ const keys=Object.keys(ES).filter(k=>k!==ES[k]).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')); _re=new RegExp(keys.join('|'),'g'); }
  return t.replace(_re,m=>ES[m]||m);  // single pass — no cascading re-translation
}
function trEl(id){ const e=document.getElementById(id); if(e) e.innerHTML=tr(e.innerHTML); }
// Translate only visible TEXT (between tags) + placeholder/title/data-label attrs — never ids/classes/handlers.
// Text right after a tag carrying `data-u` is something a person typed (brand, model, client, note):
// it is never translated, so a "Datejust" stays a Datejust.
function tr(html){
  if(lang!=='es'||html==null) return html;
  let s=String(html);
  if(s.indexOf('<')<0) return trText(s);            // plain text (toasts, titles)
  s=s.replace(/(<[^>]*\bdata-u\b[^>]*)?>([^<]+)</g,(m,u,t)=>u?m:'>'+trText(t)+'<');
  s=s.replace(/(placeholder|title|aria-label|data-label)="([^"]*)"/g,(m,a,v)=>a+'="'+trText(v)+'"');
  return s;
}

/* ---------- data now lives on the server; only the UI language is cached locally ---------- */

/* ---------- language switching ---------- */
function setLang(l){ lang=l; try{localStorage.setItem('bf_lang',lang);}catch(e){}
  applyI18n();
  if(session.user){ buildNav(); buildCoSwitch(); refreshUserCard(); refreshBrand(); go(currentView); }
}
function applyI18n(){
  const map={li_sub:'Sign in to your business workspace',li_lblUser:'Username',li_lblPass:'Password',li_btn:'Sign in',li_lblRemember:'Save password in this browser',loginErr:'Incorrect username or password.',balLabel:'Current Balance'};
  Object.entries(map).forEach(([id,en])=>{ const el=document.getElementById(id); if(el) el.textContent=(lang==='es'?(ES[en]||en):en); });
  const uEl=document.getElementById('li_user'); if(uEl) uEl.placeholder=lang==='es'?'ej. AdminJoo':'e.g. AdminJoo';
  const bc=document.getElementById('balChip'); if(bc) bc.title=tr('Current Balance = Total Revenue − Total Expenses');
  const so=document.getElementById('ucOut'); if(so){ so.title=tr('Sign out'); so.setAttribute('aria-label',so.title); }
  document.documentElement.lang=lang;
  document.querySelectorAll('#loginLang button, #topLang button, #setLang button, #sheetLang button').forEach(b=>b.classList.toggle('on',b.dataset.lang===lang));
}

const DB={companies:[],users:[],inventory:[],sales:[],expenses:[],revenues:[],clients:[],payments:[]};
let idc=1; const uid=p=>(p||'')+(idc++);
let session={user:null};        // logged-in user
let adminCompanyId=null;        // company an admin is currently inspecting

/* ---------- server API layer ---------- */
async function apiReq(method,path,body){
  const opt={method,headers:{}};
  if(body!==undefined){ opt.headers['Content-Type']='application/json'; opt.body=JSON.stringify(body); }
  const res=await fetch(path,opt);
  let data=null; try{ data=await res.json(); }catch(e){}
  if(!res.ok){ const err=new Error((data&&data.error)||('HTTP '+res.status)); err.status=res.status; throw err; }
  return data;
}
function apiErr(e){ return (e&&e.message)||'Error'; }
async function loadState(companyId){
  const q=companyId?('?companyId='+encodeURIComponent(companyId)):'';
  const st=await apiReq('GET','/api/state'+q);
  session.user=st.me;
  DB.companies=st.companies||[]; DB.users=st.users||[]; DB.inventory=st.inventory||[];
  DB.clients=st.clients||[]; DB.sales=st.sales||[]; DB.expenses=st.expenses||[]; DB.revenues=st.revenues||[]; DB.payments=st.payments||[];
  adminCompanyId=st.activeCompanyId||null;
  indexState();
  return st;
}
async function reload(){ try{ await loadState(adminCompanyId); }catch(e){ if(e.status===401){ return logout(); } } refreshBalance(); go(currentView); }

/* ---------- helpers ---------- */
const fmt=n=>{ n=Math.round(n||0); return (n<0?'−':'')+'₲\u00a0'+Math.abs(n).toLocaleString('es-PY'); };
const fmtPdf=n=>{ n=Math.round(n||0); return (n<0?'-':'')+'Gs. '+Math.abs(n).toLocaleString('es-PY'); };
const fmtUsd=n=>'$'+(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtShort=n=>{const a=Math.abs(n),g=n<0?'−':'';if(a>=1e9)return g+'₲'+(a/1e9).toFixed(1).replace(/\.0$/,'')+'B';if(a>=1e6)return g+'₲'+(a/1e6).toFixed(1).replace(/\.0$/,'')+'M';if(a>=1e3)return g+'₲'+(a/1e3).toFixed(0)+'k';return g+'₲'+Math.round(a);};
const parseNum=s=>{const n=parseFloat(String(s).replace(/[^\d.]/g,''));return isNaN(n)?0:n;};
const parseInt2=s=>{const n=parseFloat(String(s).replace(/[^\d]/g,''));return isNaN(n)?0:n;};
const ymKey=d=>d.slice(0,7);
const monthLabel=ym=>{const[y,m]=ym.split('-');return mName(+m-1)+' '+y;};
const localISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>localISO(new Date());
const fmtDate=d=>{const[y,m,day]=d.split('-');return `${day} ${mName(+m-1)} ${y}`;};
const initials=n=>n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const avColor=seed=>AV_COLORS[[...String(seed)].reduce((a,c)=>a+c.charCodeAt(0),0)%AV_COLORS.length];

/* ---------- units, cost and profit ---------- */
let INV_BY_ID={}, SALES_BY_INV={}, SALE_BY_ID={}, _agg={};
function indexState(){ INV_BY_ID={}; SALES_BY_INV={}; SALE_BY_ID={}; _agg={};
  DB.inventory.forEach(i=>INV_BY_ID[i.id]=i);
  DB.sales.forEach(s=>{ SALE_BY_ID[s.id]=s; if(s.inventoryId)(SALES_BY_INV[s.inventoryId]=SALES_BY_INV[s.inventoryId]||[]).push(s); }); }
const sum=(l,f)=>l.reduce((a,x)=>a+(+f(x)||0),0);
const qtyOf=i=>Math.max(1,Math.floor(+i.quantity||1));          // units bought on this inventory line
const saleQty=s=>Math.max(1,Math.floor(+s.quantity||1));        // units in this sale (older sales: 1)
function invLeft(i){ return i.status==='Sold'?0:Math.max(0,qtyOf(i)-(+i.soldQty||0)); } // units still available now
// Cost of one unit: frozen on the sale; sales made before that existed fall back to the inventory item.
function saleUnitCost(s){ if(s.unitCost!=null) return +s.unitCost||0; const it=INV_BY_ID[s.inventoryId]; return it?(+it.purchasePYG||0):0; }
const saleCost=s=>saleUnitCost(s)*saleQty(s);
const saleProfit=s=>(+s.price||0)-saleCost(s);
const isInvPurchase=e=>!!e.inventoryId||e.category==='Inventory Purchase';
const pct=(v,t,d)=>{ if(!t) return '—'; const n=(v/t*100).toFixed(d==null?1:d); return (lang==='es'?n.replace('.',','):n)+'%'; };
const xQty=n=>n>1?`<span class="qty">× ${n}</span>`:'';
function delta(cur,prv){ if(prv==null||!prv) return ''; const d=(cur-prv)/Math.abs(prv)*100, up=d>=0;
  return `<span class="${up?'trend-up':'trend-down'}">${up?'+':'−'}${Math.abs(d).toFixed(0)}%</span> vs prev`; }

/* ---------- scope by active company ---------- */
function activeCompanyId(){ return session.user.role==='admin'? adminCompanyId : session.user.companyId; }
function activeCompany(){ return DB.companies.find(c=>c.id===activeCompanyId()); }
const coScope=list=>list.filter(x=>x.companyId===activeCompanyId());
function myScope(list){ // sales see only their own; managers/admin see all in company
  const l=coScope(list);
  return session.user.role==='sales'? l.filter(x=>x.agentId===session.user.id) : l;
}
/* permissions */
function can(what){ const r=session.user.role;
  switch(what){
    case 'expenses': case 'inventoryManage': case 'profitCharts': case 'reports': case 'allClients': case 'team': case 'logo':
      return r==='admin'||r==='manager';
    case 'createSales': return r==='admin'||r==='manager';   // create sales-agent profiles
    case 'createManagers': return r==='admin';               // only admin creates managers/admins & companies
    case 'adminConsole': return r==='admin';
    case 'sales': case 'revenue': case 'clients': return true; // everyone
    default: return false;
  }
}

/* ---------- product label (generic beyond watches) ---------- */
function pLabel(){ return (activeCompany()&&activeCompany().productType)||'Item'; }
function plural(w){ if(lang==='es'){ return /[aeiouáéíóú]$/i.test(w)? w+'s' : w+'es'; } return /(?:ch|sh|s|x|z)$/i.test(w)?w+'es' : /[^aeiou]y$/i.test(w)?w.slice(0,-1)+'ies' : w+'s'; }
function pPlural(){ return plural(pLabel()); }
