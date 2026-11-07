# 0056 · Ülke, il ve ilçe listesi çekirdekte veri dosyası

## Tarih

2026-11-07

## Karar

Ülke, il ve ilçe listesi çekirdeğin `cekirdek/bolgeler/` klasöründe veri dosyası olarak durur, çekirdeğin sürümüyle gelir, veritabanına girmez (kart 0070). Bütün yerler bölgeyi yalnız `bolgeler.ts` ile okur ve doğrular; kayıtlar adı değil kodu tutar.

- **Kodlar:** ülke ISO 3166-1 (`TR`), il ISO 3166-2 (`TR-34`), ilçe bu projenin kodu (`TR-34-001`): il kodu ve il içindeki sıra. İlçe kodu değişmez, yeniden kullanılmaz.
- **Adlar:** il ve ilçe adları özel ad olduğu için veride yazılıdır. Ülke adı veride durmaz, sitenin dilinde ortak biçimleyiciden (`ulkeAdi`, CLDR) gelir.
- **Merkez ilçeler:** Büyükşehir olmayan 51 ilin merkez ilçesi "Merkez" adıyla listededir. Resmî ilçe sayısı 922, liste 973'tür.
- **Kaynak (kullanıcı kararı):** Resmî kaynağa ulaşılamadığı için il kodları ISO 3166-2:TR'den, ilçeler açık bir derlemeden (MIT) alındı ve Vikipedi'yle il il karşılaştırıldı. Veri dosyası ve belge "resmî değil" der. Gerçek mağazadan önce resmî listeyle karşılaştırma kart 0089'dadır.
- **Posta kodu:** Liste tutulmaz, ülke başına biçimle denetlenir (Türkiye 5 rakam).

## Neden

- Liste bütün sitelerde aynıdır ve yalnız yasa değişince değişir. Çekirdeğin sürümüyle gitmesi yeterli, her sitenin veritabanına kopyalanması gereksiz.
- Ad yerine kod tutmak, bir ilçenin adı değişince eski adreslerin bozulmamasını sağlar.
- Ülke adını dil verisinden almak, ikinci dil gelince adların kendiliğinden o dilde çıkmasını sağlar.
- Resmî ilçe kodu elde olmadan resmî görünen bir kod uydurulmadı. Projenin kendi kodu açıkça kendi kodu olarak yazıldı.

## Düşünülen diğer yollar

- **Listeyi her sitenin veritabanında tutmak:** Seçilmedi. Aynı veri her sitede kopyalanır, güncelleme her siteye ayrı veri değişikliği ister.
- **Dış bir adres hizmetinden canlı okumak:** Seçilmedi. Dış bağımlılık ve kesinti riski getirir. Adres formu hizmet kesilince çalışmazdı.
- **Resmî listeyi beklemek:** Kullanıcı seçmedi. Katalog bölümü beklerdi. Liste resmî olanla değiştirilebilir biçimde kuruldu.
- **İlçe kodu olarak ÖSYM ya da başka bir kurumun kodunu almak:** Seçilmedi. O kodlar o kurumun işine göredir, adres kodu değildir.
- **Ülke adlarını dosyada yazmak:** Seçilmedi. Her dil için ayrı bir liste gerekirdi.

## Sonuçları

- Liste resmî olmadığı için gerçek mağazada bir ilçe eksik ya da yanlış yazılmış olabilir. Kart 0089 bitmeden gerçek mağaza açılmamalı. Bu yalnız disiplindir, kontrolü yoktur.
- Resmî listede ilçe kodu bulunursa projenin ilçe kodlarıyla nasıl eşleşeceği kart 0089'da kararlaştırılır. Kayıtlarda tutulan kod değişmemelidir.
- Bir ilçe kurulur ya da kaldırılırsa çekirdeğin yeni sürümü gerekir. Siteler bunu ancak güncellenince görür.
- Ülke adları Node.js'in dil verisine bağlıdır. Node sürümü değişince bir ülkenin yazılışı değişebilir.
- Veriyi üreten betik projede tutulmadı. Resmî liste geldiğinde betik projeye girecek.
