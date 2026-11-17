# Kartla ödeme ve taksit

## Ad

Kartla ödeme ve taksit (kartla-odeme)

## Ne işe yarar

Müşteri ödeme adımında "Kartla öde"yi seçer, ödeme kuruluşunun güvenli sayfasında banka ya da kredi kartıyla, isterse taksitle öder. Ödeme kuruluşu ödemeyi doğrulayınca sipariş kurulur ve "hazırlanıyor" durumuna geçer. Ürün sayfasında "Kartla N taksite kadar" satırı ve bankalara göre taksit tablosu görünür. Mağaza sahibi parayı ödeme kuruluşundan alır; siteler her gün ödeme kuruluşunun kayıtlarıyla karşılaştırılır.

## Kimler için

Fiziksel ürün satan bütün siteler. Ödeme kuruluşuyla sözleşmesi olan mağaza için anlamlıdır; sözleşme yokken eklenti yalnız deneme ortamında açılır.

## Gerekenler

Temel paketteki ödeme adımı ve ödeme oturumu (karar 0140), stok ayırma, sipariş ve ödeme yöntemleri (karar 0141), arka plan kuyruğu, hata izleme ve gizli bilgiler. Başka eklenti gerekmez. Ödeme kuruluşu iyzico'dur (karar 0142); kuruluşa özgü kod tek dosyadadır, başka bir kuruluş sonradan aynı yere eklenebilir.

## Ayarlar

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza |
|---|---|---|---|
| Eklenti açık mı (`eklentiler` listesinde) | Altyapı sahibi | Kapalı | Açık |
| Ödeme kuruluşunun ortamı (`kartlaOdemeOrtami`: deneme ya da canlı) | Altyapı sahibi | Deneme | Deneme |
| Ürün sayfasında taksit satırı (`kartlaOdemeUrunSayfasindaTaksit`) | Mağaza sahibi | Göster (karar 0132) | Göster |
| En çok taksit sayısı (`kartlaOdemeEnCokTaksit`: 1, 2, 3, 6, 9, 12) | Mağaza sahibi | 12 | 6 |

"Kartla öde"nin ödeme adımında açık olup olmadığı ve sırası ödeme yöntemlerinin ayarıdır (panel: Ödeme yöntemleri); eklenti kapalıyken yöntem kapalı sayılır. Ödeme kuruluşunun anahtarları gizli bilgidir (`KARTLA_ODEME_ANAHTARI`, `KARTLA_ODEME_GIZLI_ANAHTARI`), ayar dosyasına yazılmaz.

## Veri

- Yeni kayıt: kart ödemesi. Ödeme oturumu, ödeme kuruluşunun belirteci (token) ve ödeme kimliği, durum (başlatıldı, ödendi, başarısız, iptal edildi), müşterinin ödediği tutar (taksit farkıyla), taksit sayısı, oluşturma ve sonuçlanma zamanı. Kart numarası, son kullanma tarihi ve güvenlik kodu saklanmaz; kartın yalnız son dört hanesi ve ailesi (ödeme kuruluşunun verdiği) saklanır.
- Aynı ödeme oturumundan bir kart ödemesi açık olabilir; yeniden "Siparişi onayla" yeni oturum açar.
- Siparişe yeni ödeme yöntemi (`kart`) ve yeni durum ("hazırlanıyor") eklenir; siparişin ödenen tutarı ve taksiti kart ödemesinde durur.

## Ekranlar

- Vitrin, ödeme adımı: ödeme yöntemlerinde "Kartla öde" (taslaktaki satır). Seçilince altında "Kart bilgilerinizi iyzico'nun güvenli sayfasında girersiniz; taksit seçenekleri orada kartınıza göre gösterilir" yazar. "Siparişi onayla" müşteriyi ödeme kuruluşunun sayfasına götürür (kullanıcı kararı: form bizim sayfamıza gömülmez).
- Vitrin, dönüş: ödeme başarılıysa sipariş alındı sayfası (kartla ödendi, taksit sayısı, ödenen tutar). Başarısız ya da yarıda kalan ödemede müşteri ödeme adımına döner, formu dolu bulur ve üstte hata kutusu görür (taslaktaki "Kart reddedildi"). Ödeme alındı ama ürün bu arada tükendiyse ödeme iptal edilir ve müşteri bunu okur (kullanıcı kararı).
- Vitrin, ürün sayfası: eklenti açıkken ve ayar "göster" iken fiyatın altında "Kartla N taksite kadar · Taksit seçenekleri"; bağlantı bankalara göre taksit tablosunu pencerede açar. Tablo ödeme kuruluşundan gelir.
- Panel: "Ödeme yöntemleri" ekranında "Kartla öde" satırı (eklenti açıkken), açılıp kapatılır ve sıralanır.

