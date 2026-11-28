# 0058 · Sunucu veritabanı denemesi yayındaki sürümü gözetmiyor

## Amaç

`pnpm sunucu-veritabani-denemesi`, Örnek Mağaza'nın veritabanına kimlik dosyasındaki çekirdek sürümünün değişikliklerini uygular. Kart 0051 sırasında ölçüldü: sunucudaki site 0.6.1, kimlik 0.8.1. Görüntü bilgisayarda olsaydı deneme, yayın yapılmadan yeni tabloları çalışan sitenin veritabanına uygulayacaktı. Bu değişikliklerden biri "yedekten" notludur (karar 0044). Sitenin eski kodla yeni veritabanında nasıl çalıştığı ölçülmedi. Deneme bu sırada uyarmıyor.

Bölüm: Yeni mağaza. On altıncı bölümde açık kartlardan bu bölüme alındı; deneme birden çok siteli sunucuda yayındaki sürümü gözetmeli.

## Olmazsa olmazlar

- Deneme, yayındaki sitenin sürümünden yeni değişikliği çalışan siteye sormadan uygulamaz.
- Davranış bilerek bozularak denenir.

## Sınırlar

- Denemenin ölçtüğü ayrım ve şifre yenileme kontrolleri zayıflatılmaz.
- Görüntü denetimindeki sürüm kuralı gevşetilmez.

## Bitti sayılır

- Kimlikteki sürüm yayındaki sürümden yeniyken deneme Örnek Mağaza'nın veritabanını değiştirmiyor. Ölçüldü.
- Deneme bu durumda da ayrımı ölçüyor ya da nedenini söyleyip duruyor.

## Sonuç

- **Kural.** Deneme Örnek Mağaza'nın veritabanını yalnız iki durumda kullanır: site hiç yayınlanmamışsa ya da kullanılacak görüntü yayındaki çekirdeğin aynısıysa (aynı sürüm ve aynı parmak izi, karar 0205). Kararı `yayindakiCekirdekMi` (`komutlar/sunucu-veritabani.mts`) verir.
  - Görüntünün kaydı bilinmiyorsa, kaydedilmemiş değişiklikten üretildiyse ya da iz hesaplanamıyorsa site kullanılmaz. Etkin yayının kaydı bulunamazsa da kullanılmaz.
  - Kullanılmazsa Örnek Mağaza'nın veritabanına dokunulmaz, "dokunulmadı" satırı nedenini yazar. Yerine ikinci bir geçici site (`vt-deneme-2`, ayrılmış ikinci numara) açılır. Ayrım ve şifre yenileme ölçümleri iki geçici siteyle aynen yapılır, sonunda ikisi de silinir.
- **Görüntünün etiketi.** Görüntü sunucuya denemenin kendi etiketiyle (`<sürüm>-vt-deneme`) gider ve iki yerde de silinir.
  - Neden: eskiden görüntü sürümün etiketiyle gidiyordu. Bilgisayardaki `0.81.0` yayındakinden farklı olduğu için sunucudaki `0.81.0` etiketi yayındaki görüntüden kayacaktı.
  - Karar, sunucuya gidecek etiketin görüntüsünden verilir. Görüntünün kaydını okuyan işlev tek yerde (`goruntununKaydi`); yayın hazırlığı da onu kullanır.
- **Ölçümler.**
  - `komutlar/testler/sunucu-veritabani-denemesi.test.ts` (14 test). 13 bozma ayrı ayrı denendi, her biri kırmızıya düştü. Denemenin kararı kullanması yalnız yazıyla denetlenir (deneme sunucuya bağlanır).
  - Komutların testleri, tür kontrolü ve denetim yeşil.
  - Sunucuda bir kez (2026-11-28): bilgisayardaki 0.81.0 görüntüsü (424c13f1) yayındakinden (e5328447) farklıyken deneme Örnek Mağaza'ya dokunmadı. Veritabanı önce ve sonra aynıydı: 72 uygulanmış değişiklik, 82 tablo, aynı değişiklik ve şema özetleri. Ölçümler iki geçici siteyle 10/10 yeşil bitti.
  - Sunucudaki 0.81.0 etiketi yayındaki görüntüde (920d7e98) kaldı, geçici siteler ve etiket silindi. Hızlı sunucu denetimi yeşil.
  - Etiketlemenin karardan önceye alınması bu çalışmadan sonradır. Deneme yeniden çalıştırılmadı: veritabanı kutusunu yeniden kurar (kart 0355).
- **Bağımsız kontrolün bulgularıyla düzeltilen.**
  - Karar ile gönderilen görüntü ayrı adımlarda seçiliyordu.
  - Örnek Mağaza'nın yalnız kararla kullanıldığı test edilmiyordu.
- **Kart 0355'e yazılanlar** (bu karttan önce de vardı):
  - Deneme veritabanı kutusunu bir çalışmada iki üç kez yeniden kurar; yayındaki site o saniyelerde veritabanına bağlanamaz.
  - Aynı çekirdekte Örnek Mağaza'nın izinleri bilgisayardaki dosyayla yeniden yazılır.
  - `pnpm sunucu-veritabani` hâlâ sormadan uygular.
  - Öteki iki komut sürüm etiketini kaydırabilir.
- **Ölçülmeyen.**
  - "Görüntü aynı, Örnek Mağaza kullanılır" yolu sunucuda çalıştırılmadı (bugün bilgisayarda yayındakiyle aynı görüntü yok).
  - Geri dönüşten sonra veritabanında etkin yayından yeni değişiklik varsa denemenin eski görüntüyle güncellemesi büyük olasılıkla hiçbir şey yazmadan hata verir; ölçülmedi.

## Durum

çalışılıyor
