# Eklentiler

Eklenti, temel pakette olmayan bir özelliktir. Temel paketin listesi `temel-paket.md` dosyasındadır, orada adı geçmeyen her özellik bu kataloğa aittir. Her eklentinin bu klasörde tek bir tarif dosyası vardır. Claude bir eklentiyi eklerken önce bu tarifi ve `.claude/rules/` klasöründeki kuralları okur, eklentiyi o siteye uygun biçimde kendisi yazar. WooCommerce eklentileri farklı geliştiricilerin yazdığı ve birbirini bozabilen parçalardır, bizimkileri ise aynı projede, aynı kurallarla Claude yazar ve kod tamamen projenin sahibinindir.

Katalogdaki bir eklenti, kullanıcı istemeden kurulmaz.

## Tarif biçimi

Her tarif aynı başlıklarla yazılır.

| Başlık | Ne yazılır |
|---|---|
| **Ad** | Eklentinin kısa adı ve komutta kullanılacak kod adı, örneğin sepette-kalan-hatirlatma. |
| **Ne işe yarar** | Müşteri ve mağaza sahibi için ne sağladığı, iki üç cümle. |
| **Kimler için** | Hangi satış biçimlerinde ve hangi sitelerde anlamlı olduğu. |
| **Gerekenler** | Hangi temel parçaya ya da hangi başka eklentiye ihtiyaç duyduğu. |
| **Ayarlar** | Eklentinin site başına ayarları ve varsayılan değerleri. |
| **Veri** | Eklemesi gereken yeni kayıtlar ve mevcut kayıtlara eklenen alanlar. |
| **Ekranlar** | Vitrinde ve yönetim panelinde eklenecek ya da değişecek ekranlar. |
| **Bildirimler** | Gönderilecek e-posta, SMS ya da panel bildirimleri. |
| **Dış servis** | Bağlanacak dış servis, deneme ortamı olup olmadığı, hata olunca ne yapılacağı. |
| **Yasal notlar** | Uyulması gereken yasal kurallar. |
| **Bitti sayılır** | Eklentinin tamamlandığını gösteren kontrol listesi. |
| **Kapatılınca** | Eklenti kapatılınca ne olacağı, verinin nasıl korunacağı. |

## Eklenti nasıl eklenir

1. **İstek:** Kullanıcı eklentiyi kod adıyla ister, örneğin sepette-kalan-hatirlatma.
2. **Okuma:** Claude eklentinin tarifini, kural dosyalarını ve projenin karar kayıtlarını okur.
3. **Plan:** Claude bu siteye uygun planı `planlar/` klasörüne kaydeder ve kullanıcıya sade bir özetini sunar.
4. **Onay:** Kullanıcı planı onaylar ya da değiştirir.
5. **Kurulum:** Claude eklentiyi kendi çalışma kopyasında kurar, ayarı varsayılan olarak kapalı başlatır.
6. **Kontrol:** Otomatik kontroller ve testler koşar, Claude tarifteki "bitti sayılır" listesini tek tek dener.
7. **Denetim:** İşi yapmayan ikinci bir kontrol sonucu tarifle karşılaştırır. Bu kontrol kurulana kadar bu adımı Claude'un kendi kontrolü yapar.
8. **Yayın:** Eklenti tek komutla canlıya çıkar, kullanıcı ayarı panelden açar.
9. **Kayıt:** Tarihçeye giriş yazılır, eklenti sitenin ayarlarında açık olarak görünür.

Eklenti ekleme komutu henüz yok. İlk eklenti (stoğa gelince haber ver) elle kuruldu (kart 0144); komut bu kurulumdan çıkarılır (kart 0145). Eklentinin çekirdekteki yeri ve bağlantı noktaları: karar 0117, `.claude/rules/eklentiler.md`. Çalışma kopyası, tek komutla yayın ve bağımsız denetim de eğitimin ilerleyen bölümlerinde kurulur.

## Katalog

Parantez içindeki ad, eklentinin önerilen kod adıdır. Tarif dosyası bu adla yazılır, örneğin `sepette-kalan-hatirlatma.md`.

**Derste örnek gösterilen eklentiler**
- Stoğa gelince haber ver (`stoga-gelince-haber-ver`)
- Kartla ödeme ve taksit, sanal POS (`kartla-odeme`)
- Excel ile toplu ürün işlemleri (`excel-ile-toplu-urun-islemleri`)
- Trendyol bağlantısı (`trendyol-baglantisi`)
- Panelden ürün görseli üretimi (`panelden-urun-gorseli-uretimi`)
- Instagram ve Facebook kataloğu (`instagram-ve-facebook-katalogu`)
- Sepette kalan hatırlatma (`sepette-kalan-hatirlatma`)

