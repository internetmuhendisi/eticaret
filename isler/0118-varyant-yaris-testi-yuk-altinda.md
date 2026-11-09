# 0118 · Varyant yarış testi yük altında bir kez düştü

## Amaç

`cekirdek/moduller/urun/testler/varyant.test.ts` içindeki "aynı anda aynı birleşimi ekleyen iki istekten yalnız biri geçer" testi, kart 0105 sırasında bütün birim testleri birlikte çalışırken bir kez kırmızı oldu (1521 ms). Kart 0105 bu modüle dokunmadı.

Aynı kodla:
- tek başına üç çalıştırmada geçti
- bütün takımın sonraki çalıştırmasında geçti

Hatanın iletisi kaydedilmedi. Sebebi bu yüzden bilinmiyor. Kart 0088 ve 0092'deki gibi yük altında bir zamanlama sorunu olabilir, ama ölçülmedi.

## Olmazsa olmazlar

- Testi yük altında tekrar tekrar çalıştırıp düştüğü anın iletisini yakala.
- Sebep ölçülmeden düzeltme yazılmaz. Test kodun bir yarışını yakalıyorsa o yarış ayrıca kart olur.

## Sınırlar

- Varyant servisinin davranışı bu kartta değişmez; yalnız testin güvenilirliği.

## Bitti sayılır

- Düşmenin sebebi ölçüldü ve yazıldı.
- Test yük altında art arda en az on çalıştırmada geçiyor ya da sebebi koddaysa o kart açıldı.

## Durum

yapılacak
