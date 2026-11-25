# 0251 · Elle sipariş tarayıcı testinde sipariş isteği derlemeyi bekliyor

## Amaç

Kart 0237 ve 0187'nin gönderimindeki hat (44647718107) yalnız bir testte kırmızı bitti: `cekirdek/testler/uctan-uca/elle-siparis.test.ts` "panelden klavyeyle elle sipariş". "Siparişi oluştur"a basınca `POST /kapi/yonetici/elle-siparis` 200 döndü ama 4,4 saniye sürdü. Test ayrıntı sayfasına geçişi 5 saniye bekliyor, süre doldu. Hattın izinde test sürerken "[Fast Refresh] rebuilding" ve "[Fast Refresh] done in 3438ms" var: istek geliştirme sunucusunun derlemesini bekledi. Kart 0222'nin ısınması uçları GET ile istiyor, bu uç POST ile çağrılıyor. Aynı ucun testi kart 0248'in hattında (44627994476) geçmişti; düşüş zamanlamaya bağlıdır.

Bölüm: Sipariş ve müşteri hesabı. Kart 0238 sırasında hattın sonucuna bakılırken bulundu, o karta karıştırılmadı.

## Olmazsa olmazlar

- Derlemenin neden ısınmadan sonra yeniden yapıldığı ölçülür: GET ile istenen POST ucunun derlemesinin POST'ta yeniden yapılıp yapılmadığı, yoksa testin başka bir sayfasının (elle sipariş ekranı) derlemesinin araya girip girmediği. Kart 0226 (hatta sunucunun istek satırları) bu ölçümü kolaylaştırır.
- Ölçülen sebebe göre düzeltme: ısınmanın uçları kendi yöntemiyle istemesi ya da ısınmanın ikinci turuna elle sipariş ekranının girmesi. Düzeltme bütün uçlara uygulanır, yalnız bu teste değil.
- Testin 5 saniyelik beklemesi sebep ölçülmeden uzatılmaz.

## Sınırlar

- Elle siparişin kendisi (kart 0236) değişmez.

## Bitti sayılır

- Sebep ölçülerek yazıldı.
- Düzeltmeden sonra hattın koşulunda (temiz veritabanı, iki işlemci) elle sipariş testi art arda beş kez geçiyor ve izde testin sürdüğü sırada yeniden derleme yok.

## Notlar

- Kart 0293 (2026-11-23, kullanıcı kararıyla buraya bırakıldı): aynı kalıp ödeme testinde de görüldü. Hat 45045593092'de `odeme.test.ts` havale bildiriminde "Bildirimi gönder"den sonra `POST /kapi/herkese-acik/havale-bildirimi` testin 5 saniyelik beklemesi bitene kadar yanıt almadı (izde durum -1: iz yanıttan önce kapandı). Tarayıcı konsolunda iki kez "[Fast Refresh] rebuilding", sayfanın sol altında 5 saniye boyunca "Compiling…" var; uç ısınmada GET ile istenmişti (yalnız POST tanımlı, 405 alır).
- Ölçülmemiş bir ihtimal: Next.js geliştirme sunucusu kullanılmayan girişleri `maxInactiveAge` (varsayılan 60 saniye) dolunca bırakıyor, en çok `pagesBufferLength` (5) tanesini tutuyor (`next/dist/server/config-shared.js`). Turbopack'te de geçerliyse ısınmanın etkisi uzun takımda kaybolur, derleme takımın ortasında yeniden olur. Hattın 2 işçisinde öteki işçinin istediği bir yolun derlemesi de bu isteği bekletebilir. Hattın günlüğü derleme satırı yazmıyor; ayırt etmek için ölçüm gerekir. Kart 0281 ve 0282 aynı aileden olabilir.
- Kart 0271'in hattı (2026-11-24, 45276121046, kayıt 352ec25) yalnız bu kalıpla kırmızı: `odeme-yontemleri.test.ts:442` "banka hesapları". Hatalı IBAN'la Enter'dan sonra `POST /kapi/yonetici/banka-hesabi-ekle` testin 5 saniyelik beklemesi bitene kadar yanıt almadı (izde durum -1), penceredeki Kaydet ve Vazgeç "kayıt sürüyor" diye kapalı kaldı. İstekten yaklaşık 0,2 saniye sonra "[Fast Refresh] rebuilding" ve "done in 432ms", ardından bir "rebuilding" daha var. Birim testleri 3996/3996, tarayıcı 348 geçti, 1 düştü, 5 çalışmadı; aynı test bir önceki gönderimin hattında (45265384335) yeşildi.

