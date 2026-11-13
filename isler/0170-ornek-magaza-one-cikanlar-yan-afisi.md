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

## Notlar (2026-11-14)

- Yan afişsiz ızgara 1280 px'te beş sütundur (karar 0089); sekiz ürün 5+3 dizilirdi. Taslaktaki gibi beş ürün bırakıldı (ilk beşi: Kablosuz Kulaklık, Kapüşonlu Sweatshirt, Basic Tişört, Keten Masa Örtüsü, Porselen Kupa). Bu beşi "Yeni gelenler"le de çakışmaz (kart 0184'ün bir maddesi kendiliğinden kalkar). Telefonda 2+2+1 dizilir.
- Kullanılmayan görsel `afis-yan-2-firsat.jpg` silindi.
- Önce ve sonra görüntüsü (taze kurulmuş Örnek Mağaza, 1280 ve 390 px): önce sekiz ürün ve sol yanda "Süreli fırsatlar, indirimdeki ürünleri bitmeden yakalayın" afişi; sonra beş ürün, tam genişlikte, afiş yok.
- Sitenin düzen testi eski düzen dosyasıyla kırmızıya düştü (ölçüldü).
- Ölçerken bulunan: kayan afişin ekran okuyucudaki adı da "Öne çıkanlar"; ana sayfada iki bölge aynı adı taşıyor (kart 0189).

## Durum

yapılacak
