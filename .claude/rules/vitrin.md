---
paths:
  - "cekirdek/vitrin/**"
  - "cekirdek/moduller/duzen/**"
  - "cekirdek/moduller/menu/**"
  - "cekirdek/katalog/deneme-bolumu/**"
  - "cekirdek/uygulama/app/**"
  - "cekirdek/temalar/**"
  - "siteler/**"
  - "**/sitemap*"
  - "**/robots*"
---

# Vitrin yapısı

- Ana sayfa afişi, ürün ızgarası, kategori listesi, yorum alanı gibi vitrin bölümlerini ortak bileşenlerden kur ve site tasarım değerleriyle giydir.
- Ortak bileşenle yapılamayan vitrin bölümünü o sitenin klasöründe yaz. İkinci bir sitede de gerekince çekirdeğe taşı.
- Sepet, ödeme formu, adres formu, stok kontrolü ve sipariş takibi bütün sitelerde aynı koddur. Yalnız görünümü site tasarımıyla değişir.
- Ana sayfanın ilk düzenini sitenin klasöründe başlangıç değeri olarak yaz (`baslangic/duzen.json`, yoksa temanın düzeni). Sonraki düzen mağaza sahibinin ayarıdır, veritabanında durur ve panelden değişir (karar 0010). Düzen değişikliği kod değişikliği gerektirmesin.
- Sitenin başlangıç düzeni kategori, marka, etiket ve ürüne adres adıyla başvurur; adres adı başlangıç kataloğunda olmalıdır. Düzen katalogdan sonra kurulur ve adres adları `baslangicDuzeniniBagla` ile kimliğe çevrilir (`cekirdek/moduller/duzen/baslangic.ts`, karar 0092). Görsele `baslangic/gorseller/` klasöründeki dosyanın adıyla başvurur; görsele başvuran düzeni yalnız arka plan sürecinin açılıştaki kurulumu yazar (karar 0094). Açılıştaki kurulum `baslangiclariKur` (`cekirdek/arka-plan-isleri/baslangic.ts`) ile yapılır; tarayıcı testlerinin hazırlığı da onu çağırır (karar 0097). Temanın düzeni kayda başvurmaz, metin isteyen bölüm de koymaz.
- Ürünün listede, aramada, önerilerde ve sepette görünen kartını tek bileşenden çıkar.
- İndirimli fiyatı, üstü çizili eski fiyatı ve para birimini her yerde tek fiyat bileşeniyle göster.
- Sayfa başlığı, açıklama, yapılandırılmış veri ve paylaşım görselini sayfa türüne göre ortak bir üreticiden al.
- Ürün ya da kategori adresi değişince eski adresi kalıcı olarak yenisine yönlendir. Site haritası kendiliğinden üretilsin.

## Adresler ve sayfa iskeleti (karar 0103)

- Kategori, marka, etiket ve ürün sayfasının adresi `kayitAdresleri` ile kurulur, türler `cekirdek/kayitlar/adres.ts` kaydındadır. Adresteki ad yalnız `kayitAdresiniCoz` (`cekirdek/moduller/gorunurluk/adres.ts`) ile kayda çevrilir: kayıt yoksa sayfa "bulunamadı"dır, eski adres bugünkü adrese kalıcı yönlenir (308), sorgu kısmı korunur. Sayfa bunu `KayitSayfasi` ve `sayfaninKaydi` ile yapar (`cekirdek/vitrin/kayit-sayfasi.tsx`).
- Eski adresleri yalnız veritabanındaki tetikleyici yazar (`eski_adresler`, değişiklikler 0031 ve 0032): ad değişince ve kayıt silinince. Servis bu tabloya yazmaz. Yönlendirme zincirsizdir, silinmiş ya da sayfası açılmayan kayda gitmez; adı şu an görünmeyen bir kayıt taşıyorsa adres bulunamaz.
- Sekme başlığı ve açıklama yalnız `cekirdek/moduller/gorunurluk/sayfa-bilgisi.ts` ile üretilir. Sayfa başlığını `sayfaBasligi` ile verir ("<sayfa> | <mağaza adı>", tam başlık); başlık vermeyen sayfa mağaza adını alır. Next.js'in `%s` kalıbı kullanılmaz.
- Vitrin sayfasının iskeleti kütüphanenin parçalarıyla kurulur: `SayfaYolu`, `SayfaBasligi`, `BosHal`, sayfa geçişinde `Sayfalama` ya da `DahaFazla`. Sayfa bunları kendisi yeniden yazmaz.

