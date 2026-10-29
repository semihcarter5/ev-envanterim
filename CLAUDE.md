# Ev Envanterim

Evdeki gıda, ilaç ve eşyaları fotoğrafla ya da barkodla kaydeden, yapay zekâyla kategorileyen ve nerede durduğunu tutan; ücretsiz, açık kaynaklı, mobil öncelikli bir PWA. Arayüz ve yorumlar Türkçe. Kullanıcıyla Türkçe konuş.

## Yığın

- **Ön yüz:** `web/` altında sade ES modülleri (derleme adımı yok), hash yönlendirici, `html` etiketli şablon (otomatik kaçışlı), Roboto, ana renk `#2547D0`. Tasarım kuralları: `design-system/MASTER.md`.
- **Arka uç:** Supabase (ücretsiz plan). Auth (e-posta + Google, PKCE), Postgres + RLS, özel Storage kovası `item-photos`, Edge Function `scan`.
- **Yayın:** GitHub Pages, `web/` klasörü `main` dalına push edilince `.github/workflows/pages.yml` ile yayınlanır. Adres: https://semihcarter5.github.io/ev-envanterim/
- **Depo:** https://github.com/semihcarter5/ev-envanterim
- **Supabase projesi:** `zjshhkttbpfshznrjrrx` (eu-central-1). Yayınlanabilir anahtar `web/js/config.js` içinde ve istemci tarafında olması güvenli.

## Klasörler

- `web/` — uygulama (`js/main.js`, `js/views.js`, `js/config.js`, `css/app.css`, `sw.js`, `manifest.webmanifest`, `icons/`).
- `supabase/migrations/0001…0005` — numaralı SQL; eskileri değiştirme, yenisini ekle.
- `supabase/functions/scan/` — `index.ts` (Deno.serve, Gemini çağrısı), `handler.ts` (tüm kurallar, bağımlılıklar dışarıdan verilir), `sanitize.ts` (yapay zekâ çıktısını doğrular), `scan_test.ts`.
- `docs/` — logo dosyaları. Logo: harita iğnesi içinde ev.
- `.github/workflows/` — `pages.yml`, `test.yml` (Deno testleri), `keepalive.yml` (haftalık Supabase ping; depo Variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`).

## Tarama kuralları (maliyet koruması)

Kullanıcının Gemini anahtarı yalnızca Supabase Edge Function gizli değeridir (`GEMINI_API_KEY`); istemciye asla gitmez.

- Kullanıcı başına günlük sınır: `SCAN_DAILY_LIMIT` (varsayılan 20).
- Tüm kullanıcılar için günlük toplam: `SCAN_GLOBAL_DAILY_LIMIT` (varsayılan 300).
- Model: `GEMINI_MODEL` (varsayılan `gemini-3.5-flash-lite`).
- Hata kodları: `unauthorized` 401, `bad_image` 400, `ai_not_configured` 503, `daily_limit` 429, `service_busy` 503 (kullanıcı hakkı iade edilir), `ai_busy`/`ai_unavailable` 502 (kullanıcı ve toplam iade edilir).
- Sayaç fonksiyonları (`bump_scan_usage`, `refund_scan_usage`, `bump_scan_global`, `refund_scan_global`) yalnızca `service_role` içindir.
- Barkodda Open Food Facts'e yalnızca rakamlar gider.

## Komutlar

- Edge Function testleri: `deno test supabase/functions/scan` (13 test geçmeli).
- Yerelde önizleme: `web/` içinde `python -m http.server 8731`. Supabase ve CDN'e erişim gerekir.
- Edge Function'ı yayınlamak: Supabase CLI ile `supabase functions deploy scan --no-verify-jwt` (JWT fonksiyon içinde `getUser` ile doğrulanıyor).

## Kurallar

- Gizli anahtar, şifre, OAuth istemci sırrı hiçbir dosyaya ve commit'e girmez. Gemini anahtarını ve Google istemci kimliği/sırrını kullanıcı kendisi Supabase'e girer.
- Her yeni tabloda RLS açık ve politikalar yazılı olmalı.
- İlaç modunda doz veya tedavi önerisi yok.
- Erişilebilirlik: kontrast en az 4.5:1, dokunma alanı en az 44x44 px, ikon düğmelerinde etiket. 360 px genişlikte çalışmalı.
- `web/js/config.js` içindeki `GOOGLE_LOGIN` bayrağı Google düğmesini gösterir/gizler. Şu an `true`.

## Durum

- Çalışanlar: e-posta girişi, Google girişi (OAuth "Testing" durumunda; yalnızca test kullanıcıları girebilir), yapay zekâ taraması, barkod okuma, konum kaydı, yayın hattı ve CI.
- Bilinen sınır: Supabase varsayılan e-posta gönderimi saatte 2 ile sınırlı ve yalnızca ekip adreslerine gider; arkadaşların e-posta onaylı kaydı için "Confirm email" kapatılmalı ya da özel SMTP bağlanmalı.
- Sırada (`PLAN.md`): 7) yakında biten ürünler ve bildirimler, 8) gerçek telefonda deneme, gizlilik metni, yayına alma.
- Fikirler: tek dosyalık `supabase/setup.sql`, boş `config.js` şablonu ve fork ile kendi kurulumu için adım adım README.
