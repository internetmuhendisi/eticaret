# 0152 · Katalog sayfasının iki tarayıcı testi yük altında süre sınırını aştı

## Amaç

Kart 0120'nin kapanış kontrolünde (2026-11-11), `cekirdek/testler/uctan-uca/katalog.test.ts` içindeki iki test 60 saniyelik sınırda kırmızı oldu:

- "ana sayfa her parçayı kendi bölümünde ve sayfasına bağlantıyla gösterir" (satır 93)
- "yavaş işlemcide yan pencere sayfa hazır olunca açılır, konsolda uyuşmazlık uyarısı yok" (satır 277)

İkisinin iletisi aynıydı: `page.waitForLoadState: Test timeout of 60000ms exceeded`. Test, sayfanın ağ işinin bitmesini (`networkidle`) beklerken takıldı. Çalışma dört dosyayla (durum sayfaları, yönetici girişi, kayıt sayfaları, katalog) 4 işçiyle yapıldı: 87 testten 85'i geçti. O sıradaki yük ortalaması ölçümden hemen sonra 5 dakikalık 18,6 idi.

Aynı kodla:
- bir saat önce bütün tarayıcı takımında ikisi de geçti (170 test);
- iki test tek başına üç kez çalıştırıldı, üçünde de geçti (yük ortalaması 5 civarı).

Kart 0120 bu iki testi ve katalog sayfasını değiştirmedi. Sebep bilinmiyor; yükle ilgisi olduğu tahmindir, ölçülmedi. Kontrol hattında ara sıra kırmızı çıkarsa yayın durur, hattın makinesi bilgisayardan yaklaşık iki kat yavaştır (kart 0129).

Bölüm: Vitrin. Kart 0120'de görüldü, ona karıştırılmadı. Kart 0147'den (Örnek Mağaza'nın vitrini canlıya) önce bitmeli. Benzer kartlar: 0149 (ana sayfa başlık testi yük altında, iletisi kaydedilmedi), 0133, 0118, 0088.

## Olmazsa olmazlar

- Önce yeniden üretilir: iki test yük altında (bütün takımla ya da yapay yükle) tekrar tekrar çalıştırılır, kaçta kaç düştüğü ve hangi adımda takıldığı yazılır. Düşen çalışmada `networkidle`'ın neden gelmediği ölçülür (bitmeyen istek, açık kalan bağlantı, geliştirme sunucusunun derlemesi).
- Kart 0149'daki düşüşle ortak bir sebep olup olmadığı ölçülür; ortaksa iki kart birlikte kapanır, değilse ayrı kalır.
- Sebebi ölçülmeden süre sınırı büyütülmez ya da bekleme kaldırılmaz.
- Düzeltme, eski hâliyle yük altında kırmızı ve yeni hâliyle yeşil olduğu gösterilerek kabul edilir.

## Sınırlar

- Katalog sayfasının ve parçaların davranışı değişmez; bu iş yalnız testin kararlılığıdır, gerçek bir ürün hatası çıkarsa ayrı kart.

## Bitti sayılır

- Sebep ölçüldü ve yazıldı.
- İki test yük altında art arda en az beş çalışmada geçiyor.
- 0149 ile ilişki yazıldı.

## Durum

yapılacak
