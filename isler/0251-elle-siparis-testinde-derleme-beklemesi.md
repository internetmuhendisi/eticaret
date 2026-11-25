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

## Durum

yapılacak
