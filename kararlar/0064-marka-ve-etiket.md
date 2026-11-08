# 0064 · Marka ve etiket: ortak grup yapısı, silme kuralı ve ad anahtarı

## Tarih

2026-11-08

## Karar

Marka `markalar`, etiket `etiketler` tablosunda durur; ürünlerle bağlantıları `urun_markalari` ve `urun_etiketleri` tablolarındadır (kart 0078). Marka yalnız `cekirdek/moduller/marka/servis.ts`, etiket yalnız `cekirdek/moduller/etiket/servis.ts` ile okunur ve değişir. Ürünün markası ve etiketleri ürün girdisinin `marka` ve `etiketler` alanlarıyla ürün servisinden yazılır.

- **Ortak grup yapısı:** Marka ve etiket aynı kurallara uyan düz gruplardır. Tablo biçimi (`grupTablosu`), bağlantı biçimi (`grupBaglantisi`) ve servis (`grupServisi`) tek yerde yazılıdır (`cekirdek/moduller/urun/grup.ts`, `grup-servisi.ts`). Her grubun yalnız adı, izinleri, metinleri, girdi şeması ve bağlantısının tekilliği ayrıdır. Kategori ağaç olduğu için kendi modülünde kalır.
- **Alanlar:** Ad, adres adı ve açıklama. Etiketin açıklaması girilmez (kartın istediği); sütun iki grupta aynı biçim için vardır.
- **Tekillik:** Ad ve adres adı silinmemişler arasında sitede tekildir. Adres adı ürün ve kategoriyle aynı kuralla üretilir.
- **Ad anahtarı:** Marka, etiket ve kategori adları büyük küçük harf ve noktalı noktasız i ayrımı olmadan karşılaştırılır (`cekirdek/metinler/ad-anahtari.ts`). Önce İ, I ve ı harflerinin üçü de "i" yapılır, sonra harfler küçültülür. Anahtar yalnız veritabanında hesaplanır (`adAnahtariSql`; tekil indeksler ve tekillik sorguları aynı ifadeyi kullanır). Uygulama kendi küçültmesiyle karşılaştırmaz: JavaScript ile veritabanı bazı harfleri (Yunancadaki kelime sonu sigma) farklı küçültür; ad değişince tekillik her zaman veritabanında aranır. Adlar ve kayda giren serbest metinler NFC biçimine çevrilir (`kayitMetni`): birleşik ve ayrık yazılmış "Ş" aynıdır. Kategori kardeş adı indeksi de bu anahtarla yeniden kuruldu.
- **Marka tekildir:** `urun_markalari` tablosunun birincil anahtarı üründür, bir ürünün ikinci markası veritabanında da yazılamaz.
- **Silme (kullanıcı kararı):** Marka ya da etiket silinmiş olarak işaretlenir, ürün bağlantıları kalkar. Ürünün kendisi ve öteki bilgileri değişmez. Kalkan ürünler silme kaydında listelenir.
- **Kilit sırası (bağımsız kontrolün bulgusu):** Ürün yazmaları ürün kilidini alır (`cekirdek/moduller/urun/kilit.ts`). Kategori silme birden çok kategori satırını güncellediği için satırlara dokunmadan önce o kilidi de alır; yoksa ürün değişikliği satırları bir sırayla paylaşımlı kilitlerken silme başka sırayla güncelleyip iki işlem birbirini bekleyerek kilitlenirdi. Ürün servisi kategori kilidini hiç almaz, sıra hep aynıdır. Marka ve etiket silme tek satır güncellediği için bu kilidi almaz.
- **Ürün bağlantıları:** Kategori, marka ve etiket bağlantıları ürün serviste tek tanımdan yürür (`cekirdek/moduller/urun/baglantilar.ts`). Bağlanacak grup ve ürünün mevcut grupları paylaşımlı kilitle okunur: aynı anda silinen gruba bağlantı kurulmaz, kalkmış bağlantı kayda bağlıymış gibi girmez (kart 0077'nin kuralı).
- **Grubun ürünleri:** Kategori, marka ve etiket aynı tek sorguyu kullanır (`cekirdek/moduller/urun/liste.ts`): görünürlük, sayfa ve toplam birlikte gelir. Silinmiş grubun ürünü gelmez; silme bağlantıları zaten kaldırır, süzgeç ikinci ağdır.
- **İzinler (kullanıcı kararı):** Her grup için görme, değiştirme ve silme. Görevli görür ve değiştirir, silemez.

## Neden

- Marka ve etiketin kuralları aynıdır. Tek servis, birinde düzeltilen hatanın ötekinde kalmamasını sağlar (kural: bir işi tek yerde tanımla).
- Türkçe adlarda "I" ile "ı" ve "İ" ile "i" aynı harfin büyüğü ve küçüğüdür. Standart küçültme bunu bilmez: "ŞIK" ile "Şık" iki ayrı marka olurdu, mağazada aynı markanın iki kaydı açılabilirdi. Ayrıca veritabanı ve JavaScript "İ" harfini farklı küçültür; ortak anahtar ikisini aynı tutar.
- Silinen grubun ürünlerden kalkması kategoriyle aynı davranıştır ve ürünü bozmaz (kullanıcının seçtiği yol).

## Düşünülen diğer yollar

- **Marka ve etiketi ayrı ayrı yazmak:** Seçilmedi, aynı kod iki kez yazılırdı.
- **Marka ve etiketi tek tabloda bir tür alanıyla tutmak:** Seçilmedi. Markanın tekilliği bağlantı tablosunda ayrı bir kısıt isterdi, izinler ve kayıtlar tür alanına göre ayrılmak zorunda kalırdı.
- **Markayı ürün tablosunda bir sütun olarak tutmak:** Seçilmedi. Ürün ve marka tabloları birbirini içe alırdı, silme ve kilit kuralları etiket ve kategoriden ayrı yazılırdı.
- **Silinen markayı üründe silinmiş olarak bırakmak, ya da bağlı ürün varken silmeyi reddetmek:** Kullanıcı seçmedi.
- **Sitenin diline göre küçültmek (Türkçe kuralı yalnız Türkçe sitede):** Seçilmedi. Tekil indeks dile göre değişemez. Seçilen anahtar başka dillerde zaten aynı sonucu verir.
- **Aksanları da düşürmek (adres adı gibi):** Seçilmedi. "Çam" ile "Cam" ayrı sözcüklerdir, aynı ad sayılmamalı.

## Sonuçları

- "Kırmızı" ile "Kirmizi" aynı ad sayılır, ikisi aynı sitede marka ya da etiket olamaz.
- Veritabanının harf ayarı (`en_US.utf8`) Türkçe harfleri (ş, ç, ğ, ö, ü) doğru küçültür. Harf ayarı `C` olan bir veritabanında yalnız İngiliz harfleri küçülürdü; ad anahtarı testi bunu yerel kutuda yakalar, sunucudaki veritabanının harf ayarı ayrıca ölçülmez (yalnız disiplin; aynı kutu tanımı kullanılır).
- Kategori silme, ürün yazmaları bitene kadar bekler; ürün değişiklikleri de kategori silme bitene kadar bekler.
- Grup tanımındaki şemaların açıklamalı ya da açıklamasız biçimi tür kontrolünde ayırt edilmez; yanlış şema verilirse testler yakalar (etiket açıklaması testi).
- Stok kodunun tekilliği kendi kuralıyla kalır (yalnız küçültme); kodlarda Türkçe harf beklenmez.
- Silinen grup geri alınırsa (geri alma ekranı yok) ürün bağlantıları kendiliğinden dönmez; silme kaydındaki liste kullanılır.
- Marka ve etiket uçları yoktur. Yeni izinlerin her rolde beklentisi erişim testinde denenir; her uçta gerçek istekle denenmesi uçlar yazılınca olur.
- Tür kontrolü modül klasörlerinin hepsini kapsamaz (kart 0056); bu kartın dosyaları kapsamı genişletilmiş bir tür kontrolüyle elle denetlendi.
