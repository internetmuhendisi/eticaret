# 0222 · Ödeme testinde ilk sipariş isteği 5 saniyede dönmüyor

## Amaç

Kart 0214'ün gönderimindeki kontrol hattı (çalışma 44079499012) yalnız bir tarayıcı testinde kırmızı bitti: `cekirdek/testler/uctan-uca/odeme.test.ts:262`, "üye olmayan müşteri formu klavyeyle doldurur, kapıda nakit seçer; sipariş oluşur, sepet boşalır". Tarayıcı testlerinin sonucu 276 geçti, 1 düştü, 3 çalışmadı. Hız ölçümü, görüntü ve yerel ortam adımları çalışmadı.

Hattın izinde (`tarayici-testleri-izi`) "Siparişi onayla"dan sonra `POST /kapi/herkese-acik/odeme` isteği testin sonuna kadar, yaklaşık 7 saniye, dönmedi. Sayfa "Siparişiniz onaylanıyor" durumunda kaldı. `basariBekle` içindeki `toHaveURL` 5 saniyelik beklemede düştü. Hata cevabı ya da yanlış sonuç yok. Bu, o çalışmada ödeme ucunu çağıran ilk testti. Aynı dosyanın sonraki sipariş testleri (havale dahil) geçti. Yerel son doğrulamada (hat koşulu, temiz veritabanı) test geçmişti.

Tahmin, ölçülmedi: geliştirme sunucusu ucu ilk istekte derliyor ve hattın makinesinde bu 5 saniyeyi aşıyor. Testlerden önceki hazırlık (`cekirdek/testler/uctan-uca/hazirlik.ts`) ödeme ucunu önceden açmıyor. Ödeme işleminin bir kilitte beklemesi (stok satırı, sipariş numarası) de olasıdır.

## Olmazsa olmazlar

- Önce sebep ölçülür. Hattın izinden ve sunucu günlüğünden isteğin nerede beklediği bulunur: derleme mi, veritabanı kilidi mi, başka bir şey mi. Sebep iddiası ölçümle doğrulanmadan düzeltme yazılmaz.
- Düşüş yerelde yeniden üretilmeye çalışılır: hattın koşulu, temiz veritabanı, sunucu baştan açılarak, ödeme dosyası tek başına ve bütün takımla. Kaç denemede kaç düşüş olduğu yazılır.
- Sebep ilk derlemeyse düzeltme ortak hazırlıkta yapılır, tek testin beklemesi uzatılarak yapılmaz. Aynı sorunun ilk kez çağrılan öteki uçlarda da olup olmadığına bakılır.
- Sebep kilit ya da yavaş sorguysa bu bir ürün hatasıdır. Düzeltme ödeme ve sipariş servisinde yapılır, gerçek müşterinin bekleme süresi ölçülür.

## Sınırlar

- Ödeme ve sipariş akışının davranışı, metinleri ve ekranı değişmez (sebep ürün hatası çıkmadıkça).
- Tarayıcı testlerinin genel süre sınırları ve eylem sınırı kart 0198'in işidir, bu karta karışmaz.
- Testlere yeniden deneme eklenmez.

## Bitti sayılır

- Düşüşün sebebi ölçümle yazıldı.
- Düzeltmeyle, düşüşün üretildiği koşulda art arda en az on çalışmada test yeşil. Düşüş üretilemediyse bu açıkça yazıldı.
- Düzeltme bilerek geri alınınca, düşüşün üretildiği koşulda test kırmızıya düşüyor. Ya da bunun neden denenemediği yazıldı.
- Kontrol hattı yeşil.

## Ölçüm (2026-11-18)

**Sebep: geliştirme sunucusunun yeniden derlemesi.** İstek ne veritabanında ne kilitte bekledi.

