# 0058 · Sunucu veritabanı denemesi yayındaki sürümü gözetmiyor

## Amaç

`pnpm sunucu-veritabani-denemesi`, Örnek Mağaza'nın veritabanına kimlik dosyasındaki çekirdek sürümünün değişikliklerini uygular. Kart 0051 sırasında ölçüldü: sunucudaki site 0.6.1, kimlik 0.8.1. Görüntü bilgisayarda olsaydı deneme, yayın yapılmadan yeni tabloları çalışan sitenin veritabanına uygulayacaktı. Bu değişikliklerden biri "yedekten" notludur (karar 0044). Sitenin eski kodla yeni veritabanında nasıl çalıştığı ölçülmedi. Deneme bu sırada uyarmıyor.

## Olmazsa olmazlar

- Deneme, yayındaki sitenin sürümünden yeni değişikliği çalışan siteye sormadan uygulamaz.
- Davranış bilerek bozularak denenir.

## Sınırlar

- Denemenin ölçtüğü ayrım ve şifre yenileme kontrolleri zayıflatılmaz.
- Görüntü denetimindeki sürüm kuralı gevşetilmez.

## Bitti sayılır

- Kimlikteki sürüm yayındaki sürümden yeniyken deneme Örnek Mağaza'nın veritabanını değiştirmiyor. Ölçüldü.
- Deneme bu durumda da ayrımı ölçüyor ya da nedenini söyleyip duruyor.

## Durum

yapılacak
