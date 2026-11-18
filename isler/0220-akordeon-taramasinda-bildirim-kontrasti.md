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

## Ölçüm ve düzeltme (2026-11-18)

**Sebep: önceki adımın bildirimi, akordeonun taraması sürerken kendiliğinden kapanıyor.** Kapanma geçişindeki yarı saydam yazının kontrastı düşük ölçülüyor.

- **Hattın iki izi.** İki düşüş var: 44230524141'de masaüstünde, 44037770257'de tablette. İkisinde de bildirim akordeondan yaklaşık 4 saniye önce açıldı (248,94 ve 174,43 sn). Akordeonun taraması başladığında bildirimde `data-removed="true"` vardı (252,95 ve 178,48 sn). Bildirimin süresi sonner'ın varsayılanı, 4 saniye. Hatta "ipucu" ve "bildirim" taramaları yaklaşık 3,7 saniye sürdüğü için süre akordeon adımında doluyor.
- **Bekleme neden görmüyor?** Taramanın beklemesi o anda süren animasyonları bekliyor. Kapanma geçişi bekleme bittikten sonra, axe çalışırken başlıyor.
- **Yerelde mekanizma (geçici test, kayda girmedi).** Bildirim kapanmaya başladığı anda yapılan tarama:
  - beklemesiz: 3'te 2 kırmızı, aynı ihlal (`color-contrast: div[data-title=""]`);
  - taramanın beklemesiyle: 3'te 0 kırmızı.
- **Yerelde neden kendiliğinden üretilmiyordu?** Sonner, fare bildirim alanının üstündeyken süreyi durduruyor. Yerelde akordeona tıklamadan sonra bildirim 10 saniyede de kapanmadı. Fare kenara çekilince 4,0 saniyede kapandı (opaklık 0,97 → 0,5 sn içinde kalktı).
- **Düşüşün üretildiği koşul.** Testin adımları kullanıldı; fare kenarda, akordeon klavyeyle açıldı. Akordeonun bildirimin hangi anında açılacağı 3,60–4,00 sn arasında 50 ms adımlarla tarandı. Yalnız 3,75 sn'de 3/3 düştü, 3,80'de 1/3, öteki anlarda 0. 3,75 sn'de on çalışma: düzeltmesiz 10/10 kırmızı (aynı ihlal), düzeltmeyle 10/10 yeşil.

**Düzeltme: taramadan önce bildirimin süresi durdurulur** (`cekirdek/testler/uctan-uca/bildirim-suresi.ts`, `bildirimSuresiniDurdur`). Sonner fare bildirimin üstündeyken süreyi durdurur. Bu yüzden tarama başlamadan, sayfada kapanmamış bir bildirim varsa fare onun üstüne getirilir.
- Bildirim taramada kalır, süresi, metni ve yeri değişmez (Sınırlar). Açılmış çizilir; gerçek kullanıcının fare üstündeyken gördüğü hâl budur.
- Bildirim zaten kapanmaya başladıysa geçiş fareden önce başlamıştır; taramanın animasyon beklemesi onu bekler.

**Neden ortak bir yardımcıda?** Sorun beklemenin eksikliği değil, tarama sürerken dolan süredir. Bunu taramanın kendisi önler: bildirimi açan adım değil, her tarama.
- Kart 0205'in ortak taraması henüz yok; her dosyanın kendi `tara` kopyası var. Yardımcı tek dosyadadır ve bildirimden kısa süre sonra tarayan iki dosyanın taramasının başında çağrılır:
  - bileşen sahnesi;
  - ödeme yöntemleri: banka hesabı "eklendi" bildiriminden sonra silme onayının taraması (bağımsız kontrolün bulgusu).
- Kart 0205 ortak taramayı kurunca yardımcı oraya taşınır.

**İlk düzeltme denemesi bırakıldı.** İlk deneme, "bildirim" adımından sonra bildirimi kapat düğmesiyle kapatıyordu. Bağımsız kontrol iki sorun buldu:
- "Bildirim" taramasının kendisini korumuyordu.
- Süre tıklamadan önce dolarsa kapat düğmesi kalkıp başka bir ara sıra düşüş doğuruyordu.

**Sonuçlar (geçici ölçüm testi, aynı koşullar).** Akordeon bildirimin 3,60–3,90. saniyelerinde, 25 ms adımlarla, her adımda üç kez açıldı:
- yardımcısız: 39 çalışmanın 13'ünde aynı ihlalle kırmızı;
- yardımcıyla: 39/39 yeşil.

3,75. saniyede ayrıca on çalışma: yardımcıyla 10/10 yeşil. Yardımcısız aynı noktada önceki ölçümde 10/10 kırmızıydı, ikincisinde 0/10. Pencere birkaç on milisaniyedir ve makinenin hızına göre kayıyor; bu yüzden asıl karşılaştırma tarama aralığıyla yapıldı.

**Gerçek testler.** Bileşen sahnesi üç kez 24/24. Ödeme yöntemleri iki kez 5/5.

**Bildirim parçası değişmedi.** Gerçek kullanıcı yalnız kapanma geçişinin bir anını görür; son hâl doğru.

**Kart 0217.** Sepet testinde bildirim alanı bugün taramanın dışında. Kart 0217 bu dışarıda bırakmayı kaldırınca sepetin taraması da bu yardımcıyı çağırmalıdır.

**Kalan madde.** "Kontrol hattı yeşil" maddesi gönderimde görülecek.

## Durum

bitti
