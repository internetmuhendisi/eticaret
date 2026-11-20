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

## Durum

yapılacak