## Filtreli ürün listesi (karar 0105)

- Kategori, marka, etiket ve arama sayfasının ürün listesi yalnız `filtreliUrunListesi` (`cekirdek/vitrin/urun-listesi/veri.ts`) ile kurulur; kapsam koşulu kategori servisinin `kategoriUrunKosulu`'ndan ya da grup servisinin `urunKosulu`'ndan gelir. Sayfa bunu `KayitListesiSayfasi` ile çizer.
- Filtre kuralları ve sayılar yalnız `cekirdek/moduller/urun/filtre.ts`'dedir. Fiyat filtresi ve sıralaması kartın fiyatıdır (`fiyatAraliklari`); fiyat SQL'de yeniden hesaplanmaz.
- Filtre, sıralama ve sayfa adreste durur; adres yalnız `adres.ts` ile okunur ve kurulur. Müşterinin yazdığı tutar biçimleyicinin `paraOku`'suyla okunur.
- Önerilen sıra ürünün vitrin sırasıdır, yalnız `vitrinSirasiniDegistir` yazar.

## Arama (karar 0107)

- Aramanın harf kuralı yalnız `cekirdek/metinler/arama-anahtari.ts`'dedir (`aramaAnahtari`, veritabanında `aramaAnahtariSql`); ad tekilliğinin kuralıyla (`ad-anahtari.ts`) karıştırılmaz.
- Aramanın koşulu ve "en uygun" puanı yalnız `cekirdek/moduller/urun/arama.ts`'den gelir (`aramaSorgusu`, `aramaKosulu`, `uygunlukPuani`); liste `filtreliUrunListesi` ile kurulur, görünürlük orada uygulanır. Sözcük `strpos` ile aranır, `LIKE` kullanılmaz.
- "En uygun" sıralaması yalnız arama sayfasındadır (`aramaSiralamalari`); kategori sayfası adreste görse de yok sayar.
- Arama kutusu `AramaKutusu` (`cekirdek/vitrin/arama-kutusu.tsx`) ile çizilir, kütüphanenin `AramaFormu`'nu kullanır. Arama sayfasının istek sınırı ara katmandadır (`proxy.ts`, `istekSinirlari.arama`).

## Bulunamadı ve hata sayfası (karar 0104)

- Vitrinde olmayan adres ve olmayan kayıt `notFound()` ile `app/(vitrin)/not-found.tsx`'e düşer (`BulunamadiSayfasi`); vitrinin hata sınırı `app/(vitrin)/error.tsx`'tir (`HataSayfasi`). İkisi de çerçevenin içindedir. Sayfa kendi "bulunamadı" ekranını yazmaz.
- Eşleşmeyen adresi `app/(vitrin)/[...adres]` yakalar. Kapı, panel ve geliştirme kendi yakalayıcısıyla ondan ayrılır; vitrin dışı yeni bir adres ailesi açan iş kendi yakalayıcısını ekler. Tarayıcının kendiliğinden istediği dosya adresleri (`/favicon.ico`) yakalayıcıya düşmez.
- `notFound()` veren vitrin sayfası sayfa bilgisinde `bulunamadiSayfaBilgisi`'ni döner: sekme başlığı "Sayfa bulunamadı | <mağaza>" olur.
- Tarayıcıdaki bir vitrin ekranına çerçevenin verisi gerekirse sağlayıcıyla verilir (`VitrinBilgisiSaglayici`); ekran veritabanına gitmez.

## Ürün kartı ve fiyat (karar 0085)

- Ürünün kartı `UrunKarti`, fiyatı `FiyatGosterimi` ile çizilir (`cekirdek/vitrin/urun-karti/`). Kartın verisi yalnız `urunKartlari` ile gelir: görünürlük, fiyat aralığı, indirim oranı, stok durumu ve görsel çekirdeğin tek işlevlerinden. Kartta ya da bölümde fiyat, oran ya da stok durumu yeniden hesaplanmaz.
- Kartın görünümü `urunKartiGorunumu` ile bulunur: bölümün seçimi, yoksa temanınki (vitrin bağlamındaki `parcaGorunumleri`). Görünümler `cekirdek/kayitlar/tema.ts` kaydındadır.
- Ürün görseli yalnız ürün görseli ucundan (`urunGorseliAdresi`) gösterilir; dosyanın kimliği vitrinde adres olmaz.

