# 0094 · Logo yükleme ekranı ve ucu

## Amaç

Kart 0073 logoyu değiştiren ve kaldıran servisi yazdı (`logoyuDegistir`, `logoyuKaldir`, karar 0059), ama ekran ve yükleme ucu yok. Mağaza sahibi logosunu panelden yükleyebilmeli ve kaldırabilmeli.

Önce 0073 bitmiş olmalı; panel ayar ekranlarının iskeleti geldiyse onun içinde yapılır. Gerçek mağazada kullanılmadan önce dosyaların yedeği (kart 0093) bitmiş olmalı.

Bölüm: Yönetim paneli.

## Olmazsa olmazlar

- Yönetici girişinde yükleme ve kaldırma ucu; izin `magaza-ayarlari.degistir`. Uç belgesi ve erişim testi güncellenir.
- İstek gövdesinin boyutu dosya sınırıyla (`dosyaSinirlari.enCokBayt`) sınırlanır; sınırı aşan istek okunmadan reddedilir. Ön kapının gövde sınırı (1 MB, kart 0022) yükleme adresi için ayrıca ayarlanır.
- Kart 0072'nin koşulları (karar 0058): site kutularına bellek sınırı konur (büyük bir görselin yeniden kodlanması yaklaşık 370 MB ister, kutular sunucuyu paylaşır); `sharp`'ın çekirdek görüntüsünde (Alpine) gerçekten çalıştığı yerel ortam denemesinde, kutunun içinde bir görsel kaydedilerek ölçülür.
- Ekran ortak form bileşenleriyle kurulur, telefonda kullanılabilir, hata kodları (`dosyaHatalari`) metin dosyasından anlaşılır biçimde gösterilir.
- Yükleme ucuna istek sınırı ve robot koruması gerekip gerekmediği karar kaydına yazılır.

## Sınırlar

- Logonun vitrinde ve panelde nereye yerleşeceği tasarım işidir.

## Bitti sayılır

- Tarayıcı testi logoyu yüklüyor, vitrindeki logo ucu yenisini veriyor, kaldırınca ilk logoya dönüyor.
- Sınırı aşan ve izinsiz türdeki dosya ekranda anlaşılır hatayla reddediliyor.
- Kutuların bellek sınırı yerelde ve sunucu denetiminde ölçülüyor; `sharp` görüntüde çalışıyor.

## Notlar

- Kullanıcı kararı (2026-11-22): logo ayrı bir ekranda değil, Tema ekranının "Logo" bölümünde. Kalan tema ayarları kart 0260'ta aynı ekrana eklenir.
- Yükleme gövdesi ham bayttır, sınır iki katmandadır (kapı ve ön kapı), yükleme sınırı `yukleme` (60 saniyede 30), robot koruması yok, kutuların belleği 1 GB: karar 0165.
- Ölçümler: kutunun içinde 40 milyon piksellik logo yüklenince bellek zirvesi 330–332 MB; gerçek Caddy 2.10.2 ile yükleme yolunun 413'ü bir kez elle ölçüldü.
- Yerel ortam denemesinde Örnek Mağaza'nın kuyruğa bağlı beş ölçümü, ortak veritabanındaki birikmiş e-posta işleri yüzünden kırmızıydı. Bu işle ilgisiz, ana dalda ölçülmedi.
- Site adreslerinde genel gövde sınırı kart 0289'da.
- Bağımsız kontrolün bulgularıyla düzeltildi: bellek sınırının sunucu denetimindeki beklenen değeri yayın kaydından okunur (yoksa eski yayınlar denetimi kırmızı yapar, başka sitenin yayınını durdururdu), takas sınırı ölçülür, yerel ortamdaki zirve ölçümü kırmızıya düşebilir hâle geldi, iptalden ve kaldırmadan sonra odak, kaldırma hatasının metni, dosya türlerinin adları kayıttan, logo durumu tek işlevde, yükleme sürerken düğmenin kapalı görünmesi.
- Logo bölümü taslaktaki görsel alanına göre düzenlendi (önizleme, kaynak ve düğmeler tek kutuda, açıklama altında); taslakla karşılaştırma üç genişlikte görüntüyle bir kez yapıldı, testte yok. Taslaktaki "Logo kaldırılınca yerinde mağaza adı yazar" bugünkü davranışla uyuşmuyor: kaldırınca sitenin ilk logosu döner, ilk logo yoksa ad yazar; metin buna göre yazıldı.

## Durum

yapılacak
