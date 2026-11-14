# 0200 · Katalogda onay kutusunun hidrasyon uyarısı yeniden üretildi

## Amaç

Kart 0123'te onay kutusunun hidrasyon uyarısı aranmış, yeniden üretilememişti. Taslak karşılaştırması sırasında (karar 0128, 2026-11-15) üretildi.

Görülen: Konsolda "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties". Fark Radix'in onay kutusunun gizli `input`'unun `style` özniteliğindedir (`position`, `pointerEvents`, `opacity`, `margin`, `transform`). Ağaçta `BultenFormu` → `OnayKutusu` → `CheckboxBubbleInput`. Geliştirme sunucusunun göstergesi "12 Issues" dedi.

Üretme adımları (geliştirme sunucusu, Chromium):

1. `/gelistirme/bilesenler/bolum-kutuphanesi?renk=acik` açılır, ağın durulması beklenir. Bu noktada uyarı yok.
2. `section[aria-label="Ana sayfa bölümleri"] > div:nth-of-type(2) section[aria-label="Kampanyalar"]` öğelerinin her biri Playwright'ın `locator.screenshot()` ile görüntülenir: sayfa o öğelere kaydırılır.
3. 1 saniye sonra konsolda iki hata vardır (1280 ve 390 px'te, `reducedMotion: "reduce"` ile).

Kaydırmadan önce uyarı yoktur (ölçüldü). Sebep ölçülmedi: kaydırmanın hangi parçanın sonradan bağlanmasını tetiklediği bilinmiyor.

Bölüm: Testler.

## Olmazsa olmazlar

- Sebep ölçülerek bulunsun; uyarının canlı derlemede de olup olmadığı ölçülsün.
- Düzeltme ya da kabul, tarayıcı testinin konsol denetimiyle (kart 0123) korunsun: kaydırılan katalog sayfasında hidrasyon uyarısı kırmızıdır.

## Sınırlar

- Onay kutusunun davranışı (formla gönderim, klavye) değişmez.

## Bitti sayılır

- Uyarı yok ya da nedeni ve kabulü kararla yazıldı; kaydıran tarayıcı testi var.

## Durum

yapılacak
