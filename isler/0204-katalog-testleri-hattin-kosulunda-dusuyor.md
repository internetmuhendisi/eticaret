# 0204 · İki katalog testi hattın koşulunda düşüyor

## Amaç

Kart 0148'in ölçümünde (2026-11-15) ana dalın kodu (f577c15) temiz veritabanında, hattın koşuluyla (`taskset -c 0-3`, `--workers=2`) çalıştırıldı. `cekirdek/testler/uctan-uca/katalog.test.ts` dosyası çalışınca iki test iki denemenin ikisinde de düştü:

- **`:134` "sıralanabilir liste: klavyeyle, düğmeyle ve fareyle taşınır, Escape geri alır":** Fareyle sürüklenen satır son satıra değil, bir önceki yere bırakıldı. Bir başka denemede 375 px'e küçültülünce sayfa 287 px yana kaydı.
- **`:963` "kayan afiş: telefonda telefon görseli, masaüstünde asıl görsel":** 375 px'te görselin doğal boyutu dikey çıkmadı.

İki test de tek başına çalışınca geçti. Bütün takım ana dalın koduyla bir kez 254/254 geçti. Kart 0148'in koduyla üç tam çalışmanın üçünde bu iki test düştü.

Ölçülenler:

- Kayan afiş testi, "sonraki"ye bastıktan hemen sonra görselin doğal boyutunu okuyor, görselin yüklenmesini beklemiyor.
- Okumadan önce bir ölçüm daha eklenince iki denemede de görsel yüklenmiş çıktı (375 × 500) ve test geçti.
- Sürükleme testinin sebebi ölçülmedi.

Tarayıcı testlerinde bu iki testten biri düşünce tema ekranının aşaması (`tema-degisikligi`, karar 0129) çalışmaz ("did not run").

Bölüm: Testler.

## Olmazsa olmazlar

- Her iki düşüşün sebebi hattın koşulunda ölçülerek bulunsun.
- Kayan afiş testi görselin yüklenmesini beklesin.
- Testlerin yakaladığı kural (telefonda telefon görseli, satırın klavye, düğme ve fareyle taşınması, telefonda yana kaymama) zayıflamasın.

## Sınırlar

- Sıralanabilir listenin ve kayan afişin davranışı, ölçüm hata göstermedikçe değişmez.
- Kart 0203 (yavaş işlemcide yan pencere testi) ayrı karttır.

## Bitti sayılır

- Sebepler ölçümle karta yazıldı.
- Düzeltmeden sonra katalog test dosyası hattın koşulunda art arda en az beş kez düşmeden geçti.

## Durum

yapılacak