## Ürün sayfası (karar 0108)

- Ürün sayfası `UrunSayfasi` (`cekirdek/vitrin/urun-sayfasi/sayfa.tsx`) ile çizilir, verisi yalnız `urunSayfasiVerisi`'nden (`veri.ts`) gelir. Her birleşimin fiyatı, stok yazısı ve stok kodu sunucuda fiyat bileşeniyle çizilir; tarayıcı yalnız seçili birleşiminkini gösterir, hesap yapmaz. Tek birleşimin fiyatı `araliginiKur` ile kurulur (rozet ve bitiş kartla aynı kural).
- Renk ve beden seçiminin kuralları ve adresi yalnız `secim.ts`'tedir (`degerDurumu`, `secimiDegistir`, `ilkSecim`, `secimdenSorgu`). Parametre ürün listesinin filtresiyle aynıdır (`secenek-<seçenek>`). İlk seçim ve tükenmiş değerin gösterimi mağaza sahibinin ayarıdır (`secenekOnSecimi`, `tukenmisSecenek`).
- Uzun açıklama yalnız `aciklamayiTemizle` ile temizlenmiş olarak ve `bicimli-metin` stiliyle çizilir.
- Galeri ürün görseli ucundan boyutlarıyla çizilir; video yalnız oynata basınca yüklenir. Seçili birleşimin görseli ilk öğe değilse şerit, sayfanın kodu bağlanmadan satır içi küçük bir betikle o öğeye kaydırılır (karar 0122).
- Eklentilerin ürün sayfası parçası yalnız yuvadan gelir (`UrunSayfasiYuvalari`, karar 0117): stok yazısının altında, seçili birimi `useSeciliBirim` ile okur. Bir eklenti tükenmiş birim için iş görüyorsa tükenmiş değer seçilebilir (`tukenmisSecilebilir`, kart 0144); kural `secimiDegistir`'dedir. Müşterinin elle seçtiği değer sessizce değişmez: tükenmiş değer seçilebiliyorsa korunur, değişmek zorundaysa `degisenSecimler` ile söylenir. Tercih sayfa açılırken yalnız adresteki seçimdir (`adrestekiSecim`); ayarın ilk seçimi tercih değildir (kararlar 0118, 0119).

## Ürün yorumları (karar 0109)

- Yorum yalnız `cekirdek/moduller/yorum/servis.ts` ile yazılır ve okunur. Yalnız yayındaki yorum görünür ve ortalamaya girer: ürün sayfası, ürün kartının puanı ve ana sayfa bölümü `puanOzetleri`, `urunYorumlari` ve `anaSayfaYorumlari`'nı kullanır; yorum ya da puan başka yerde sayılmaz.
- Satın alma denetimi yalnız `satinAldiMi`'dır (`cekirdek/moduller/yorum/satin-alma.ts`). Sipariş modülü onu siparişlere bağlar.
- Yorum metni düz metindir, yazı olarak çizilir (HTML olarak çizilmez). Görünen ad kısaltılmış saklanır (`kisaAd`).
- Sayfa çizilirken müşterinin oturumu okunmaz: yazma izni "Yorum yaz" basılınca müşteri ucundan sorulur. Girişe giden müşteri `girisAdresiDonuslu` ile, yalnız vitrinin kendi sayfasına döner (`vitrinDonusu`).

## Favoriler (karar 0110)

