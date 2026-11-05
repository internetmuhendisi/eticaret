# 0038 · Sunucu yeniden başlayınca bütün kutular kendiliğinden açılır

## Amaç

Sunucu, gereken bir güvenlik güncellemesi varsa gece 04:00'te kendiliğinden yeniden başlıyor (karar 0030). Sitelerin, veritabanının ve Caddy'nin kutuları yeniden başlamanın ardından kendiliğinden açılmazsa siteler sabaha kadar, belki de daha uzun süre kapalı kalır. Bugün `sunucu/compose.yaml` ve yerel ortamın ürettiği site kutularında kutunun yeniden başlama kuralı tanımlı değil.

Kart 0018'in bağımsız kontrolünde, yeniden başlatma kararı verilirken fark edildi.

Önce 0018 bitmiş olmalı. Sitelerin sunucuya ilk yayınından (0023) önce yapılmalı.

## Olmazsa olmazlar

- Sunucuda çalışacak her kutunun (veritabanı, Caddy, her site) yeniden başlama kuralı tek yerde tanımlanır.
- Docker sunucu açılışında kendiliğinden başlar (kart 0018'de açık, yeniden ölçülür).
- Kural yerel ortamda da aynıdır, yerel ortam denemesi bunu ölçer.

## Sınırlar

- Yayın komutu ve sağlık kontrolü bu işe girmez (0021).
- Gece yeniden başlatmanın saati ya da politikası değişmez (karar 0030).

## Bitti sayılır

- Yerel ortam açıkken Docker yeniden başlatılınca bütün kutular kendiliğinden açılıyor ve sağlık ucu yanıt veriyor.
- Yeniden başlama kuralı olmayan bir kutu tanımı bir kontrolde kırmızıya düşüyor.

## Durum

yapılacak
