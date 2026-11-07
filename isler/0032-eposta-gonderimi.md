# 0032 · E-posta gönderimi

## Amaç

Site müşteriye ve yöneticiye e-posta gönderebilsin. E-postalar ortak bir şablonla kuyruktan gider. Gönderim hizmeti seçimi açılışa kaldı (kart 0060, karar 0050).

Önce 0031 bitmiş olmalı.

## Olmazsa olmazlar

- Ortak e-posta şablonu: mağazanın logosu ve adı, metinler metin dosyasından, düz metin karşılığı.
- Her e-posta kuyruktan gider. Gönderilen her e-postanın kaydı tutulur, alıcı adresi günlükte kısaltılır.
- Geliştirmede e-postalar gerçek kişilere gitmez, yerelde yakalanır.
- Gönderim hizmeti tek dosyadan bağlanır.

## Sınırlar

- Sipariş, kargo ve yönetici bildirimi e-postaları o modüllerle gelir.
- Gönderen adı ve metinlerin panelden düzenlenmesi panel işidir.
- Toplu e-posta gönderilmez.

## Bitti sayılır

- Yerelde gönderilen e-posta dışarı gitmeden yakalanıyor.
- Gönderim hizmeti tek dosyadan değiştirilebiliyor; gönderici yerel olmayan adrese bağlanmıyor.
- Kullanıcının kararı (2026-11-07): hesap açılmadı, gerçek gönderim açılışta bağlanacak. Hizmet seçimi, alan adı kayıtları, anahtar ve e-postanın gerçek adrese ulaşması kart 0060'a taşındı.

## Durum

bitti