- Favori yalnız `cekirdek/moduller/favori/servis.ts` ile yazılır ve okunur. Listede yalnız sayfası açılan ürün görünür (`vitrinKosulu`, sayfa yeri); sınır sitenin `favoriSiniri` ayarıdır ve yalnız görünen favorileri sayar.
- Vitrinde favori durumu yalnız `cekirdek/vitrin/favori-durumu.ts`'tedir: düğme `FavoriDugmesi`, sayı `FavoriSayisi` ile (`favori-dugmesi.tsx`). Hesap durumundan sonra tek istek gider; değişiklik istekleri sırayla gider. Favori düğmesini başka yerde yeniden yazma.
- Üye olmayan müşterinin listesi ve favoriler sayfasının çerezi yalnız `favori-deposu.ts` ile okunur ve yazılır; yalnız ürün kimlikleri saklanır. Çıkış (`cikisYap`) çerezi siler.
- Favoriler sayfası kartları çerezdeki listeyle sunucuda `urunKartlari` ile çizer; sırayı ve görünenleri tarayıcıdaki durum seçer (`favori-listesi.tsx`). Çerezde ürün yoksa boş hâl durum bilinmeden çizilir (karar 0125).
- Vitrinin bildirim alanı çerçevededir (`VitrinBildirimleri`); vitrin ekranı bildirimi `bildirimGoster` ile verir, ikinci bir alan açmaz.

## Ana sayfa bölümleri ve görseller (karar 0087)

- Ana sayfa düzenin ana sayfa alanını çizer; bölüm yoksa sade sayfa görünür. Bölümün başlığı h2'dir, sayfanın h1'i mağaza adıdır.
- Bölümün ve kategorinin görseli yalnız vitrin görseli ucundan (`vitrinGorseliAdresi`) ve `BolumGorseli` ile (`cekirdek/vitrin/bolum-kutuphanesi/gorsel.tsx`) gösterilir. Görselin ölçüsü ve adresleri vitrin bağlamındadır; bölüm görsel adresi yazmaz.
- Bölüm metnindeki ayar değeri yalnız yer tutucuyla gelir (`cekirdek/kayitlar/yer-tutucular.ts`, `yerTutuculariDoldur`). Değeri olmayan yer tutucuyu taşıyan metin çizilmez.
- Renkli zemin `zeminSiniflari` ile okunur çiftiyle seçilir (`cekirdek/vitrin/bolumler/ortak/zemin.ts`), renkli zeminde odak yazının rengindedir.
- Kendiliğinden hareket eden bölüm durdurulabilir ve hareket azaltma tercihinde kendiliğinden hareket etmez (`useHareketAzaltma`).

## Ürün bölümleri (karar 0088)

- Ürün gösteren bölüm ürünlerini yalnız ürün kaynağından, vitrin bağlamı üzerinden alır (`kaynaklarinUrunleri`, `cekirdek/vitrin/urun-kaynagi.ts`; anahtar `urunKaynagiAnahtari`). Kaynakta görünürlük, tükenen ürün ve sıra sorgudadır; bölüm ürünü yeniden süzmez, sıralamaz.
- İndirimdeki ürünün listesi yalnız `indirimdekiUrunKosulu` ile süzülür. Kartta görünen indirim tek ölçüdür: rozeti çıkaran oran (`fiyat.indirim`); geri sayım, "indirimdekiler" ve fırsatlar ona bakar. İndirimin bitişi kartın fiyatından (`indirimBitisi`) okunur; geri sayımın bitişi elle girilmez, bölümde hesaplanmaz.
- Ürün bölümünün ızgarası, başlık satırı ve yan afişi ortak parçalardır (`cekirdek/vitrin/bolumler/ortak/urun-izgarasi.tsx`, alanları `urun-alanlari.ts`). Yan afişin görseli masaüstünde altta kalan yüksekliği doldurur, daha darda sağda kendi oranıyla durur (karar 0121).
- Sayfa açıkken değişen vitrin bilgisi (geri sayım) sunucuda bağlamın anıyla çizilir, tarayıcıda yalnız değişeceği anda yeniden kurulur.

## İşleve bağlı bölümler (karar 0090)

