# 0126 · Katalogdaki menü satırı klavye testi kararsız

## Amaç

`cekirdek/testler/uctan-uca/katalog.test.ts` içindeki "üst kısım: masaüstünde menü satırı açılır menülerle klavyeyle gezilir, menü düğmesi gizlidir" testi aynı kodla bazen geçiyor, bazen kırmızı. Açılır menü görünüyor ama ilk öğe ("Giyim") odak almıyor (`toBeFocused` beş saniyede gelmiyor). Kart 0114 sırasında ölçüldü: ana daldaki kodla tek başına beş denemenin üçünde, kart 0114'ün kopyasında üç denemenin ikisinde kırmızı. Kırmızı test kontrol hattını durdurur.

Bölüm: Vitrin. Kart 0114'te görüldü, ona karıştırılmadı.

## Ölçüm (2026-11-11)

- Bugünkü kodla (`ac` sayfayı `sayfaHazir` ile bekler, kart 0121) test tek başına 20 kez çalıştı, 20'si geçti (yük ortalaması 3,5'ten başladı).
- Bekleme geçici olarak kart 0121'den önceki hâline (yalnız ağ işi, `networkidle`) indirildi. Test 20 kez çalıştı, 9'u kartta yazan hatayla kırmızıya düştü: menü görünüyor, "Giyim" beş saniyede odak almıyor (yük ortalaması 28). Değişiklik geri alındı.
- Bütün tarayıcı testleri iki kez geçti, ikisinde de 155 test: tek işçiyle 8,7 dakika (yük 16), hattaki gibi varsayılan işçi sayısıyla (9) 4,3 dakika (yük 13).
- Sonuç: neden testin sayfa React'a bağlanmadan Enter'a basmasıydı, kart 0121'in beklemesiyle düzeldi. Kod ve test değişmedi. Tam bağlanmış sayfada menü klavyeyle doğru açılıyor. Bağlanma bitmeden basan ziyaretçinin ne yaşadığı ayrıca ölçülmedi; aynı durumun yan penceredeki karşılığı kart 0121'de, karar 0099'dadır.
- Ölçüm sırasında günlükte "Düzendeki bölüm çizilemiyor (gecersiz): telif-satiri" hatası görüldü. Bu kart 0122'nin konusu, testi etkilemiyor.

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
