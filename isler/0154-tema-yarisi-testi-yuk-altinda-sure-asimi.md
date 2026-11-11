# 0154 · Tema değişikliği yarış testi yük altında 5 saniyelik sınırı aştı

## Amaç

Kart 0137'nin kapanış kontrolünde (2026-11-12), bütün birim takımında `cekirdek/moduller/tema/testler/tema-degisikligi.test.ts` içindeki "tema değişikliği ile bölüm ekleme birbirini ezmez: eklenen bölüm her sırada düzende kalır" testi (satır 603) kırmızı oldu: `Test timed out in 5000ms`. Takımın 2632 testinden yalnız bu düştü. Yük ortalaması ölçümden hemen sonra 1 dakikalık 44, 5 dakikalık 33 idi.

Aynı kodla dosya tek başına çalıştırılınca 16 testin hepsi geçti. Test döngüde üç deneme yapar ve dosyanın kendi süre ayarı yoktur (Vitest'in varsayılanı 5 saniye); öteki veritabanı testlerinin çoğu `vi.setConfig({ testTimeout: 60_000 })` kullanır. Sebebin yük olduğu tahmindir, ölçülmedi. Kart 0137 tema modülüne dokunmadı.

Bölüm: Altyapı (testler). Benzer kartlar: 0152, 0149, 0088.

## Olmazsa olmazlar

- Önce yeniden üretilir: test yük altında tekrar tekrar çalıştırılır, kaçta kaç düştüğü ve bir denemenin ne kadar sürdüğü yazılır.
- Sebebi ölçülmeden süre sınırı büyütülmez. Süre sınırı büyütülecekse ölçülen sürenin dayanağı test dosyasında yazılır.
- Testin yakaladığı yarış (kilit) bozulunca test yine kırmızıya düşmelidir.

## Sınırlar

- Tema ve düzen servisinin davranışı değişmez; gerçek bir ürün hatası çıkarsa ayrı kart.

## Bitti sayılır

- Sebep ölçüldü ve yazıldı.
- Test yük altında art arda en az beş çalışmada geçiyor.

## Durum

yapılacak