- Ara ölçüm (kart 0251, 2026-11-25; yerelde hattın koşulu: iki işlemci, iki işçi, `CI=1`, sunucunun istek satırları geçici `stdout: "pipe"` ile):
  - GET ile ısıtılmış yalnız-POST uca POST yeniden derlenmez (30–64 ms); kartın ilk şüphesi doğrulanmadı. Dosya klasörüne, `test-results`'a ve kök klasöre yazmak derleme turu başlatmaz. İlk kez istenen yol derlenince bütün açık tarayıcılara "[Fast Refresh] rebuilding" gider; Turbopack bu iletiyi 100 ms'den uzun her güncelleme turunda gönderir, iletinin kendisi o yolun derlendiğini göstermez.
  - `maxInactiveAge`/`pagesBufferLength` yalnız webpack'in yolundadır, Turbopack girdileri bırakmaz. Yüksüz makinede ısınmış sayfa 37 sayfadan sonra da hızlı gelir ve aynı anda süren derlemeyi beklemez.
  - Üç yerel tam takımda aynı aileden düşüşler üretildi (menüden Enter'la panel sayfasına geçiş 5 sn'de bitmedi: Ekip üçünde de, Ödeme yöntemleri, yeni blog yazısı, Müşteriler). İzlerde ya sayfanın `_rsc` isteği 2,8 sn derleme bekledi ya da sayfa isteği hızlı dönüp tarayıcı kodu dosyaları (`/_next/static/chunks/…`) 3 sn'den uzun yanıt almadı.
  - Takımın ortasında ısınmış sayfaların Next.js payı 0,5–1,8 sn'ye çıktı (bir takımda 33 istek, ör. `/yonetim/giris` 1,3 sn, `/yonetim/blog/yeni` 1,8 sn).
  - Olay döngüsü ve çöp toplama ölçeriyle (`NODE_OPTIONS=--require`): sunucunun ana sürecinde testler sırasında uzun takılma yok (en uzunu 617 ms; major GC 140–555 ms). Ama geliştirme sunucusu parametreli yola (`[ad]` vb.) her istekte statik yollar için yeni bir Node süreci açıyor (`next-dev-server.js` `getStaticPaths`: "we don't re-use workers"; önbellekte sonuç olsa da yenileme arka planda yapılır): bir takımda 491 süreç, testler sırasında 3–4 sn'de bir; her açılış 1–2 sn işlemci yer. Yavaş isteklerle örtüşmesi ölçülen turda kesin değil (6 yavaş isteğin 3'ü, rastgele anların %45'i).
  - Sıradaki ölçüm: düşen testlerin anlarıyla işçi açılışlarının karşılaştırılması; işçiyi kapatan bir yolla (parametreli sayfalarda statik yol hesabını önlemek) tam takımın yeniden ölçülmesi. Turbopack'in kalıcı önbelleği (`.next/dev/cache/turbopack`, 3,2 GB) ikinci aday, ölçülmedi.
- İkinci ara ölçüm (kart 0251, 2026-11-25; aynı koşul):
  - Statik yol işçisi elendi: geliştirme sunucusunun dosyası geçici olarak değiştirilip önbellekte sonucu olan yolda işçi açılmadı (takımda 491 yerine 13 işçi); Ekip, davet ve Müşteriler testleri yine düştü.
  - Yerel ortak veritabanındaki düşüşler hattaki düşüşle aynı aile değil: veritabanında testlerden birikmiş 6035 silinmemiş yönetici ve 2105 müşteri var. Ekip sayfası hepsini listeler, sayfanın sunucu cevabı her menü geçişinde 3,2–3,6 sn sürer (ikinci geçişte de; derleme beklemesi değil). İlk ara ölçümdeki "aile yerelde üretiliyor" sonucu bu yüzden yanlıştı.
  - Menüden geçiş ile adresle açılış aynı tarayıcı kodu dosyalarını ister (geçici ölçüm testiyle dört panel sayfasında); ısınmanın atladığı dosya yok.
  - Hattın koşulunda (ayrı kutuda temiz veritabanı, iki işlemci, iki işçi, `CI=1`) iki tam takım: dolu derleme önbelleğiyle 360 geçti, 1 düştü (yorum onayının `document-title` taraması, kart 0287); boş derleme önbelleğiyle 366/366 geçti. Sunucunun istek satırlarında yavaş istekler (2,8–5,9 sn) yalnız ısınma sırasında; testler sürerken en yavaş istek 1,9 sn, 1,5 sn'yi aşan POST yok.
  - Sonuç: düşüş yerelde hattın koşuluyla üretilemiyor; sebebi yerelde ölçülemez. Ayırt etmek için hattaki sunucunun istek ve derleme satırları gerekir (kart 0226).
