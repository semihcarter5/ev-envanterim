# Katkı rehberi

Katkılar çok değerli. Küçük bir düzeltme de olabilir, yeni bir özellik de.

## Başlamadan

- Büyük bir değişiklik yapacaksan önce bir **issue** aç, fikri konuşalım.
- Küçük düzeltmeler için doğrudan pull request açabilirsin.

## Kurallar

1. **Gizli anahtar yok.** API anahtarı, şifre veya gerçek kullanıcı verisi hiçbir commit'e girmez. `.env` dosyaları zaten `.gitignore` içinde.
2. **Veritabanı değişiklikleri migration ile.** `supabase/migrations` altına numaralı yeni bir `.sql` dosyası ekle; eski dosyaları değiştirme.
3. **Her yeni tabloda satır bazlı güvenlik (RLS) açık olmalı** ve politikalar yazılmalı. RLS'siz tablo içeren PR kabul edilmez.
4. **Erişilebilirlik:** kontrast en az 4.5:1, dokunma alanları en az 44x44 px, ikon düğmelerinde etiket.
5. **Sağlık verisi:** ilaç modunda doz veya tedavi önerisi eklenmez.
6. **Mobil öncelikli** düşün; 360 px genişlikte kullanılabilir olmalı.

## Pull request

- Tek konuya odaklı, küçük PR'lar tercih edilir.
- Ne değiştiğini ve nasıl denediğini kısaca yaz; arayüz değişikliğinde ekran görüntüsü ekle.

Katkı yaparak değişikliklerinin MIT lisansı altında yayınlanmasını kabul etmiş olursun.
