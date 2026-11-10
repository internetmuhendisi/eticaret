# 0126 · Katalogdaki menü satırı klavye testi kararsız

## Amaç

`cekirdek/testler/uctan-uca/katalog.test.ts` içindeki "üst kısım: masaüstünde menü satırı açılır menülerle klavyeyle gezilir, menü düğmesi gizlidir" testi aynı kodla bazen geçiyor, bazen kırmızı. Açılır menü görünüyor ama ilk öğe ("Giyim") odak almıyor (`toBeFocused` beş saniyede gelmiyor). Kart 0114 sırasında ölçüldü: ana daldaki kodla tek başına beş denemenin üçünde, kart 0114'ün kopyasında üç denemenin ikisinde kırmızı. Kırmızı test kontrol hattını durdurur.

Bölüm: Vitrin. Kart 0114'te görüldü, ona karıştırılmadı.

## Olmazsa olmazlar

- Önce nedeni ölçülür: tıklama ya da Enter menü tam açılmadan mı gidiyor, hidrasyon mu bitmemiş (kart 0121'e benzer), Radix odağı mı geç veriyor.
- Neden kodda bir hataysa (ziyaretçi de aynı şeyi yaşıyorsa) kod düzeltilir; yalnız testin zamanlamasıysa test, beklemeyi gerçek bir koşula bağlayacak biçimde düzeltilir.
- Düzeltmeden sonra test tek başına en az yirmi kez ve tam takımda geçer.

## Sınırlar

- Menü satırının görünüşü değişmez.

## Bitti sayılır

- Nedeni ölçümle yazıldı.
- Test yirmi tekrarda ve tam takımda yeşil.

## Durum

yapılacak
