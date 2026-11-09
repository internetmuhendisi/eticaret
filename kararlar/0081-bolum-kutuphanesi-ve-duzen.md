# 0081 · Bölüm kütüphanesi ve düzen

## Tarih

2026-11-09

## Karar

Vitrinin üst kısmı, ana sayfası ve alt kısmı bölümlerden kurulur (kart 0106). Bölümler çekirdekteki ortak bir kütüphanede durur.

**Bölüm türü tarifi.** Her tür kendi tarifini yazar (`cekirdek/vitrin/bolum-kutuphanesi/tarif.ts`):

- adı ve konabileceği düzen alanları
- mağaza sahibinin doldurduğu alanlar ve her alanın türü
- görünüm seçenekleri (ilki varsayılandır)
- bağlı olduğu işlev

Alan türleri:

- metin, uzun metin, görsel
- bağlantı: sitenin kendi adresi (`/` ile) ya da kullanıcı adı, şifre ve port taşımayan `https` adresi
- ürün kaynağı: kategori, marka, etiket, yeni gelenler, indirimdekiler ya da elle seçilen ürünler
- kategori seçimi, marka seçimi
- tarih: saatli ya da saatsiz, takvimde olan gün
- temanın renklerinden seçim: yalnız tarifin saydığı renkler
- liste: alt alanlı öğeler, en az ve en çok sayıyla, iç içe liste yok

Metin alanları ve bağlantının adresi değişiklik kaydına yazılabilir olmalıdır: kaydın e-posta sandığı değer (`https://www.tiktok.com/@magaza` gibi) kodla (`kayda-uygun-degil`) reddedilir, kayıtta beklenmeyen hataya dönmez. Denetim karakteri (`\u0000` gibi) geçmez; uzun metinde yalnız satır sonu ve sekme serbesttir. Alan kodları kayıtta yasak sözcük (telefon, eposta, anahtar...) taşıyamaz.

**Tek tarif, her yerde.** Alanların şeması, panelin düzenleme formu (`cekirdek/yonetim-paneli/bolum-formu.tsx`) ve düzen servisi aynı tariften çıkar; ikinci bir form ya da şema yazılmaz. Form her alanı kendi türünün parçasıyla çizer. Uzun metin için kütüphaneye yeni bir parça eklendi (`UzunMetinAlani`, shadcn textarea). Tarih için giriş alanının tarih türleri kullanılır.

**Kütüphanenin altyapısı ile bölüm kodu ayrıdır.**

- Altyapı `cekirdek/vitrin/bolum-kutuphanesi/` klasöründedir: tarif şeması, düzen kuralları, tür kaydı (`kutuphane.ts`) ve görünüş kaydı (`gorunumler.tsx`).
- Her bölüm türünün kodu `cekirdek/vitrin/bolumler/<tür>/` klasöründedir. Bu kod elle içerik taşıyamaz: ürün adı, fiyat, görsel adresi, bağlantı ya da cümle yazılamaz. Bunu kod denetiminin `bolum-icerigi` kuralı yakalar, bozuk örnekleri vardır.
- Kütüphane bugün boştur, bölüm türleri kendi kartlarıyla gelir (0108, 0110–0112). Kütüphanenin kendisi bir deneme bölümüyle kanıtlanır (`cekirdek/katalog/deneme-bolumu/`). Deneme bölümü mağazanın kütüphanesine girmez; katalogda (`/gelistirme/bilesenler/bolum-kutuphanesi`) ve testlerde kullanılır, aynı içerik kuralından geçer.

**Düzen.**

- Her alandaki bölümlerin sırası, görünürlüğü, görünümü ve alan değerleri.
- Aynı türden birden çok bölüm olabilir, her bölümün kendi kimliği vardır.
- Bir alanda en çok 50 bölüm olur.
- Düzen sitenin veritabanında sürüm sürüm saklanır (`duzen_surumleri`). Sürüm satırı değiştirilemez.
- Başlangıç değeri sitenin `baslangic/duzen.json` dosyasından, o yoksa başlangıç temasının düzeninden gelir ve ilk okumada bir kez yazılır.

İşlemler: ekleme, alan değerlerini ve görünümü değiştirme, gizleme ve gösterme, bir alandaki bölümleri sıralama, silme.

- Her işlem bütün düzeni yeni sürüm olarak yazar.
- Her işlem değişiklik kaydına aynı veritabanı işleminde girer.
- Yazmalar düzen kilidini alır.
- Eklenen ya da değişen bölümün başvurduğu görsel, kategori, marka, etiket ve ürünün var ve silinmemiş olduğu denetlenir. Hata başvuran alanın yoluyla döner (`degerler.urunler.urunler.1`), panel onu alanın yanında gösterir. Başvurulan satırlar paylaşımlı kilitlenir: aynı anda silinen kayda bağlanılmaz, silme bitene kadar beklenir.
- Yazılacak düzen önce biçimden geçer: biçimi bozuk bir sürüm yazılmaz.

**İşlev.** Kartta "bağlı olduğu özellik" denen şey, ürün özelliğiyle karışmasın diye "işlev" adıyla yazıldı (`cekirdek/kayitlar/islevler.ts`: yorum, blog, bülten).

