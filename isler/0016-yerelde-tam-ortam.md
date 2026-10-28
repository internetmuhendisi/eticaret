# 0016 · Yerelde tam ortam

## Amaç

Sunucudaki düzenin aynısı yerelde tek komutla açılır: önde Caddy, arkada PostgreSQL ve Örnek Mağaza'nın kutusu (karar 0013). Sunucuya gitmeden önce her şey burada denenir.

Önce 0015 bitmiş olmalı.

## Olmazsa olmazlar

- `sunucu/` altında Docker ve Caddy dosyaları.
- Caddy isteği adrese göre doğru sitenin kutusuna gönderir.
- İkinci bir deneme sitesi aynı ortamda yan yana çalıştırılabilir.
- Gizli bilgiler yalnız `.env` dosyasından okunur, `.env.example` güncellenir.

## Sınırlar

- Sunucu kurulumu ve gerçek alan adı bu işe girmez (0018, 0020).

## Bitti sayılır

- Ortam tek komutla açılıyor, Örnek Mağaza'nın boş vitrini ve sağlık ucu Caddy üzerinden açılıyor.
- İki site yan yana açıkken her biri yalnız kendi adını ve kendi veritabanını görüyor.
- Ortam tek komutla kapanıyor.

## Durum

yapılacak
