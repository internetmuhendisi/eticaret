# 0065 · Kapı yanıtları önbelleğe alınmasın

## Amaç

Kapının yanıtlarında önbellek başlığı yok (`cekirdek/kapi/zarf.ts`). Kart 0033'ün bağımsız kontrolünde görüldü: kişisel veri taşıyan `GET /kapi/musteri/hesabim` yanıtı başlıksızdır. E-postanın önbellekten geri geldiği ölçülmedi. Kart 0033'te ekran bu isteği önbelleksiz yapar, kapının kendisi başlık koymaz.

## Olmazsa olmazlar

- Önbelleğe girmemesi gereken yanıtlar kapıda tek yerden `Cache-Control: no-store` alır; hangi uçların istisna olacağı belirlenir.
- Sağlık ucu ve ön kapı denetimleri bozulmaz.

## Sınırlar

- Vitrin sayfalarının ve görsellerin önbelleği bu işe girmez.

## Bitti sayılır

- Testte müşteri ve yönetici uçlarının başarılı ve hatalı yanıtı `no-store` taşıyor.

## Durum

bitti
