# Site ayarları (taslak)

Siteden siteye değişebilen davranışların listesi. Her yeni site bu varsayılan değerlerle başlar, kurulurken gerekenler değiştirilir. Bu dosya bir taslaktır, plan aşamasında çekirdeğin ayar şemasına dönüşür (`.claude/rules/ayarlar.md`).

Durum: 2026-10-28 tarihinde kullanıcı onayıyla yazıldı. Aynı gün ilk site Örnek Mağaza'nın değerleri eklendi (karar 0007) ve üç yeni ayar girdi: kapıda ödeme seçenekleri, kargoya verme süresi, iade kargosunu kim öder (karar 0008). "Örnek Mağaza" sütununda "—" yazan ayar varsayılanla çalışır. Aynı gün her ayara "Kim değiştirir" sütunu eklendi (karar 0010): altyapı sahibinin ayarları site klasöründe durur ve yayınla değişir, mağaza sahibinin ayarları panelden değişir, site klasöründe yalnız başlangıç değerleri durur (`planlar/cekirdek-ve-siteler.md`). Aynı gün altyapı sahibinin ayarları çekirdeğin ayar şemasına girdi (kart 0010). Bu ayarların asıl yeri artık `cekirdek/ayar-semasi/ayarlar.ts` dosyasıdır; buradaki tablo değişirse şema da aynı değişiklikte güncellenir.

## Örnek Mağaza

İlk demo sitesi. Gerçek satış yapmaz, her özellik önce onda denenir (karar 0007).

- Kategoriler: Giyim (tişört, sweatshirt; beden ve renk seçenekli), Ev ve Yaşam (mum, vazo, kupa), Elektronik Aksesuar (şarj kablosu, telefon kılıfı, kulaklık). Özel kurallı ürün yok.
- Ürünler demoda %20 KDV sınıfıyla girilir. Giyimin doğru oranı gerçek mağazada muhasebeciye sorulur.
- Kargo ücreti ve ücretsiz kargo sınırı sonra panelden girilir.

## Mağaza

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Satış ve teslimat ülkesi | Altyapı sahibi | Türkiye | — | |
| Dil | Altyapı sahibi | Türkçe | — | |
| Para birimi | Altyapı sahibi | TL | — | |
| Para biçimi | Altyapı sahibi | 1.234,56 ₺ (simge sonda, binlikte nokta, ondalıkta virgül, 2 ondalık) | — | |
| Saat dilimi | Altyapı sahibi | İstanbul (Europe/Istanbul) | — | |
| Ağırlık birimi | Altyapı sahibi | kg | — | |
| Boyut birimi | Altyapı sahibi | cm | — | |
| Sipariş numarası öneki | Altyapı sahibi | Mağaza adından 3 harf | ORN | Kurulumda mağaza adından önerilir |
| Sipariş numarası başlangıcı | Altyapı sahibi | 1001 | — | |

## Vergi

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Vergi | Mağaza sahibi | Açık | — | |
| Vergi adı | Mağaza sahibi | KDV | — | |
| Vergi sınıfları | Mağaza sahibi | %20, %10, %1, %0 | — | |
| Fiyat girişi | Mağaza sahibi | Vergi dahil | — | |
| Fiyatın yanındaki metin | Mağaza sahibi | "KDV dahil" | — | |
| Verginin hesaplandığı adres | Mağaza sahibi | Teslimat adresi | — | |
| Yuvarlama | Mağaza sahibi | Satır satır | — | Faturadaki satırlarla aynı tutar çıkar |

## Fiyat

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| İndirimde eski fiyat olarak son 30 günün en düşük fiyatı | Mağaza sahibi | Açık | — | Yasal dayanağı hukukçuya teyit ettirilecek |

## Stok

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Tükenen ürün | Mağaza sahibi | Gösterilir ama satılmaz | — | Seçenekler: göster ama satma, gizle |
| Düşük stok uyarı eşiği | Mağaza sahibi | 5 adet | — | Ürün bazında değiştirilebilir |
| "Son X ürün" yazısı | Mağaza sahibi | 5 adet ve altında | — | |
| Ödeme sırasında stok ayırma süresi | Mağaza sahibi | 15 dakika | — | |

## Sepet ve ödeme

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Üye olmadan alışveriş | Mağaza sahibi | Açık | — | |
| Telefon zorunlu | Mağaza sahibi | Açık | — | Kargo firmaları telefon ister |
| Havale | Mağaza sahibi | Açık | — | |
| Ödenmeyen havale siparişinin iptal süresi | Mağaza sahibi | 3 gün | — | Süre sonunda stok geri döner |
| Kapıda ödeme | Mağaza sahibi | Kapalı | Açık | İsteyen mağaza açar |
| Kapıda ödeme seçenekleri | Mağaza sahibi | Nakit | Nakit ve kart | Seçenekler: nakit, kart. Müşteri ödeme adımında seçer, kartı kurye çeker |

## Kargo

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Ücretsiz kargo sınırının hesaplandığı tutar | Mağaza sahibi | İndirimden sonraki tutar | — | Seçenekler: indirimden önce, indirimden sonra |
| Kargoya verme süresi | Mağaza sahibi | 1 iş günü | — | Sayı olarak tutulur. Ürün sayfasında "1 iş gününde kargoda" yazar, ön bilgilendirme metnindeki teslim süresi de buradan gelir |

## İade

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| İade kargosunu kim öder | Mağaza sahibi | Mağaza | — | Seçenekler: mağaza, müşteri. İade koşulları metnine buradan girer. Cayma hakkında yasal kuralı hukukçuya teyit ettirilecek |

## Yorumlar

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Yalnız satın alanlar yorum yapabilir | Mağaza sahibi | Açık | — | |
| Doğrulanmış alıcı etiketi | Mağaza sahibi | Açık | — | |

## E-posta

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Gönderen adı | Altyapı sahibi | Mağazanın görünen adı | — | Panelden düzenlenmesi panel işidir |
| Gönderen adresi | Altyapı sahibi | Yok, e-posta gönderilmez | `ornek-magaza@posta.eticaretmagazasi.com` | Alan adı henüz doğrulanmadı, bugün yalnız yerel kutuya gider (karar 0050) |
| Yanıt adresi | Altyapı sahibi | Gönderen adresi | — | |
| Logo adresi | Altyapı sahibi | Yok, mağaza adı yazı olarak görünür | — | Marka ayarları gelince panele taşınır |

## Tasarım ve marka

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Mağaza sahibi temayı değiştirebilir | Altyapı sahibi | Açık | — | Özel tasarlanan mağazada kapatılır |
| Vitrinde altyapı adı | Altyapı sahibi | Kapalı | — | |
| Ana sayfada "Yakında açılıyoruz." yazısı | Altyapı sahibi | Kapalı | Açık | Başlığın altında bilgi yazısı; bakım modu değildir, vitrin açık kalır (kart 0041). Mağaza sahibinin ayarları gelince panele taşınabilir |
| Bakım sayfasının metni | Altyapı sahibi | Boş (ortak metin) | Boş | Bakım sayfasında ortak metnin yerine görünür (kart 0043) |
| Yönetici oturumu | Altyapı sahibi | 24 saat | — | Bu süre boyunca hiç girmezse yeniden giriş ister (kart 0025) |
| Müşteri oturumu | Altyapı sahibi | 30 gün | — | Bu süre boyunca hiç girmezse yeniden giriş ister (kart 0025) |
| Vitrinde koyu tema | Mağaza sahibi | Kapalı | Açık | Mağazanın tasarımına göre açılır |
