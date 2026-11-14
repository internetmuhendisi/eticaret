# 0128 · Katalog Canlı Çarşı taslağıyla üçüncü kez karşılaştırıldı

## Tarih

2026-11-15

## Karar

Bölüm kütüphanesi `planlar/tasarim-yonu/secenekler.html` (Canlı Çarşı) ile bilgisayar (1280 px) ve telefon (390 px) genişliğinde, açık temada karşılaştırıldı. Taslağın 16 bölümü (üst kısım, kayan afiş, güven şeridi, kampanya afişleri, kategoriler, öne çıkanlar, yeni gelenler, ikili tanıtım, sekmeli vitrin, fırsatlar, yorumlar, geniş afiş, blog, markalar, bülten, alt kısım) katalogdaki karşılığıyla yan yana kondu. Ayrıca 22 yazı öğesinin hesaplanan stilleri ölçüldü.

Bir fark düzeltildi:

- **Önceki ve sonraki ikonu:** Taslak kayan afişte ve sayfalamada köşeli ok (‹ ›) kullanır. Ortak ikon sözlüğünde bu kavram uzun oktu (← →), parça shadcn/ui'dan uyarlanırken gelmişti (kart 0103). Sözlükte köşeli oka çevrildi. Kayan afiş, kaydırmalı şerit, sayfalama ve ürün galerisi birlikte değişti.

## Neden

Taslak kullanıcının seçtiği yöndür (karar 0075). Ok ikonu daha önceki karşılaştırmalarda (kararlar 0093, 0096) ele alınmamıştı ve ikon sözlüğünde tek satırla karşılanıyordu.

## Düşünülen diğer yollar

- **Yalnız kayan afişin okunu değiştirmek:** Aynı kavramın ikonu her yerde aynı olmalıdır (`.claude/rules/tasarim-sistemi.md`). Taslak sayfalamada da köşeli ok kullanır.
- **Ölçekte olmayan boyutları eklemek:** Taslak duyuru ve telif yazısında 13 px, afiş açıklamasında 17 px, afiş düğmesinde 15 px, ödeme işaretinde 10 px yan boşluk kullanır. Ölçeğe eklenmedi, en yakın değerler kaldı (karar 0096'daki gibi).

## Sonuçları

Karar 0096'nın listesine ek olarak bilerek bırakılan ya da içerikten gelen farklar:

- **Ölçek:** Duyuru yazısı 14 px, telif 12 px, afiş açıklaması 18 px, afiş düğmesi 14 px. Ödeme işareti 12 px yazı ve 8 px yan boşlukla. Kart adının ve bülten başlığının satır yüksekliği ölçeğin satır değerinden.
- **Güven şeridi:** Taslakta da maddeler hücrede ortalıdır. Kısa yazılı madde ortada durur.
- **Telefonda sekmeler:** Yana kayar (karar 0089).
- **Kayan afiş:** Slayt noktaları 44 px aralıklı, telefonda sayaç (karar 0123).
- **Örnek içerik:** Katalogun örnek bağlamının içeriğinden gelenler. Kategori sayısı, görselsiz yan afiş, örnek görsellerin biçimi, isteğe bağlı "Tümünü gör" ve "Ayrıntılar" düğmeleri.

Vitrin sayfalarının (kategori, ürün, arama, favoriler, bulunamadı) taslaktan farkları kart 0195'tedir ve kullanıcı kararı bekler. Bu karşılaştırma bölüm kütüphanesiyle sınırlıdır.

Karşılaştırma sırasında katalogda bir hidrasyon uyarısı yeniden üretildi (bülten formunun onay kutusu, sayfa kaydırılınca). Kart 0200'e yazıldı, bu işte düzeltilmedi.

Karşılaştırma bir kez görüntüyle ve hesaplanan stillerle yapıldı, stil farklarının kalıcı testi yoktur. Ok ikonunun testi `bilesenler/ikonlar/testler/sozluk.test.ts`.
