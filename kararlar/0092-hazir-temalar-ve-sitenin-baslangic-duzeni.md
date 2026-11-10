# 0092 · Üç hazır tema ve sitenin kayda bağlı başlangıç düzeni

## Tarih

2026-11-10

## Karar

- **Üç hazır tema:** Canlı Çarşı, Yumuşak Mevsim ve Keskin Çizgi çekirdekte hazır temadır (`cekirdek/temalar/hazir/`). Sıra budur, listenin ilki Canlı Çarşı'dır (karar 0075). Değerleri tasarım değerleri dosyasındadır (`bilesenler/tasarim-degerleri/degerler.ts`), çünkü ham renk yalnız orada yazılabilir.
- **Ortak mağaza sahibi seçenekleri:** Üç tema aynı seçenekleri açar (`magaza-secenekleri.ts`):
  - renk: yalnız ana renk;
  - yazı tipi: üç temanın kendi yazı tipi çiftleri (Inter ve Jost, Manrope, Inter ve Archivo);
  - köşe: keskin, orta ya da yuvarlak;
  - düğme: hap, yumuşak ya da köşeli.
  Manrope ve Archivo `@fontsource-variable` paketleriyle sitenin kendi sunucusundan yüklenir.
- **Temanın başlangıç düzeni ortaktır ve kayda başvurmaz:** Tema bütün sitelerde ortaktır, bir sitenin kategorisini ya da ürününü bilemez. Düzeninde yalnız metin ya da kayıt istemeyen bölümler vardır: üst ve alt kısım, yeni ve indirimli ürün vitrinleri, fırsatlar, yorumlar, blog. Afiş, güven şeridi, kategori kutuları, marka logoları ve bülten sitenin dosyasındadır.
- **Sitenin başlangıç düzeni kayda adres adıyla başvurur:** `baslangic/duzen.json` kategori, marka, etiket ve ürüne adres adıyla bağlanır. Site doğrulaması her adres adının başlangıç kataloğunda olduğunu denetler. Görsele başvuru henüz yoktur (kart 0115).
- **Kurulum katalogdan sonra:** Düzen kurulurken adres adları silinmemiş kayıtların kimliğine çevrilir (`cekirdek/moduller/duzen/baslangic.ts`). Arka plan süreci açılırken sıra katalog, menüler, düzendir.
  - Dosya kayda başvuruyorsa ve katalog henüz kurulmamışsa düzen yazılmaz. Vitrin o arada düzeni boş görür ve bunu süreç başına bir kez günlüğe uyarı olarak yazar. Düzene dokunan uçlar (tema yayını, geri dönüş, bölüm işlemleri) bilinen hatayla döner: `hizmet-kullanilamiyor`, ayrıntısı `katalog-bekleniyor`. Açılışın ilk saniyelerinde olağandır. Katalog kurulamadıysa sonraki açılışa kadar sürer; katalog hatası ayrıca kaydedilir.
  - Kurulumdan önce silinmiş ya da adres adı değişmiş kayıt kendi öğesiyle düşer: elle seçimde yalnız o ürün (seçim boş kalırsa onu taşıyan liste öğesi, örneğin sekme), listede o öğe, bölümün kendi alanındaysa bölüm. Önce bulunan bağlar yazılır, sonra düşenler kaldırılır: aynı öğenin birden çok bağı bulunamasa da öğe bir kez düşer. Kalan bölüm kayıtlı düzenin kurallarından geçmezse (listenin en az sınırı) o da düşer. Hata bir kez kaydedilir.
  - Bağlanılan satırlar paylaşımlı kilitlenir. Kategoriye başvuruluyorsa önce kategori kilidi alınır (kilit sırası düzen, kategori, satırlar): kategori silme birden çok satırı güncellerken ters sırayla kilitlenme olmaz (menülerdeki kural). Panelden bölüm eklemede aynı risk kart 0125'te ölçülecek.

## Neden

- Kart 0114 seçilen kategorilerin ve markaların site klasöründe başlangıç değeri olmasını istiyor. Kayıtların kimliği kurulumda üretildiği için dosyaya kimlik yazılamaz. Adres adı menülerde de aynı yolla kullanılıyor (karar 0082): tek bir bağlama biçimi var.
- Vitrin düzeni ilk okumada yazıyordu. Katalog kurulmadan yazılsaydı bağlar bulunamaz, düzen eksik kalırdı ve bir daha düzelmezdi (düzen bir kez yazılır). Bu yüzden kayda başvuran düzen kataloğu bekler.
- Seçenekler üç temada ortak, çünkü mağaza sahibi temayı değiştirince seçtiği yazı tipi ve köşe biçimi de geçerli kalmalı.

## Düşünülen diğer yollar

- **Düzeni yalnız açılışta kurmak, vitrinde hiç kurmamak:** Kayda başvurmayan düzeni olan siteler (dosyası olmayan, temanın düzenini kullanan) bugün ilk okumada kuruluyor ve testler buna dayanıyor. İki yol birlikte kaldı: açılış kurar, vitrin de kurabilir ama katalogdan önce kurmaz.
- **Kimliği dosyaya yazmak:** Kimlikler her kurulumda farklıdır, dosya bir kez yazılıp birçok veritabanına kurulamazdı.
- **Bulunamayan bağda bütün düzeni yazmamak:** Mağaza sahibinin kurulumdan önce sildiği tek bir ürün bütün ana sayfayı boş bırakırdı. Menülerdeki gibi yalnız o öğe düşer.
- **Her temaya kendi seçeneklerini vermek:** Tema değişince mağaza sahibinin seçimi geçersiz kalırdı.

## Sonuçları

- Temalar bugünkü tasarım değerleriyle yazılabildiği kadar taslağa benzer. Keskin Çizgi'nin büyük harfli başlığı ve sarı rozeti, Yumuşak Mevsim'in kenarsız kartı, sırada 4 ürünü ve geniş bölüm aralığı yazılamadı (kart 0124).
- Katalog kurulana kadar (açılışın ilk saniyeleri) ana sayfa sade görünür, tema yayını 503 döner. Katalog kurulamazsa bu durum sonraki açılışa kadar sürer.
- Bölümün kendi alanındaki kayıt düşünce bölüm iki katmanda düşer: önce bağın kendisi, sonra kayıtlı düzenin kuralı. Biri kaldırılınca öteki tutar.
- Örnek Mağaza'nın görseli olmayan bölümleri (kayan afiş, kampanya afişleri, kategori kutuları, geniş afiş, marka logoları) metinleriyle yazılı, görsel paketi gelene kadar gizlidir (kart 0115).
- Görsele adres adıyla başvuru kart 0115'te eklenecek; bugün sitenin düzeninde görsel alanı doldurulamaz.
