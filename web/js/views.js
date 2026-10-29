// Ekranlar: her biri durumu alır, güvenli HTML döner. Olaylar main.js'te toplanır.
import { GOOGLE_LOGIN } from './config.js';
import { html, raw, icons, CATEGORIES, catLabel, expiryStatus, daysUntil, formatMonthYear, formatDay, timeAgo, queryTokens, matches, norm } from './lib.js';

const tabs = (active) => html`
<nav class="tabs" aria-label="Ana gezinme">
  <a href="#/" ${active === 'home' ? raw('aria-current="page"') : ''}>${icons.home}<span>Ana sayfa</span></a>
  <a href="#/search" ${active === 'search' ? raw('aria-current="page"') : ''}>${icons.search}<span>Ara</span></a>
  <a href="#/scan" class="add" aria-label="Ürün ekle">${icons.plus}</a>
  <a href="#/places" ${active === 'places' ? raw('aria-current="page"') : ''}>${icons.grid}<span>Yerler</span></a>
  <a href="#/settings" ${active === 'settings' ? raw('aria-current="page"') : ''}>${icons.settings}<span>Ayarlar</span></a>
</nav>`;

const thumb = (it, urls) => {
  const u = it.photo_path && urls.get(it.photo_path);
  return u ? html`<span class="thumb"><img src="${u}" alt="" loading="lazy"></span>` : html`<span class="thumb">${icons[it.category] || icons.item}</span>`;
};
const placeOf = (it, paths) => (it.location_id && paths.get(it.location_id)) || '';
const itemRow = (it, S, end) => html`
<a class="row" href="#/item/${it.id}">
  ${thumb(it, S.urls)}
  <span class="grow"><div class="t">${it.name}</div><div class="s">${placeOf(it, S.paths) || it.location_note || catLabel(it.category)}</div></span>
  ${end}
</a>`;
const expEnd = (it) => { const s = expiryStatus(it.expiry_date); return s ? html`<span class="end ${s.tone === 'muted' ? '' : s.tone}">${s.text}</span>` : ''; };
const group = (rows) => (rows.length ? html`<div class="group">${rows}</div>` : '');
const bar = (title = '', right = '') => html`<div class="bar"><button class="iconbtn" data-action="back" aria-label="Geri">${icons.back}</button><span class="title">${title}</span><div style="min-width:48px;text-align:right">${right}</div></div>`;
const empty = (b, s) => html`<div class="empty"><b>${b}</b><span>${s}</span></div>`;

// ---------- Giriş ----------
export function loginView(S) {
  const signup = S.authMode === 'signup';
  return html`
<main class="login">
  <img class="logo" src="icons/icon.svg" alt="Ev Envanterim" width="64" height="64">
  <h1>Evindeki her şey, nerede olduğuyla birlikte.</h1>
  <p class="lead">Gıda, ilaç ve eşyalarını kaydet. Yerini bir fotoğrafla ya da kısa bir notla yaz.</p>
  ${S.authMsg && html`<div class="${S.authMsgKind === 'ok' ? 'ok' : 'err'}" role="alert" style="margin-left:0;margin-right:0">${S.authMsg}</div>`}
  ${S.emailOpen && html`
  <form class="form" data-form="login" novalidate>
    <label class="sr" for="em">E-posta</label>
    <input class="input" id="em" name="email" type="email" inputmode="email" autocomplete="email" placeholder="E-posta" value="${S.authEmail || ''}" required>
    <label class="sr" for="pw">Şifre</label>
    <input class="input" id="pw" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="Şifre (en az 6 karakter)" minlength="6" required>
    <button class="btn" type="submit">${signup ? 'Hesap oluştur' : 'Giriş yap'}</button>
    <button class="link" type="button" data-action="auth-mode" style="justify-content:center">${signup ? 'Zaten hesabın var mı? Giriş yap' : 'Hesabın yok mu? Kayıt ol'}</button>
  </form>`}
  <div class="actions-bottom">
    ${GOOGLE_LOGIN && html`<button class="btn secondary" data-action="google">${icons.user}<span>Google ile devam et</span></button>`}
    ${!S.emailOpen && html`<button class="btn" data-action="email-open">${icons.mail}<span>E-posta ile devam et</span></button>`}
    <p class="fine">Verilerin yalnızca sana aittir. Devam edersen kullanım şartlarını kabul edersin.</p>
  </div>
</main>`;
}

