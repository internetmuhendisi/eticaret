# 0145 · Sipariş, müşteri hesabı ve e-posta taslağının ürün kararları

## Tarih

2026-11-19

## Karar

On üçüncü bölümün (sipariş ve müşteri hesabı) taslağı `planlar/tasarim-yonu/siparis-ve-hesap.html` dosyasıdır (kart 0233). Canlı Çarşı yönünde (karar 0075) şunları çizer: giriş ve kayıt, hesabım (siparişlerim, sipariş ayrıntısı, adreslerim, favorilerim, hesap bilgileri), üye olmayanın sipariş takibi, sipariş alındı sayfasının eki, iade talebi, müşterinin kendi iptali, müşteriye giden on bir e-posta, altı yönetici bildirimi ve panelin en az sipariş ekranları (siparişler, sipariş ayrıntısı ve pencereleri, elle sipariş, sipariş ayarları). Kullanıcı taslağı onayladı. Bölümün ekran kartları (0234–0241) kendi görüntülerini bu taslakla karşılaştırır.

Kullanıcının kararları:

| Soru | Karar |
|---|---|
| "Yalnız satın alanlar yorum yapabilir" açıkken hangi sipariş "satın aldı" sayılır | Teslim edildi durumuna geçmiş sipariş. Kargodaki sipariş sayılmaz. |
| Teslim edildi durumuna geçiş | Mağaza sahibi panelde elle işaretler. Süre sonunda kendiliğinden geçiş yoktur. |
| Kargodaki sipariş iptal edilebilir mi | Edilemez. Kargoda olan sipariş ürün dönünce teslimden sonra iade akışıyla geri ödenir. |
| Kısmi iadeden sonra yeni iade | Yapılabilir. Bir siparişte birden çok kısmi iade olur, toplamı ödenen tutarı aşamaz. |
| Hesabım menüsü (masaüstü) | Solda yan menü. Telefonda menü yatay kayan şerittir. |
| Girişten sonra açılan hesap sayfası | Siparişlerim. Ayrı hesap özeti sayfası yoktur. |
| Üye olmayanın takibinde adres | Kısaltılmış: ad, soyad ve telefon kısaltılır, il ve ilçe görünür, sokak adresi görünmez. Tam adres sipariş e-postasında durur. |
| Siparişteki kişisel bilgiler | Süre sonunda silinir: ad, adres, telefon ve e-posta siparişten çıkar, tutarlar, ürünler ve vergi dökümü kalır. Süre altyapı sahibinin ayarıdır; taslakta 10 yıl, hukukçuya teyit ettirilir. |

Site ayarı olarak önerilenler (`planlar/site-ayarlari.md`, Örnek Mağaza varsayılanları kullanır):

- Müşterinin kendi iptali: kapalı, ödeme beklenirken, kargoya verilene kadar; varsayılan "ödeme beklenirken".
- İade talebi süresi: teslimden sonra 14 gün.
- Kargo firmaları: ad ve takip adresi kalıbı (`{takip numarası}`); varsayılan boş liste. Örnek Mağaza'ya açıkça deneme olan bir firma önerilir.
- Yönetici bildirimlerinin alıcıları (boşsa mağaza sahibi rolündeki yöneticiler) ve her bildirimin açık ya da kapalı olması; varsayılan hepsi açık.
- Siparişteki kişisel bilgilerin saklama süresi: altyapı sahibinin ayarı.

## Neden

