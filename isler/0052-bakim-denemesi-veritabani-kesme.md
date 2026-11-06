# 0052 · Bakım denemesi yarıda kesilince veritabanı kapalı kalabilir

## Amaç

Kart 0049'un bağımsız kontrolü `pnpm hata-izleme-denemesi` için bir açık buldu, orada kapatıldı (karar 0043). Aynı yapı `komutlar/bakim-denemesi.mts` dosyasında da var, kod okuyarak görüldü, çalıştırılarak ölçülmedi: kesme sinyali yakalanmıyor, terminal kapanırsa `finally` çalışmaz; `docker start` sonucu okunmuyor, sürmekte olan bir durdurmadan sonra kutu kapalı kalabilir. Bu deneme sitenin kutusunu da durdurur ve elle bakımı açar.

## Olmazsa olmazlar

- Önce ölçülür: deneme sırasında terminal kapanınca kutular ve bakım durumu ne oluyor.
- Veritabanını ve kutuyu açma yolu `pnpm hata-izleme-denemesi` ile tek yerde toplanır.

## Sınırlar

- Denemenin ölçtüğü şeyler değişmez.

## Bitti sayılır

- Deneme kesilince veritabanı ve kutu çalışıyor, elle bakım kapalı. Sunucuda ölçüldü.
- Açılamazsa komut bunu ve elle açma komutunu söylüyor.

## Durum

yapılacak
