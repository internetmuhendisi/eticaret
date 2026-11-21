# 0252 · Panel menüsünden geçişte "sayfa hazır" beklemesi bitmiyor

## Amaç

Kart 0238'in gönderimindeki hat (44663133477) yalnız bir tarayıcı testinde kırmızı bitti: `cekirdek/testler/uctan-uca/siparisler.test.ts` "sipariş ayarları: kargo firması eklenir ve silinir". Test panel menüsünden Enter ile Sipariş ayarları sayfasına geçti, sayfa doğru çizildi (başlık, iki kargo firması), ama `menudenGit` içindeki `sayfaHazir` beklemesi (bütün öğelerin React'a bağlanması, kart 0121) 180 saniyelik test süresi dolana kadar bitmedi; sonraki 3 test çalışmadı. İzde geçiş sırasında "[Fast Refresh] rebuilding" ve "done in 194ms" var. İzin son görüntüsünde gövdede önceki sayfanın başlık öğesi (`<title>Karşılama | Örnek Mağaza paneli</title>`) ve bir `<style>` öğesi kalmış; React'a bağlı olmayan öğenin bunlardan biri olduğu tahmindir, ölçülmedi. Hattın izi `tarayici-testleri-izi` ekinde.

Bölüm: Sipariş ve müşteri hesabı. Kart 0238'in hattına bakılırken bulundu. Kart 0251 ile aynı kökten (testin sürdüğü sırada geliştirme sunucusunun derlemesi) olabilir.

## Olmazsa olmazlar

- Beklemeyi bitirmeyen öğe ölçülür: takıldığında React'a bağlı olmayan öğelerin listesi (etiket, öznitelik, üst öğe) yazılır. Bunun için `sayfaHazir` süre dolunca bağlanmamış öğeleri hata iletisinde söyler; bu kalıcı kalır, sonraki düşüşlerde iz çözmek gerekmez.
- Gövdede kalan eski başlık öğesinin nereden geldiği ölçülür: Next.js'in gövdeye yazdığı sayfa bilgisi mi, React'ın başlık taşıması mı, geçişle aynı anda gelen Fast Refresh mi. Yerelde geçiş sırasında derleme zorlanarak (ya da ısınmasız ilk geçişte) yeniden üretilmeye çalışılır.
- Ölçülen sebebe göre düzeltme. Sebep yalnız geliştirme sunucusuna özgüyse: canlı derlemede (`next start`) aynı geçişte gövdede eski başlık kalmadığı ölçülür, düzeltme testin beklemesinde ya da ısınmada yapılır. Canlıda da kalıyorsa ürün hatasıdır, ayrıca söylenir.
- Bekleme React'ın bağlamadığı öğeyi kör bir istisnayla geçmez: istisna yalnız ölçülen öğe için, nedeniyle yazılır.
- Kart 0251 ile ortak kök çıkarsa ikisi birlikte ele alınır, kullanıcıya söylenir.

## Sınırlar

- Sipariş ayarları ekranı ve kargo firmaları (kart 0234) değişmez.
- Testin 180 saniyelik süresi ya da `sayfaHazir`'in beklemesi sebep ölçülmeden uzatılmaz.

## Bitti sayılır

- Bağlanmamış öğe ve sebebi ölçülerek yazıldı.
- `sayfaHazir` süre dolunca bağlanmamış öğeleri söylüyor; bilerek bağlanmamış öğe konunca ileti onu adıyla gösteriyor.
- Canlı derlemede menüden geçişte gövdede eski başlık kalmadığı (ya da kaldığı ve ne yapıldığı) yazıldı.
- Düzeltmeden sonra hattın koşulunda (temiz veritabanı, iki işlemci) `siparisler.test.ts` art arda beş kez geçiyor.

## Sonuç

- **Bağlanmamış öğe (izden ölçüldü).** Hattın izinin sayfa görüntüleri Playwright'ın kuralıyla çözüldü (aynı çerçevenin önceki görüntülerine başvuru). `/yonetim` tam sayfa yüklendiğinde sunucunun HTML'inde `<title>Karşılama | Örnek Mağaza paneli</title>` başlıkta değil gövdenin sonundaydı: Next.js sayfa bilgisini akışla, geç hazırlanınca gövdeye yazar ("streaming metadata", normal tarayıcı kimliğinde açık). Test `paneleGir`'den hemen sonra, sayfanın bağlanmasını beklemeden menüye bastı: görüntülerde `next-route-announcer` Enter'dan 15 ms önce belirdi (bağlanma sürüyordu). Geçişten sonra yeni başlık başlığa yazıldı, gövdedeki eski `<title>` sonuna kadar kaldı; `sayfaHazir` her öğeyi beklediği için bitmedi. Geçişle aynı anda geliştirme sunucusu derleme yaptı ("[Fast Refresh] rebuilding", 194 ms); dosya değişikliği değil, istek üzerine derleme (kartlar 0207, 0222).
- **Yerelde üretilemedi.** Panele girişten hemen sonra geçişte dört turun üçünde sayfa bağlanmamıştı (13 ve 33 öğe), ama takılma olmadı. 4 kat yavaş işlemci, geçişle aynı anda zorla yeniden derleme, bağlantı bağlı ama sayfanın kalanı bağlanmamışken Enter (9–52 öğe) ve sayfa bilgisine 1,5 ve 6 saniyelik geçici gecikme denendi: geliştirme sunucusunda başlık yerelde hep başlıkta çizildi, gövdede bağlanmamış öğe kalmadı. Başlığın gövdeye düştüğü sıralama hattın yavaş makinesine bağlı; sebebin bu son halkası ölçülemedi.
- **Canlı derleme (`next start`).** `/yonetim`'in başlığı canlıda gövdeye akıyor ve React onu bağlıyor. 4 ve 20 kat yavaş işlemciyle, sayfa yarı bağlıyken (1–14 öğe) menüden geçişte gövdede eski başlık kalmadı, `document.title` her seferinde yeni sayfanınki. Kullanıcıya görünen bir hata bulunmadı.
- **Düzeltme.** `paneleGir` panelin açılış sayfasının bağlanmasını bekler (karar 0099; tetikleyici buydu). Bağlanmamış `<title>` için istisna yazılmadı: gerektiği ölçülmedi. `sayfaHazir` ağ işinden sonra en çok 30 saniye bekler ve dolunca bağlanmamış öğeleri etiket, kimlik, sınıf, üst öğe ve metinle söyler; testi `sayfa-hazir.test.ts` (kimlik iletiden çıkarılınca kırmızı). Hattın koşulunda ağ işinden sonraki bekleme 73 ölçümde en çok 16 ms (ortanca 4 ms).
- **Kart 0251 ile ilişki.** Ortak olan, testin sürdüğü sırada geliştirme sunucusunun istek üzerine derlemesi. Ama 0251'de sebep POST isteğinin derlemeyi beklemesi, burada ise bağlanmamış sayfada geçiş; düzeltmeleri ayrı.
- **Doğrulama.** Hattın koşulunda (temiz veritabanı ayrı kutuda, `taskset -c 0,1`, tek işçi) `siparisler.test.ts` art arda beş kez: 15/15 geçti. `sayfaHazir` bütün tarayıcı testlerinde kullanıldığı için aynı ayrı ortamda bütün takım tek işçiyle bir kez çalıştı: 303/303, 23,6 dakika.

## Durum

bitti
