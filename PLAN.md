# Ev Envanterim: Plan

## Amaç
Evdeki ürünleri kamerayla tarayıp AI ile kategorilere ayırmak ve nereye konduğunu fotoğraf veya notla kaydetmek. Üç mod: **gıda, ilaç, eşya**. Basit arayüz, Google veya e-posta ile giriş, ücretsiz ve açık kaynak.

## Rakiplerden farkımız
1. Gıda, ilaç ve eşya tek uygulamada; kategoriye göre alanlar değişir (SKT, garanti, fiş).
2. "Nereye koydum?" ana özellik: konum fotoğrafı ve notu, doğal cümleyle arama.
3. AI öneri yapar, kullanıcı tek dokunuşla onaylar.
4. Tek fotoğrafta çok ürün; etiketten SKT okuma (OCR).
5. Türkçe, kurulumsuz web (PWA), ücretsiz ve açık kaynak.
6. Gizlilik: tarama öncesi açık uyarı; ilaç, kimlik ve belge için elle ekleme önerilir.

## Teknik kararlar
- Arka uç: Supabase (Auth, Postgres + RLS, Storage, Edge Function). Ücretsiz plan.
- AI: Gemini Flash-Lite (varsayılan gemini-3.5-flash-lite, secret ile değişir), Edge Function arkasında, kullanıcı başına günlük sınır (varsayılan 20). Sonraki aşama: kullanıcının kendi anahtarı (yalnızca kendi cihazında).
- Barkod: yerleşik BarcodeDetector, yoksa ZXing (iOS Safari için). Ürün adı: Open Food Facts (ücretsiz, anahtarsız); yalnızca barkod numarası gönderilir.
- Yayın: GitHub Pages.

## Sıra
1. [x] Supabase projesi, şema, güvenlik kuralları, fotoğraf deposu
2. [x] Açık kaynak depo iskeleti, tasarım sistemi taslağı
3. [x] Kullanıcı akışları ve ekran tasarımları (Yön C: sade, Roboto)
4. [x] Arayüz iskeleti: giriş, ürün listesi, elle ekleme, konum, arama (web/)
5. [x] Kamera ve AI tarama (Edge Function), onay ekranı. Canlı kullanım için GEMINI_API_KEY secret'ı gerekir
6. [x] Barkod okuma ve ürün adı arama (SKT okumayı AI tarama yapıyor)
7. [ ] "Yakında bitenler" ve bildirimler
8. [ ] Test (gerçek telefon), gizlilik metni, yayın
