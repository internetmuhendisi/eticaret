# 0192 · Kayan afişin telefon görseli testi bir kez düştü

## Amaç

Kart 0130'un kontrolünde `cekirdek/testler/uctan-uca/katalog.test.ts` içindeki "kayan afiş: telefonda telefon görseli, masaüstünde asıl görsel" testi bir kez kırmızı oldu. O çalışmada iki test dosyası (`katalog.test.ts` ve `musteri-hesabi.test.ts`) iki işçiyle birlikte koşuyordu, test 1,5 saniyede düştü; süre aşımı değildi. Aynı test tek başına ve dosyanın tamamı yeniden çalışınca yeşil geçti. Hata iletisi kaydedilmedi; sebebi bilinmiyor.

Bölüm: Testler.

## Olmazsa olmazlar

- Hata yük altında (birden çok dosya ve işçi) yeniden üretilip iletisi kaydedilsin.
- Sebep ölçümle bulunsun: testin beklemesi mi, görselin yüklenmesi mi, paylaşılan veritabanında başka bir testin bıraktığı düzen mi.
- Test, sebebi düzeltilerek kararlı hâle gelsin; bekleme süresi uzatarak örtülmesin.

## Sınırlar

- Kayan afişin kendi davranışı, ölçüm hata gösterirse ayrı kart olur.

## Bitti sayılır

- Hata ya yeniden üretilip düzeltildi ya da yük altında art arda en az beş çalışmada yeniden görülmedi; ölçümler karta yazıldı.

## Durum

yapılacak
