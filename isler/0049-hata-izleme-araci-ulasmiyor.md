# 0049 · Uç ve ara katman hataları hata izleme aracına ulaşmıyor

## Amaç

Kart 0027'nin bağımsız kontrolünde geçerli gönderim adresi ve kapalı veritabanıyla panel, giriş, çıkış ve sağlık istekleri gönderildi. Günlükte 9 "beklenmeyen hata" satırı çıktı, araca 0 olay ulaştı. Gönderim adresi ve yakalayıcı çalışıyordu.

Olası neden, doğrulanmadı: aracın bağlantısını tutan modül değişkeni (`cekirdek/izleme/hata-katmani.ts`) açılış, uç ve ara katman paketlerinde ayrı kopyalarda kalıyor. `pnpm hata-izleme-denemesi` ayrı süreçte kendi bağlantısını kurduğu için bunu göremez. Hata yayında fark edilmeden kalır.

## Olmazsa olmazlar

- Önce ölçülür: nedeni ve uç tarafının 0027'den önce de böyle olup olmadığı.
- Bağlantı, açılışta bağlanan aracı bütün paketlerin görmesini sağlar (karar 0026'daki ortak alan gibi).
- `pnpm hata-izleme-denemesi` gerçek uçtan ve ara katmandan çıkan hatayı da ölçer.

## Sınırlar

- Araca giden olayın içeriği ve maskesi değişmez (karar 0036).

## Bitti sayılır

- Uçta ve ara katmanda çıkan beklenmeyen hata araca etiketli ve maskeli ulaşıyor. Gerçek uygulamayla ölçüldü.
- Bağlantıyı bilerek bozunca ölçüm kırmızıya düşüyor.

## Durum

bitti
