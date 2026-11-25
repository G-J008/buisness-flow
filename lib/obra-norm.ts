// How Argus decides that two names are the same thing: capitals, accents, double spaces and the gap
// between a number and its unit don't count. "Fumé 6 mm" = "FUME 6MM" = "fume  6 mm".
export function norm(s: any) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[“”"'´`]/g, '')
    .replace(/(\d)\s+(?=[a-z])/g, '$1')
    .replace(/[\s ]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim();
}

// A product is identified by its supplier + code (when there is one) or supplier + name.
export const productKey = (supplierKey: string, name: any, code?: any) =>
  `${supplierKey}|${code && norm(code) ? 'c:' + norm(code) : 'n:' + norm(name)}`;

function lev(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return d[b.length];
}
// "Templado 10mm" and "Templado 10mm incoloro" look like the same product: the user decides.
export function similar(a: string, b: string) {
  a = norm(a); b = norm(b);
  if (!a || !b || a === b) return false;
  // different numbers mean different products: 6mm vs 8mm, 3+3 vs 4+4, model 1 vs model 2
  const nums = (x: string) => (x.match(/\d+(?:[.,]\d+)?/g) || []).join('|');
  if (nums(a) !== nums(b)) return false;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;
  if (a.length > 5 && lev(a, b) <= 2) return true;
  const ta = new Set(a.split(' ')), tb = new Set(b.split(' '));
  const inter = [...ta].filter((x) => tb.has(x)).length;
  return inter / new Set([...ta, ...tb]).size >= 0.6;
}

// Prices as people write them in Paraguay: "185.000", "Gs. 185.000", "185000", "12,50".
export function parsePrice(v: any): number | null {
  if (typeof v === 'number') return isFinite(v) && v >= 0 ? v : null;
  // keep digits and separators only; a dot left over from "Gs." or a trailing comma is not part of the number
  let t = String(v ?? '').replace(/[^\d.,]/g, '').replace(/^[.,]+|[.,]+$/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return isFinite(n) && n >= 0 ? n : null;
}

export function parseUnit(v: any): 'm2' | 'ml' | 'un' | null {
  const t = norm(v).replace(/\s/g, '');
  if (!t) return null;
  if (['m2', 'm²', 'mt2', 'mts2', 'metrocuadrado', 'metroscuadrados', 'xm2', '/m2'].includes(t)) return 'm2';
  if (['ml', 'm', 'mt', 'mts', 'metro', 'metros', 'metrolineal', 'metroslineales', 'xml', '/ml', 'mlineal'].includes(t)) return 'ml';
  if (['un', 'u', 'und', 'unid', 'unidad', 'unidades', 'c/u', 'cu', 'pza', 'pieza', 'piezas', 'x u', 'xu'].includes(t)) return 'un';
  return null;
}
// Without a unit column, a sensible default from the category name.
export function guessUnit(category: string): 'm2' | 'ml' | 'un' {
  const c = norm(category);
  if (c.includes('acces')) return 'un';
  if (c.includes('perfil')) return 'ml';
  return 'm2';
}
