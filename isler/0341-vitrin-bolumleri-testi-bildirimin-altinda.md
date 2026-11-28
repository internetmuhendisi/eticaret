# 0341 · Vitrin bölümleri testi bildirimin altındaki düğmeye basamıyor

## Amaç

Hat 46097578163 (2cfac334) yalnız `cekirdek/testler/uctan-uca/vitrin-bolumleri.test.ts:376`'da kırmızı: "Göster" düğmesine 15 saniye basılamadı, basılan noktada başarı bildirimi (`data-sonner-toast`) vardı. İzden ölçüldü: "Gizle"ye (1125, 809) noktasında basıldı (ekranın sağ altı, bildirimin çıktığı yer), fare orada kaldı; bildirim fare üstündeyken kapanmaz (`.claude/rules/test.md`), "Göster" aynı noktadadır. Satırın yeri paylaşılan düzendeki üst kısım bölümlerinin sayısına bağlıdır (bu çalışmada 5. sıra): bir önceki hatta (46092515856) aynı kodla geçti.

Kod değişmedi (gönderim yalnız Dockerfile, komut testi ve belgeler); 0319'un yayınının önünde.

## Olmazsa olmazlar

- Testte bildirimin altında kalabilecek düğmeye basmadan önce fare bildirimden uzaklaştırılır ve bildirimin kapanması beklenir (ya da basış bildirimden bağımsız yapılır). Aynı kalıp dosyanın öteki ardışık basışlarında da aranır.
- Satırı ekranın altına düşürerek (sıra kurarak) eski hâlde kırmızı, düzeltmeyle yeşil gösterilir.

## Sınırlar

- Bildirimin davranışı (fare üstündeyken durması) değişmez.

## Bitti sayılır

- Eski hâlde sıra kurularak kırmızı, düzeltmeyle yeşil.
- Gönderimin hattında tarayıcı testleri bu testte düşmüyor.

## Sonuç

- Dosyaya `bildirimiKapat` eklendi: bildirimi kendi kapat düğmesiyle kapatır, kapanmasını bekler. Bildirimden sonra fareyle basılan dört yerde çağrılır (düzenle, göster, Slider'ın iki Kaydet'i); klavyeyle ya da bildirimin içinden yapılan adımlar değişmedi. Kapanmayı beklemek yerine kapatmak süre eklemez (4 sn'lik bildirim).
- Sıra kurularak ölçüldü: pencere 780 px'e kısaltılınca bildirim (699–756) "Göster" düğmesini (706–750) örttü; eski hâlde hattaki hatanın aynısı (15 sn, `data-sonner-toast` basışı alıyor), düzeltmeyle yeşil. Dosya 12/12.
- Kural `test.md`'ye yazıldı; öteki dosyalarda yalnız disiplindir.

## Durum

bitti
