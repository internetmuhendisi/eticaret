# 0210 · İndirim kartı indirimli birleşimin görselini göstermiyor

## Amaç

Kart 0147 ve 0128'in kapanış kontrolünde (2026-11-16, deneme adresi, 0.76.0) görüldü. "Bitmeden yakalayın" bölümündeki Kapüşonlu Sweatshirt kartı ürünün ana görselini, yani gri sweatshirt'ü gösteriyor. İndirim ise yalnız lacivert birleşimlerde. Müşteri gri ürünü indirimde sanıyor. Karta basınca ürün sayfası da indirimsiz Gri seçili açılıyor (S, Gri, 649,90).

Sebep koddan okundu: ürün kartı görseli her zaman ana görselden alır (`anaGorseller`, `cekirdek/vitrin/urun-karti/veri.ts`). Fırsat kaynağı kartın bitişini bulduğu birleşimi bilir (kart 0111, en yakın biten satılabilir birleşim), ama görsel ve bağlantı bu birleşime göre seçilmiyor.

Öneri: indirim ürünün yalnız bazı birleşimlerindeyse, indirimi gösteren kart o birleşimin görselini gösterir ve ürün sayfasını o birleşim seçili açar. Bu her sitede doğru olan bir davranış olduğu için site ayarı değildir.

Bölüm: Vitrin. Kart 0147'nin kontrolünde görüldü, ona karıştırılmadı.

## Olmazsa olmazlar

- "Fırsatlar" bölümünde ve ürün kaynağı "indirimdekiler" olan bölümlerde:
  - Ürünün bütün satılabilir birleşimleri indirimde değilse kart, kaynağın seçtiği indirimli birleşimin görselini gösterir. Fırsatlarda bu birleşim bitişi en yakın olanıdır; indirimdekilerde aynı kural kullanılır.
  - Kartın bağlantısı ürün sayfasını o birleşim seçili açar. Ürün sayfasının seçim adresi kullanılır (kart 0138).
- Birleşimin kendi görseli yoksa ya da bütün birleşimler indirimdeyse kart bugünkü gibi ana görseli ve seçimsiz adresi kullanır.
- Öteki kaynaklar (elle seçim, kategori, yeni gelenler) ve öteki sayfalar değişmez.
- Sorgu sayısı ürün sayısıyla artmaz (kart 0109 ve 0111'deki ölçüm).
- Testler:
  - Gerçek veritabanıyla, yalnız bir rengi indirimli üründe görsel ve adres o birleşimden geliyor.
  - Hepsi indirimli üründe ve görselsiz birleşimde kart ana görselde kalıyor.
  - Tarayıcıda karta basınca ürün sayfası indirimli birleşim seçili ve üstü çizili eski fiyatla açılıyor.
  - Her yeni denetim bilerek bozularak kırmızıya düşüyor.

## Sınırlar

- Kartın fiyat gösterimi değişmez: aralıkta eski fiyat yazılmaz (kart 0109, karar 0086). Fiyatın da birleşime göre gösterilmesi ayrı ürün kararıdır.
- Ürün sayfasının galerisi ve seçim kuralları değişmez.
- Örnek Mağaza'nın kataloğu değişmez.

## Bitti sayılır

- Fırsatlarda Kapüşonlu Sweatshirt kartı lacivert görseli gösteriyor, karta basınca ürün sayfası Lacivert seçili ve üstü çizili 649,90 ile açılıyor (yerelde, tarayıcıyla).
- İndirimdekiler kaynağında da aynı davranış testte.
- Hepsi indirimli ve görselsiz birleşimli ürünlerde kart değişmiyor (testte).
- Testler yeşil, bozma denemeleri kırmızıya düşüyor.

## Durum

yapılacak
