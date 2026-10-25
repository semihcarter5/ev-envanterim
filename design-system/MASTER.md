# Ev Envanterim: Tasarım Sistemi (taslak)

> Kaynak: ui-ux-pro-max'in yerleşik kuralları. Arama betiği bu ortamda yüklü olmadığı için veritabanı eşleşmesi değil, genel varsayılanlar kullanıldı. Ekran tasarımı sırasında gözden geçirilecek.

## Yön
Sakin, sıcak, "ev" hissi. Az öğe, büyük dokunma alanları, tek ana eylem (ürün ekle).

## Renk (açık tema)
| Rol | Değer | Not |
|---|---|---|
| Arka plan | #FAFAF7 | sıcak beyaz |
| Yüzey (kart) | #FFFFFF | |
| Metin | #1C1917 | arka planda yüksek kontrast |
| İkincil metin | #57534E | arka planda en az 4.5:1 |
| Ana renk | #0F766E | beyaz metinle 4.5:1 üstü |
| Gıda | #B45309 | |
| İlaç | #BE123C | |
| Eşya | #4338CA | |
| Uyarı (bitmek üzere) | #B45309, bitti: #B91C1C | renk tek başına işaret olmasın: ikon ve metin de olsun |

Koyu tema: aynı roller, arka plan #1C1917, kontrastlar ayrıca doğrulanacak.

## Yazı
- Gövde 16 px, satır yüksekliği 1.5. Başlıklar için tek bir yazı tipi ailesi, sistem yazı tipi yedekli.
- Türkçe karakter desteği (ı, İ, ş, ğ, ç, ö, ü) zorunlu.

## Bileşen kuralları
- Dokunma alanı en az 44x44 px, aralar en az 8 px.
- Alt gezinme en fazla 5 sekme: Ana sayfa, Ara, (+ Ekle), Yer, Ayarlar.
- İkonlar tek bir SVG setinden; emoji ikon yerine kullanılmaz.
- Form etiketleri görünür (yalnızca placeholder yok), hata alanın yanında.
- Yükleme ve tarama durumunda geri bildirim; hareket azaltma tercihine saygı.
- Görseller WebP, yer ayrılmış (düzen kayması yok).
