# 0157 · Yönetim paneli taslağının ürün kararları

## Tarih

2026-11-21

## Karar

On dördüncü bölümün (yönetim paneli) taslağı `planlar/tasarim-yonu/panel.html` dosyasıdır (kart 0257). Canlı Çarşı yönünde (karar 0075) şunları çizer: pano, ortak liste ekranı (ürün listesiyle) ve ortak form yapısı (mağaza bilgileriyle), tema ayarları, kayan afiş formu, ürün ekranı, kategori, marka, etiket ve özellik ekranları, yorum onayı, tam sipariş listesi, sipariş ayrıntısı (fatura, adres düzeltme, takılan iade), sipariş fişi, müşteri listesi ve ayrıntısı, blog ve sabit sayfalar (panelde ve vitrinde), menüye bağlama, ekip, roller, davet ve davet kabulü. Kullanıcı taslağı onayladı. Bölümün ekran kartları (0258–0278, 0186 ve bölüme alınan açık kartlar) kendi görüntülerini bu taslakla karşılaştırır.

Kullanıcının kararları (hepsi önerilen seçenek):

| Soru | Karar |
|---|---|
| Bu bölümün toplu işlemleri | Temel: ürünlerde yayınla, taslağa al, arşive al, sil; siparişlerde fiş yazdır ve hazırlamaya al; yorumlarda yayınla ve reddet. Toplu fiyat, toplu kategori ve etiket, kargoya verme ve dışa aktarma on beşinci bölümde. |
| Ürün ekranının yerleşimi | Tek sayfa; bilgisayarda solda "Bu sayfada" bağlantıları, sağda yayın durumu. Sekme yok. |
| Birleşimlerin fiyatı ve stoğu | Birleşim tablosunda toplu girilir (stok kodu, satış fiyatı, indirimli fiyat, stok); indirimin zamanı bütün birleşimler için birlikte. |
| Sipariş adresinin düzeltilmesi | Kargoya verilene kadar. Vergi adresin bölgesine bağlıysa ve tutar değişecekse düzeltme yapılmaz. |
| Ürün ve adet düzeltme | Bu bölümde yok; yanlış sipariş iptal edilip elle yenisi girilir. |
| Düzeltmede müşteriye bildirim | E-posta kutusu, varsayılan işaretli. |
| Fatura | Numara, tarih ve PDF dosyası birlikte eklenir; müşteri faturayı hesabındaki sipariş ayrıntısında ve takip sayfasında indirir. Gerçek e-fatura bağlantısı yoktur. |
| Müşteri ayrıntısında mağaza | Müşteri hakkında not yazar (müşteri görmez) ve şifre sıfırlama bağlantısı gönderir. Hesabı kapatamaz. |
| Müşteri listesi | Yalnız üyeler; üye olmadan verilen sipariş siparişlerde görünür. |
| Blog yazısının alanları | Başlık, adres adı, özet, biçimli içerik, kapak görseli (alternatif metniyle), blog kategorisi, yazar adı, yayın zamanı. Etiket ve yorum yok. |
| Sabit sayfanın vitrin adresi | `/sayfa/<adres adı>` (ör. `/sayfa/hakkimizda`). |
| Roller | Hazır roller: mağaza sahibi, görevli ve iki yeni hazır rol, "Sipariş görevlisi" ve "İçerik editörü". Mağaza sahibi rol tanımlamaz, yalnız rol verir. |
| Davetin geçerlilik süresi | 3 gün, tek kullanımlık. |
| Pano | "Bakılması gerekenler" önde, kısa sayılar yanda; yeni mağazada açılış adımları. Grafik ve raporlar on beşinci bölümde. |

