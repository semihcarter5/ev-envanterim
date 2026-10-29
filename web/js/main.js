// Yönlendirme, oturum ve olaylar.
import * as api from './api.js';
import { html, raw, esc, compressImage, store } from './lib.js';
import * as V from './views.js';
import { readBarcode, lookupProduct, isCode } from './barcode.js';

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');

const S = {
  session: null, email: '', items: [], locs: [], paths: new Map(), urls: new Map(),
  filter: 'all', recent: store.get('recent', []),
  scan: null, draft: null, consent: store.get('scan_consent', false),
  authMode: 'signin', authEmail: '', emailOpen: false, authMsg: '', authMsgKind: 'err',
};

let toastTimer;
function toast(msg) {
  $toast.textContent = msg; $toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $toast.classList.remove('show'), 2600);
}
const show = (view, opts = {}) => { $app.innerHTML = view.__raw; $app.classList.toggle('no-nav', !!opts.noNav); };
const friendly = (e) => {
  const m = String(e?.message || e);
  if (/Invalid login credentials/i.test(m)) return 'E-posta veya şifre hatalı.';
  if (/already registered|already been registered/i.test(m)) return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.';
  if (/Email not confirmed/i.test(m)) return 'E-postanı henüz doğrulamadın. Gelen kutundaki bağlantıya dokun.';
  if (/rate limit|too many/i.test(m)) return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Bağlantı kurulamadı. İnternetini kontrol et.';
  if (/provider is not enabled|Unsupported provider/i.test(m)) return 'Google ile giriş bu kurulumda henüz açık değil. E-posta ile devam et.';
  return m;
};

// ---- Kamera ve tarama ----
let stream = null;
let bcTimer = null;
const stopCamera = () => { clearInterval(bcTimer); stream?.getTracks().forEach((t) => t.stop()); stream = null; };
async function startCamera() {
  const v = document.getElementById('cam'), st = document.getElementById('cam-state');
  if (!v) return false;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('yok');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 } }, audio: false });
    if (!document.getElementById('cam')) { stopCamera(); return false; } // bu arada sayfa değişti
    v.srcObject = stream; await v.play().catch(() => {}); st.hidden = true;
    return true;
  } catch (e) {
    if (st) st.textContent = 'Kamera açılamadı. Alttaki düğmeyle galeriden fotoğraf seçebilirsin.';
    return false;
  }
}
const SCAN_ERRORS = {
  ai_not_configured: 'Yapay zekâ taraması bu kurulumda henüz açık değil. Ürünü elle ekleyebilirsin.',
  daily_limit: 'Bugünkü tarama hakkın doldu. Yarın tekrar dene ya da ürünü elle ekle.',
  service_busy: 'Bugün tüm kullanıcıların toplam tarama hakkı doldu. Yarın tekrar dene ya da ürünü elle ekle.',
  ai_busy: 'Yapay zekâ şu an yoğun. Biraz sonra tekrar dene.',
  ai_unavailable: 'Fotoğraf taranamadı. Tekrar dene ya da ürünü elle ekle.',
  bad_image: 'Fotoğraf okunamadı. Başka bir fotoğrafla dene.',
  unauthorized: 'Oturumun bitmiş. Çıkış yapıp yeniden giriş yap.',
  network: 'Bağlantı kurulamadı. İnternetini kontrol et.',
};
function scanUi(busy, msg) {
  const ov = document.getElementById('cam-overlay'), hint = document.getElementById('scan-hint');
  if (!ov) return;
  ov.hidden = !busy;
  if (busy) document.getElementById('cam-msg').textContent = msg || 'Ürünler aranıyor…';
  else if (msg && hint) hint.textContent = msg;
  document.querySelectorAll('.shutter, #gallery').forEach((el) => { el.disabled = busy; });
}
let scanning = false;
async function scanBlob(source) {
  if (scanning) return;
  scanning = true; scanUi(true);
  try {
    const blob = await compressImage(source, 700 * 1024);
    const res = await api.scanPhoto(blob);
    if (!res.items.length) { scanUi(false, 'Ürün bulamadım. Biraz yaklaşıp tekrar dene.'); return; }
    if (S.scan?.url) URL.revokeObjectURL(S.scan.url);
    S.scan = { blob, items: res.items, remaining: res.remaining, url: URL.createObjectURL(blob) };
    location.hash = '#/confirm';
  } catch (e) {
    console.error(e);
    scanUi(false, SCAN_ERRORS[e.code] || friendly(e));
  } finally { scanning = false; }
}
// ---- Barkod ----
function startBarcodeLoop() {
  const v = document.getElementById('cam');
  let busy = false;
  clearInterval(bcTimer);
  bcTimer = setInterval(async () => {
    if (busy || !v?.videoWidth) return;
    busy = true;
    try { const code = await readBarcode(v); if (code) { clearInterval(bcTimer); handleBarcode(code); } }
    catch (e) { console.error(e); clearInterval(bcTimer); scanUi(false, 'Barkod okuyucu yüklenemedi. İnterneti kontrol edip yeniden dene.'); }
    busy = false;
  }, 300);
}
async function handleBarcode(code) {
  if (!isCode(code)) return;
  navigator.vibrate?.(30);
  const known = S.items.find((i) => i.barcode === code);
  if (known) { toast('Bu ürün zaten kayıtlı'); location.hash = `#/item/${known.id}`; return; }
  scanUi(true, 'Ürün aranıyor…');
  let name = null, failed = false;
  try { name = await lookupProduct(code); } catch { failed = true; }
  if (name) {
    S.scan = { blob: null, url: null, items: [{ name, category: 'food', quantity: 1, expiry_date: null, barcode: code }] };
    location.hash = '#/confirm';
  } else {
    S.draft = { barcode: code, note: failed ? 'Ürün bilgisi alınamadı. Adını yaz, barkod kayıtlı kalsın.' : 'Bu barkod veritabanında yok. Adını yaz, barkod kayıtlı kalsın.' };
    location.hash = '#/add';
  }
}
async function barcodeFromFile(file) {
  scanUi(true, 'Barkod okunuyor…');
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const code = await readBarcode(bmp);
    if (code) return handleBarcode(code);
    scanUi(false, 'Fotoğrafta barkod bulamadım. Barkodu daha yakından çekip dene.');
  } catch (e) { console.error(e); scanUi(false, 'Fotoğraf okunamadı. Başka bir fotoğrafla dene.'); }
}

