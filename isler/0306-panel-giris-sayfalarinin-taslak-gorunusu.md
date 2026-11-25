# 0306 · Panelin giriş sayfalarının taslaktaki kartlı görünüşü

## Amaç

Kart 0275'in taslak karşılaştırmasında bulundu, o karta karıştırılmadı. Taslak (`planlar/tasarim-yonu/panel.html`, "Davet kabulü") davet kabul sayfasını panelin giriş sayfasının görünüşünde çizer: yüzey zeminde ortalı bir kart, kartın başında mağazanın logosu ve adı, zorunlu alanların yıldızı, alttaki notun küçük ve soluk yazısı. Gerçek giriş sayfaları (giriş, kod, kurulum, şifre sıfırlama ve davet kabulü) bugün kartsız, logosuz sade düzendedir (`cekirdek/uygulama/app/yonetim/giris/layout.tsx`). Davet kabulü bugünkü giriş düzenine uyar; taslağın görünüşü bütün giriş sayfalarına birlikte gelmelidir.

Bölüm: Yönetim paneli.

## Olmazsa olmazlar

- Giriş düzeni taslaktaki karta geçer: logo ve mağaza adı kartın başında, altyapı adı alt köşede kalır (karar 0004).
- Giriş, kod, kurulum, şifre sıfırlama ve davet kabul sayfaları aynı düzeni kullanır; zorunlu alanlar ortak işaretle.
- Telefon, tablet ve bilgisayarda iki renkte tarama; var olan giriş testleri geçer.

## Sınırlar

- Giriş akışının davranışı (iki aşamalı giriş, deneme sınırı) değişmez.

## Bitti sayılır

- Beş sayfanın görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Var olan giriş, kurulum, şifre sıfırlama ve davet tarayıcı testleri geçer.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
