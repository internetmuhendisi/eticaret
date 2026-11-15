# 0203 · Yavaş işlemcide yan pencere testi hatta süre sınırını aştı

## Amaç

Kart 0197'nin kapanış gönderiminde (2026-11-15, kayıt 01c76b5, hat çalışması 43690883075) kontrol hattında yalnız bir tarayıcı testi düştü:

- `cekirdek/testler/uctan-uca/katalog.test.ts:478` "yavaş işlemcide yan pencere sayfa hazır olunca açılır, konsolda uyuşmazlık uyarısı yok": `page.waitForLoadState: Test timeout of 60000ms exceeded.`

Test işlemciyi bilerek 4 kat yavaşlatır (kart 0121). Ana dalın bir önceki çalışmasında (d96af76, hat çalışması 43686874100) aynı test geçti. Hat yeniden çalıştırılmadı (her çalışma ücretli, kullanıcı kararı); düşüşün her seferinde mi, yükle mi olduğu bilinmiyor. Sebep ölçülmedi.

Bölüm: Testler.

## Olmazsa olmazlar

- Sebep ölçülerek bulunsun: testin hangi adımda beklediği (sayfanın açılması, menü düğmesi, `sayfaHazir`), hattaki makinenin hızında ve yükünde ne kadar sürdüğü. Tahmin düzeltilmesin.
- Ölçüm önce yerelde, hattın koşuluna yakın yükle yapılsın; hatta ölçüm gerekiyorsa çalıştırmadan önce kullanıcıya sorulsun.
- Testin yakaladığı kural (yavaş işlemcide sayfa bağlanmadan yan pencere açılınca uyuşmazlık uyarısı) zayıflamasın; düzeltme bozmayla gösterilsin.

## Sınırlar

- Süre sınırını yalnız yükseltmek düzeltme sayılmaz; gerekiyorsa ölçümle gerekçelendirilir.
- Yan pencerenin ve sayfa hazır beklemesinin davranışı, ölçüm hata göstermedikçe değişmez (kart 0121, karar 0099).

## Bitti sayılır

- Sebep ölçümle karta yazıldı.
- Düzeltmeden sonra test, hattın yüküne yakın yerel yükte art arda en az beş kez geçti.
- Hat yeşil.

## Durum

yapılacak
