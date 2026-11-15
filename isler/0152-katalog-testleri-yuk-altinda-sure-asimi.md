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

## Ölçüm (2026-11-16)

Sonuç: sebep kart 0203'te bulunan Playwright yarışıdır. Kart 0203'ün yaması (karar 0130) bu kartın düşüşünü de kapatır. Kodda ve testte değişiklik gerekmedi.

- **Ortam.** Çalışma kopyası ve ayrı kutuda temiz veritabanı kullanıldı. Bilgisayar 32 işlemcili. Yük, testlerle birlikte çalışan 20 ya da 28 boş döngüyle verildi. Turun başındaki yük ortalaması 18–36 arasındaydı. Playwright'ın ağ sinyali işlevlerine yalnız bu kopyada zaman damgalı kayıt eklendi. Ölçüm yamasız ve yamalı Playwright'la ayrı ayrı yapıldı.
- **Kartın koşulu, yamasız.** Dört dosya (durum sayfaları, yönetici girişi, kayıt sayfaları, katalog), dört işçi, beş tur (104 test). Beş turun biri düştü. Düşen test "yavaş işlemcide yan pencere" testiydi. İleti kartta yazanla aynıydı: `page.waitForLoadState: Test timeout of 60000ms exceeded`. Test, sayfa açılışındaki `sayfaHazir`'ın ilk adımında takıldı.
- **İki test tekrarla, yamasız.** Yalnız iki test, her biri tur başına on kez (`--repeat-each=10`), dört işçi, üç tur. 60 denemenin 16'sı düştü (5, 4, 7). Hepsi yan pencere testiydi, hepsi aynı iletiyle.
- **Takılmanın sırası.** Kayıtta 17 takılma var (1 + 16), düşen testlerle bire bir aynı sayı. 17'sinin 17'sinde de sıra kart 0203'tekiyle aynı:
  1. "Ağ durdu" sinyali verildi.
  2. Geliştirme sunucusunun `hmr-client` isteği başlayıp bitti. Zamanlayıcı kurulamadı, çünkü sinyal zaten verilmişti.
  3. Geç gelen `domcontentloaded` sinyali sildi.

  Bundan sonra kayıtta olay yok. Bitmeyen istek, açık kalan bağlantı ya da derleme beklemesi görülmedi.
- **Yamalı.**
  - Kartın koşulunda beş tur, beşi de 104/104 geçti.
  - İki testin tekrarında üç tur, 60/60 geçti.
  - Bu turlarda tehlikeli sıra (sinyal varken kurulan zamanlayıcı, ardından silinme) üç kez yaşandı. Üçünde de sinyal yeniden verildi, yani yamalı satır bu testlerde gerçekten çalıştı.
- **"Ana sayfa her parçayı…" testi.** Yamasız 35 denemede bir kez bile düşmedi (beş tam turda 5, tekrarlarda 30). Bu test de aynı `sayfaHazir` beklemesini kullanır, yani aynı yarışa açıktır. Kartın günündeki düşüşünün iletisi aynıydı, ama düşüşün kendisi bu ölçümde yeniden üretilemedi.
- **Kart 0149 ile ilişkisi.** Ortak sebep yok. 0149'un testi (`bos-sayfalar.test.ts`) `networkidle` beklemez; `goto`'nun varsayılan `load` beklemesi bu yarıştan etkilenmez. Kartta yazan düşüş de 8,9 saniyede oldu, 60 saniyelik takılmaya benzemiyor. Test yamalı Playwright'la on işçi ve yük ortalaması 19–41'de üç turda 270/270 geçti, ileti yakalanamadı. 0149 ayrı kalır.

## Durum

yapılacak
