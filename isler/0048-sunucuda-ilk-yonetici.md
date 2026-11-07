# 0048 · Sunucuda ilk yönetici

## Amaç

`pnpm yonetici-ac` yalnız yereldeki veritabanına bağlanır (kart 0027, karar 0042). Yayındaki siteye ilk yöneticiyi açacak yol yoktur; bu yüzden deneme adresindeki panele kimse giremez.

Önce 0027 bitmiş olmalı. İlk yayınla birlikte yapılır.

## Olmazsa olmazlar

- Komut sitenin sunucudaki veritabanında, sitenin kendi kutu kullanıcısıyla ve gizli bilgi dosyasıyla çalışır (`sunucuda-guncelle.ts` gibi görüntüdeki parça).
- Şifre komutta üretilir, ekranda bir kez görünür; sunucu günlüğüne ve kayda girmez.
- Başka sitenin veritabanına yönetici açmayı durdurur.
- Örnek Mağaza'nın deneme adresine deneme yöneticisi bununla açılır.

## Sınırlar

- Mağaza sahibinin teslim akışı (ilk girişte şifre belirleme) site komutlarıyla gelir.

## Bitti sayılır

- Deneme adresinde deneme yöneticisi giriş yapıp boş panele ulaşıyor, çıkınca giremiyor. Tarayıcıyla ölçüldü.
- `pnpm bakim-denemesi` ve `pnpm sunucu-denetle` yeni panel davranışıyla geçiyor.

## Durum

bitti
