# 0096 · Makine yüklüyken panelden çıkış testi düşüyor

## Amaç

`cekirdek/testler/uctan-uca/yonetici-girisi.test.ts` içindeki `cikisYap`, "Çıkış yap" düğmesine bastıktan sonra adresin 5 saniye içinde `/yonetim/giris` olmasını bekliyor. Makine yüklüyken adres `/yonetim` olarak kalıyor ve test düşüyor. Sayfada çıkış hatası uyarısı görünmüyor: istek ya bitmemiş ya da bittikten sonraki yönlenme gecikmiş.

Kart 0074 sırasında ölçüldü (2026-11-07). Hata iki ayrı testte görüldü: "kod denemesi sınırı gerçek uygulamada dolar" ve "kurulumlu yönetici yalnız şifreyle giremez...". Dosya tek başına çalıştırılınca 3 denemede 3 kez geçti. Bütün tarayıcı testleri birlikte çalışınca kart 0074'ün dalı ve ana dalın kodu aynı biçimde düştü. Ana dalın kodu, makinenin yükü 24'e çıktığı çalıştırmada düştü, yük 5-17 arasındayken geçti. 32 çekirdekli makinede başka oturumların kutuları da çalışıyordu. Kontrol hattında görülüp görülmediği bilinmiyor.

## Olmazsa olmazlar

- Önce ölçülür: yavaş kalan çıkış isteği mi, yoksa ondan sonraki sayfa yüklemesi mi (Next.js geliştirme sunucusu sayfayı ilk istekte derler).
- Sebep uygulamadaysa (çıkış ucu yük altında yavaşsa) uygulamada düzeltilir.
- Sebep test ortamıysa bekleme süresi gerekçesiyle ayarlanır ya da testler derlenmiş uygulamaya karşı çalışır. Kontrol zayıflatılmaz: çıkıştan sonra panelin kapandığı yine ölçülür.

## Sınırlar

- Çıkışın davranışı (oturumun kapanması, sayfanın baştan yüklenmesi) değişmez.

## Bitti sayılır

- Bütün tarayıcı testleri makine yüklüyken art arda beş kez bu testte düşmeden geçiyor. Ölçüm, yük değerleriyle birlikte kartın kapanışında yazılı.

## Durum

yapılacak
