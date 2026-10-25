// Supabase ile konuşan tek katman. Ekranlar doğrudan veritabanına dokunmaz.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

const must = ({ data, error }) => { if (error) throw error; return data; };
const here = () => location.origin + location.pathname;

// ---- Oturum ----
export const getSession = async () => (await sb.auth.getSession()).data.session;
export const signInGoogle = async () => must(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: here() } }));
export const signInEmail = async (email, password) => must(await sb.auth.signInWithPassword({ email, password }));
export const signUpEmail = async (email, password) => must(await sb.auth.signUp({ email, password, options: { emailRedirectTo: here() } }));
export const signOut = async () => must(await sb.auth.signOut());

// ---- Ev ----
let homeIdCache = null;
export async function homeId() {
  if (homeIdCache) return homeIdCache;
  const rows = must(await sb.from('home_members').select('home_id').limit(1));
  if (!rows.length) throw new Error('Bu hesaba bağlı bir ev bulunamadı.');
  return (homeIdCache = rows[0].home_id);
}
export const resetCache = () => { homeIdCache = null; };

// ---- Yerler ----
export const listLocations = async () => must(await sb.from('locations').select('id,name,parent_id').order('name'));
/** Yer kimliklerinden "Banyo › Dolap › Üst çekmece" yolunu üretir. */
export function pathMap(locs) {
  const byId = new Map(locs.map((l) => [l.id, l]));
  const cache = new Map();
  const walk = (id) => {
    if (cache.has(id)) return cache.get(id);
    const l = byId.get(id); if (!l) return '';
    const p = l.parent_id && byId.has(l.parent_id) ? `${walk(l.parent_id)} › ${l.name}` : l.name;
    cache.set(id, p); return p;
  };
  const out = new Map(); locs.forEach((l) => out.set(l.id, walk(l.id))); return out;
}
/** "Mutfak, dolap 2, üst çekmece" yazısını parçalayıp eksik yerleri oluşturur; son yerin kimliğini döner. */
export async function ensureLocationPath(text) {
  const parts = String(text || '').split(/[,>›]/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
  if (!parts.length) return null;
  const hid = await homeId();
  let locs = await listLocations();
  let parent = null;
  for (const name of parts) {
    const found = locs.find((l) => (l.parent_id || null) === parent && l.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'));
    if (found) { parent = found.id; continue; }
    const row = must(await sb.from('locations').insert({ home_id: hid, name: name.slice(0, 80), parent_id: parent }).select('id,name,parent_id').single());
    locs = [...locs, row]; parent = row.id;
  }
  return parent;
}
export const deleteLocation = async (id) => must(await sb.from('locations').delete().eq('id', id));

// ---- Ürünler ----
export const listItems = async () => must(await sb.from('items').select('*').order('created_at', { ascending: false }));
export const getItem = async (id) => must(await sb.from('items').select('*').eq('id', id).maybeSingle());
export async function saveItem(id, fields) {
  if (id) return must(await sb.from('items').update(fields).eq('id', id).select().single());
  return must(await sb.from('items').insert({ ...fields, home_id: await homeId() }).select().single());
}
export const deleteItem = async (id) => must(await sb.from('items').delete().eq('id', id));

// ---- Fotoğraflar (özel depo; kısa ömürlü bağlantılarla gösterilir) ----
export async function uploadPhoto(blob) {
  const path = `${await homeId()}/${crypto.randomUUID()}.jpg`;
  must(await sb.storage.from('item-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
  return path;
}
export async function signedUrls(paths) {
  const list = [...new Set(paths.filter(Boolean))];
  if (!list.length) return new Map();
  const rows = must(await sb.storage.from('item-photos').createSignedUrls(list, 3600));
  return new Map(rows.filter((r) => r.signedUrl).map((r) => [r.path, r.signedUrl]));
}
export const removePhotos = async (paths) => {
  const list = paths.filter(Boolean);
  if (list.length) await sb.storage.from('item-photos').remove(list);
};

// ---- Yapay zekâ taraması (Edge Function; Gemini anahtarı sunucuda kalır) ----
const toBase64 = (blob) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(String(fr.result).split(',')[1]);
  fr.onerror = () => rej(fr.error);
  fr.readAsDataURL(blob);
});
export async function scanPhoto(blob) {
  const { data, error } = await sb.functions.invoke('scan', { body: { image: await toBase64(blob) } });
  if (error) {
    let code = error.name === 'FunctionsFetchError' ? 'network' : 'ai_unavailable';
    try { code = (await error.context.json()).error || code; } catch { /* gövde yok */ }
    const e = new Error(code); e.code = code; throw e;
  }
  return data; // { items, remaining, limit }
}
export async function saveItems(rows) {
  const hid = await homeId();
  return must(await sb.from('items').insert(rows.map((r) => ({ ...r, home_id: hid }))).select());
}
