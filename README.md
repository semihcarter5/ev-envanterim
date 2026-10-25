# Ev Envanterim

Evdeki ürünleri (gıda, ilaç, eşya) kamerayla tarayıp yapay zekâyla kategorilere ayıran ve **nereye koyduğunu unutmamanı** sağlayan, mobil uyumlu, ücretsiz ve açık kaynaklı web uygulaması.

*English: a free, open-source, mobile-first web app that scans household items with the camera, auto-categorizes them (food, medicine, belongings) and remembers where you put them.*

## Durum

Erken aşama. Giriş, ürün ekleme (fotoğraf ve yer notuyla), liste, arama, yerler, ürün kartı ve kamerayla AI tarama ve barkod okuma çalışıyor. AI tarama için Gemini anahtarı gerekir (aşağıya bak); barkod için anahtar gerekmez. Bildirimler sırada. Plan için [PLAN.md](PLAN.md) dosyasına bak.

## Nasıl çalışır

- **Kayıt:** Google veya e-posta (Supabase Auth).
- **Veri:** Supabase Postgres. Her kullanıcı yalnızca kendi evinin verisini görür (satır bazlı güvenlik).
- **Fotoğraflar:** Özel bir Supabase Storage bölümünde, telefonda küçültülerek saklanır.
- **AI:** Fotoğraf tanıma, anahtarı gizleyen bir Supabase Edge Function üzerinden Gemini ile yapılır. Kullanıcı başına ve tüm kullanıcılar için günlük tarama sınırı vardır. Etiketteki son kullanma tarihini de bu tarama okur.
- **Barkod:** Telefonun kendi barkod okuyucusu (yoksa ZXing kütüphanesi) barkodu cihazda okur. Ürün adı [Open Food Facts](https://world.openfoodfacts.org) açık veritabanından aranır; bulunamazsa barkod kayıtlı kalır, adı sen yazarsın. Kayıtlı bir barkodu tekrar okutunca ürünün kartı açılır.
- **Yayın:** GitHub Pages (herkese açık depolarda ücretsiz).

## Kendi ücretsiz kopyanı kur

1. Depoyu fork'la.
2. [supabase.com](https://supabase.com) üzerinde ücretsiz bir proje aç.
3. `supabase/migrations` içindeki dosyaları sırayla SQL editöründe çalıştır (ya da Supabase CLI ile `supabase db push`).
4. `web/js/config.js` içine kendi proje adresini ve publishable anahtarını yaz. Supabase panelinde **Authentication > URL Configuration** altına yayın adresini (Site URL) ve gerekirse `http://localhost:8000` adresini ekle; yoksa e-posta ve Google dönüş bağlantıları çalışmaz. Google ile giriş için **Authentication > Providers > Google** bölümünü kendi OAuth bilgilerinle aç.
5. Tarama fonksiyonunu yayınla: `supabase functions deploy scan --no-verify-jwt` (fonksiyon kullanıcıyı kendisi doğrular). AI için [Google AI Studio](https://aistudio.google.com)'dan, **faturalandırması açık olmayan** bir projeden anahtar al ve Supabase'de Edge Function secret olarak `GEMINI_API_KEY` adıyla ekle. İsteğe bağlı secret'lar: `GEMINI_MODEL` (varsayılan `gemini-3.5-flash-lite`; ücretsiz katmanda hangi modelin açık olduğunu AI Studio'da kontrol et) `SCAN_DAILY_LIMIT` (kullanıcı başına günlük tarama, varsayılan 20) ve `SCAN_GLOBAL_DAILY_LIMIT` (tüm kullanıcılar için günlük toplam, varsayılan 300; sahte hesapların ücretsiz kotanı bitirmesini önler). Anahtarı asla depoya veya sayfa koduna koyma.
6. Depo ayarlarında **Pages > Source** değerini *GitHub Actions* yap; `main` dalına her gönderimde `web/` klasörü otomatik yayınlanır.
7. Repo ayarlarında `SUPABASE_URL` ve `SUPABASE_PUBLISHABLE_KEY` değişkenlerini ekle; haftalık keepalive görevi projenin duraklatılmasını önler.

## Yerelde çalıştırma

Derleme adımı yoktur. `web/` klasöründe `python3 -m http.server 8000` çalıştırıp `http://localhost:8000` adresini aç.

## Gizlilik ve güvenlik notları

- Ücretsiz Gemini katmanında gönderilen içerik Google'ın ürün geliştirmesinde kullanılabilir. Bu yüzden tarama ekranı ilk kullanımda bunu açıkça söyler ve ilaç, kimlik veya kişisel belge fotoğrafı çekmemeyi, bunları elle eklemeyi önerir. Fotoğraf yalnızca sen çekince gönderilir.
- Barkod aramasında Open Food Facts'e yalnızca barkod numarası gider (hesap, fotoğraf veya başka bilgi gitmez). Barkod görüntüsü cihazdan çıkmaz.
- Uygulama **tıbbi tavsiye vermez**: doz veya tedavi önerisi yoktur, yalnızca son kullanma tarihi ve konum takibi yapar.
- Sayfaya gömülen publishable anahtar herkese açık olabilir; veriyi `supabase/migrations` içindeki satır bazlı güvenlik kuralları korur.

## Test

Tarama fonksiyonunun kuralları (oturum, görsel doğrulama, günlük sınır, hata durumunda hak iadesi, yapay zekâ cevabını temizleme) `deno test supabase/functions/scan` ile sınanır.

## Katkı

[CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bak. Lisans: [MIT](LICENSE).