**Satış biçimleri**
- Dijital ürün (`dijital-urun`)
- Online hizmet (`online-hizmet`)
- Randevulu hizmet (`randevulu-hizmet`)
- Etkinlik ve bilet (`etkinlik-ve-bilet`)
- Abonelik (`abonelik`)
- Üyelik (`uyelik`)
- Kiralama (`kiralama`)
- Ön sipariş (`on-siparis`)
- Sınırlı sayıda satış (`sinirli-sayida-satis`)
- Paket ürün (`paket-urun`)
- Kendi paketini oluştur (`kendi-paketini-olustur`)
- Hediye kartı (`hediye-karti`)
- Kişiye özel ürün (`kisiye-ozel-urun`)
- Ölçüye göre ürün (`olcuye-gore-urun`)
- Dosya yükleyerek sipariş (`dosya-yukleyerek-siparis`)
- Teklif usulü satış (`teklif-usulu-satis`)
- Açık artırma (`acik-artirma`)
- Bağış ve isteğe bağlı fiyat (`bagis-ve-istege-bagli-fiyat`)
- Siparişe göre üretim (`siparise-gore-uretim`)
- İkinci el ürün (`ikinci-el-urun`)

**Katalog ve stok**
- Başka sistemden veri taşıma (`baska-sistemden-veri-tasima`)
- Gruplu ürün (`gruplu-urun`)
- Kat adedi ve gruba ya da sepete göre adet kuralları (`adet-kurallari`)
- Mal kabul ve sayım (`mal-kabul-ve-sayim`)
- Çoklu depo ve depolar arası transfer (`coklu-depo`)
- Son kullanma tarihi ve parti takibi (`son-kullanma-ve-parti-takibi`)
- Seri numarası (`seri-numarasi`)
- Tedarikçi kataloğu aktarımı (`tedarikci-katalogu-aktarimi`)
- Tedarikçiden gönderim (`tedarikciden-gonderim`)
- 3B görünüm ve gelişmiş video oynatıcı (`urun-videosu-ve-3b-gorunum`)
- Dış bağlantılı ürün (`dis-baglantili-urun`)
- Pazaryerleri, Google ve reklam için ürün veri akışı (`urun-veri-akisi`)
- Enerji etiketi (`enerji-etiketi`)

**Vitrin ve sepet**
- Kodsuz sayfa düzenleyici (`kodsuz-sayfa-duzenleyici`)
- Duyuru çubuğu (`duyuru-cubugu`)
- Ücretsiz kargo hedefi (`ucretsiz-kargo-hedefi`)
- Kalıcı sepet (`kalici-sepet`)
- Sepeti paylaşma (`sepeti-paylasma`)
- Ürün karşılaştırma (`urun-karsilastirma`)
- Son bakılan ürünler (`son-bakilan-urunler`)
- Hızlı bakış (`hizli-bakis`)
- Ürün rozetleri (`urun-rozetleri`)
- Açılır pencere (`acilir-pencere`)
- Geri sayım (`geri-sayim`): ürün sayfası ve öteki yerler için; ana sayfanın geri sayımlı fırsatlar bölümü temel pakettedir (karar 0088)
- Mağaza bulucu (`magaza-bulucu`)
- Beden rehberi (`beden-rehberi`)
- Odanda gör ve sanal deneme (`odanda-gor-ve-sanal-deneme`)
- Uyumluluk sorgusu (`uyumluluk-sorgusu`)
- Fiyat düşünce haber ver (`fiyat-dusunce-haber-ver`)

**Arama**
- Akıllı ve anlamsal arama (`akilli-arama`)
- Görselle arama (`gorselle-arama`)
- Sesli arama (`sesli-arama`)
- Aramadan sayfaya yönlendirme (`aramadan-sayfaya-yonlendirme`)
- Arama sıralama kuralları (`arama-siralama-kurallari`)

**Ödeme**
- Banka sanal POS bağlantısı (`banka-sanal-pos`)
- Kapıda ödeme onayı (`kapida-odeme-onayi`)
- Yemek kartı ve alışveriş çekiyle ödeme (`yemek-karti-ve-alisveris-ceki`)
- Ön provizyon ve sonradan çekim (`on-provizyon`)
- Ödeme yöntemini koşula bağlama (`odeme-yontemi-kosullari`)
- Ters ibraz yönetimi (`ters-ibraz-yonetimi`)
- Dijital cüzdanlar (`dijital-cuzdanlar`)
- Karekod ile ödeme (`karekod-ile-odeme`)
- Alışveriş kredisi (`alisveris-kredisi`)
- Sonra öde (`sonra-ode`)
- Parçalı ödeme (`parcali-odeme`)
- Kapora (`kapora`)
- Mağaza bakiyesi (`magaza-bakiyesi`)
- Ödeme bağlantısı (`odeme-baglantisi`)
- Yurt dışı ödeme yöntemleri (`yurt-disi-odeme-yontemleri`)

