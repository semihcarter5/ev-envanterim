// Küçük yardımcılar: güvenli HTML, ikonlar, tarih, arama, fotoğraf sıkıştırma.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const raw = (s) => ({ __raw: String(s) });
const part = (v) => {
  if (v === false || v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(part).join('');
  if (typeof v === 'object' && '__raw' in v) return v.__raw;
  return esc(v);
};
/** Şablon etiketi: araya giren her değer kaçırılır; iç içe html`` güvenle birleşir. */
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s + (i < vals.length ? part(vals[i]) : ''); });
  return raw(out);
}

const svg = (p, w = 1.5) => raw(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`);
export const icons = {
  food: svg('<path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-2 1-3 4-3 7h3v11"/>'),
  medicine: svg('<path d="M10.5 20.5a5 5 0 01-7-7l9-9a5 5 0 017 7z"/><path d="M8.5 8.5l7 7"/>'),
  item: svg('<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>'),
  pin: svg('<path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  home: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2),
  grid: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 4v16M4 12h8"/>'),
  settings: svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>', 2),
  chev: svg('<path d="M9 6l6 6-6 6"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 9"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/>'),
  user: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6 18a6.5 6.5 0 0112 0"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 2),
  check: svg('<path d="M5 12l5 5 9-10"/>', 3),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
};

export const CATEGORIES = [
  { id: 'food', label: 'Gıda' },
  { id: 'medicine', label: 'İlaç' },
  { id: 'item', label: 'Eşya' },
];
export const catLabel = (id) => (CATEGORIES.find((c) => c.id === id) || CATEGORIES[2]).label;

// ---- Tarih ----
const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((parseDay(dateStr) - t) / 86400000);
}
/** Son kullanma durumu: { text, tone } ; tone = 'bad' | 'warn' | 'muted' */
export function expiryStatus(dateStr) {
  const n = daysUntil(dateStr);
  if (n === null) return null;
  if (n < 0) return { text: 'Geçti', tone: 'bad' };
  if (n === 0) return { text: 'Bugün', tone: 'bad' };
  if (n <= 7) return { text: `${n} gün`, tone: 'warn' };
  if (n <= 60) return { text: `${n} gün`, tone: 'muted' };
  return { text: `${Math.round(n / 30)} ay`, tone: 'muted' };
}
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  const d = parseDay(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function formatDay(dateStr) {
  if (!dateStr) return '';
  const d = parseDay(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'Az önce';
  if (s < 3600) return `${Math.round(s / 60)} dk önce`;
  if (s < 86400) return `${Math.round(s / 3600)} sa önce`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'Dün' : `${d} gün önce`;
}

// ---- Arama ----
export const norm = (s) => String(s ?? '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
const STOP = new Set(['nereye', 'nerede', 'neredeydi', 'koymustum', 'koydum', 'koydun', 'koyduk', 'konmustu', 'var', 'yok', 'bul', 'bana', 'goster', 'acaba', 'hangi', 'ben', 'bir', 'icin', 'mi', 'mu', 'ne', 'nedir', 'idi', 'miydi']);
/** "pasaportu nereye koymuştum?" -> ["pasapor"]: gereksiz sözcükler atılır, ekler kabaca budanır. */
export function queryTokens(q) {
  return norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 5 ? w.slice(0, w.length - 2) : w));
}
export function matches(text, tokens) {
  if (!tokens.length) return false;
  const t = norm(text);
  return tokens.every((k) => t.includes(k));
}

// ---- Fotoğraf sıkıştırma (Supabase deposu 1 MB ile sınırlı) ----
export async function compressImage(file, maxBytes = 900 * 1024) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let last = null;
  for (const side of [1280, 960, 720, 512]) {
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.82, 0.7, 0.58, 0.45]) {
      last = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
      if (last && last.size <= maxBytes) return last;
    }
  }
  return last;
}

// ---- Tarayıcı deposu (isteğe bağlı kolaylık; yoksa sessizce atlanır) ----
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yok say */ } },
};
