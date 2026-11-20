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

## Durum

yapılacak