// ---------- Ana sayfa ----------
export function homeView(S) {
  const f = S.filter;
  const list = S.items.filter((i) => f === 'all' || i.category === f);
  const count = (c) => S.items.filter((i) => c === 'all' || i.category === c).length;
  const soon = list.filter((i) => i.expiry_date && daysUntil(i.expiry_date) <= 30).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)).slice(0, 5);
  const initial = (S.email || '?').charAt(0).toLocaleUpperCase('tr');
  return html`
<div class="top"><h1>Evim</h1><a class="avatar" href="#/settings" aria-label="Hesap">${initial}</a></div>
<a class="searchbox" href="#/search">${icons.search}<span>Ürün veya yer ara</span></a>
<div class="chips" role="group" aria-label="Kategori">
  ${[{ id: 'all', label: 'Tümü' }, ...CATEGORIES].map((c) => html`<button class="chip ${f === c.id ? 'on' : ''}" data-action="filter" data-id="${c.id}" aria-pressed="${String(f === c.id)}"><span>${c.label}</span><span>${count(c.id)}</span></button>`)}
</div>
${S.items.length === 0
  ? html`<h2 class="label">Başlayalım</h2>${empty('Henüz ürün yok', 'Aşağıdaki + düğmesiyle ilk ürününü ekle.')}`
  : html`
${soon.length > 0 && html`<h2 class="label">Yakında bitenler</h2>${group(soon.map((i) => itemRow(i, S, expEnd(i))))}`}
<h2 class="label">${f === 'all' ? 'Son eklenenler' : catLabel(f)}</h2>
${list.length ? group(list.slice(0, 30).map((i) => itemRow(i, S, html`<span class="end">${timeAgo(i.created_at)}</span>`))) : empty('Bu kategoride ürün yok', 'Başka bir kategoriye bak ya da yeni ürün ekle.')}`}
${tabs('home')}`;
}