async function shutter() {
  const v = document.getElementById('cam');
  if (!v || !v.videoWidth) return scanUi(false, 'Kamera hazır değil. Galeriden fotoğraf seçebilirsin.');
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  scanBlob(await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92)));
}

// ---- Veri ----
async function loadData() {
  const [items, locs] = await Promise.all([api.listItems(), api.listLocations()]);
  S.items = items; S.locs = locs; S.paths = api.pathMap(locs);
  const photos = items.flatMap((i) => [i.photo_path, i.location_photo_path]);
  S.urls = await api.signedUrls(photos).catch(() => new Map());
}

// ---- Yönlendirme ----
function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name = '', id = ''] = h.split('/');
  return { name, id };
}
let renderId = 0;
async function render() {
  const my = ++renderId;
  const { name, id } = parse();
  stopCamera(); scanning = false;
  document.body.classList.toggle('dark', name === 'scan' && !!S.session);
  if (name !== 'add' && name !== 'scan') S.draft = null;
  if (!S.session) { show(V.loginView(S), { noNav: true }); return; }
  if (name === 'login') { location.replace('#/'); return; }
  try {
    show(V.loadingView());
    window.scrollTo(0, 0);
    if (['', 'search', 'places', 'item', 'edit', 'add', 'confirm', 'scan'].includes(name)) await loadData();
    if (my !== renderId) return;
    switch (name) {
      case '': show(V.homeView(S)); break;
      case 'search': show(V.searchView(S, '')); document.getElementById('q')?.focus(); break;
      case 'scan': {
        const bc = id === 'barcode';
        show(V.scanView(S, bc), { noNav: true });
        if (bc) { if (await startCamera()) startBarcodeLoop(); } else if (S.consent) startCamera();
        break;
      }
      case 'confirm': if (!S.scan) { location.replace('#/scan'); break; } show(V.confirmView(S), { noNav: true }); break;
      case 'add': show(V.formView(S, null), { noNav: true }); break;
      case 'edit': show(V.formView(S, S.items.find((i) => i.id === id)), { noNav: true }); break;
      case 'item': show(V.itemView(S, S.items.find((i) => i.id === id)), { noNav: true }); break;
      case 'places': show(V.placesView(S)); break;
      case 'settings': show(V.settingsView(S)); break;
      default: location.replace('#/');
    }
  } catch (e) { console.error(e); show(V.errorView(friendly(e))); }
}

