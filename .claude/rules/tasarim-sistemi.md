---
paths:
  - "bilesenler/**"
  - "cekirdek/temalar/**"
  - "cekirdek/moduller/tema/**"
  - "siteler/*/tema/**"
  - "**/*.css"
---

# Tasarım sistemi

Tasarım değeri, renk, yazı boyutu, boşluk gibi tasarımı oluşturan ve tek yerde tanımlanan değerdir.

- Renkler koda elle yazılmaz, tek bir yerden (tasarım değerlerinden) gelir.
- Renk, yazı tipi, yazı boyutu, boşluk, köşe yarıçapı, gölge ve katman sırasını tek dosyada tanımla. Tasarımı değiştirmek o dosyayı değiştirmek demektir.
- Rengi "birincil", "zemin", "yazı", "tehlike" gibi anlamlı adlarla kullan. Renk kodu ya da paletten ham renk yazma.
- Vitrin tasarımını sitenin seçtiği temadan al. Tema, tasarım değerlerinin tamamını ve koyu tema değerlerini tanımlar. Temasız site kurulmaz, yeni site bir temanın varsayılanlarıyla başlar.
- Temalar çekirdekte durur ve bütün sitelerde ortaktır. Yalnız tek bir siteye tasarlanan tema o sitenin klasöründe durur ve başka sitede görünmez. Sitenin kullanabileceği temalar altyapı sahibinin ayarıdır, panel yalnız onları gösterir. "Mağaza sahibi temayı değiştirebilir" kapalıysa ne tema ne tema ayarı değişir.
- Mağaza sahibi temanın yalnız açtığı değerleri değiştirir: renk, yazı tipi, köşe ve düğme biçimi, logo, ana sayfa düzeni. Tema her ayar için varsayılanı ve izin verilen seçenekleri tanımlar. Boşluk ölçeği, genişlik sınırları ve katman sırası gibi değerler her zaman temadan gelir, serbest kod ya da stil yazılamaz.
- Vitrinin son tasarımı temanın değerleri ile sitenin tema ayarlarının birleşimidir. Bu birleşimi tek yerde üret, bileşenler yalnız sonucu okur.
- Mağaza sahibinin seçtiği renkleri kaydetmeden önce kontrast kontrolünden geçir. Açık temada geçmezse kaydetme ve okunur bir ton öner. Mağaza sahibi tek renk seçer; koyu temada geçmezse okunur tonunu kullan.
- Panelde canlı önizleme ve taslak yoktur, her temanın gezilebilir demosu vardır (karar 0080). Tema seçimi ve tema ayarı değişikliği yayınlanınca yeni bir sürüm olur. Her yayınlanan sürümü sakla, önceki sürüme tek adımda dönülebilsin. Tema değişikliği ürüne, içeriğe ve menülere dokunmaz.
- Yönetim paneli bütün sitelerde aynı görünür. Panel siteden yalnız logo ve ana rengi alır.
- Panelin siteden aldığı ana rengi kontrast kontrolünden geçir. Geçmezse okunur bir tonunu türet.
- Koyu tema değerlerini aynı dosyada ayrıca tanımla. Koyu temayı bileşen bileşen yamama.
- Uyarı, başarı ve hata renklerinin doygun tonunu yalnız zemin ve işarette kullan. Yazı için okunur tonunu kullan.
- Boşluk, genişlik ve yazı boyutunu tanımlı ölçekten seç. Rastgele piksel değeri yazma.
- Açılır pencere, menü ve bildirimin üst üste sırasını tanımlı katman sırasından al.
- Yalnız tanımlı köşe yarıçaplarını ve gölgeleri kullan.
- Telefon, tablet ve masaüstü genişlik sınırlarını tasarım değerlerinden al. Elle genişlik sınırı yazma.
- Bütün ikonları tek setten al. "Düzenle", "sil", "sepete ekle" gibi bir kavramın ikonu her yerde aynıdır ve tek ikon sözlüğünden okunur.
- Bir öğe değişirken animasyonu yalnız değişen özelliğe uygula.
- Tasarım değerleri değişince tasarım sistemi belgesini aynı değişiklikte güncelle.

## Araçlar (karar 0076)

- Değerler `bilesenler/tasarim-degerleri/degerler.ts` dosyasındadır, belgesi aynı klasörün `README.md` dosyasıdır. Stil Tailwind CSS 4 sınıflarıyla, yalnız oradaki adlarla yazılır (`bg-birincil`, `p-4`, `tablet:`).
- Tailwind'in kendi teması yüklenmez: hazır palet, hazır ölçü ve hazır kırılma noktası yoktur. Serbest değer (`w-[37px]`, `bg-(--x)`, `bg-zemin/[0.37]`, `[&>svg]:p-4`), sayıyla katman (`z-37`), 0 ve 2 dışında kenar kalınlığı (`border-7`), `dark:`, hazır palet rengi ve satır içi stilde ölçü denetimde hatadır.
- Gereken değer yoksa önce `degerler.ts`'e eklenir. Yeni yazı-zemin eşleşmesi kontrast listesine de eklenir.
- Radix parçalarının durumları adlı durumla yazılır (`acik:`, `etkin:`, `isaretli:`...), sınıflar `sinif()` ile birleştirilir (kart 0103, belgesi aynı README).
- İkonlar yalnız ikon sözlüğünden gelir (`bilesenler/ikonlar/sozluk.ts`); Lucide'yi başka yerde içe aktarmak denetimde hatadır.
- Sitenin değerlerini yalnız `cekirdek/temalar/birlesim.ts` verir. Kök düzen onları sayfaya CSS değişkeni olarak yazar, panel düzeni panelin değerlerini onların üstüne yazar.
- Vitrin hangi temayla çizileceğini yalnız `vitrinTemasi`'ndan öğrenir (karar 0127): tema demosunda ziyaretçinin seçtiği tema, öteki sitelerde kayıtlı tema.