- **Hattın izi (44079499012).** "Siparişi onayla"ya basıldıktan 0,45 saniye sonra, POST sunucuya varınca tarayıcının konsolunda `[Fast Refresh] rebuilding` yazıyor. Testin sonuna kadar `done` gelmiyor, POST de dönmüyor. Hattın günlüğünde o dakikada sunucunun hata satırı yok.
- **Kart 0207'nin düşüşü aynı sebepten.** Hattın izi (43893063883): Enter'dan 0,41 saniye sonra `[Fast Refresh] rebuilding` geliyor, 4,6 saniye sonra `done in 4567ms`. Stok bildirimi POST'unun bekleme süresi 4,9 saniye; derleme bitince 200 ile dönüyor.
- **Neden POST derlemeyi başlatıyor?** Hat tek işçiyle, sırayla çalışıyor ("Running 280 tests using 1 worker"); aynı anda başka test yok. Her kapı ucu kendi yol dosyası (`app/kapi/.../route.ts`). Geliştirme sunucusu bir yolu ilk istendiğinde derliyor.
- **Yerelde hattın koşulu.** Temiz veritabanı ayrı kutuda, iki işlemci, tek işçi, boş önbellek.
  - Isınmasız bütün takım: 283/283, 35,3 dk. Takımın ortasında ilk kez istenen uçların derleme payı (Next.js'in istek satırındaki `next.js:` süresi) 15–56 ms. Ödeme ucu 56 ms, stok bildirimi ucu 42 ms.
  - Hatta neden 4,5 saniyeyi aştığı ölçülemedi: hattın günlüğü sunucunun istek satırlarını yazmıyor (kart 0226). Hattın makinesi dört işlemcili ve yavaş; takımın sonuna doğru büyüyen derleme belleği olası, ölçülmedi.
- **Düşüş yerelde üretilemedi.** Isınmasız iki dosya ve bütün takım geçti.

**Düzeltme.** Tarayıcı testlerinin hazırlığı (`hazirlik.ts`) testlerden önce uygulamanın her yolunu bir kez istiyor (`isinma.ts`, 102 yol). Playwright sunucuyu hazırlıktan önce açıyor (`createGlobalSetupTasks`: önce eklentiler, sonra hazırlık). Turbopack derlenmiş yolu süre dolunca bırakmıyor (bağımsız kontrol kaynaktan okudu).

- Isınmalı bütün takım aynı koşulda: 283/283, 25,7 dk; ısınma 29 sn sürdü. Testler sırasında POST'ların framework payı en çok 7 ms. Derlenen yollar yalnız girişsiz istekte girişe yönlenen panel, giriş kodu ve kurulum sayfaları.
- İki dosya (ödeme ve stok bildirimi) aynı koşulda, her seferinde önbellek boşaltılıp sunucu baştan açılarak on kez art arda: 10/10, her seferinde 12/12. İki ucun framework payı 0,4–4 ms.
- Düzeltmeyi geri alıp kırmızıyı görmek denenemedi, çünkü düşüş yerelde üretilemiyor. Geri alınınca uçların testler sırasında yeniden derlendiği ölçüldü (yukarıdaki 42–56 ms).

**Bağımsız kontrol.** Ciddi hata bulmadı. Bulgularıyla şunlar düzeldi:
- Isınmayan yolların listesine giriş kodu ve kurulum sayfaları eklendi.
- Isınmanın istemci adresi, testlerin hiç kullanmadığı bir bloğa taşındı.
- Hazırlığın 120 saniyede düşmesi yazıldı.
- Isınmanın çalıştırılması yalnız disiplin olarak işaretlendi.
- Sunucu günlüğünün hatta görünmesi kart 0226'ya yazıldı.

**Kalan madde.** "Kontrol hattı yeşil" maddesi bir sonraki gönderimde görülecek.

## Hattan sonra (2026-11-18)

- **Hat 44220561276.** Birim testleri 3440/3440, tarayıcı testleri 286/286 geçti; ödeme ve stok bildirimi testleri yeşil. Hız ölçümü hiçbir sayfayı ölçmeden düştü.
- **Sebep: ısınmanın yeri.** Isınma `hazirlik.ts`'ye konmuştu; hız ölçümü de bu hazırlığı kullanıyor. Orada sunucu kendinden imzalı sertifikalı vekilin arkasında, Node'un `fetch`'i sertifikayı reddedince hazırlık düştü ("self-signed certificate"). Göndermeden önce hız ölçümü yerelde çalıştırılmamıştı.
- **Düzeltme.** Isınma tarayıcı testlerinin ikinci hazırlığı oldu (`isinma.ts`'nin varsayılan işlevi, `playwright.config.ts`); hız ölçümünün ayarı değişmedi. Birim testi ikisinin yerini denetler; eski hâlle kırmızı.
- **Yerel doğrulama (temiz veritabanı, iki işlemci).** Hız ölçümü 13/13. Ödeme ve stok bildirimi 12/12. Isınma ilk testten önce 98 istekle yapıldı; testlerde POST'ların derleme payı en çok 2 ms.

## Durum

bitti