- Yorum, blog ve bülten bölümlerinin verisi vitrin bağlamındadır (`yorumlar`, `blogYazilari`, `bultenKaydi`; türleri `cekirdek/vitrin/bolum-kutuphanesi/islev-verisi.ts`). İşlev yazılınca bağlamı bu türlerle doldur, bölümü değiştirme. Bülten bölümü bağlamda gönderim adresi yoksa çizilmez.
- Bütün odaklanabilir öğeleri zemin renginde bir kutuda olan renkli bölge `zeminSiniflari(…, { odak: false })` kullanır: renkli zeminin odak kuralı iç kutuya geçip odağı görünmez yapar.
- Vitrinde içeriği boş kaldığı için çizilmeyen bölüm türü boşluğunu tek işlevle bulur ve kaydeder (`bolumBosluklari`, `cekirdek/vitrin/bolum-kutuphanesi/gorunumler.tsx`, kart 0172): görünüş o işlevle `null` döner, panel aynı işlevle vitrinin bağlamını okuyarak "şu an vitrinde görünmüyor" der (`bosBolumMetinleri`). Boşluğu veriye bağlı yeni tür kayda ve metin listesine eklenir (tür kontrolü ister); görünüş boşluğu ayrıca yazmaz.
- Paneldeki çizilmeme nedeninin metni yalnız `cizilmemeNedeniMetni` ile seçilir. Yeni işlev eklenince `islevYokMetinleri`'ne metni eklenir (tür kontrolü ister).
- Pazarlama onayının metni tektir (`vitrin.onay.pazarlama`). Onay isteyen yeni form da onu kullanır.
- Her sayfada ya da ana sayfada duran robotlu form `useRobotluGonderim({ ertele: true })` kullanır: sayfa açılınca robot sorusu istenmez.

## Bölüm kütüphanesi (karar 0081)

- Üst kısım, ana sayfa ve alt kısım bölümlerden kurulur. Bölüm türünün tarifi (`cekirdek/vitrin/bolum-kutuphanesi/tarif.ts`) adını, konabileceği alanları, alanlarını ve türlerini, görünümlerini ve bağlı olduğu işlevi yazar. Alanların şeması, panelin düzenleme formu ve düzen servisi bu tariften çıkar.
- Yeni bölüm türü `cekirdek/vitrin/bolumler/<tür>/` klasörüne yazılır, tarifi `kutuphane.ts`'e, görünüşü `gorunumler.tsx`'e kaydedilir. Bölüm kodunda elle içerik (ürün adı, fiyat, görsel adresi, bağlantı, cümle) yazmak denetimde hatadır; içerik alan değerlerinden ve veriden gelir.
- Düzen yalnız `cekirdek/moduller/duzen/servis.ts` ile okunur ve değişir. Vitrin bölümleri `cizilecekBolumler` ile alır ve `DuzenAlaniCizimi` ile çizer: her bölüm kendi hata sınırının içindedir.
- Panel düzeni düzen uçlarıyla değiştirir (`cekirdek/kapi/yonetici/duzen.ts`, kart 0142, karar 0115). Önceki hâline dönüş `oncekiHaleDon`'dur: çağıranın gördüğü son sürümü ister, tema değişikliğinin yazdığı sürümü geri almaz. Formun seçenekleri `duzenSecenekleri` ile gelir.
- Düzen yazması kategoriye başvurunca satırları kilitlemeden önce kategori kilidini alır; kilit sırası düzen, kategori, satırlar (karar 0114). Kategori servisi düzen kilidini almaz. Ürünlerin vitrin sırasıyla kilitlenme kart 0159'dadır.
- Bölümün bağlı olduğu işlev `cekirdek/kayitlar/islevler.ts` kaydındadır. İşlev yazılınca orada açılır; bölüm kendiliğinden çizilir.
- Yayınlanmış bir görünüm, alan, seçim seçeneği ya da renk tariften ancak `eskiKodlar`'da bugünkü karşılığı yazılarak kaldırılır ya da adı değişir (karar 0113): eski düzen okunurken karşılığına çevrilir. Tarife eklenen her yeni kod `yayinlanan-kodlar.json`'a da eklenir; kayıt yalnız büyür. İkisini `testler/yayinlanan-kodlar.test.ts` denetler. Bölüm türü kaldırmak ayrı karar ister.

## Menüler (karar 0082)

