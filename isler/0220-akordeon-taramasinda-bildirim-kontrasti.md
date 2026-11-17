# 0220 · Bileşen sahnesinin akordeon taramasında bildirimin kontrastı

## Amaç

Kart 0213'ün gönderimindeki kontrol hattı (çalışma 44037770257) yalnız bir tarayıcı testinde kırmızı bitti: `cekirdek/testler/uctan-uca/bilesenler.test.ts:56`, "katalog açık temada, tablet genişliğinde taramadan geçer". Testin "açık akordeon" taraması `color-contrast` ihlali verdi. İhlalin öğesi `div[data-title=""]`, yani bir önceki adımda ("bildirim") açılan sonner bildiriminin başlığıdır. Akordeonun kendisi ihlalde yoktur. Aynı test bir önceki hatta (çalışma 44023789687, kart 0065) yeşildi. Kart 0213 bu dosyalara dokunmadı. Ara sıra olan bir düşüşe benziyor.

Tahmin, ölçülmedi: bildirim, akordeona basılınca bir geçişe giriyor (kapanma, yığılma ya da yer değiştirme). Geçiş ortasında yazı yarı saydam olduğu için kontrast düşük ölçülüyor. Taramanın beklemesi (`tara`, `document.getAnimations()`) yalnız o anda süren animasyonları bekliyor. Geçiş beklemeden sonra bir karede başlıyorsa yakalanmıyor olabilir. Katalogdaki filtre şeridinde de benzer bir durum görülmüştü (kart 0136'nın kapanış notu).

## Olmazsa olmazlar

- Önce sebep ölçülür. Hattın izi (`tarayici-testleri-izi`) indirilip düşen anın görüntüsü ve DOM'u incelenir. Bildirimin o anki saydamlığı ve durumu (`data-removed`, `data-expanded`, `data-mounted`) yazılır. Sebep iddiası ölçümle doğrulanmadan düzeltme yazılmaz.
- Düşüş yerelde yeniden üretilmeye çalışılır: hattın koşulu, yavaşlatılmış işlemci, art arda çalışma. Kaç denemede kaç düşüş olduğu yazılır.
- Sebep testteyse düzeltme ortak beklemede yapılır, testin kendi kopyasında yapılmaz (kart 0205 ile çakışırsa onunla birlikte düşünülür). Sebep parçadaysa (`bilesenler/parcalar/bildirim.tsx`) düzeltme parçada yapılır.
- Bildirimin gerçek kullanıcıda okunmaz göründüğü bir an varsa (geçiş değil, son hâl), bu bir arayüz hatasıdır ve parçada düzeltilir.

## Sınırlar

- Bildirimin süresi, metni ve yeri değişmez.
- Üst üste binen bildirimlerin kapat düğmesi kart 0217'nin işidir, bu karta karışmaz.
- Taramadan bildirim alanı çıkarılmaz. Bildirim açıkken tarama yine geçmelidir.

## Bitti sayılır

- Düşüşün sebebi ölçümle yazıldı.
- Düzeltmeden önce yerelde düşüşün üretildiği koşulda düzeltmeyle art arda en az on çalışmada test yeşil. Düşüş üretilemediyse bu açıkça yazıldı.
- Düzeltme bilerek geri alınınca, düşüşün üretildiği koşulda test kırmızıya düşüyor. Ya da bunun neden denenemediği yazıldı.
- Kontrol hattı yeşil.

## Durum

yapılacak