## Bildirimler

Bu eklenti e-posta göndermez: sipariş e-postaları on üçüncü bölümdedir. Günlük karşılaştırmada uyuşmayan sipariş hata izlemeye yazılır; yöneticiye e-posta on üçüncü bölümün e-postalarıyla bağlanır.

## Dış servis

iyzico (karar 0142): ödeme formu (Checkout Form), sonuç sorgusu, aynı gün iptal, taksit sorgusu, imzalı ödeme bildirimi (webhook, `X-IYZ-SIGNATURE-V3`) ve günlük işlem raporu. Deneme ortamı vardır (`sandbox-api.iyzipay.com`), belgelenmiş deneme kartlarıyla çalışır; gerçek ödeme alınmaz. Her çağrının zaman aşımı vardır, hata kaydedilir. Ödeme kuruluşuna ulaşılamazsa müşteri ödeme adımında kalır ve "kartla ödeme şu an yapılamıyor" görür, ayrılan stok bırakılır. Sonuç sorgusu ulaşılamazsa sipariş kurulmaz; imzalı bildirim ve günlük karşılaştırma sonradan tamamlar.

## Yasal notlar

- Kart bilgisi sitenin sunucusuna gelmez ve saklanmaz; 3D Secure ödeme kuruluşunun sayfasında yapılır.
- Ödemenin başarısı tarayıcıdan gelen bilgiyle değil, ödeme kuruluşunun sorguyla verdiği sonuçla kabul edilir.
- Taksitli toplam (taksit farkıyla) müşteriye ödeme kuruluşunun sayfasında ödemeden önce, sipariş alındı sayfasında ödemeden sonra yazılır.
- Alıcının kimlik numarası sorulmaz; kurumsal faturada vergi numarası, bireyselde yer tutucu gönderilir (kullanıcı kararı). Gerçek mağazada canlıya geçmeden önce ödeme kuruluşuna teyit ettirilir.
- Mesafeli satış sözleşmesi ve ön bilgilendirme metni kartla ödemeyi de anlatır (kart 0063, hukukçuyla).

## Bitti sayılır

- Eklenti kapalıyken ödeme adımında "Kartla öde" yok, ödeme başlatılmaz, taksit ucu bulunamadı verir, panelin ödeme yöntemlerinde satırı yok (kayıtlı yeri korunur), ürün sayfasında taksit satırı yok. Dönüş ve bildirim yalnız önceden başlatılmış ödemeyi tamamlar; karşılaştırma son yedi günde ödeme yoksa çalışmaz.
- Açıkken deneme ortamında kartla ve taksitle sipariş baştan sona geçiyor; sipariş "hazırlanıyor", ödenen tutar ve taksit siparişte.
- Başarısız ve yarıda kalan ödemede sipariş kurulmuyor, ayrılan stok bırakılıyor, müşteri ödeme adımına hata metniyle dönüyor.
- Tarayıcıdan gelen "başarılı" yok sayılıyor: sipariş yalnız ödeme kuruluşunun sorgu sonucuyla kuruluyor.
- İmzasız ve yanlış imzalı bildirim reddediliyor; aynı bildirim ve dönüş iki kez gelse de sipariş bir kez kuruluyor.
- Ödeme alındı ama stok yoksa ödeme iptal ediliyor, sipariş kurulmuyor.
- Günlük karşılaştırma uyuşmayan siparişi (ödendi ama sipariş yok, sipariş var ama ödeme yok, tutar farklı) hata izlemeye yazıyor.
- Ürün sayfasında taksit satırı ayara göre görünüyor, tablo ödeme kuruluşundan geliyor.
- Kontroller ve testler geçiyor, taslakla karşılaştırma yapıldı.

## Kapatılınca

"Kartla öde" ödeme adımından ve panelden kalkar, ürün sayfasındaki taksit satırı kalkar, uçlar bulunamadı verir. O anda ödeme sayfasında olan müşterinin dönüşü ve ödeme kuruluşunun bildirimi yine işlenir: parası çekilmiş bir müşterinin siparişi kaybolmaz. Kart ödemeleri ve siparişler silinmez. Günlük karşılaştırma eklenti kapandıktan sonra yedi gün daha çalışır.