// ---- Olaylar ----
document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  try {
    if (a === 'back') { history.length > 1 ? history.back() : (location.hash = '#/'); }
    else if (a === 'reload') render();
    else if (a === 'consent') { S.consent = true; store.set('scan_consent', true); document.querySelector('.consent')?.remove(); startCamera(); }
    else if (a === 'shutter') shutter();
    else if (a === 'filter') { S.filter = el.dataset.id; show(V.homeView(S)); }
    else if (a === 'google') { await api.signInGoogle(); }
    else if (a === 'email-open') { S.emailOpen = true; S.authMsg = ''; render(); document.getElementById('em')?.focus(); }
    else if (a === 'auth-mode') { S.authMode = S.authMode === 'signin' ? 'signup' : 'signin'; S.authMsg = ''; render(); }
    else if (a === 'signout') { await api.signOut(); }
    else if (a === 'recent') { const q = el.dataset.q; document.getElementById('q').value = q; document.getElementById('results').innerHTML = V.searchResults(S, q).__raw; }
    else if (a === 'delete-item') {
      if (el.dataset.armed !== '1') { el.dataset.armed = '1'; el.textContent = 'Emin misin? Çıkar'; el.classList.add('danger'); setTimeout(() => { if (el.isConnected) { el.dataset.armed = ''; el.textContent = 'Bitti, çıkar'; el.classList.remove('danger'); } }, 4000); return; }
      const it = S.items.find((i) => i.id === el.dataset.id);
      el.disabled = true;
      await api.deleteItem(el.dataset.id);
      if (it) api.removePhotos([it.photo_path, it.location_photo_path]).catch(() => {});
      toast('Listeden çıkarıldı'); location.hash = '#/';
    }
    else if (a === 'delete-place') {
      if (el.dataset.armed !== '1') { el.dataset.armed = '1'; toast(Number(el.dataset.count) > 0 ? 'Bu yerdeki ürünlerin yeri silinir. Onaylamak için tekrar dokun' : 'Silmek için tekrar dokun'); setTimeout(() => { el.dataset.armed = ''; }, 4000); return; }
      await api.deleteLocation(el.dataset.id); toast('Yer silindi'); render();
    }
  } catch (e) { console.error(e); toast(friendly(e)); if (a === 'delete-item') render(); }
});

document.addEventListener('input', (ev) => {
  if (ev.target.id === 'q') document.getElementById('results').innerHTML = V.searchResults(S, ev.target.value).__raw;
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.name === 'category') {
    const w = t.value === 'item';
    document.getElementById('f-exp').hidden = w; document.getElementById('f-war').hidden = !w;
  }
  if (t.id === 'gallery') { const f = t.files[0], bc = t.dataset.mode === 'barcode'; t.value = ''; if (f) (bc ? barcodeFromFile(f) : scanBlob(f)); return; }
  if (t.name?.startsWith('cat')) {
    const i = t.name.slice(3), d = document.querySelector(`[name=exp${i}]`);
    if (d) d.hidden = t.value === 'item';
  }
  if (t.name?.startsWith('use')) {
    const k = document.querySelectorAll('.found .chk input:checked').length, b = document.getElementById('save-found');
    if (b) { b.textContent = k ? `${k} ürünü kaydet` : 'Kaydedilecek ürün yok'; b.disabled = !k; }
  }
  if (t.type === 'file') {
    const out = t.closest('label')?.querySelector('[data-fname]');
    if (out && t.files[0]) out.textContent = t.files[0].name;
  }
});

