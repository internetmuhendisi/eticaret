# 0254 · Yerelde bütün birim takımı "out of shared memory" ile düşüyor

## Amaç

Bu bilgisayarda (32 işlemci) `pnpm birim-testleri` değişikliksiz ana dalda da 24–31 dosyada düşüyor: deneme veritabanını kuran işçiler bütün değişiklikleri tek işlemde uygularken veritabanı "out of shared memory" diyor (kilit tablosu doluyor). 2026-11-20 ölçümleri (kart 0239 sırasında):

- Ana dal (`b0c5afd`), ortak yerel kutu: 29 dosya, 57 test düştü, hata 59 kez.
- Kart 0239'un dalı, ortak yerel kutu: 24 ve 31 dosya düştü.
- Kart 0239'un dalı, boş ve temiz ayrı kutu: 30 dosya, hata 101 kez; aynı kutuda `--maxWorkers=4` ile 218/218 dosya, 3613 test yeşil, hata yok.

Kontrol hattının makinesinde 4 işlemci olduğu için hatta görülmez. Yerelde bütün takım güvenilir bir sonuç vermiyor; düşen dosyalar tek başına geçiyor (kart 0239'da 24 dosya, 630/630).

Bölüm: Test altyapısı. Kart 0239 sırasında bulundu, o karta karıştırılmadı.

## Olmazsa olmazlar

- Sebep ölçülür: aynı anda kaç işçinin değişiklik uyguladığı, bir uygulamanın kaç kilit tuttuğu ve veritabanının kilit sınırı (`max_locks_per_transaction`, `max_connections`).
- Ölçülen sebebe göre düzeltme. Seçenekler: Vitest işçi sayısını sınırlamak (hattaki gibi), deneme veritabanını kurmayı işçiler arasında sıraya koymak, ya da yerel ve hat veritabanı kutusunun kilit ayarını yükseltmek. Hattın koşulu değişmez ya da bilinçli değişirse karar kaydıyla.
- Bozma denemesi: düzeltme geri alınınca yerelde aynı hata yeniden görülür.

## Sınırlar

- Testlerin kendisi değişmez.
- Tarayıcı testleri ve hız ölçümü bu kartın işi değil.

## Bitti sayılır

- Bu bilgisayarda değişikliksiz `pnpm birim-testleri` art arda iki kez yeşil, "out of shared memory" yok.
- Sebep ve ölçümler karta yazıldı.

## Durum

yapılacak