// ---------- Arama ----------
export function searchResults(S, q) {
  const toks = queryTokens(q);
  if (!q.trim()) {
    return html`${S.recent.length ? html`<h2 class="label">Son aramalar</h2>${group(S.recent.map((r) => html`<button class="row" data-action="recent" data-q="${r}" style="min-height:52px"><span class="thumb">${icons.clock}</span><span class="grow"><div class="t">${r}</div></span></button>`))}` : empty('Ne arıyorsun?', 'Ürün adını yaz. Örneğin: “pasaportu nereye koymuştum?”')}`;
  }
  const scored = S.items.map((i) => {
    const place = placeOf(i, S.paths);
    const nameHit = matches(i.name, toks);
    const anyHit = nameHit || matches(`${i.name} ${i.notes || ''} ${i.location_note || ''} ${place} ${i.barcode || ''}`, toks);
    return { i, place, score: nameHit ? 2 : anyHit ? 1 : 0 };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return empty('Sonuç bulunamadı', 'Başka bir sözcükle dene ya da ürünü ekle.');
  const [best, ...rest] = scored;
  const u = best.i.location_photo_path && S.urls.get(best.i.location_photo_path);
  return html`
<h2 class="label">En iyi eşleşme</h2>
<a class="group" href="#/item/${best.i.id}" style="display:flex;gap:12px;padding:14px 16px">
  <span class="thumb" style="width:72px;height:72px;border-radius:12px">${u ? html`<img src="${u}" alt="">` : icons.image}</span>
  <span style="min-width:0"><div class="t" style="font-size:17px;font-weight:600">${best.i.name}</div>
  <div style="margin-top:2px;font-size:15px;font-weight:500;overflow-wrap:anywhere">${best.place || 'Yer yazılmamış'}</div>
  ${best.i.location_note && html`<div class="muted" style="margin-top:2px;font-size:14px;overflow-wrap:anywhere">${best.i.location_note}</div>`}</span>
</a>
${rest.length > 0 && html`<h2 class="label">Diğer sonuçlar</h2>${group(rest.map((r) => itemRow(r.i, S, html`<span class="chev">${icons.chev}</span>`)))}`}`;
}
export function searchView(S, q = '') {
  return html`
<div style="padding:24px 16px 0"><form data-form="search" class="searchbox on" style="margin:0" role="search">
  ${icons.search}<label class="sr" for="q">Ara</label>
  <input id="q" name="q" type="search" value="${q}" placeholder="Ürün veya yer ara" autocomplete="off" enterkeyhint="search">
</form></div>
<div id="results">${searchResults(S, q)}</div>
${tabs('search')}`;
}

// ---------- Ekle / düzenle ----------
export function formView(S, it) {
  const e = it || {};
  const cat = e.category || (S.filter !== 'all' ? S.filter : 'food');
  const place = e.location_id ? S.paths.get(e.location_id) || '' : '';
  const placeText = place.replace(/ › /g, ', ');
  const showWarranty = cat === 'item';
  const barcode = e.barcode || S.draft?.barcode || '';
  return html`
${bar(it ? 'Düzenle' : 'Ürün ekle')}
<form data-form="item" data-id="${e.id || ''}" autocomplete="off">
  <input type="hidden" name="barcode" value="${barcode}">
  ${!it && S.draft && html`<div class="ok" style="margin:0 28px 12px" role="status">${S.draft.note}</div>`}
  <div class="seg" role="radiogroup" aria-label="Kategori">
    ${CATEGORIES.map((c) => html`<label><input type="radio" name="category" value="${c.id}" ${c.id === cat ? raw('checked') : ''}>${icons[c.id]}<span>${c.label}</span></label>`)}
  </div>
  <h2 class="label">Ürün</h2>
  <div class="group">
    <label class="field"><span>Ad</span><input name="name" value="${e.name || ''}" maxlength="200" required placeholder="Örn. Vitamin D damla"></label>
    <label class="field"><span>Adet</span><input name="quantity" type="number" min="0" inputmode="numeric" value="${e.quantity ?? 1}"></label>
    <label class="field" id="f-exp" ${showWarranty ? raw('hidden') : ''}><span>Son kullanma tarihi</span><input name="expiry_date" type="date" value="${e.expiry_date || ''}"></label>
    <label class="field" id="f-war" ${showWarranty ? '' : raw('hidden')}><span>Garanti bitişi</span><input name="warranty_until" type="date" value="${e.warranty_until || ''}"></label>
    <label class="photo-field"><span class="thumb">${icons.camera}</span><span class="grow"><div class="t" style="font-weight:600">Ürün fotoğrafı</div><div class="s muted" style="font-size:14px" data-fname>${e.photo_path ? 'Var. Değiştirmek için dokun.' : 'İsteğe bağlı'}</div></span><input type="file" name="photo" accept="image/*" capture="environment"></label>
  </div>
  <h2 class="label">Nereye koydun?</h2>
  <div class="group">
    <label class="field"><span>Yer (virgülle ayır: oda, dolap, çekmece)</span><input name="place" value="${placeText}" list="places" placeholder="Örn. Banyo, dolap, üst çekmece" maxlength="200"></label>
    <datalist id="places">${[...S.paths.values()].map((p) => html`<option value="${p.replace(/ › /g, ', ')}"></option>`)}</datalist>
    <label class="field"><span>Not</span><textarea name="location_note" rows="2" maxlength="500" placeholder="Örn. Mavi kutunun arkasında">${e.location_note || ''}</textarea></label>
    <label class="photo-field"><span class="thumb">${icons.image}</span><span class="grow"><div class="t" style="font-weight:600">Yer fotoğrafı</div><div class="s muted" style="font-size:14px" data-fname>${e.location_photo_path ? 'Var. Değiştirmek için dokun.' : 'Rafın veya çekmecenin fotoğrafı'}</div></span><input type="file" name="locphoto" accept="image/*" capture="environment"></label>
  </div>
  <div id="form-err"></div>
  <div class="actions"><button class="btn" type="submit">${it ? 'Değişiklikleri kaydet' : 'Kaydet'}</button></div>
</form>`;
}

// ---------- Ürün kartı ----------
export function itemView(S, it) {
  if (!it) return html`${bar()}${empty('Ürün bulunamadı', 'Silinmiş olabilir.')}`;
  const place = placeOf(it, S.paths);
  const hero = (it.location_photo_path && S.urls.get(it.location_photo_path)) || (it.photo_path && S.urls.get(it.photo_path));
  const exp = expiryStatus(it.expiry_date);
  const n = daysUntil(it.expiry_date);
  const expSmall = exp ? (n < 0 ? `${-n} gün önce geçti` : n === 0 ? 'Bugün bitiyor' : n > 60 ? `${Math.round(n / 30)} ay var` : `${n} gün var`) : '';
  return html`
${bar('', html`<a class="link" href="#/edit/${it.id}">Düzenle</a>`)}
<div class="pad"><div class="muted" style="font-size:14px">${catLabel(it.category)}</div><h1 style="margin-top:2px">${it.name}</h1></div>
<div class="hero-photo">${hero ? html`<img src="${hero}" alt="${it.name} fotoğrafı">` : html`${icons.image}<span>Fotoğraf yok</span>`}</div>
<div class="group" style="margin-top:12px">
  <div class="kv"><span>Yer</span><span>${place || 'Yazılmamış'}</span></div>
  ${it.location_note && html`<div class="kv"><span>Not</span><span style="font-weight:500">${it.location_note}</span></div>`}
  ${it.expiry_date && html`<div class="kv"><span>Son kullanma</span><span>${formatMonthYear(it.expiry_date)}<small>${expSmall}</small></span></div>`}
  ${it.warranty_until && html`<div class="kv"><span>Garanti bitişi</span><span>${formatDay(it.warranty_until)}</span></div>`}
  <div class="kv"><span>Adet</span><span>${it.quantity}</span></div>
  ${it.barcode && html`<div class="kv"><span>Barkod</span><span>${it.barcode}</span></div>`}
</div>
${it.category === 'medicine' && html`<p class="note">Bu uygulama doz veya tedavi önerisi vermez. Kullanım için prospektüse veya sağlık uzmanına başvur.</p>`}
<div class="actions">
  <a class="btn secondary" href="#/edit/${it.id}">Yerini değiştir</a>
  <button class="btn" data-action="delete-item" data-id="${it.id}">Bitti, çıkar</button>
</div>`;
}

// ---------- Yerler ----------
export function placesView(S) {
  const counts = new Map();
  S.items.forEach((i) => i.location_id && counts.set(i.location_id, (counts.get(i.location_id) || 0) + 1));
  const parents = new Set(S.locs.map((l) => l.parent_id).filter(Boolean));
  const rows = S.locs.map((l) => ({ l, path: S.paths.get(l.id) })).sort((a, b) => a.path.localeCompare(b.path, 'tr'));
  return html`
<div class="top"><h1>Yerler</h1></div>
<p class="sub">Ürünlerini koyduğun odalar, dolaplar ve çekmeceler.</p>
<form data-form="place" class="group" style="margin-top:16px"><label class="field"><span>Yeni yer</span><input name="place" maxlength="200" placeholder="Örn. Mutfak, dolap 2"></label>
<div style="padding:0 16px 14px"><button class="btn secondary" type="submit" style="height:44px">Yer ekle</button></div></form>
<h2 class="label">${rows.length ? 'Kayıtlı yerler' : 'Henüz yer yok'}</h2>
${rows.length ? group(rows.map(({ l, path }) => html`
<div class="row" style="cursor:default"><span class="thumb">${icons.pin}</span>
  <span class="grow"><div class="t">${path}</div><div class="s">${counts.get(l.id) || 0} ürün</div></span>
  ${parents.has(l.id) ? html`<span class="s muted" style="font-size:13px">içinde yer var</span>` : html`<button class="iconbtn" style="color:var(--sec)" data-action="delete-place" data-id="${l.id}" data-count="${counts.get(l.id) || 0}" aria-label="${path} yerini sil">${icons.trash}</button>`}</div>`)) : empty('Yer eklemedin', 'Ürün eklerken yazdığın yerler burada birikir.')}
${tabs('places')}`;
}

// ---------- Ayarlar ----------
export function settingsView(S) {
  return html`
<div class="top"><h1>Ayarlar</h1></div>
<h2 class="label">Hesap</h2>
<div class="group"><div class="kv"><span>E-posta</span><span style="font-weight:500">${S.email}</span></div></div>
<div style="margin:16px 16px 0"><button class="btn secondary" data-action="signout">Çıkış yap</button></div>
<h2 class="label">Gizlilik</h2>
<p class="note" style="margin-top:0">Verilerin yalnızca sana ve evine eklediğin kişilere görünür. Fotoğraflar özel bir depoda tutulur ve kısa ömürlü bağlantılarla gösterilir.</p>
<p class="note">Ev Envanterim açık kaynaklıdır (MIT).</p>
${tabs('settings')}`;
}

export const loadingView = () => html`<div class="loading">Yükleniyor…</div>`;
export const errorView = (msg) => html`<div class="top"><h1 class="md">Bir sorun oldu</h1></div><div class="err" role="alert">${msg}</div><div style="margin:16px 28px"><button class="btn secondary" data-action="reload">Yeniden dene</button></div>`;

// ---------- Kamera ----------
export function scanView(S, barcode = false) {
  return html`
<div class="scan">
  <div class="scanbar">
    <a class="iconbtn" href="#/" aria-label="Kapat" style="color:#fff">${icons.close}</a>
    <h1>Ürün ekle</h1><span style="width:48px"></span>
  </div>
  <div class="modes" role="tablist" aria-label="Tarama türü">
    <a role="tab" href="#/scan" aria-selected="${String(!barcode)}">Fotoğraf</a>
    <a role="tab" href="#/scan/barcode" aria-selected="${String(barcode)}">Barkod</a>
  </div>
  <div class="cam-wrap">
    <video id="cam" playsinline muted autoplay></video>
    ${barcode && html`<div class="guide" aria-hidden="true"></div>`}
    <div id="cam-state" class="cam-state">Kamera açılıyor…</div>
    <div id="cam-overlay" class="cam-overlay" hidden role="status"><span class="spin"></span><span id="cam-msg">Ürünler aranıyor…</span></div>
  </div>
  <p class="scan-hint" id="scan-hint" role="status">${barcode ? 'Barkodu çizgilerin içine hizala. Okununca kendiliğinden ilerler.' : 'Rafı, çekmeceyi ya da tek bir ürünü çerçeveye al.'}</p>
  <div class="scan-controls">
    <label class="gallery" aria-label="Galeriden seç">${icons.image}<input type="file" id="gallery" accept="image/*" data-mode="${barcode ? 'barcode' : 'photo'}"></label>
    ${barcode ? html`<span style="width:80px"></span>` : html`<button class="shutter" data-action="shutter" aria-label="Fotoğraf çek"><span></span></button>`}
    <a class="manual" href="#/add">Elle ekle</a>
  </div>
  ${!barcode && !S.consent && html`
  <div class="consent" role="dialog" aria-modal="true" aria-labelledby="cons-t">
    <div class="sheet">
      <h2 id="cons-t">Fotoğraf yapay zekâya gönderilir</h2>
      <p>Çektiğin fotoğraf, ürünleri tanımak için Google Gemini'ye gönderilir. Ücretsiz katmanda Google bu içeriği ürünlerini geliştirmek için kullanabilir.</p>
      <p>İlaç, kimlik veya kişisel belge fotoğrafı çekme. Onları "Elle ekle" ile yazarak ekleyebilirsin. Barkod sekmesi fotoğraf göndermez.</p>
      <button class="btn" data-action="consent">Anladım, devam et</button>
      <a class="link" href="#/scan/barcode" style="width:100%;justify-content:center">Barkodla ekle</a>
    </div>
  </div>`}
</div>`;
}

export function confirmView(S) {
  const sc = S.scan;
  const n = sc.items.length;
  return html`
${bar('')}
<form data-form="found" autocomplete="off">
  <div class="pad"><h1 class="md">${n} ürün buldum</h1></div>
  <p class="sub">Yanlış olanı düzelt, olmayanın tikini kaldır.</p>
  <div class="group" style="margin-top:16px">
    ${sc.items.map((it, i) => html`
    <div class="found" data-i="${i}">
      <label class="chk"><input type="checkbox" name="use${i}" checked aria-label="${it.name} kaydedilsin"><span class="box">${icons.check}</span></label>
      <div class="grow">
        <input class="fname" name="name${i}" value="${it.name}" maxlength="200" aria-label="Ürün adı" required>
        <div class="frow">
          <select name="cat${i}" aria-label="Kategori">${CATEGORIES.map((c) => html`<option value="${c.id}" ${c.id === it.category ? raw('selected') : ''}>${c.label}</option>`)}</select>
          <input name="qty${i}" type="number" min="1" inputmode="numeric" value="${it.quantity}" aria-label="Adet">
          <input name="exp${i}" type="date" value="${it.expiry_date || ''}" aria-label="Son kullanma tarihi" ${it.category === 'item' ? raw('hidden') : ''}>
        </div>
      </div>
    </div>`)}
  </div>
  <h2 class="label">Nereye koydun?</h2>
  <div class="group">
    <label class="field"><span>Yer (virgülle ayır: oda, dolap, çekmece)</span><input name="place" list="places" placeholder="Örn. Mutfak, dolap 2, üst çekmece" maxlength="200"></label>
    <datalist id="places">${[...S.paths.values()].map((p) => html`<option value="${p.replace(/ › /g, ', ')}"></option>`)}</datalist>
    <label class="field"><span>Not</span><textarea name="location_note" rows="2" maxlength="500" placeholder="Örn. Mavi kutunun arkasında"></textarea></label>
    ${sc.url && html`<div class="photo-field" style="cursor:default"><span class="thumb"><img src="${sc.url}" alt="Çektiğin fotoğraf"></span><span class="grow"><div class="t" style="font-weight:600">Bu fotoğraf yer fotoğrafı olur</div><div class="s muted" style="font-size:14px">Ürünün kartında görünür.</div></span></div>`}
  </div>
  <div class="actions"><button class="btn" type="submit" id="save-found">${n} ürünü kaydet</button></div>
</form>`;
}