document.addEventListener('submit', async (ev) => {
  const form = ev.target.closest('form[data-form]');
  if (!form) return;
  ev.preventDefault();
  const kind = form.dataset.form;
  const fd = new FormData(form);
  const btn = form.querySelector('button[type=submit]');
  try {
    if (kind === 'login') {
      const email = String(fd.get('email')).trim(), pw = String(fd.get('password'));
      S.authEmail = email;
      if (!email || pw.length < 6) { S.authMsg = 'E-posta ve en az 6 karakterli bir şifre gir.'; S.authMsgKind = 'err'; return render(); }
      btn.disabled = true;
      if (S.authMode === 'signup') {
        const r = await api.signUpEmail(email, pw);
        if (!r.session) { S.authMsg = 'Hesabın oluşturuldu. E-postana gelen bağlantıya dokunarak doğrula. Sonra bu sayfada e-posta ve şifrenle giriş yap.'; S.authMsgKind = 'ok'; S.authMode = 'signin'; render(); }
      } else await api.signInEmail(email, pw);
    } else if (kind === 'search') {
      const q = String(fd.get('q')).trim();
      if (q) { S.recent = [q, ...S.recent.filter((r) => r !== q)].slice(0, 6); store.set('recent', S.recent); }
      document.getElementById('q').blur();
    } else if (kind === 'place') {
      const id = await api.ensureLocationPath(String(fd.get('place')));
      if (!id) return toast('Önce bir yer yaz');
      toast('Yer eklendi'); render();
    } else if (kind === 'found') {
      const rows = [];
      S.scan.items.forEach((ai, i) => {
        if (!fd.get(`use${i}`)) return;
        const name = String(fd.get(`name${i}`)).trim(); if (!name) return;
        const category = String(fd.get(`cat${i}`));
        rows.push({
          category, name,
          quantity: Math.max(1, parseInt(fd.get(`qty${i}`), 10) || 1),
          expiry_date: category === 'item' ? null : (fd.get(`exp${i}`) || null),
          barcode: ai.barcode || null,
          ai_suggestion: ai.barcode ? null : ai, ai_confirmed: !ai.barcode,
        });
      });
      if (!rows.length) return toast('Kaydedilecek ürün yok');
      btn.disabled = true; btn.textContent = 'Kaydediliyor…';
      const locId = await api.ensureLocationPath(String(fd.get('place')));
      const note = String(fd.get('location_note')).trim() || null;
      const photo = S.scan.blob ? await api.uploadPhoto(S.scan.blob) : null;
      try { await api.saveItems(rows.map((r) => ({ ...r, location_id: locId, location_note: note, location_photo_path: photo }))); }
      catch (e) { api.removePhotos([photo]).catch(() => {}); throw e; }
      if (S.scan.url) URL.revokeObjectURL(S.scan.url);
      S.scan = null;
      toast(rows.length === 1 ? 'Ürün eklendi' : `${rows.length} ürün eklendi`);
      location.hash = '#/';
    } else if (kind === 'item') {
      const name = String(fd.get('name')).trim();
      if (!name) return toast('Ürün adını yaz');
      btn.disabled = true; btn.textContent = 'Kaydediliyor…';
      const id = form.dataset.id || null;
      const old = id ? S.items.find((i) => i.id === id) : null;
      const category = String(fd.get('category'));
      const fields = {
        category, name,
        barcode: isCode(fd.get('barcode')) ? String(fd.get('barcode')) : null,
        quantity: Math.max(0, parseInt(fd.get('quantity'), 10) || 0),
        expiry_date: category === 'item' ? null : (fd.get('expiry_date') || null),
        warranty_until: category === 'item' ? (fd.get('warranty_until') || null) : null,
        location_note: String(fd.get('location_note')).trim() || null,
        location_id: await api.ensureLocationPath(String(fd.get('place'))),
      };
      const removed = [];
      for (const [field, col] of [['photo', 'photo_path'], ['locphoto', 'location_photo_path']]) {
        const f = fd.get(field);
        if (f && f.size) {
          const blob = await compressImage(f);
          fields[col] = await api.uploadPhoto(blob);
          if (old?.[col]) removed.push(old[col]);
        }
      }
      const saved = await api.saveItem(id, fields);
      if (removed.length) api.removePhotos(removed).catch(() => {});
      S.draft = null;
      toast(id ? 'Kaydedildi' : 'Ürün eklendi');
      location.hash = `#/item/${saved.id}`;
    }
  } catch (e) {
    console.error(e);
    const msg = friendly(e);
    if (kind === 'login') { S.authMsg = msg; S.authMsgKind = 'err'; render(); }
    else { toast(msg); if (btn) { btn.disabled = false; btn.textContent = kind === 'found' ? 'Tekrar dene' : 'Kaydet'; } }
  }
});

// ---- Açılış ----
window.addEventListener('hashchange', render);
api.sb.auth.onAuthStateChange((event, session) => {
  const had = !!S.session;
  S.session = session; S.email = session?.user?.email || '';
  if (event === 'SIGNED_OUT') { api.resetCache(); S.items = []; S.emailOpen = false; location.hash = ''; render(); }
  else if (event === 'SIGNED_IN' && !had) { api.resetCache(); S.authMsg = ''; if (location.hash.startsWith('#/login')) location.hash = '#/'; render(); }
});
(async () => {
  try {
    const s = await api.getSession();
    S.session = s; S.email = s?.user?.email || '';
  } catch (e) { console.error(e); }
  // OAuth/e-posta dönüşündeki ?code=... adres çubuğunda kalmasın
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  render();
})();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