**Kargo ve teslimat**
- Kargo firması bağlantısı (`kargo-firmasi-baglantisi`)
- Kargo sigortası (`kargo-sigortasi`)
- Birden çok kargo firması (`coklu-kargo-firmasi`)
- Kargo entegratörü (`kargo-entegratoru`)
- Kurye ve aynı gün teslimat (`kurye-ve-ayni-gun-teslimat`)
- Mağazadan teslim alma (`magazadan-teslim-alma`)
- Desiye ve ağırlığa göre kargo ücreti, kargo sınıfları (`desiye-gore-kargo-ucreti`)
- Teslimat noktası (`teslimat-noktasi`)
- Teslim günü seçimi (`teslim-gunu-secimi`)
- Birden çok adrese gönderim (`coklu-adrese-gonderim`)
- Uluslararası gönderi (`uluslararasi-gonderi`)

**Kampanya ve sadakat**
- Kampanya takvimi (`kampanya-takvimi`)
- Müşteri grupları ve davranışa göre gruplar (`musteri-gruplari`)
- Otomatik indirim (`otomatik-indirim`)
- X al Y öde (`x-al-y-ode`)
- Sepet tutarına göre indirim (`sepet-tutarina-gore-indirim`)
- Hediye ürün (`hediye-urun`)
- Sadakat puanı ve puanla ödeme (`sadakat-puani`)
- Müşteri seviyeleri (`musteri-seviyeleri`)
- Arkadaşını getir (`arkadasini-getir`)
- Satış ortaklığı (`satis-ortakligi`)
- İçerik üreticisi kodu (`icerik-ureticisi-kodu`)
- Doğum günü indirimi (`dogum-gunu-indirimi`)
- Çekiliş ve oyunlaştırma (`cekilis-ve-oyunlastirma`)
- Hediye listesi (`hediye-listesi`)

**İletişim ve pazarlama**
- Tarama hatırlatması (`tarama-hatirlatmasi`)
- Bülten (`bulten`)
- Toplu SMS (`toplu-sms`)
- İleti Yönetim Sistemi (İYS) bağlantısı (`iys-baglantisi`)
- WhatsApp bildirimi (`whatsapp-bildirimi`)
- Anlık bildirim (`anlik-bildirim`)
- Hoş geldin ve geri kazanma akışları (`hos-geldin-ve-geri-kazanma`)
- Yeniden sipariş hatırlatması (`yeniden-siparis-hatirlatmasi`)
- Memnuniyet anketi (`memnuniyet-anketi`)
- Kişiye özel öneri (`kisiye-ozel-oneri`)

**Yorum ve içerik**
- Ürün soru ve cevap (`urun-soru-cevap`)
- Mağaza puanı (`magaza-puani`)
- Satış bildirimi (`satis-bildirimi`)

**Satış kanalları**
- Pazaryeri komisyon hesaplayıcı (`pazaryeri-komisyon-hesaplayici`)
- Hepsiburada (`hepsiburada`)
- N11 (`n11`)
- Amazon ve diğer pazaryerleri (`amazon-ve-diger-pazaryerleri`)
- TikTok ve Pinterest kataloğu (`tiktok-ve-pinterest-katalogu`)
- Canlı yayında satış (`canli-yayinda-satis`)
- Videoyla alışveriş (`videoyla-alisveris`)
- Yapay zekâ asistanıyla satın alma (`yapay-zeka-asistaniyla-satin-alma`)

**Yurt dışı**
- Çok dil (`cok-dil`)
- Çok para birimi (`cok-para-birimi`)
- Konuma göre yönlendirme (`konuma-gore-yonlendirme`)
- Yurt dışı vergi ve gümrük (`yurt-disi-vergi-ve-gumruk`)
- Otomatik vergi servisi (`otomatik-vergi-servisi`)
- E-ihracat belgeleri (`e-ihracat-belgeleri`)

**Kurumsal satış**
- Kurumsal hesap ve şubeler (`kurumsal-hesap-ve-subeler`)
- Kurum içi roller (`kurum-ici-roller`)
- Sipariş onay akışı (`siparis-onay-akisi`)
- Excel'den toplu sipariş (`excelden-toplu-siparis`)
- Satın alma sipariş numarası (`satin-alma-siparis-numarasi`)
- Temsilci adına sipariş (`temsilci-adina-siparis`)
- Vergi muafiyeti (`vergi-muafiyeti`)
- Ek vergiler: vergi üstüne vergi, ÖTV, ekovergi (`ek-vergiler`)
- Toptan ve perakende ayrımı (`toptan-ve-perakende`)
- Alışveriş listeleri (`alisveris-listeleri`)
- Kuruma özel fiyat ve katalog (`kuruma-ozel-fiyat-ve-katalog`)
- Vadeli ödeme ve cari hesap (`vadeli-odeme-ve-cari-hesap`)
- Teklif isteme (`teklif-isteme`)
- Hızlı sipariş formu (`hizli-siparis-formu`)
- Bayi ağı (`bayi-agi`)

