# Site ayarları (taslak)

Siteden siteye değişebilen davranışların listesi. Her yeni site bu varsayılan değerlerle başlar, kurulurken gerekenler değiştirilir. Bu dosya bir taslaktır, plan aşamasında çekirdeğin ayar şemasına dönüşür (`.claude/rules/ayarlar.md`).

Durum: 2026-10-28 tarihinde kullanıcı onayıyla yazıldı. Henüz hiçbir site kurulmadı, "Bu sitenin değeri" sütunu site kurulurken eklenir.

## Mağaza

| Ayar | Varsayılan | Not |
|---|---|---|
| Satış ve teslimat ülkesi | Türkiye | |
| Dil | Türkçe | |
| Para birimi | TL | |
| Para biçimi | 1.234,56 ₺ (simge sonda, binlikte nokta, ondalıkta virgül, 2 ondalık) | |
| Saat dilimi | İstanbul (Europe/Istanbul) | |
| Ağırlık birimi | kg | |
| Boyut birimi | cm | |
| Sipariş numarası öneki | Mağaza adından 3 harf | Kurulumda mağaza adından önerilir |
| Sipariş numarası başlangıcı | 1001 | |

## Vergi

| Ayar | Varsayılan | Not |
|---|---|---|
| Vergi | Açık | |
| Vergi adı | KDV | |
| Vergi sınıfları | %20, %10, %1, %0 | |
| Fiyat girişi | Vergi dahil | |
| Fiyatın yanındaki metin | "KDV dahil" | |
| Verginin hesaplandığı adres | Teslimat adresi | |
| Yuvarlama | Satır satır | Faturadaki satırlarla aynı tutar çıkar |

## Fiyat

| Ayar | Varsayılan | Not |
|---|---|---|
| İndirimde eski fiyat olarak son 30 günün en düşük fiyatı | Açık | Yasal dayanağı hukukçuya teyit ettirilecek |

## Stok

| Ayar | Varsayılan | Not |
|---|---|---|
| Tükenen ürün | Gösterilir ama satılmaz | Seçenekler: göster ama satma, gizle |
| Düşük stok uyarı eşiği | 5 adet | Ürün bazında değiştirilebilir |
| "Son X ürün" yazısı | 5 adet ve altında | |
| Ödeme sırasında stok ayırma süresi | 15 dakika | |

## Sepet ve ödeme

| Ayar | Varsayılan | Not |
|---|---|---|
| Üye olmadan alışveriş | Açık | |
| Telefon zorunlu | Açık | Kargo firmaları telefon ister |
| Havale | Açık | |
| Ödenmeyen havale siparişinin iptal süresi | 3 gün | Süre sonunda stok geri döner |
| Kapıda ödeme | Kapalı | İsteyen mağaza açar |

## Kargo

| Ayar | Varsayılan | Not |
|---|---|---|
| Ücretsiz kargo sınırının hesaplandığı tutar | İndirimden sonraki tutar | Seçenekler: indirimden önce, indirimden sonra |

## Yorumlar

| Ayar | Varsayılan | Not |
|---|---|---|
| Yalnız satın alanlar yorum yapabilir | Açık | |
| Doğrulanmış alıcı etiketi | Açık | |

## Tasarım ve marka

| Ayar | Varsayılan | Not |
|---|---|---|
| Mağaza sahibi temayı değiştirebilir | Açık | Özel tasarlanan mağazada kapatılır |
| Vitrinde altyapı adı | Kapalı | |
| Vitrinde koyu tema | Kapalı | Mağazanın tasarımına göre açılır |
