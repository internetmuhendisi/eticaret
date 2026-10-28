# Site ayarları (taslak)

Siteden siteye değişebilen davranışların listesi. Her yeni site bu varsayılan değerlerle başlar, kurulurken gerekenler değiştirilir. Bu dosya bir taslaktır, plan aşamasında çekirdeğin ayar şemasına dönüşür (`.claude/rules/ayarlar.md`).

Durum: 2026-10-28 tarihinde kullanıcı onayıyla yazıldı. Aynı gün ilk site Örnek Mağaza'nın değerleri eklendi (karar 0007) ve üç yeni ayar girdi: kapıda ödeme seçenekleri, kargoya verme süresi, iade kargosunu kim öder (karar 0008). "Örnek Mağaza" sütununda "—" yazan ayar varsayılanla çalışır.

## Örnek Mağaza

İlk demo sitesi. Gerçek satış yapmaz, her özellik önce onda denenir (karar 0007).

- Kategoriler: Giyim (tişört, sweatshirt; beden ve renk seçenekli), Ev ve Yaşam (mum, vazo, kupa), Elektronik Aksesuar (şarj kablosu, telefon kılıfı, kulaklık). Özel kurallı ürün yok.
- Ürünler demoda %20 KDV sınıfıyla girilir. Giyimin doğru oranı gerçek mağazada muhasebeciye sorulur.
- Kargo ücreti ve ücretsiz kargo sınırı sonra panelden girilir.

## Mağaza

| Ayar | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|
| Satış ve teslimat ülkesi | Türkiye | — | |
| Dil | Türkçe | — | |
| Para birimi | TL | — | |
| Para biçimi | 1.234,56 ₺ (simge sonda, binlikte nokta, ondalıkta virgül, 2 ondalık) | — | |
| Saat dilimi | İstanbul (Europe/Istanbul) | — | |
| Ağırlık birimi | kg | — | |
| Boyut birimi | cm | — | |
| Sipariş numarası öneki | Mağaza adından 3 harf | ORN | Kurulumda mağaza adından önerilir |
| Sipariş numarası başlangıcı | 1001 | — | |

## Vergi

| Ayar | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|
| Vergi | Açık | — | |
| Vergi adı | KDV | — | |
| Vergi sınıfları | %20, %10, %1, %0 | — | |
| Fiyat girişi | Vergi dahil | — | |
| Fiyatın yanındaki metin | "KDV dahil" | — | |
| Verginin hesaplandığı adres | Teslimat adresi | — | |
| Yuvarlama | Satır satır | — | Faturadaki satırlarla aynı tutar çıkar |

## Fiyat

| Ayar | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|
| İndirimde eski fiyat olarak son 30 günün en düşük fiyatı | Açık | — | Yasal dayanağı hukukçuya teyit ettirilecek |

## Stok

| Ayar | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|
| Tükenen ürün | Gösterilir ama satılmaz | — | Seçenekler: göster ama satma, gizle |
| Düşük stok uyarı eşiği | 5 adet | — | Ürün bazında değiştirilebilir |
| "Son X ürün" yazısı | 5 adet ve altında | — | |
| Ödeme sırasında stok ayırma süresi | 15 dakika | — | |

## Sepet ve ödeme

| Ayar | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|
| Üye olmadan alışveriş | Açık | — | |
| Telefon zorunlu | Açık | — | Kargo firmaları telefon ister |
| Havale | Açık | — | |
| Ödenmeyen havale siparişinin iptal süresi | 3 gün | — | Süre sonunda stok geri döner |
| Kapıda ödeme | Kapalı | Açık | İsteyen mağaza açar |
| Kapıda ödeme seçenekleri | Nakit | Nakit ve kart | Seçenekler: nakit, kart. Müşteri ödeme adımında seçer, kartı kurye çeker |

## Kargo

| Ayar | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|
| Ücretsiz kargo sınırının hesaplandığı tutar | İndirimden sonraki tutar | — | Seçenekler: indirimden önce, indirimden sonra |
| Kargoya verme süresi | 1 iş günü | — | Sayı olarak tutulur. Ürün sayfasında "1 iş gününde kargoda" yazar, ön bilgilendirme metnindeki teslim süresi de buradan gelir |

## İade

| Ayar | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|
| İade kargosunu kim öder | Mağaza | — | Seçenekler: mağaza, müşteri. İade koşulları metnine buradan girer. Cayma hakkında yasal kuralı hukukçuya teyit ettirilecek |

## Yorumlar

| Ayar | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|
| Yalnız satın alanlar yorum yapabilir | Açık | — | |
| Doğrulanmış alıcı etiketi | Açık | — | |

## Tasarım ve marka

| Ayar | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|
| Mağaza sahibi temayı değiştirebilir | Açık | — | Özel tasarlanan mağazada kapatılır |
| Vitrinde altyapı adı | Kapalı | — | |
| Vitrinde koyu tema | Kapalı | Açık | Mağazanın tasarımına göre açılır |