**Pazaryeri**
- Çok satıcılı yapı (`cok-saticili-yapi`)
- Satıcı paneli (`satici-paneli`)
- Komisyon ve satıcıya ödeme (`komisyon-ve-saticiya-odeme`)
- Anlaşmazlık yönetimi (`anlasmazlik-yonetimi`)

**Fatura ve muhasebe**
- E-fatura ve e-arşiv bağlantısı (`e-fatura-baglantisi`)
- Proforma fatura (`proforma-fatura`)
- Muhasebe programı bağlantısı (`muhasebe-programi-baglantisi`)
- Kurumsal yazılım bağlantısı (`kurumsal-yazilim-baglantisi`)
- E-irsaliye (`e-irsaliye`)
- Mali müşavir erişimi (`mali-musavir-erisimi`)

**Raporlar**
- Maliyet ve kâr marjı (`maliyet-ve-kar-marji`)
- Kâr raporu (`kar-raporu`)
- Satın alma hunisi (`satin-alma-hunisi`)
- A/B testi (`ab-testi`)
- Isı haritası (`isi-haritasi`)
- Müşteri yaşam boyu değeri (`musteri-yasam-boyu-degeri`)
- Reklam ölçüm kodları (`reklam-olcum-kodlari`)

**Yapay zekâ**
- Yapay zekâyla ürün açıklaması (`yapay-zeka-urun-aciklamasi`)
- Toplu arama motoru metni (`toplu-arama-motoru-metni`)
- Üründen paylaşım metni (`urunden-paylasim-metni`)
- Yapay zekâ asistanlarında görünürlük (`yapay-zeka-asistanlarinda-gorunurluk`)
- Alışveriş asistanı (`alisveris-asistani`)
- Yönetici asistanı (`yonetici-asistani`)
- Fiyat önerisi (`fiyat-onerisi`)
- Talep tahmini (`talep-tahmini`)
- Yorum özeti (`yorum-ozeti`)
- Sahte sipariş tespiti (`sahte-siparis-tespiti`)

**Müşteri hizmetleri**
- Sıkça sorulan sorular (`sikca-sorulan-sorular`)
- Çağrı merkezi bağlantısı (`cagri-merkezi-baglantisi`)
- Müşteri adına işlem (`musteri-adina-islem`)
- Canlı destek (`canli-destek`)
- Destek talepleri (`destek-talepleri`)
- Ortak gelen kutusu (`ortak-gelen-kutusu`)
- Garanti ve arıza başvurusu (`garanti-ve-ariza-basvurusu`)

**Mağaza içi satış**
- Kasa (`kasa`)
- Ortak stok (`ortak-stok`)
- Yazar kasa bağlantısı (`yazar-kasa-baglantisi`)
- Online al, mağazada iade et (`online-al-magazada-iade-et`)
- Ortak müşteri kaydı (`ortak-musteri-kaydi`)
- Gün sonu kapanışı (`gun-sonu-kapanisi`)
- Mağazada sipariş, eve gönderim (`magazadan-eve-gonderim`)
- Mağazada hediye kartı ve puan (`magazada-hediye-karti-ve-puan`)

**Otomasyon ve entegrasyon**
- İş akışı otomasyonu (`is-akisi-otomasyonu`)
- Başka yazılımlar için programlı erişim (`programli-erisim`)
- Olay bildirimi (`olay-bildirimi`)
- Müşteri ilişkileri yazılımı bağlantısı (`musteri-iliskileri-yazilimi-baglantisi`)
- E-posta pazarlama servisi bağlantısı (`e-posta-pazarlama-servisi-baglantisi`)
- Yapay zekâ ajanları için erişim (`yapay-zeka-ajanlari-icin-erisim`)

**Mobil**
- Telefona eklenebilen site (`telefona-eklenebilen-site`)
- Mağaza uygulaması (`magaza-uygulamasi`)

**Müşteri hesabı ve panel**
- Sosyal giriş (`sosyal-giris`)
- Verilerimi indir ve hesabımı sil (`veri-talepleri`)
- Tekrar sipariş (`tekrar-siparis`)
- Sipariş birleştirme (`siparis-birlestirme`)
- Planlı değişiklik (`planli-degisiklik`)

## Bu sürümde tarifi yazılmış eklentiler

- Sepette kalan hatırlatma (`sepette-kalan-hatirlatma.md`)
- Stoğa gelince haber ver (`stoga-gelince-haber-ver.md`): kuruldu (kart 0144, karar 0117), Örnek Mağaza'da açık