- Teslim edilmiş siparişi "satın aldı" saymak yorumu ürünü eline almış müşteriye bırakır. Doğrulanmış alıcı etiketi (karar 0109) de böylece gerçek kullanımı gösterir.
- Kargo entegrasyonu temel pakette yok. Teslimi mağaza sahibi bilir; kendiliğinden geçiş, ürünü almamış müşteride iade süresini ve yorumu yanlış zamanda açardı.
- Kargodaki siparişi iptal etmemek durum geçişlerini sade tutar: yoldaki ürün için para ancak ürün dönünce, iade akışıyla geri ödenir.
- Birden çok kısmi iade, ürünleri ayrı zamanlarda iade eden müşterinin olağan durumudur. Tek akış (iş kuralları) toplam sınırıyla bunu taşır.
- Yan menü panelin düzeniyle aynı alışkanlığı verir ve yeni hesap sayfası (iade talepleri gibi) eklenince sığar.
- Müşteri hesaba en sık siparişine bakmak için gelir. Ayrı özet sayfası bakımı olan bir ekran daha olurdu.
- Takip yalnız numara ve e-postayla açıldığı için bu ikisini ele geçiren biri tam adrese ulaşmamalı.
- Kişisel bilgiyi sınırsız tutmak KVKK'nın "gerektiği kadar saklama" ilkesine aykırı düşer. Tutarların kalması muhasebe ve rapor içindir.

## Düşünülen diğer yollar

- **Kargoya verilen siparişi "satın aldı" saymak:** Yorum daha erken açılırdı, ama ürünü henüz almamış biri de yazabilirdi. Kullanıcı seçmedi.
- **Kargodan belirli gün sonra kendiliğinden teslim:** Mağaza sahibinin işi azalırdı, kargoda kalan ya da dönen siparişte yanlış teslim yazardı. Kullanıcı seçmedi.
- **Kargodaki siparişi iptal edebilmek:** Kargoyu almayan müşteride bir adım kısalırdı, ama "kargoda iptal" stok ve para için ayrı bir yol açardı. Kullanıcı seçmedi.
- **Siparişte tek iade:** Hesap basitleşirdi, ikinci ürünü sonradan iade etmek isteyen müşteri yolsuz kalırdı. Kullanıcı seçmedi.
- **Sekmeli hesap menüsü** ve **hesap özeti sayfası:** Taslakta gösterildi, kullanıcı seçmedi.
- **Takipte tam adres:** Müşteri her şeyi tek yerde görürdü. Numara ve e-postayı bilen herkes de görürdü. Kullanıcı seçmedi.
- **Kişisel bilgiyi istenene kadar tutmak:** Silme işi gerekmezdi. Hesabı olmayan müşterinin verisi süresiz kalırdı. Kullanıcı seçmedi.

## Sonuçları

- Kart 0234 durum geçişlerini bu kararlarla yazar: "kargoda"dan "iptal"e geçiş yoktur, "teslim edildi" yalnız yöneticinin işlemiyle gelir. Yorum denetimi teslim edilmiş siparişe bağlanır. Mağaza sahibi teslimi işaretlemezse müşteri ne iade talebi açabilir ne yorum yazabilir.
- Kart 0235 birden çok kısmi iadeyi ve toplam sınırını taşır. Kargoda iptal olmadığı için kartla ödenmiş ve kargoya verilmiş siparişte para ancak iadeyle döner.
- Saklama süresinin uzunluğu ve silmenin hangi alanları kapsayacağı hukukçuya teyit ettirilir (kart 0063'e soru olarak eklenir). Teyit gelene kadar taslaktaki 10 yıl yalnız öneridir. Silme işi sipariş kartlarıyla birlikte yazılır, ödeme oturumunun kişisel verisi de (karar 0141) bu süreye bağlanır.
- Taslakta iki şey yalnız örnektir, temel pakette karşılığı yoktur: ürün düzeyinde "iade edilemez" bilgisi (iade talebindeki kişisel bakım satırı) ve hesap bilgilerinde e-posta değiştirme ile hesap silme. Gerekirse ayrı kart açılır.
- E-posta ve hesap metinleri taslaktadır, gerçek metin ve yasal cümleler kart 0063'te hukukçuyla gelir. Sunucuda gerçek gönderim yoktur (kart 0060). E-postalar sitenin koyu temasını almaz.
