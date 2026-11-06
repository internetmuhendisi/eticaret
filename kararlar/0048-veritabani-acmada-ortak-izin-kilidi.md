# 0048 · Veritabanı açmada ortak izin kayıtları kilitle sırayla değişir

## Tarih

2026-11-07

## Karar

- `komutlar/site-veritabani-ac.sql`, `postgres` ve `template1` veritabanlarının ortak iznini değiştiren iki satırı tek işlemde ve PostgreSQL'in danışma kilidiyle (`pg_advisory_xact_lock`) çalıştırır. Kilit işlem bitince kalkar.
- Geçici test veritabanlarını tek yardımcı açar (`denemeVeritabaniAc`, `cekirdek/veritabani/testler/deneme-sitesi.ts`). Betik yarıda kalırsa yardımcı veritabanını ve kullanıcıyı kaldırır.
- `cekirdek/veritabani/testler/paralel-acma.test.ts` gerçek psql süreçleriyle aynı anda 8 veritabanı açar, bunu 5 tur tekrarlar ve ortak veritabanlarının kapalı kaldığını denetler.
- Sahte doğrulamanın süre testi her iki doğrulamayı sırayla 20'şer kez ölçer, en kısa süreleri karşılaştırır. Sınırlar (yarısı ile iki katı) değişmedi.

## Neden

- **Yarış ölçüldü:** Düzeltmesiz ana dal betiğinde 40 paralel açmanın 4'ü `tuple concurrently updated` hatası verdi. Hata alan 4 koşunun hepsinde veritabanı ve kullanıcı geride kaldı. Kilitle 160 paralel açmanın hiçbiri hata vermedi.
- **Kilit betikte:** Sunucu ve bilgisayar aynı betiği kullanır (0034), düzeltme ikisini birden kapsar. Yalnız ortak satırlar kilitlenir, veritabanı açma paralel kalır.
- **Süre testi:** Kırmızı yeniden üretilemedi. Üç test takımı aynı anda çalışırken eski ölçüm 120 denemede sınırı aşmadı ama oran 1,87'ye çıktı, bir test takımıyla yapılan başka bir ölçümde 1,94 görüldü. Yeni ölçümde aynı yük altında oran en çok 1,11 oldu. Ortanca iki yöntemde de 1,0 olduğu için sahte doğrulamanın maliyeti gerçekle aynıdır, sorun ölçüm gürültüsüdür.

## Düşünülen diğer yollar

- **Testleri sırayla çalıştırmak:** Seçilmedi. Test süresi uzardı, sunucuda aynı anda açma ihtimali de açık kalırdı.
- **İzin yalnız açıksa kaldırmak:** Seçilmedi. İlk açmada iki işlem yine aynı anda değiştirebilir.
- **Hatayı yakalayıp yeniden denemek:** Seçilmedi. Hatanın kendisini gizler, betik `ON_ERROR_STOP` ile çalışır.
- **Süre testinin sınırlarını genişletmek:** Seçilmedi. Testin yakaladığı maliyet farkını gevşetirdi.
- **Test başlarken artıkları silmek:** Seçilmedi. Aynı anda çalışan başka bir işin testini bozabilir (0023).

## Sonuçları

- Bozma denemeleri: kilit kaldırılınca paralel test 5 koşunun 5'inde kırmızı. Betik sonda hata verince artık kalmıyor. Sahte doğrulama hesapsız ya da üçte bir bellekle çalışınca süre testi kırmızı. Kilit olmadan paralel testin yeşil geçmesi ihtimal olarak yine mümkündür; testin kırmızısı rastlantıya bağlıdır, yeşili değildir.
- Test öldürülürse artık yine kalabilir, 0023'teki sınır sürer. Temizlik yalnız betiğin ve değişikliklerin hata verdiği yolu kapsar.
- Süre testi yaklaşık 40 Argon2 hesabı yapar (yüksüz koşuda yarım saniye kadar).
- Sunucuda ölçüm: geçici bir sitenin veritabanı değişen betikle iki kez açıldı. Betik tuttu, ortak veritabanları kapalı kaldı, kilit kalmadı, veritabanı kutusu ve Örnek Mağaza yeniden başlamadı, tablo sayısı değişmedi. Sunucuda paralel açma ölçülmedi, yerelde ölçüldü.
- `pnpm sunucu-veritabani-denemesi` çalıştırılmadı. Bu deneme kimlikteki çekirdek sürümünün değişikliklerini Örnek Mağaza'nın veritabanına uygular; bugün sunucudaki site 0.6.1, kimlik 0.8.1'dir. Sorun kart 0058'dedir.