Site ayarı olarak önerilenler (`planlar/site-ayarlari.md`, "Panel ve içerik"): panel listelerinde sayfa başına satır (25), sipariş fişinde fiyatlar (gösterilir), blog (varsayılan kapalı, Örnek Mağaza'da açık).

## Neden

- Temel toplu işlemler her satırda aynı denetimle (geçiş kuralı, izin) güvenle yapılır; kargoya verme her siparişte ayrı takip numarası ister, toplu fiyat ve dışa aktarma on beşinci bölümün işidir.
- Tek sayfa ürün ekranı bir ürünü baştan sona tek kaydırmada gösterir; hatalı alan neredeyse odak oraya gider, gizli sekmede kalan hata olmaz.
- Altı birleşimli bir üründe altı pencere açmak yerine tabloda toplu giriş hem hızlı hem karşılaştırılabilirdir.
- Adres en sık kargodan önce fark edilir; kargodan sonra düzeltme kargo firmasında yapılır. Ürün düzeltme stok, ayırma ve ödemeyi yeniden hesaplatır; iptal ve elle sipariş bugün var olan yollarla aynı sonucu verir.
- Numara siparişte aranır, PDF müşteriye verilir; ikisini birlikte almak mağazanın e-fatura sisteminden bağımsız kalmasını sağlar.
- Hesabı kapatmak kişisel veri başvurusudur, ayrı ele alınır; şifre sıfırlama bağlantısı müşterinin kendi e-postasına gider, mağaza şifreyi görmez.
- Kategori, ana sayfanın blog bölümündeki "kategoriden" kaynağı için gerekir (kart 0112).
- `/sayfa/` öneki sayfa adlarını ürün, kategori ve sistem adresleriyle hiç çakıştırmaz.
- Hazır roller izinlerin tutarlı kalmasını sağlar (değiştiren görür kuralı); ihtiyaç çıkarsa yeni hazır rol çekirdeğe eklenir.
- Kısa davet süresi ele geçen bağlantının açık kaldığı süreyi kısaltır.

## Düşünülen diğer yollar

- Geniş toplu işlemler (toplu kategori, etiket, kargoya verme, teslim): bu bölümü büyütürdü, kargoda takip numarası olmadan anlamsız olurdu.
- Sekmeli ürün ekranı: kısa sayfalar verir, ama hatalı alan başka sekmede kalabilir ve ürünün bütününü görmek zorlaşır.
- Birleşimi tek tek pencerede düzenlemek: basit ürünle aynı form, ama çok birleşimde yavaş.
- Adresin yalnız ödeme beklenirken düzeltilmesi: daha sade, ama hazırlanan siparişte fark edilen yanlış adres düzeltilemezdi.
- Ödeme beklenirken ürün ve adet düzeltme: telefonla değişiklik isteyen müşteri için kolay, ama tutar, stok ayırması ve havale süresi yeniden hesaplanır.
- Yalnız fatura numarası ya da yalnız PDF: biri müşteriye belge vermez, öteki siparişte aranamaz.
- Müşteri hesabını panelden kapatmak: KVKK başvurusu yolunu atlardı.
- Üye olmayanların da müşteri listesinde e-postayla gruplanması: karar 0150'deki ayrımı bozardı.
- Kökte sayfa adresi (`/hakkimizda`): daha kısa, ama sistem adresleriyle çakışma denetimi ister.
- Mağaza sahibinin rol tanımlaması: esnek, ama bağlı izinlerin yanlış birleşmesine açık.
- 7 günlük davet: daha rahat, ama bağlantı daha uzun açık kalır.
- Sayılar ve grafik önde pano: raporlar on beşinci bölümde geleceği için bu bölümde boş kalırdı.

## Sonuçları

- Kart 0258 toplu işlem mekanizmasını yazar; ekran kartları (0262, 0267, 0277) yalnız temel işlemleri ekler.
- Kart 0263–0265 tek sayfa ürün ekranını yazar; 0264 ve 0265 aynı birleşim tablosuna yazar.
- Kart 0269 adres düzeltmeyi kargoya verilene kadar açar; ürün düzeltme kartı açılmaz.
- Kart 0268 faturanın numarası, tarihi ve dosyasını ekler; müşterinin hesabı ve takip sayfası faturayı gösterir (vitrin tarafı da bu kartın işidir). Dosya yükleme kart 0094'ün altyapısını kullanır.
- Kart 0271 notları ve şifre sıfırlama bağlantısını ekler; hesabı kapatma panelde yoktur.
- Kart 0272 blog kategorisini ve yazar adını ekler; 0273 sabit sayfaları `/sayfa/` altında açar.
- Kart 0274 iki yeni hazır rolü izin kaydına, belgeye ve rol erişim testine ekler; 0275 davet süresini 3 gün yazar.
- Kart 0186 panoyu "bakılması gerekenler" düzeninde yazar.
- Taslağın düğmeleri ve menüsü gerçek panelle aynı 44 px'tir; tablo içi ad bağlantıları 32 px'tir (WCAG 2.2 AA'nın 24 px sınırını geçer), ekran kartlarının tarayıcı testleri bunu yeniden ölçer.
- Taslak ürün kodu değildir, renkleri yalnız taslağı göstermek için yazılıdır (karar 0075 ile aynı).
