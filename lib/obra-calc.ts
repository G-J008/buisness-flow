// Budget math for Argus Construcción. public/js/app-8.js has the same logic for the live preview in the browser.
//
// A budget line is one kind of item (e.g. "Puerta mano amiga") with its measures and quantity:
//   parts       glass, profile… each a supplier product priced per m², per linear metre or per unit
//   accessories per part, always by quantity (wheels, glue, screws)
//   labour      per item or per m²
// unit cost = Σ part price × measure + Σ accessory price × qty + labour; line cost = unit cost × quantity.
// The client sees cost × (1 + margin %).

export type Accessory = { supplierId?: string; productId?: string; name?: string; price?: number; qty?: number };
export type Part = { label: string; categoryId?: string; supplierId?: string; productId?: string; productName?: string; unit?: string; price?: number; accessories?: Accessory[] };
export type Line = { id: string; itemTypeId?: string; baseName: string; width: number; height: number; qty: number; parts: Part[]; laborMode: 'item' | 'm2'; laborRate: number };

export const area = (l: Line) => (Number(l.width) || 0) * (Number(l.height) || 0);
export function measure(unit: string | undefined, l: Line) {
  if (unit === 'm2') return area(l);
  if (unit === 'ml') return 2 * ((Number(l.width) || 0) + (Number(l.height) || 0));
  return 1;
}
export function unitCost(l: Line) {
  let t = 0;
  for (const p of l.parts || []) {
    if (p.productId) t += (Number(p.price) || 0) * measure(p.unit, l);
    for (const a of p.accessories || []) t += (Number(a.price) || 0) * (Number(a.qty) || 0);
  }
  t += (Number(l.laborRate) || 0) * (l.laborMode === 'm2' ? area(l) : 1);
  return t;
}
export const lineCost = (l: Line) => unitCost(l) * Math.max(1, Number(l.qty) || 1);
export const budgetCost = (lines: Line[]) => lines.reduce((t, l) => t + lineCost(l), 0);

// "Puerta mano amiga" + glass Fumé + profile Amaderado → "Puerta mano amiga con vidrio Fumé y perfil Amaderado"
export function smartName(l: Line) {
  const bits = (l.parts || []).filter((p) => p.productName).map((p) => `${(p.label || '').toLowerCase()} ${p.productName}`.trim());
  if (!bits.length) return l.baseName;
  const tail = bits.length === 1 ? bits[0] : bits.slice(0, -1).join(', ') + ' y ' + bits[bits.length - 1];
  return `${l.baseName} con ${tail}`;
}
const fmtM = (n: number) => (Math.round(n * 100) / 100).toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const measureLabel = (l: Line) => (Number(l.width) && Number(l.height) ? `${fmtM(Number(l.width))} × ${fmtM(Number(l.height))} m` : '');

// Proposal rows at client prices.
export function proposalItems(lines: Line[], marginPct: number) {
  const k = 1 + (Number(marginPct) || 0) / 100;
  return lines.map((l) => {
    const qty = Math.max(1, Number(l.qty) || 1);
    const unitPrice = Math.round(unitCost(l) * k);
    const m = measureLabel(l);
    return { description: smartName(l) + (m ? ` (${m})` : ''), qty, unitPrice, total: unitPrice * qty };
  });
}

// What a sales agent receives: every price already includes the margin, so their totals match the client price
// and they never see supplier costs or the margin itself.
export function inflateLines(lines: Line[], k: number): Line[] {
  return lines.map((l) => ({
    ...l,
    laborRate: (Number(l.laborRate) || 0) * k,
    parts: (l.parts || []).map((p) => ({
      ...p,
      price: (Number(p.price) || 0) * k,
      accessories: (p.accessories || []).map((a) => ({ ...a, price: (Number(a.price) || 0) * k })),
    })),
  }));
}
