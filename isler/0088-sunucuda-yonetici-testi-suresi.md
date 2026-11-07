# 0088 · Sunucuda yönetici testinin süre sınırı

## Amaç

`cekirdek/moduller/ekip/testler/sunucuda-yonetici.test.ts` içindeki "tam yetkili yöneticileri sayar" testi makine yüklüyken 5 saniyelik sınırı aşıp kırmızı oluyor. Kodda bir hata yok, test yavaş. Kırmızı hat yayını durdurduğu için kontrol hattında da düşebilir.

Kart 0069 sırasında ölçüldü (2026-11-07): makinenin yük ortalaması 27,8 iken (32 çekirdek) test ana dalda 5651 ms, kart dalında 5486 ms sürdü ve iki dalda da düştü. Tek başına üç çalıştırmada geçti. Test her adımda ayrı bir süreç başlatıyor, her süreç yaklaşık 1 saniye sürüyor.

## Olmazsa olmazlar

- Önce yavaşlığın nereden geldiği ölçülür (süreç açılışı, veritabanı bağlantısı, değişikliklerin uygulanması).
- Testin denediği şey zayıflamaz: sayım yine gerçek süreç ve gerçek veritabanıyla ölçülür.
- Süre sınırı yükseltilecekse nedeni testte yazılır. Bu dosyadaki öteki uzun testler de aynı gözle okunur.

## Sınırlar

- Sunucuda yönetici açan parçanın davranışı değişmez.

## Bitti sayılır

- Test yük altında art arda beş kez geçiyor, ölçüm kartın kapanışında yazılıyor.

## Durum

yapılacak
