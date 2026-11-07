# 0073 · Mağaza logosu

## Amaç

Mağazanın logosu tek yerden gelir; vitrin, panel ve e-postalar aynı logoyu kullanır (temel paket: Mağaza ayarları).

Önce 0069 ve 0072 bitmiş olmalı.

## Olmazsa olmazlar

- İlk logo site klasörünün `marka/` klasöründedir. Mağaza sahibi değiştirirse yenisi dosya deposunda ve veritabanında durur.
- Logo yoksa mağaza adı yazı olarak görünür.
- Bugünkü `logoAdresi` ayarı (e-posta) bu düzene bağlanır. Ayarın sahibi değişirse `planlar/site-ayarlari.md` güncellenir.
- Logonun değişmesi değişiklik kaydına yazılır.
- Logo dosya deposundan (kart 0072, karar 0058) tarayıcıya bir adresle verilir: adres yalnız silinmemiş dosyayı ve kaydındaki türü verir, doğru `Content-Type` ve `X-Content-Type-Options: nosniff` başlığıyla. Yükleme ucu gelirse istek boyutu dosya sınırıyla sınırlanır.
- Uygulama dosya servisini ilk kez bu kartta kullanır: `sharp`'ın çekirdek görüntüsünde (Alpine) çalıştığı yerel ortam denemesinde ölçülür.
- Yükleme ucu açılmadan önce site kutularına bellek sınırı konur: büyük bir görselin yeniden kodlanması yaklaşık 370 MB ister, kutular sunucuyu paylaşır (kart 0072'nin bağımsız kontrolü).

## Sınırlar

- Logo yükleme ekranı yazılmaz.
- Vitrin ve panelin logoyu nerede gösterdiği tasarım işidir.

## Bitti sayılır

- Logo yokken ad, ilk logoyla `marka/`, değiştirilmiş logoyla depodaki dosya geliyor (test).
- E-posta logoyu aynı yerden alıyor.

## Durum

yapılacak
