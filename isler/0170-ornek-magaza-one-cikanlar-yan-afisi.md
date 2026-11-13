# 0170 · Örnek Mağaza: "Öne çıkanlar" yan afişi kalksın

## Amaç

Müşteri gezisinde (2026-11-13) görüldü: Örnek Mağaza'nın ana sayfasındaki "Öne çıkanlar" bölümünün yan afişi "Süreli fırsatlar, indirimdeki ürünleri bitmeden yakalayın" diyor, yanındaki ürünlerin hiçbiri indirimli görünmüyor.

## Olmazsa olmazlar

- Kullanıcı kararı: yan afiş kaldırılır, "Öne çıkanlar" taslaktaki gibi yan afişsiz tam genişlikte ızgaradır. "Yeni gelenler"in yan afişi kalır.
- Değişiklik yalnız sitenin başlangıç düzenindedir (`siteler/ornek-magaza/baslangic/duzen.json`); kullanılmayan görsel varsa kaldırılır.
- Sitenin düzen testi ve `KURALLAR.md` tablosu güncellenir.

## Sınırlar

- Çekirdeğe dokunulmaz.
- Kurulu sitelerin düzeni kendiliğinden değişmez (başlangıç düzeni bir kez yazılır); yerel ve sunucudaki Örnek Mağaza'nın düzeni bu kartta değişmez.

## Bitti sayılır

- Taze kurulan Örnek Mağaza'da "Öne çıkanlar" yan afişsiz (sitenin düzen testi).
- Önce ve sonra ekran görüntüsü karşılaştırıldı.

## Durum

yapılacak