## Tema yapısı (karar 0080)

- Tema tanımının şeması `cekirdek/temalar/sema.ts`, hazır temalar `cekirdek/temalar/hazir/` ve kaydı `cekirdek/temalar/temalar.ts`. Siteye özel tema `siteler/<kod>/tema/<tema kodu>.json` dosyasıdır, adını da taşır.
- Temanın başvurduğu bölüm türleri ve parça görünümleri `cekirdek/kayitlar/tema.ts` kaydındadır. Yeni bölüm ya da görünüm önce kayda eklenir; kayıtta olmayana başvuran tema açılmaz.
- Mağaza sahibine açılabilen renkler ve köşe ile düğme biçimi seçeneklerinin kodları da o kayıttadır (`magazaRenkleri`, `koseSecenekleri`, `dugmeBicimiSecenekleri`; kart 0260, karar 0168), panelde görünen adları metin dosyasında. Adı olmayan renk ya da seçenek açan tema açılmaz (`renk-acilamaz`, `secenek-adsiz`).
- Tema yalnız sitede barındırılan yazı tiplerini (`yuklenenYaziTipleri`) ve cihazın genel yazı tiplerini kullanır.
- Hazır temalar Canlı Çarşı, Yumuşak Mevsim ve Keskin Çizgi'dir (karar 0092). Değerleri `degerler.ts`'tedir (ham renk yalnız orada yazılır), mağaza sahibinin seçenekleri ve başlangıç düzeni üç temada ortaktır (`cekirdek/temalar/hazir/magaza-secenekleri.ts`, `baslangic-duzeni.ts`).
- Temadan temaya değişen görünüş tema değeriyle yazılır, bileşende temaya göre koşul yazılmaz (karar 0126). Başka bir renkle aynı olan ya da onu izlemesi gereken renk bağlı renktir (`renkBaglari`); okunurluk bağlar çözülerek ölçülür. Başlık biçimi `font-baslik`'e bağlıdır, tema boşlukları ve ürün sütunu kendi sınıflarıyla okunur.
- Mağaza sahibinin tema ayarlarının şeması `cekirdek/temalar/ayarlar.ts`, sürümleri `cekirdek/moduller/tema/` modülündedir. Başlangıç değeri `siteler/<kod>/baslangic/tema.json`.
- Renk okunurluğu tek yerde ölçülür (`cekirdek/temalar/okunurluk.ts`): temanın kendi değerleri, mağaza sahibinin rengi ve panelin ana rengi aynı ölçüden geçer.
- Yeni CSS dosyası açılmaz. Stil sınıfla yazılır, temel stil `tailwind.css` içindedir.
- Kâğıda basılan sayfa (sipariş fişi, kart 0270) her zaman açık renktedir: zorlanan renk özniteliği (`data-renk`) tek bir öğeye de verilebilir. Yazdırma sayfasının boyu adlı `@page` ile `tailwind.css`'te yazılır, ad gövdeye verilir (karar 0171).
- Yazı tipleri sitenin kendi sunucusundan yüklenir (`@fontsource-variable` paketleri), dış sunucudan yüklenmez.

## Tema değişikliği (karar 0091)

- Tema kodu değişen yayın düzen yolunu ister: `uygula` (yeni temanın düzeni, aynı türün içeriği taşınır, karşılıksız bölüm gizli eklenir) ya da `koru`. Yollar `cekirdek/moduller/duzen/gecis.ts`, yazımı tema servisindedir.
- Tema ve düzen yalnız tema servisi üzerinden, aynı işlemde birlikte değişir. Kilit sırası tema, düzen; düzen servisine tema kilidini alan bir işlem yazılmaz.
- Her tema sürümü kendinden önceki düzen sürümünü saklar (`onceki_duzen_sira`). Tema kodu değişen geri dönüş düzeni oradan getirir; tema kodu değişmeyen işlem düzene dokunmaz.
- Tema uçları `cekirdek/kapi/yonetici/tema.ts`, girdi şemaları `cekirdek/moduller/tema/semalar.ts`.
- Yeni temaya geçerken mağaza sahibinin ayarlarından yeni temanın kabul etmediği renk ve seçenek atılır, gerisi kalır (`yeniTemaninAyarlari`, karar 0129). Uymayan ayarı atan tek işlev `sorunluAyarlariAt`'tır.
- Masaüstünde filtrenin yeri mağaza sahibinin tema ayarıdır (`urunFiltresi`); seçilmemişse temanın görünümü. Vitrin parça görünümlerini yalnız `parcaGorunumleriniKur` ile okur (`cekirdek/temalar/ayarlar.ts`).
