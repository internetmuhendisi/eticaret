# 0088 · Sunucuda yönetici testinin süre sınırı

## Amaç

`cekirdek/moduller/ekip/testler/sunucuda-yonetici.test.ts` içindeki "tam yetkili yöneticileri sayar" testi makine yüklüyken 5 saniyelik sınırı aşıp kırmızı oluyor. Kodda bir hata yok, test yavaş. Kırmızı hat yayını durdurduğu için kontrol hattında da düşebilir.

Kart 0069 sırasında ölçüldü (2026-11-07): makinenin yük ortalaması 27,8 iken (32 çekirdek) test ana dalda 5651 ms, kart dalında 5486 ms sürdü ve iki dalda da düştü. Tek başına üç çalıştırmada geçti. Test her adımda ayrı bir süreç başlatıyor, her süreç yaklaşık 1 saniye sürüyor.

## Ölçüm (2026-11-10, kart 0129 ile)

- Kontrol hattında da düştü (çalışma 42854721027, "Test timed out in 5000ms").
- Bir sürecin açılışı parça parça ölçüldü: servis modüllerinin yüklenmesi üç ölçümde 275–279 ms, şifre özeti 19–21 ms; geçersiz girdiyle hemen duran süreç bile 0,5 saniye (pnpm üzerinden) sürüyor. Süre süreçlerin yüklenmesine gidiyor, veritabanı işine değil.
- Yüksüz makinede test tek başına üç kez: "tam yetkili yöneticileri sayar" (beş süreç) 1,87–3,06 saniye, "son tam yetkili kapatılamaz" (dört süreç) 1,55–2,75 saniye.
- Yük ortalaması 38 iken (40 meşgul süreç) beş kez: sayım testi 4,74–5,29 saniye sürdü, beşinin üçünde eski 5 saniyelik sınırı aştı; yeni sınırla beşi de geçti. Eski sınırla yapılan tek çalışma 4,90 saniyeyle geçti.
- Düzeltme: dosyadaki testlerin süre sınırı 30 saniye, ölçüm testte yazılı. Test gövdeleri değişmedi: sayım yine gerçek süreç ve gerçek veritabanıyla. Süreç asılı kalırsa test yine düşer.
- Kontrol hattının birim testleri adımı sonraki dört çalışmanın üçünde yeşil geçti (42893769935, 42914059742, 42922969104); dördüncüsünde (42918605493) düşen test kart 0092'nindi.

## Olmazsa olmazlar

- Önce yavaşlığın nereden geldiği ölçülür (süreç açılışı, veritabanı bağlantısı, değişikliklerin uygulanması).
- Testin denediği şey zayıflamaz: sayım yine gerçek süreç ve gerçek veritabanıyla ölçülür.
- Süre sınırı yükseltilecekse nedeni testte yazılır. Bu dosyadaki öteki uzun testler de aynı gözle okunur.

## Sınırlar

- Sunucuda yönetici açan parçanın davranışı değişmez.

## Bitti sayılır

- Test yük altında art arda beş kez geçiyor, ölçüm kartın kapanışında yazılıyor.

## Durum

bitti