- İşlevi yazılmamış bölüm düzene eklenebilir ama vitrinde çizilmez.
- Panel nedenini görür (`panelDuzeni`, neden `islev-yok`).
- İşlev yazılınca kayıttaki değeri açılır ve bölüm kendiliğinden çizilir; düzen değişmez.

**Çizim.** Vitrin yalnız görünür, türü kütüphanede olan, değerleri geçerli ve işlevi yazılmış bölümleri çizer. Her bölüm kendi hata sınırının içindedir (`<Bolum>`): bozulan bölüm sayfanın geri kalanını, sunucuda çizilirken de, düşürmez. Türü kütüphaneden çıkmış ya da değerleri artık geçersiz bölüm çizilmez; hata süreç başına bir kez kaydedilir.

**İzinler.** `duzen.gor` ve `duzen.degistir` yalnız tam yetkili rollerdedir (temadaki kullanıcı kararıyla aynı, kart 0105).

## Neden

- Düzen, mağaza sahibinin ayarıdır ve veritabanında durur (karar 0010). Tema değişikliğinde önceki düzene dönmek (kart 0113) bütün düzenin eski hâlini ister. Sürüm sürüm saklamak bunu ek iş olmadan sağlar, tema sürümleriyle aynı yoldur (karar 0080).
- Tarifi düz TypeScript'te tutmak, site klasörü doğrulamasının ve tema şemasının (Node ile) aynı kuralları okumasını sağlar. Görünüş ayrı tutulduğu için ekran kodu bu okumaya karışmaz.
- İçerik kuralı yazılı kalsaydı ilk aceleli bölümde ürün adı koda girerdi. TypeScript 7'nin JavaScript arayüzü yoktur. Kural bu yüzden kod denetiminde (Biome'un Grit kuralı) yazıldı: kodun yapısını okur, metni ve sayıyı ayırt eder, kendi testi bozuk örnekleri koşturur.
- Altyapıyı bölüm kodundan ayırmak gerekti: kütüphanenin hata iletileri ve tarifleri metin taşır, bölüm kodu taşıyamaz.

## Düşünülen diğer yollar

- **Düzeni her bölüm bir satır olacak biçimde tablo olarak tutmak:** Tek bölüm değişince tek satır yazılırdı. Ama tema değişikliğinde bütün düzenin eski hâline dönmek için ayrı bir anlık görüntü düzeni gerekirdi. 5–30 mağazada düzen küçüktür, bütün düzeni yazmak ucuzdur.
- **İçerik kontrolünü testte düzenli ifadeyle yazmak:** Cümleyi, sınıf adını ve yorumu ayırt edemezdi, yanlış alarm verirdi. Seçilmedi.
- **Deneme bölümünü çekirdeğin kütüphanesine koymak:** Mağaza sahibinin panelinde görünürdü. Seçilmedi.
- **Görsel yükleme alanı:** Ortak yükleme bileşeni yok (kart 0094). Form bugün var olan görsellerden seçtirir.

## Sonuçları

- Başlangıç düzeni (tema ve site dosyası) veritabanındaki bir kayda başvuramaz: kayıtların kimliği kurulumda üretilir. Görsel, kategori, marka ve seçilen ürün alanları başlangıçta boş kalır; ürün kaynağı yalnız "yeni" ya da "indirimli" olabilir. Adres adıyla bağlanması ve başlangıç görsellerinin yüklenmesi Örnek Mağaza'nın düzeniyle gelir (kart 0114).
- Tarihin saat dilimine çevrilmesi ve geri sayım, bölüm türünün işidir (kart 0110); burada yalnız biçim ve takvim denetlenir.
- Değişiklik kaydı bölümün bütün değerlerini taşır: kayıt büyüyebilir, ama kim neyi değiştirdi tek satırda görünür.
- Kayıt düzene konduktan sonra silinirse bölüm ona başvurmaya devam eder.
  - Vitrinde o alan boş gibi davranmak bölüm türünün görünüşünün işidir.
  - Panelde bölümün değerleri ya da görünümü, silinmiş kayda başvuran alan düzeltilmeden değişmez; hata o alanın yanında görünür.
  - Gizleme ve silme değerlere bakmaz.
- İçerik kuralı koddaki yazıyı ve JSX özelliğini (`href`, `src`) tarar. Rakamla başlayan yazı, eğik çizgili yol, ekran dosyasında 100 ve üstü ya da ondalıklı sayı hatadır. `_blank` ve küçük sayılar (`slice(0, 8)`) serbesttir. Yalnız disiplin olanlar:
  - küçük harfle tek sözcük ürün adı ("kupa", koda benzer)
  - `.ts` dosyasındaki sayı (tarifin sınırları sayıdır)
  - 100'ün altındaki bir fiyat
- Düzen uçları ve panel ekranı yoktur. İzinlerin gerçek istekle denenmesi uçlarla gelir.
- Kural: `.claude/rules/vitrin.md`. Klasör düzeni: `.claude/rules/klasor-duzeni.md`.
