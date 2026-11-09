# 0083 · Üst kısım ve alt kısım bölümleri

## Tarih

2026-11-09

## Karar

Vitrinin her sayfasındaki üst ve alt kısım, bölüm kütüphanesinin ilk gerçek bölümlerinden kurulur (kart 0108).

**Bölümler.** Her birinin kodu `cekirdek/vitrin/bolumler/<tür>/` klasöründedir.

- Üst kısım:
  - duyuru şeridi: metin, isteğe bağlı bağlantı, temanın okunur renk çiftlerinden zemin
  - logo ve simgeler satırı: logo (yoksa mağaza adı), iletişim telefonu, hesap, arama, favoriler, sepet
  - menü satırı: ana menü ve kategori menüsü, açılır alt düzeyleriyle
- Alt kısım:
  - bağlantı sütunları: bir menüden; en üst öğeler sütun başlığı olur
  - iletişim bilgileri
  - sosyal hesaplar
  - ödeme işaretleri
  - telif satırı: altyapı adı, altyapı sahibinin `vitrindeAltyapiAdi` ayarı açıksa görünür
- Her türün iki görünümü vardır, birinci görünüm varsayılandır. Hangi görünümün kullanılacağını temanın başlangıç düzeni ya da mağaza sahibi seçer. Görünümün renk, yazı ve köşe değerleri temadan gelir.

**Bağlam.**

- Bölüm alan değerleri dışında bir veriye ihtiyaç duyarsa onu "vitrin bağlamı"ndan alır (`cekirdek/vitrin/bolum-kutuphanesi/baglam.ts`). Bu veriler şunlardır:
  - mağaza adı ve logo
  - iletişim bilgileri ve adres
  - sosyal hesaplar
  - ödeme işaretleri
  - bölümlerin seçtiği menüler (adresleri kurulmuş olarak)
  - işlevler, sayılar, yıl ve altyapı adı
- Vitrin bağlamı istek başına bir kez okur (`cekirdek/vitrin/baglam-oku.ts`). Bölüm veritabanına kendisi gitmez, mağaza adını ya da iletişim bilgisini de kendisi yazmaz.
- Katalog aynı bölümleri örnek bağlamla çizer (`cekirdek/katalog/ornek-baglam.ts`).

**Menü alanı.**

- Yeni bir alan türü eklendi: menü seçimi. Menüye koduyla başvurulur. Temanın başlangıç düzeni de `ana-menu`, `kategori-menusu` ve `alt-bilgi` kodlarını seçebilir.
- Düzen servisi bölüm eklerken ya da değiştirirken menünün var olduğunu ve silinmediğini denetler. Menü satırını paylaşımlı kilitler, böylece aynı anda silinmekte olan bir menüye bağlanılamaz.
- Başlangıç düzeninde menü denetlenmez, çünkü menüler katalogdan sonra kurulur. Olmayan bir menüyü seçen bölüm vitrinde boş kalır.

**Telefon (kullanıcı kararı).**

- Telefonda logo satırında arama ve sepet kalır.
- Yan penceredeki bir bağlantıya basılınca pencere kapanır. Vitrinin çerçevesi sayfalar arasında yeniden çizilmez; pencere kendiliğinden kapanmazdı (bağımsız kontrol, tarayıcıda ölçüldü).
- Menü düğmesi soldan bir yan pencere açar. Bu pencerede seçilen menüler (alt düzeyi olan dal akordeonla açılır) ile hesap ve favoriler bulunur.
- Menü satırı yalnız masaüstünde görünür. Tablette menü düğmesi ve simgeler birlikte durur.

**İşlevler.**

- İşlev kaydına arama, favori, sepet ve ödeme eklendi. Bugün hepsi kapalıdır.
- Arama, favoriler ve sepet düğmeleri, ilgili işlev yazılınca görünür. Bugün kırık bağlantı göstermemek için gizlidirler.
- Ödeme işaretleri bölümü ödeme işlevine bağlıdır. İşaretler sitede gerçekten açık olan ödeme yöntemlerinden gelir (kullanıcı kararı). Ödeme modülü yazılana kadar bölüm vitrinde çizilmez, panel nedenini gösterir.

**Sosyal hesaplar.**

- Sosyal hesaplar yeni bir mağaza sahibi ayarıdır (`sosyalHesaplar`, başlangıçta boş). Her hesap bir site (`cekirdek/kayitlar/sosyal-siteler.ts`) ve bir kullanıcı adından oluşur.
- Hesabın adresini kayıt kurar. Böylece adres hep `https` olur, `@` içeren TikTok ve YouTube adresleri değişiklik kaydına adres olarak girmez.
- İkon setinde (Lucide) marka logoları yok. Projenin kuralı ikonların tek setten gelmesini istediği için hesaplar platformun adıyla yazılı bağlantı olarak görünür.

**Çerçeve.**

- Vitrin sayfaları `app/(vitrin)/` klasör grubuna taşındı. Adresler değişmedi.
- Çerçeve (`layout.tsx`) üst ve alt kısmı düzenden çizer: yalnız görünür ve çizilebilir bölümleri alır (`cizilecekBolumler`).
- Panel ve geliştirme sayfaları çerçevenin dışındadır.
- Düzen ya da bağlam okunamazsa sayfa üst ve alt kısım olmadan açılır, hata kaydedilir.

