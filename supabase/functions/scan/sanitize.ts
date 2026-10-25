// Yapay zekâdan gelen cevap güvenilmez veridir: türünü, uzunluğunu ve değer aralığını burada zorluyoruz.
export type Category = 'food' | 'medicine' | 'item';
export interface FoundItem { name: string; category: Category; quantity: number; expiry_date: string | null }

const CATS = new Set(['food', 'medicine', 'item']);
const MAX_ITEMS = 12;

function validDate(s: unknown, now: Date): string | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  const year = now.getUTCFullYear();
  if (y < year - 1 || y > year + 15) return null;
  return s;
}

export function sanitize(input: unknown, now = new Date()): FoundItem[] {
  const list = (input as { items?: unknown })?.items;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: FoundItem[] = [];
  for (const r of list) {
    if (out.length >= MAX_ITEMS) break;
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const name = String(o.name ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!name) continue;
    const category = (CATS.has(String(o.category)) ? String(o.category) : 'item') as Category;
    const q = Math.round(Number(o.quantity));
    const quantity = Number.isFinite(q) ? Math.min(99, Math.max(1, q)) : 1;
    const key = `${category}|${name.toLocaleLowerCase('tr')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, category, quantity, expiry_date: category === 'item' ? null : validDate(o.expiry_date, now) });
  }
  return out;
}
