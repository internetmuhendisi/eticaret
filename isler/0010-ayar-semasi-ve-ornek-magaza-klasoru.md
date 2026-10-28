# 0010 · Ayar şeması ve Örnek Mağaza klasörü

## Amaç

Bütün site ayarları tek şemada tanımlanır ve her site klasörü bu şemadan geçer. Örnek Mağaza'nın klasörü açılır, uygulama hangi siteyi çalıştırdığını kendi klasöründen okur (kararlar 0010, 0011, `.claude/rules/ayarlar.md`).

Önce 0009 bitmiş olmalı.

## Olmazsa olmazlar

- `cekirdek/ayar-semasi/` altında şema. Her ayarın türü, varsayılanı, açıklaması ve kim değiştirdiği yazar. Şimdilik yalnız altyapı sahibinin ayarları girer, değerleri `planlar/site-ayarlari.md` dosyasından alınır.
- Kimlik dosyasının şeması: kod adı, görünen ad, tür (gerçek ya da demo), adresler, çekirdek sürümü, teslim durumu.
- `siteler/ornek-magaza/kimlik.json`, `ayarlar.json` (yalnız sipariş öneki `ORN`) ve `KURALLAR.md`.
- Bir site klasörünü şemadan geçiren doğrulama komutu.
- Uygulama hangi siteyi çalıştıracağını tek bir ortam değişkeninden öğrenir, sitenin adını kimlikten okuyup boş sayfada gösterir.

## Sınırlar

- Mağaza sahibinin ayarları ve `baslangic/` klasörü veritabanı gelince yazılır.
- Panelde ayar ekranı yapılmaz.

## Bitti sayılır

- Örnek Mağaza klasörü doğrulamadan geçiyor.
- Şemada olmayan bir ayar ya da yanlış türde bir değer doğrulamayı kırmızıya düşürüyor.
- Boş sayfada "Örnek Mağaza" adı kimlik dosyasından geliyor.
- Çekirdekte hiçbir site adı geçmiyor.

## Durum

bitti
