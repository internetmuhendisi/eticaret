# 0202 · İndirim oranı testi yük altında yanlış sonuç veriyor

## Amaç

Kart 0201'in ölçümünde (2026-11-15) bütün birim takımı temiz veritabanında, dört işlemciyle (`taskset -c 0-3`) çalışınca bir kez düştü:

- `cekirdek/moduller/fiyat/testler/gosterim.test.ts` "yüzde 1'in altındaki indirimin ve eski fiyatı gösterilmeyen indirimin oranı yoktur": satır 484, `kucuk?.enDusuk.eskiTutar` 10000 yerine `undefined`.

Kart 0219'un yerel hat denemesinde (2026-11-17, aynı koşul) aynı dosyada başka bir test düştü: "oran aşağı yuvarlanır: 299,90'dan 225,00'a", satır 472, `indirim` `{ oran: 24, varan: false }` yerine `undefined`. Belirti aynı: eski fiyat görünmüyor. Bir sonraki denemede bu iki test birlikte düştü, dosya tek başına üç kez geçti, `taskset -c 0-3` ile iki denemenin birinde düştü. Not: `taskset` işçi sayısını değiştirmez, araçlar işçi sayısını 32 işlemciden seçip dört işlemciye sıkıştırır; bu koşul hattaki dört işlemcili makineden ağırdır.

Dosya tek başına üç kez geçti. Düşüş süre aşımı değil, yanlış sonuçtur; bu yüzden kart 0133'ün (yük altında süre sınırı) kapsamında değildir. Sebep ölçülmedi. Eski fiyatın gösterilmesi fiyat geçmişinin zamanına bağlıdır (kart 0081): uygulama ile veritabanı saati ya da aynı anda yazılan satırlar ilk şüphelilerdir, ama bu bir tahmindir.

Kart 0261 sırasında (2026-11-21) "oran aşağı yuvarlanır" testi dosya tek başına çalışınca da düştü (satır 472, aynı belirti), ana dalda (c6aebdb) da: düşüş artık yalnız yük altında değil. Sebep ölçülmedi.

Bölüm: Testler.

## Olmazsa olmazlar

- Düşüş yük altında yeniden üretilsin ve sebebi ölçümle bulunsun.
- Sebep testteyse test düzeltilsin. Sebep eski fiyat kuralındaysa (vitrinde yanlış eski fiyat) düzeltme kuralda yapılsın ve bozmayla gösterilsin.

## Sınırlar

- Eski fiyat kuralının davranışı (kart 0081) bilerek değişmez; değişmesi gerekiyorsa kullanıcıya sorulur.

## Bitti sayılır

- Sebep ölçümle yazıldı.
- Düzeltmeden sonra aynı yükte takım en az beş kez bu testte düşmeden geçti.

## Durum

yapılacak
