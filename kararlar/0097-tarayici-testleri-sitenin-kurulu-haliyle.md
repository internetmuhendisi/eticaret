# 0097 · Tarayıcı testleri sitenin kurulu hâliyle çalışır

## Tarih

2026-11-10

## Karar

- **Kurulum testlerden önce:** Tarayıcı testleri başlamadan önce Playwright'ın hazırlığı (`cekirdek/testler/uctan-uca/hazirlik.ts`) sitenin başlangıç kataloğunu, menülerini ve düzenini kurar. Bunu arka plan sürecinin açılışta çağırdığı işlevle yapar (`baslangiclariKur`, `cekirdek/arka-plan-isleri/baslangic.ts`), kurulumun ikinci bir yolu yoktur. Kurulu sitede hiçbir şey yazmaz. Bir adım yazılamazsa testler başlamaz.
- **Görseller:** Testlerin dosya klasörü (`DOSYA_KLASORU`) verilmemişse `sunucu/olusan/dosyalar/<site klasörü>` olur. Hazırlık görselleri oraya yazar, uygulama oradan okur. Klasör veritabanı gibi çalışmalar arasında kalır ve kayda girmez.
- **Testler gerçek hâli bekler:** Ana sayfaya bakan testin beklentisi sitenin gerçek düzeninden gelir. "Yakında açılıyoruz" yazısı yalnız bölümsüz sayfada beklenir. Dokunma alanı basılan yerdir: ekranda çizilmeyen öğe sayılmaz, alanını kabına yayan bağlantı kabıyla ölçülür.

## Neden

- Kontrol hattı arka plan sürecini açmaz. Düzen hiç kurulmadığı için düzene yazan testler "hizmet kullanılamıyor" alıyordu (karar 0092, 0094). Hat da Örnek Mağaza'nın gerçek ana sayfasını hiç görmemişti.
- Düzen kurulunca ölçüldü (kart 0129): müşteri hesabı ve şifre sıfırlama testlerinden 11'i, bölümlü ana sayfada müşterinin hesap alanı olmadığı için düştü. Bu, ürünün gerçek bir eksiğiydi (kart 0131). Boş sitede çalışan testler bunu gösteremezdi.

## Düşünülen diğer yollar

- **Hatta yalnız bir kurulum adımı eklemek:** Bilgisayarda çalışan testler yine kurulumu yapmazdı, hat ile bilgisayar ayrışırdı.
- **Testleri görselsiz bir deneme sitesiyle çalıştırmak:** Hattın ölçtüğü site Örnek Mağaza'dan, yani her özelliğin önce denendiği siteden (karar 0007) uzaklaşırdı. Bölümlü ana sayfadaki hesap eksiği görünmezdi.
- **Arka plan sürecini testlerle birlikte açmak:** Kuyruğun işleri testlerin verisine dokunurdu. Kurulumun bitmesini beklemek için ayrıca günlük izlemek gerekirdi.

## Sonuçları

- Tarayıcı testlerinin ilk çalışması Örnek Mağaza'nın 59 görseliyle kurulumu bekler (bilgisayarda yaklaşık yarım dakika).
- Bilgisayardaki yerel veritabanında katalog yoksa ilk tarayıcı testi kurar. Bu, arka plan süreci açılınca da olacak şeydir.
- Görselli düzen kurulu, ama dosya klasörü başka yerde olan bir veritabanında ana sayfanın görselleri açılmaz. Hat her çalışmada boş veritabanıyla başladığı için bunu yaşamaz.
