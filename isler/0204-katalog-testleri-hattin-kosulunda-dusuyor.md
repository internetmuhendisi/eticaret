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

## Ölçüm (2026-11-15)

Ölçüm ayrı kutudaki temiz veritabanıyla, hattın koşulunda yapıldı (`taskset -c 0-3`, `--workers=2`). Katalog test dosyası her çalışmada yanında aynı adımları yürüten geçici bir ölçüm dosyasıyla birlikte çalıştı. Düzeltmeden önce dosya üç çalışmanın üçünde düştü.

- **Kayan afiş.** Görselin doğal boyutu "sonraki"den hemen sonra okunuyordu. Altı ölçümün ikisinde görsel o anda yüklenmemişti (`complete: false`, 0 × 0, `currentSrc` boş). Görsel tembel yükleniyor ve slayt o anda görünür olmuştu. Yüklenmesi beklenince altısında da telefon görseli geldi (375 × 500). Test artık doğal boyutu görsel yüklenince okuyor. Telefon kaynağı asıl görsele çevrilince test 375 px'te kırmızıya düştü.
- **Sıralanabilir liste.** Düşen her çalışmada sürükleme doğru yere bıraktı. Düşüş hep sonraki telefon adımındaydı, iki ayrı sebeple:
  - Sürüklemeden sonraki ilk tıklama kayboluyordu (kart 0158). Tıklama bırakmadan ~30 ms sonra gelince pencereye ulaşıyor, sayfaya ulaşmıyordu. 50 ms'den sonra gelen tıklama çalışıyordu (4/4).
  - Sayfa geçiş sırasında yana kayıyordu (kart 0165). İki kartın ölçümü kendi kartlarındadır.
- **"Bir önceki yere bırakıldı" belirtisi yeniden üretilemedi.** Bu belirti beş katalog çalışmasında, gerçek zamanlamayla sekiz ve 6 kat yavaş işlemciyle dört ölçümde hiç görülmedi. Yavaş işlemcide de son fare hareketi bırakmadan önce işlendi; satır son yerin üstündeydi. Kaybolan telefon tıklamasının hatası (265. satır) Playwright'ın farkında şöyle görünür: beklenen sıra `-` ile yazılır ve onda Güven şeridi bir önceki yerdedir. Kartın tarifi büyük olasılıkla bu farkın ters okunmasıdır. Bu bir çıkarımdır, ölçülmedi. Sürükleme yanlış yere bırakırsa test bıraktıktan hemen sonraki sıra denetiminde yine kırmızı olur.
- **Sonuç.** Sıralanabilir listenin ve kayan afişin kodu değişmedi. Telefonda kalıcı taşma (satıra 700 px en az genişlik) eklenince test yana kayma adımında 342 px ile kırmızıya düştü.
- Doğrulama (hattın koşulu): katalog test dosyası art arda beş kez 72/72 geçti. Ardından bütün tarayıcı takımı bir kez 257/257 geçti; tema aşaması (`tema-degisikligi`) da çalıştı. Beş çalışmanın hiçbirinde sürükleme yanlış yere bırakmadı.

## Durum

yapılacak
