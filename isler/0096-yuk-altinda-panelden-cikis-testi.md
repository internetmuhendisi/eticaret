# 0096 · Makine yüklüyken panelden çıkış testi düşüyor

## Amaç

`cekirdek/testler/uctan-uca/yonetici-girisi.test.ts` içindeki `cikisYap`, "Çıkış yap" düğmesine bastıktan sonra adresin 5 saniye içinde `/yonetim/giris` olmasını bekliyor. Makine yüklüyken adres `/yonetim` olarak kalıyor ve test düşüyor. Sayfada çıkış hatası uyarısı görünmüyor: istek ya bitmemiş ya da bittikten sonraki yönlenme gecikmiş.

Kart 0074 sırasında ölçüldü (2026-11-07). Hata iki ayrı testte görüldü: "kod denemesi sınırı gerçek uygulamada dolar" ve "kurulumlu yönetici yalnız şifreyle giremez...". Dosya tek başına çalıştırılınca 3 denemede 3 kez geçti. Bütün tarayıcı testleri birlikte çalışınca kart 0074'ün dalı ve ana dalın kodu aynı biçimde düştü. Ana dalın kodu, makinenin yükü 24'e çıktığı çalıştırmada düştü, yük 5-17 arasındayken geçti. 32 çekirdekli makinede başka oturumların kutuları da çalışıyordu. Kontrol hattında görülüp görülmediği bilinmiyor.

## Ölçüm (2026-11-11)

- Testin çıkış adımına geçici bir kayıt konup bütün tarayıcı testleri iki kez çalıştırıldı (yük ortalaması 2–3). Düşen üç denemenin üçünde de çıkış isteği hiç gitmemişti, sayfanın 6–8 öğesi henüz React'a bağlanmamıştı. Geçen denemelerde istek 27–238 ms'de 200 ile döndü.
- Neden: ne çıkış ucu ne sonraki sayfa yüklemesi. Test "Çıkış yap" düğmesine düğme tarayıcıda bağlanmadan basıyordu, bağlanmamış düğme hiçbir şey yapmaz. Kart 0121 ile aynı yarış (karar 0099). Makine yükü yarışı olası kılar ama tek neden değildir: düşük yükte de düştü.
- Çıkışın davranışı değişmedi. Testler çıkıştan önce ve forma yazmadan önce `sayfaHazir` ile bekler (`yonetici-girisi.test.ts`, `sifre-sifirlama.test.ts`).
- Yüklü makinede (24 meşgul süreç, yük ortalaması 25,9–27,7) bütün tarayıcı testleri art arda beş kez çalıştı: panelden çıkış adımı olan testlerin hepsi beş çalışmada da geçti. Aynı çalışmalarda başka iki test düştü (bölüm kütüphanesi taraması süreyi aştı, şifre sıfırlamada iki durum yazısı), ikisi kart 0129'da ele alındı.

## Olmazsa olmazlar

- Önce ölçülür: yavaş kalan çıkış isteği mi, yoksa ondan sonraki sayfa yüklemesi mi (Next.js geliştirme sunucusu sayfayı ilk istekte derler).
- Sebep uygulamadaysa (çıkış ucu yük altında yavaşsa) uygulamada düzeltilir.
- Sebep test ortamıysa bekleme süresi gerekçesiyle ayarlanır ya da testler derlenmiş uygulamaya karşı çalışır. Kontrol zayıflatılmaz: çıkıştan sonra panelin kapandığı yine ölçülür.

## Sınırlar

- Çıkışın davranışı (oturumun kapanması, sayfanın baştan yüklenmesi) değişmez.

## Bitti sayılır

- Bütün tarayıcı testleri makine yüklüyken art arda beş kez bu testte düşmeden geçiyor. Ölçüm, yük değerleriyle birlikte kartın kapanışında yazılı.

## Durum

bitti
