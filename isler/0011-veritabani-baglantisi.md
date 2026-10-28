# 0011 · Veritabanı bağlantısı ve numaralı değişiklikler

## Amaç

Karar 0013'te açık kalan veritabanı erişim kütüphanesi seçilir. Uygulama yerelde kendi PostgreSQL veritabanına bağlanır, tablo değişiklikleri numaralı dosyalarla uygulanır (`.claude/rules/veritabani.md`).

Önce 0010 bitmiş olmalı.

## Olmazsa olmazlar

- Erişim kütüphanesi seçimi ve karar kaydı. Sorgular parametreli yazılır, değişiklik dosyaları araçla üretilir.
- Yerelde Docker içinde PostgreSQL. Örnek Mağaza'ya ayrı veritabanı ve yalnız ona girebilen ayrı kullanıcı.
- `cekirdek/veritabani/degisiklikler/` altında ilk numaralı değişiklik. Başında geri alınabilir mi, yedekten mi dönülür notu.
- Hangi değişikliklerin uygulandığını veritabanının kendisi tutar.
- Kimlik, zaman ve tutar alanlarının ortak türleri: tahmin edilemeyen kimlik, saat dilimli zaman, sabit ondalıklı tutar.
- Notu olmayan değişiklik dosyasını yakalayan kontrol.

## Sınırlar

- Ürün, sipariş ya da kullanıcı tabloları bu işe girmez. İlk değişiklik yalnız altyapının kendi tablosunu açar.
- Kişisel bilgileri silinmiş kopyada deneme canlı veri olunca kurulur.

## Bitti sayılır

- Değişiklikler tek komutla boş veritabanına sırayla uygulanıyor, ikinci çalıştırmada bir şey değişmiyor.
- Notsuz bir değişiklik dosyası kontrolü kırmızıya düşürüyor.
- Uygulama veritabanına bağlanabildiğini bir testle gösteriyor.
- Veritabanı şifresi yalnız `.env` dosyasında, `.env.example` dosyasında yalnız adı var.

## Durum

yapılacak
