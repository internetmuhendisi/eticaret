# 0201 · Birim testi Örnek Mağaza'nın veritabanına deneme sitesinin ayarlarını yazıyor

## Amaç

Kart 0197'nin hattında (çalışma 43645659891, 2026-11-14) üç tarayıcı testi düştü:

- `bos-sayfalar.test.ts` "/ adresi açılır ve başlığını gösterir": h1 "Örnek Mağaza" yerine "Deneme Galerisi".
- `vitrin-cercevesi.test.ts` "alt kısımdaki e-posta tireden kırılmaz": 320 ve 360 px'te alt kısımda e-posta bağlantısı yok.

Sebep kart 0116'nın birim testindedir. `cekirdek/vitrin/testler/tema-demosu.test.ts` "müşteri sayfaları" bölümü, çalışan site deneme demo sitesiyken (`cekirdek/ayar-semasi/testler/ornek-siteler/tema-demosu`, adı "Deneme Galerisi") `musteriSayfasiBilgisi` çağırır. O da `bulunamadiSayfaBilgisi` → `sayfaBasligi` → `istekteMagazaAdi` yoluyla mağaza adını gerçek veritabanından okur.

Hatta veritabanı boş açılır. Mağaza ayarlarının başlangıç değeri ilk okumada bir kez yazılır (kart 0069). Birim testleri tarayıcı testlerinden önce aynı Örnek Mağaza veritabanında çalıştığı için başlangıç değerlerini deneme sitesi yazar. Sonraki tarayıcı testleri bu adla ve e-postasız ayarlarla çalışır.

Ölçülen: test erişilemeyen bir veritabanı adresiyle çalışınca deneme sitesi adına "mağaza adı okunamadı" hatası kaydedilir, yani veritabanına gider.

Yerelde görülmez: yerel veritabanında ayarlar zaten yazılıdır. Ana daldaki hat (kart 0116'nın kaydından sonra) bu yüzden büyük olasılıkla kırmızıdır.

Bölüm: Testler.

## Olmazsa olmazlar

- Testin veritabanına gitmemesi: mağaza adı okuması testte sahte olsun. Testin iddiaları değişmesin.
- Aynı sınıfın başka testlerde olup olmadığı aransın: çalışan siteyi `ornek-magaza` dışına çeviren ve veritabanına giden her birim testi.
- Koruma: birim testlerinden sonra Örnek Mağaza veritabanının mağaza ayarlarının sitenin kendi başlangıç değerleri olduğu ölçülsün (hatta ayrı adım ya da test). Testin düzeltmesi geri alınınca bu ölçüm, temiz veritabanıyla yerelde kırmızıya düşsün.

## Sınırlar

- Tema demosunun davranışı değişmez.
- Mağaza ayarlarının başlangıç kuralı (ilk okumada bir kez) değişmez.

## Bitti sayılır

- Test veritabanına gitmiyor, ölçüldü.
- Koruma ölçümü var, bozmayla kırmızıya düştüğü gösterildi.
- Hat yeşil; ardından kart 0197'nin dalı ana dalın üstüne taşınıp iki kez yeşil geçti.

## Durum

bitti
