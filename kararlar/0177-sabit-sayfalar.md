# 0177 · Sabit sayfalar ve menüye bağlanma

## Tarih

2026-11-24

## Karar

Mağaza sahibi hakkımızda, iletişim gibi sabit sayfalar yazar ve menüye bağlar (kart 0273; taslak ve adres karar 0157).

- **Modül:** blogla aynı modül (`cekirdek/moduller/icerik/`, karar 0176), tablo `sabit_sayfalar` (değişiklik 0056). Alanlar: başlık, adres adı, biçimli içerik, arama motoru açıklaması (isteğe bağlı), yayın durumu. Durum yalnız yayında ya da taslaktır (`cekirdek/kayitlar/sayfa.ts`); zamanlama yoktur. Sitede en çok 100 sayfa.
- **Vitrin:** `/sayfa/<adres adı>`, vitrinin çerçevesinde sade metin sayfası (sayfa yolu, başlık, içerik). Vitrin koşulu tektir (`sabitSayfaVitrinde`): sayfa, adres çözümü (`kayitAdresiniCoz`, tür `sayfa`) ve menü onu kullanır. Taslak ve silinmiş sayfa bulunamadı verir. Adı değişen ya da silinen sayfanın eski adresi ürünlerin tetikleyicisiyle saklanır (`eski_adresi_sakla`); vitrin eski adresi kalıcı olarak yönlendirir. İçerik `aciklamayiTemizle` ile temizlenir. Arama motoru açıklaması boşsa içeriğin düz yazısının başı kullanılır (`bicimliMetninDuzYazisi`), o da boşsa türün kalıbı.
- **Değişiklik:** blog yazısıyla aynı kurallar: ekran gördüğü değişme anını gönderir, arada değişen sayfa çakışır (`sayfa-degisti`), yalnız değişen alanlar gider. Kayda başlık, adres adı ve durum girer; içerik ve açıklama girmez.
- **Menü:** öğe sabit sayfaya (`sayfa`) ve tek bir blog yazısına (`blog-yazisi`) bağlanır; ikisi de kayıtlı hedeftir (kimlikle, `sayfa_kimligi` ve `blog_yazisi_kimligi` alanları, veritabanının hedef denetimi de). Taslak ya da silinmiş sayfanın öğesi vitrinde görünmez, panelde işaretlenir (öteki hedeflerle aynı kural). Blog yazısının öğesi yazı vitrinde değilse ya da blog kapalıysa görünmez: menü okuması blogun açıklığını ister (`MenuOkumaSecenekleri.blogAcik`; verilmezse kapalı sayılır, vitrin bağlamı ve panel ayarı okuyup verir).
- **Arama:** menü formunda sayfa ve blog yazısı ayrı uçla aranır (`icerik-ara`, `icerik.gor`); katalogun araması (`kayit-ara`, `urun.gor`) değişmedi.
- **Panel:** "İçerik" grubunda Sayfalar (kısa liste, liste motoruna girmez; taslağın notu), Yeni sayfa ve Sayfa (`?kimlik=`). İzinler blogunkilerdir (`icerik.gor`, `icerik.degistir`, `icerik.sil`). Sayfanın ekranı hangi menülerde olduğunu gösterir (`kayitlarinMenuYerleri`); "Menüye ekle" menüler ekranını öğe penceresi bu sayfa seçili açılmış olarak getirir (`?ekle-sayfa=`, `menu.degistir` izni olana). Menü verilmezse öğe alabilen ilk menü seçilir.
- **Başlangıç sayfaları:** sitenin `baslangic/sayfalar.json` dosyası; açılışta katalogdan sonra, menülerden önce, sitede hiç sayfa satırı yoksa bir kez kurulur. Başlangıç menüsü sayfaya adres adıyla bağlanabilir; site doğrulaması adres adının dosyada olduğunu denetler. Örnek Mağaza Hakkımızda ve İletişim ile açılır, ikisi alt bilgi menüsünün "Kurumsal" sütunundadır (kullanıcı kararı); bir de taslak SSS sayfası vardır.

## Neden

- Blogla aynı modül: aynı izinler, aynı içerik temizliği ve aynı adres yolu; ikinci bir kural yazılmasın.
- Zamanlama yok: sabit sayfa bir gün yayına girecek bir duyuru değildir, taslak ve yayında yeter (taslak da yalnız bunu çizdi).
- Blog yazısını menüye bağlamak karar 0176 ile bu karta bırakılmıştı; aynı kayıtlı hedef yolundan gider, ek bir yapı gerektirmez.
- İçeriğin ayrı arama ucu: "İçerik editörü" rolü (kart 0274) ürünleri görmeden sayfayı menüye bağlayabilmeli.
- Blog ayarını menü okumasına vermek: blog kapalıyken yazının sayfası bulunamadı verir; menüde kalan bağlantı ölü olurdu.
- "Menüye ekle"nin menüler ekranını açması: menüye öğe eklemenin tek yeri menüler ekranıdır (sıra, üst öğe, derinlik orada); sayfa ekranında ikinci bir menü formu olmasın.

## Düşünülen diğer yollar

- **Sayfayı menüye sayfa ekranındaki bir pencereden eklemek:** menüyü, üst öğeyi ve sırayı ikinci kez sormak gerekirdi; menü formunun kopyası olurdu.
- **Blog yazısını bu kartta menüye bağlamamak:** kart yalnız sayfayı istiyordu, ama karar 0176 blog yazısını bu karta bırakmıştı; aynı yolla az ek iş.
- **Kayıt aramasını tek uçta tutup izni türe göre denetlemek:** uç tanımı tek izin alır; rol erişim testi ve uç belgesi tek izni ölçer.
- **Yayın zamanlaması:** blogdaki gibi zamanlanmış sayfa; ihtiyaç yok, panel sadeleşir.
- **Kökte adres (`/hakkimizda`):** karar 0157'de seçilmedi.

## Sonuçları

- Menünün okuma işlevi blogun açıklığını ister; ayarı vermeyen yeni bir çağıran blog yazısı öğesini gizler (güvenli yön).
- Menüye ekleme penceresi menü verilmeden açılınca ilk elle kurulan menüyü seçer; başka menüye eklemek için menü solda seçilip "Öğe ekle" kullanılır.
- Yasal metinler (üyelik sözleşmesi, KVKK) bu listede değildir; kart 0063'tedir.
- Sitede daha önce menüler kurulmuşsa başlangıç sayfaları kurulur ama menüye kendiliğinden eklenmez (menüler bir kez kurulur).
- Başlangıç menüsü blog yazısına bağlanmaz (şema kabul etmez): başlangıç blogu menülerden sonra kurulur.
