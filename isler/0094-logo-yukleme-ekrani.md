# 0094 · Logo yükleme ekranı ve ucu

## Amaç

Kart 0073 logoyu değiştiren ve kaldıran servisi yazdı (`logoyuDegistir`, `logoyuKaldir`, karar 0059), ama ekran ve yükleme ucu yok. Mağaza sahibi logosunu panelden yükleyebilmeli ve kaldırabilmeli.

Önce 0073 bitmiş olmalı; panel ayar ekranlarının iskeleti geldiyse onun içinde yapılır. Gerçek mağazada kullanılmadan önce dosyaların yedeği (kart 0093) bitmiş olmalı.

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

## Durum

yapılacak
