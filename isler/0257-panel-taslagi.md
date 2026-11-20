# 0257 · Yönetim panelinin taslağı

## Amaç

Seçilen yönün taslaklarında (Canlı Çarşı, karar 0075; panel çerçevesi, vitrin bölümleri ve menüler karar 0102; sipariş ekranlarının en azı karar 0145) bu bölümün ekranları yok. Bu bölümün ekran kartları kendi ekran görüntülerini taslakla yan yana koyup farkları düzeltecek; bunun için önce bu ekranların taslağı gerekir. Taslak kod yazılmadan önce kullanıcıya gösterilir ve onaylanır (kart 0134, 0211, 0233 ile aynı yol).

Bölüm: Yönetim paneli. Bu bölümün ilk işi.

## Olmazsa olmazlar

- Canlı Çarşı'nın değerleriyle, var olan taslaklarla aynı dosya düzeninde (`planlar/tasarim-yonu/panel.html`) şunlar çizilir:
  - ortak liste ekranı: arama, süzgeçler (seçili süzgeçlerin şeridi), sıralama, sayfalama, satır seçimi ve toplu işlem çubuğu, boş hâl, sonuçsuz hâl, yükleniyor hâli; telefonda tablo yerine liste;
  - ortak form: alanın altındaki hata, sayfanın başındaki hata özeti, kaydedilmemiş değişiklik uyarısı, kaydet çubuğu, yan pencerede ve tam sayfada form;
  - vitrin bölümü formları (Slider dahil, kartlar 0163, 0178) ve tema ayarları ekranı (logo, renkler, yazı tipi, köşe ve düğme biçimi, okunmayan renkte önerilen ton);
  - ürün: ürün listesi, ürün ekranı (genel bilgiler, açıklama, kategori, marka, etiket, vergi sınıfı, yayın durumu ve zamanı, adres adı, özellikler, seçenekler ve birleşimler, galeri ve video, fiyat, indirim ve fiyat geçmişi, stok ve stok geçmişi, ilgili ürünler); kategori, marka, etiket ve özellik ekranları;
  - sipariş: tam sipariş listesi (tarih aralığı, ödeme yöntemi, durum süzgeci), sipariş ayrıntısı, kargo ve fatura bilgisi, adres düzeltme, yazdırılacak sipariş fişi (A4 ve telefon önizlemesi);
  - müşteri: müşteri listesi, müşteri ayrıntısı (siparişleri, adresleri, mağazanın notları);
  - blog ve sayfalar: yazı listesi ve yazı formu, sabit sayfa listesi ve formu, menüye bağlama; vitrinde blog listesi, yazı sayfası ve sabit sayfa;
  - ekip: panel kullanıcıları listesi, kullanıcı ayrıntısı, roller ve izinleri, davet penceresi ve davetle gelen kişinin hesap açma sayfası;
  - yorum onayı ekranı (kart 0277): durum süzgeci, yorumun görünüşü, yayınlama, reddetme, ana sayfa işareti;
  - mağaza bilgileri ve satıcı bilgileri ekranı (kart 0278);
  - panelin karşılama sayfası (pano, kart 0186).
- Panel ekranları telefon ve bilgisayar genişliğinde, açık ve koyu temada; vitrin sayfaları da aynı.
- İçerik Örnek Mağaza'nın kataloğundan gelir, uydurma ürün kullanılmaz. Kişi, adres ve e-posta açıkça örnek olduğu belli olan değerlerdir.
- Ürün kararı gerektiren yerler taslakta seçenek olarak gösterilir ve kullanıcıya sorulur; en az şunlar:
  - bu bölümün listelerinde hangi toplu işlemlerin olduğu (on beşinci bölümün toplu işlemleri ayrıdır);
  - ürün ekranının yerleşimi (tek uzun sayfa ya da sekmeler) ve varyantlı üründe birleşimlerin fiyat ve stoğunun tabloda toplu girilip girilmediği;
  - sipariş adresinin hangi durumlara kadar düzeltilebildiği, ürün ve adet düzeltmenin bu bölümde olup olmadığı, düzeltmenin müşteriye bildirilip bildirilmediği;
  - faturanın nasıl eklendiği (fatura numarası, dosya, ikisi) ve müşteriye gösterilip gösterilmediği;
  - müşteri ayrıntısında mağazanın görebileceği ve yapabileceği işler (not, hesabı kapatma, şifre sıfırlama bağlantısı);
  - blog yazısının alanları (kategori, etiket, kapak görseli, yazar adı, yayın zamanı) ve sabit sayfaların vitrin adresi;
  - rollerin mağaza sahibince tanımlanıp tanımlanamayacağı ya da hazır rollerden mi seçileceği; davetin geçerlilik süresi.
- Siteden siteye değişebilecek davranış kullanıcıya karar olarak sorulmaz; varsayılanıyla site ayarı olarak önerilir ve Örnek Mağaza için hangi değerin önerildiği söylenir (`CLAUDE.md`, Roller). En az: panel listelerinde sayfa başına satır, sipariş fişinde görünenler, blogun açık olup olmadığı.

## Sınırlar

- Ürün kodu yazılmaz. Taslak kaynak değil, karşılaştırma ölçüsüdür (karar 0075).
- Var olan taslaklar değişmez.
- Kupon, on beşinci bölümün toplu işlemleri, Excel ve raporlar çizilmez; e-posta metinlerini düzenleme (kart 0279) ve panelin içindeki bildirimler (kart 0280) de on beşinci bölümdedir.
- Gerçek yasal metin çizilmez (kart 0063).

## Bitti sayılır

- Listelenen her ekran ve hâl taslakta iki genişlikte ve iki temada var.
- Kullanıcı taslağı onayladı, verdiği ürün kararları bir karar kaydına yazıldı, önerilen site ayarları `planlar/site-ayarlari.md` tablosuna girdi.

## Durum

yapılacak
