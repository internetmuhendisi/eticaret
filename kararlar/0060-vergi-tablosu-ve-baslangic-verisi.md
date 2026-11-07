# 0060 · Vergi tablosu sitenin veritabanında, ilk değerleri site klasöründe

## Tarih

2026-11-07

## Karar

Vergi sınıfları ve oran tablosu sitenin veritabanında `vergi_siniflari` ve `vergi_oranlari` tablolarında durur (kart 0074). Okuma ve değiştirme yalnız `cekirdek/moduller/vergi/servis.ts` ile yapılır. Vergi açık mı (`vergiAcik`) ve vergi adı (`vergiAdi`) mağaza sahibinin ayarıdır.

- **Türkiye değerlerinin yeri:** "KDV" adı ile %20, %10, %1 ve %0 sınıfları çekirdekte yazmaz. Sitenin klasöründe durur: vergi adı `baslangic/ayarlar.json` dosyasında, sınıflar ve oranlar `baslangic/vergi.json` dosyasında. Örnek Mağaza bu iki dosyayla gelir. Dosyası olmayan site sınıfsız başlar, vergi adı boştur. Yeni bir Türk sitesine bu dosyaları koymak site kurma komutunun işidir. O komut henüz yok, bugün dosyalar elle konur.
- **Bir kez yazılır:** Tabloda hiç sınıf satırı yoksa (silinmiş olan da sayılır) ilk okumada ya da ilk değişiklikte başlangıç verisi yazılır. Bu yazım `sistem: baslangic-vergi` adıyla değişiklik kaydına girer. Sonra dosya kullanılmaz. Dosya yine her açılışta ve `pnpm site-dogrula`'da şemadan geçer (karar 0055'teki yol).
- **Oran:** Milyonda bir biriminde tam sayıdır: %18 = 180000. Yüzde girişte metin olarak yazılır ve sayıya çevrilmeden okunur. Ondalık ayırıcı nokta da virgül de olabilir (yüzde 100'ü geçmediği için binlik ayırıcı yoktur). En çok dört ondalık basamak olur, değer 0 ile 100 arasındadır. Sınır veritabanında da denetlenir.
- **Bölge:** Her oran satırında ülke, isteğe bağlı il ve isteğe bağlı posta kodu durur. Bölge ortak bölge doğrulamasından geçer (karar 0056). İl yalnız il listesi olan ülkede yazılabilir. Posta kodu ülkenin biçimine uyar ve tam eşleşir. Aynı bölgede birden çok oran olabilir. Oranın kendi adı yoksa mağazanın vergi adı kullanılır.
- **Silme (kullanıcı kararı):** Sınıf ve oran silinme işaretiyle silinir, satırı kalır. Silinmiş sınıfa bağlı ürün sınıfsız kalmaz. Ürün başka bir sınıfa geçirilene kadar vergisi o sınıfın oranlarıyla hesaplanır. Silinmiş sınıf ve oranları değiştirilemez, silinmiş sınıfa oran eklenemez.
- **Sınıf adları (kullanıcı kararı):** Türk sitesinin sınıf adları oranın kendisidir ("%20" gibi).
- **Yarış:** Bütün yazmalar veritabanına özel bir işlem kilidi alır (`pg_advisory_xact_lock`). Başlangıç iki kez yazılmaz. Silinmemiş iki sınıf aynı adı taşıyamaz. Ad tekilliği ayrıca kısmi tekil indeksle de korunur.

## Neden

- Kural, çekirdekte bir ülkenin vergi adını ya da oranını yasaklıyor (`.claude/rules/e-ticaret-is-kurallari.md`). Değerin site klasöründe durması, Türkiye dışında kurulan sitenin çekirdeğe dokunmadan kendi tablosuyla başlamasını sağlar.
- Mağaza ayarlarıyla aynı yol (karar 0055) sunucuya yeni bir adım eklemez. Kurulmuş sitenin tablosu dosya değişince değişmez.
- Tam sayı oran, kuruş olarak tutulan tutarla (karar 0019) birlikte vergi hesabında (kart 0075) yuvarlama hatası çıkarmaz. Milyonda bir, yaygın oranları (%7,5, %0,0001) tam olarak taşır.
- Silme işareti, ürün kaydının (kart 0076) bozulmasını önler. Silmeyi reddetmek mağaza sahibini önce bütün ürünleri taşımaya zorlardı.

## Düşünülen diğer yollar

- **Türkiye değerlerini çekirdekte bir ülke tablosunda tutmak:** Seçilmedi. Kural çekirdekte oranı ve vergi adını yasaklıyor. Oran değişince bütün sitelerin çekirdek güncellemesi beklemesi gerekirdi.
- **Değerleri site kurma komutunun ülke şablonunda tutmak:** Bugün seçilmedi, çünkü komut yok. Komut gelince şablon oradan kopyalanabilir. Sitenin dosyası yine tek kaynak kalır.
- **Oranı `numeric` sütunda tutmak:** Seçilmedi. Veritabanı sürücüsü değeri metin olarak verir, her yerde çevirmek gerekirdi. Tam sayı tutarlar zaten tam sayıdır.
- **Oranı küsuratlı sayıyla tutmak:** Seçilmedi, kural yasaklıyor.
- **Kullanılan sınıfın silinmesini reddetmek:** Seçilmedi. Kart iki yola da izin veriyor, kullanıcı işaretle silmeyi seçti.
- **Sınıfları ve oranları tek bir mağaza ayarında JSON olarak tutmak:** Seçilmedi. Ürün sınıfa kimliğiyle bağlanacak. Oranın kendi değişiklik kaydı olmalı. Aynı anda değişen iki oran birbirini ezmemeli.

## Sonuçları

- Bugün yalnız Örnek Mağaza KDV ile başlıyor. Yeni bir Türk sitesine iki dosya elle konmazsa site sınıfsız ve vergi adsız başlar. Bu yalnız disiplindir, site kurma komutu gelince kontrol olur.
- Kurulmuş sitede başlangıç dosyasının değişmesi tabloyu değiştirmez. Oran yasa ile değişirse mağaza sahibi panelden değiştirir, ekranı ileride gelecek. Bütün sitelerde birden değişecekse veri değişikliği gerekir.
- Silinmiş sınıfa bağlı ürünün vergisi eski oranla hesaplanmaya devam eder. Panel bu ürünleri göstermelidir (ürün ve panel kartları).
- İl, yalnız il listesi olan ülkede yazılabilir. Bugün listesi olan tek ülke Türkiye. Eyalet vergisi olan bir ülke ancak listesi eklenince il bazında oran alır.
- Posta kodu tam eşleşir, aralık ve joker yoktur. Gerekirse sonradan eklenir.
- Çekirdekte vergi değeri geçmediğini `cekirdek/testler/vergi-degeri-yok.test.ts` denetler. Aranan adlar sitelerden geldiği için bir site sınıfına sıradan bir sözcük ad verirse test çekirdekteki o sözcüğe kırmızı verir; o zaman ad ya da test, gerekçesiyle değiştirilir. Boşluklu yüzde yazılışı ("% 20") ve vergi modülü dışındaki sayı olarak oran aranmaz, yalnız disiplindir.