- Kart 0226 (2026-11-25, karar 0181) kuruldu: kırmızı hattın sonucunda `sunucu/olusan/tarayici-sunucu-gunlugu.log` var, her istek satırı `next.js` (derleme) ve `application-code` paylarıyla. Kullanıcı kararı: kart bir sonraki kırmızı hattın satırlarıyla sürer.
- Kartlar 0282 ve 0281 aynı aileden (hat izleriyle, 2026-11-25): 0282'de `GET /kapi/yonetici/elle-siparis-urunleri?ara=…`, 0281'de `GET /arama?ara=…` 5 sn cevapsız kaldı, ikisinde de istekten 0,2–0,3 sn sonra tarayıcıda "[Fast Refresh] rebuilding" başladı. 0281'de takımın ilk testinde ana sayfa da ısınmadan hemen sonra 5,1 sn sürdü. Sebep bulununca üçü birlikte kapanır.
- İlk sunucu günlüklü hat (45567962785, kayıt 549ebb2, 2026-11-25): bu aileden düşüş olmadı (düşen tek test kart 0307). Testler sırasında 4089 isteğin 67'sinde `next.js` payı 300 ms'yi, 5'inde 1 sn'yi aştı; büyükleri geliştirme sayfaları (`/gelistirme/bilesenler` 7,1 sn, `…/tablo` 3,2 sn, `/gelistirme/hata-denemesi` 2,7 sn), ötekiler ısınmış vitrin ve panel sayfaları (400–700 ms). Uçlar (`/kapi/…`) derlenmedi (kart 0226'nın notu). Isınmanın sonunda "Finished writing to filesystem cache in 36.7s": Turbopack kalıcı önbelleği testlerin ilk yarım dakikasında diske yazılıyor. Bir sonraki düşüşte istekle aynı anda derlenen yol günlükten okunacak.
- Elenen bir tahmin: ısınmanın girişsiz isteği 401 ile erken döner, ucun içinde sonradan yüklenen modül (`import()`) ilk gerçek istekte derlenir. Sonradan yükleme yalnız e-posta görünüşünde (tema servisi), e-posta göndericisinde, dosya servisinde (sharp) ve açılışta var; ürün araması ve arama sayfası bunlara uğramaz. Kart 0226'nın yerel denemesinde aynı ürün araması ilk gerçek istekte `next.js: 1.1ms` ile döndü.

## Sonuç (2026-11-25, karar 0184)

**Sebep (hat 45665957128, sunucu günlüklü ilk kırmızı hat).** Düşen test `arama.test.ts:119` (kart 0281'in dosyası). Isınmış `/arama` takımın başında beş kez 0,5–2,2 saniyede açıldı, 17:56:04'teki istek 11,7 saniye sürdü: `next.js` payı 11,2 saniye, `application-code` 0,5 saniye; tarayıcıda o anda "[Fast Refresh] rebuilding". Bütün takımda `next.js` payı 1,5 saniyeyi aşan istekler (ısınmadan sonra `/` 9,1 sn, `/gelistirme/bilesenler` 9,7 sn, `/arama` 11,2 sn; sonradan ilk kez istenen hata denemesi dışında) aynı dakikaya toplandı (17:55:18–17:56:16): Turbopack'in ısınmadan sonra önbelleği diske yazdığı dakika ("Finished writing to filesystem cache in 44s", 17:56:02). Test aynı sayfayı altı hâlde açtığı için takılmasız da yaklaşık 46 saniye sürüyordu; 13 saniyelik bekleme 60 saniyelik sınırı aştırdı. Geliştirme sunucusu ısınmış yolu da yeniden derleyebiliyor; kart 0251 ve 0282'nin takımın ortasındaki düşüşleri aynı kalıpta, o anların satırları yok.

**Düzeltme.** Tarayıcı testleri canlıdaki gibi derlenmiş çekirdekte çalışır (`komutlar/tarayici-sunucusu.mts`: `next build`, deneme ortamında `next start`); canlı sunucu çalışırken derlemez. Isınma asıl aşamadan kalktı. Yalnız geliştirme sunucusunda görünenler ikinci aşamada (`pnpm tarayici-testleri-gelistirme`, `playwright.gelistirme.config.ts`): yolların ısınması, her sayfayı açıp React'ın geliştirme uyarılarını arayan geliştirme taraması (`gelistirme-taramasi.test.ts`, eski tarayıcı turunun yerine) ve etiketli testler (`gelistirme-etiketleri.ts`: hidrasyon uyarısını ölçen üç test iki aşamada, hata denemesinin iki testi yalnız bu aşamada). Kartın "beklemeyi uzatma" kuralına uyuldu: hiçbir bekleme değişmedi.

**Ölçüm (yerelde hattın koşulu: temiz veritabanı ayrı kutuda, iki işlemci, iki işçi, `CI=1`).**
- Çekirdeğin bütün sayfaları istekte çizilir (`ƒ`); önceden sabitlenen tek sayfa Next.js'in genel hata sayfası. Hatta derleme yarım dakika (hız ölçümünün günlüğü).
- Asıl aşama 369/369, 20,7 dakika (geliştirme sunucusuyla hatta 31–43 dakika). Geliştirme aşaması 6/6, ilk taramayla 2,9 dakika.
- Elle sipariş ve arama testleri `--repeat-each=5` ile 25/25. Canlı sunucuda derleme olmadığı için izde yeniden derleme yoktur.
- Arama taraması testi canlı sunucuda 19,9 saniye.

**Bilerek bozma.** Ana sayfaya anahtarsız liste konunca geliştirme taraması "Each child in a list should have a unique key" ile kırmızı; hata denemesi testinin etiketi kaldırılınca asıl aşamada kırmızı (sayfa canlıda 404); ısınma asıl aşamaya geri konunca `isinma.test.ts` kırmızı. Taramanın ilk hâli bulunamadı sayfalarının kendi 404 iletisini ayıklayamıyordu (ileti belgenin durumu bilinmeden geliyor), ayıklama sayfa açıldıktan sonraya alındı.

**Bağımsız kontrolün bulgularıyla.**
- Tarama değişken parçalı sayfaları örnek değerle (404) ve panelin ayrıntı ekranlarını kayıtsız açıyordu. Artık vitrinin on sayfa türü katalogdaki kayıtla, bileşen kataloğunun her parçası kendi sayfasıyla, panelin yedi ayrıntı ekranı veritabanındaki ilk kayıtla açılıyor. Ürün sayfasına ve panelin ürün ekranına konan anahtarsız liste ikisinde de yakalandı (eski taramada ikisi de 404 ya da boştu).
- Asıl aşamanın süzgeci korunmayan bir dosyadan geliyordu. Süzgeç artık iki ayarda düz yazılı, etiket adlarıyla aynılığını `isinma.test.ts` denetliyor. Süzgeç değiştirilince bu test kırmızıya düştü.
- Tarama 3000 portunda kalan bir canlı sunucuda boş yere yeşil kalabilirdi. Artık geliştirme göstergesini (`nextjs-portal`) arıyor: canlı sunucu açıkken çalıştırılınca kırmızıya düştü.
- 404 ayıklaması yalnız belgenin kendi iletisini ayıklıyor.
- Konsol bütün tarama boyunca dinleniyor (dinleyiciler sayfa bağlanınca kaldırılıyordu).
- Belgelerdeki bayat satırlar düzeldi; StrictMode kaybı karar kaydına yazıldı.
- Yeni taramayla geliştirme aşaması 6/6, 3,7 dakika (hattın koşulunda).

**Bilinen sınır.** Asıl aşamadaki etkileşimlerde (pencere, form) çıkan React geliştirme uyarısı ve StrictMode'un çift çizimi yakalanmaz; yalnız disiplindir. Canlı derleme hidrasyon hatasının kendisini numarasıyla yazar, `konsoluDinle` onu sayar. Asıl aşamanın sunucu günlüğünde istek satırı yoktur (canlı sunucu yazmaz). Isınmanın ikinci turu ve ağ değişikliğinde yeniden deneme kalktı.

## Durum

bitti