- Menüler ve alt bilgi bağlantıları mağaza sahibinin verisidir. Yalnız `cekirdek/moduller/menu/servis.ts` ile okunur ve değişir. Türler, hedefler, derinlik ve sınırlar `cekirdek/kayitlar/menu.ts` kaydındadır: derinliği ya da hedef türünü kodda elle yazma.
- Telefonun yan penceresi kategori ağacından gelen menüyü tek bir "Kategoriler" dalı olarak çizer (`YanMenuGrubu`, bağlamın `kategoriMenuleri`; karar 0120).
- Vitrin menüyü koduyla `vitrinMenusu` ile alır. Görünmeyen öğeyi (silinmiş ya da açılmayan hedef, boş başlık) süzmek servisin işidir, bölüm yeniden süzmez. Kategori menüsü ağaçtan gelir, kategori listesini bölümde ayrıca okuma.
- Başlangıç menüleri sitenin `baslangic/menuler.json` dosyasındadır. Kayıtlı hedef adres adıyla yazılır, başlangıç kataloğunda olmalıdır.
- Panel menüleri menü uçlarıyla değiştirir (`cekirdek/kapi/yonetici/menu.ts`, kart 0143, karar 0116). Öğe uçta nesne olarak alınır, ortak şemayla serviste doğrulanır.

## Üst ve alt kısım (karar 0083)

- Vitrin sayfaları `app/(vitrin)/` altındadır; çerçeve üst ve alt kısmı düzenden `UstKisim` ve `AltKisim` (`cekirdek/vitrin/ust-alt-kisim.tsx`) ile çizer. Yeni vitrin sayfası bu klasöre yazılır.
- Bölüm mağaza adı, logo, iletişim, sosyal hesaplar, menüler gibi veriyi yalnız vitrin bağlamından alır (`baglam.ts`); bağlam istek başına bir kez `vitrinBaglaminiOku` ile okunur. Bölüm veritabanına kendisi gitmez.
- Vitrinin adresleri `cekirdek/vitrin/adresler.ts` dosyasındadır; kategori, marka, etiket ve ürün sayfasının adresi `kayitAdresleri` ile kurulur.
- Henüz yazılmamış bir sayfaya giden düğme (arama, favori, sepet) işlevine bağlanır; işlev açılınca görünür.
- Müşterinin oturumu vitrinde yalnız `useHesapDurumu`, çıkış yalnız `cikisYap` ile (`cekirdek/vitrin/hesap-durumu.ts`, karar 0098): sayfada tek istek gider, yalnız 401 girişsizdir. Hesabım menüsü üst satırdadır, katalogun örnek bağlamında (`musteriOturumu: "ornek"`) istek gitmez.
- Radix tetikleyicisine (`asChild`) verilen ve ipucuyla sarılı parça (ikon düğmesi) sunucuda çizilen bölümde tetikleyicinin özelliklerini almaz; böyle bir parça tarayıcıda çizilen bileşene yazılır (`menu-dugmesi.tsx`).

## Tema demosu (karar 0127)

- Vitrin temayı yalnız `vitrinTemasi` ile okur (`cekirdek/vitrin/tema-secimi.ts`): tema demosunda (site ayarı `temaDemosu`) ziyaretçinin seçtiği tema, öteki sitelerde kayıtlı tema. Panel kayıtlı temayı okur (`siteninGecerliTemasi`).
- Seçim adreste `?tema=<kod>` ile gelir; ara katman çereze yazıp parametresiz adrese yönlendirir (`cekirdek/uygulama/proxy.ts`). Sitenin kullanamayacağı tema yok sayılır. Sabitler `temaDemosu` kaydındadır (`cekirdek/kayitlar/tema.ts`).
- Demoda ziyaretçi yalnız gezer: müşterinin hesabına giden sayfa `musteriSayfasiniAc` ve `musteriSayfasiBilgisi` ile bulunamadı verir (`cekirdek/vitrin/yalniz-gezinti.ts`), bağlamın müşteri oturumu `"yok"`tur (hesap öğesi çizilmez), "Yorum yaz" ve favoriler sayfasının giriş bağlantısı yoktur, tarayıcıdaki hesap durumu sayfa kökündeki işaretle oturum sormaz. Yeni bir müşteri işlemi aynı yolla kapanır.
- Demo şeridi (`TemaDemosuSeridi`) vitrinin en üstündedir; tema geçişi sayfayı baştan yükler, çünkü temanın değerleri kök düzendedir.
- Demo arama motorlarına kapalıdır: ara katman her yanıta `X-Robots-Tag`, çerçeve `noindex` yazar.