**Adresler.**

- Arama, sepet ve favorilerin adresleri ile kategori, marka ve ürün sayfalarının adres biçimi `cekirdek/vitrin/adresler.ts` dosyasında tek yerde tanımlandı: `/arama`, `/sepet`, `/favoriler`, `/kategori/<adres adı>`, `/marka/<adres adı>`, `/urun/<adres adı>`.

**Renkli zeminde odak.** Odak çerçevesinin rengi (`odak`) yalnız zemin ve yüzey üstünde okunur ölçülür. Alt kısımda ve renkli duyuru şeridinde çerçeve bölgenin yazı rengini alır (`odak-yazi-renginde`); yazı rengi o zeminde en az 4,5:1 olduğu için çerçeve 3:1'i geçer. Bağımsız kontrol eski hâlde alt kısımda 2,64:1, koyu temada birincil renkli şeritte 1,03:1 ölçtü.

**Logo.** Logo en çok 40 px yüksekliğinde ve satırın genişliğinde, oranını koruyarak çizilir. Eski hâlde 10:1 bir logo 320 px'te 5,5:1'e eziliyordu.

## Neden

- Bölümün veriyi kendisinin okuması, aynı sayfada aynı ayarın ve aynı menünün birçok kez okunması demekti. Ayrıca bölüm kodu sunucuya bağlanır, katalogda örnekle çizilemezdi.
- Menüye kimlik yerine kodla başvurmak, temanın başlangıç düzeninin kurulumdan önce menü seçebilmesini sağlar. Menünün kodu değişmez (karar 0082).
- Logo satırındaki dört simge telefonda mağaza adını üç harfe indiriyordu (ölçüldü). Kart yalnız arama ve sepetin her zaman erişilebilir kalmasını istiyor; hesap ve favoriler yan pencereye taşındı.
- Telefondaki menü düğmesi tarayıcıda çizilen bir bileşendir (`menu-dugmesi.tsx`). Sunucuda çizilen düğmede yan pencerenin tetikleyici özellikleri düğmeye geçmiyordu, ipucunun sarmalında kalıyordu; pencere açılmıyordu (tarayıcıda ölçüldü). Menü satırının düz düğmesi ve bağlantıları sunucuda çizilir ve çalışır, masaüstü testi bunu dener.

## Düşünülen diğer yollar

- **Her bölümün kendi verisini okuması:** Seçilmedi, nedeni yukarıda.
- **Ödeme işaretlerini mağaza sahibinin bir listeden seçmesi:** Kabul edilmeyen bir kartın işareti gösterilebilirdi. Kullanıcı açık yöntemlerden gelmesini seçti.
- **Menü satırının telefonda kendi "Menü" düğmesine dönüşmesi:** Ayrı bir satır kaplardı. Kullanıcı logo satırındaki düğmeyi seçti.
- **Sosyal hesapları bölümün bağlantı alanında tutmak:** `@` içeren adres değişiklik kaydına giremiyordu, ayrıca aynı hesapları e-postalar da kullanacak. Seçilmedi.
- **Marka logoları için ikinci bir ikon paketi:** Tek ikon seti kuralına aykırı. Seçilmedi; gerekirse ayrı kararla gelir.
- **Kayan duyuru şeridi:** Tasarım değerlerinde kayan hareket yok. Yeni hareket eklemek bu kartın dışında kaldı. Görünümler "ortalı" ve "ince" oldu.

## Sonuçları

- Kategori, marka, ürün, arama, sepet ve favori sayfaları henüz yok. Menüdeki kayıt bağlantıları o sayfalar yazılana kadar 404 sayfasına düşer. Arama, sepet ve favori düğmeleri işlevleri yazılana kadar görünmez.
- Hesap simgesi bugün giriş sayfasına gider. Hesap sayfası yazılınca adres değişir.
- Temanın başlangıç düzeni yalnız düzeni hiç yazılmamış siteye uygulanır. Düzeni önceden yazılmış bir site bu bölümleri kendiliğinden almaz; Örnek Mağaza'nın düzeni kart 0114'te gelir.
- Alt kısım bölümleri alt alta dizilir. Sütunları yan yana koyan bir alt kısım düzeni temanın işidir (kart 0114).
- Çerçeve düzen ya da bağlam okunamayınca sayfayı üst ve alt kısım olmadan açar. Bu davranış testte yok, yalnız disiplindir.
- Menüye ulaşmak iki bölüme bağlıdır. Masaüstünde menüler menü satırındadır, telefonda ve tablette logo satırının yan penceresindedir. Mağaza sahibi menü satırını gizlerse masaüstünde menü kalmaz. Logo satırını gizlerse ya da ona menü seçmezse telefonda menü kalmaz. Panel ekranı (kart 0113) bunu uyarı olarak göstermeli.
- Olmayan vitrin adresi (menüden kategori sayfasına giden bağlantı da) Next.js'in İngilizce 404 sayfasını üst ve alt kısım olmadan açar; hata sayfası da çerçevenin dışındadır. Düzeltmesi kart 0120'dedir.
- LinkedIn hesabı şirket sayfası olarak bağlanır (`/company/`); kişisel hesap bağlanamaz.
- Aynı düzende iki bağlantı sütunları bölümü aynı adlı iki gezinme alanı oluşturur.
- Kural: `.claude/rules/vitrin.md`.
