---
paths:
  - "**/storefront/**"
  - "**/vitrin/**"
  - "**/shop/**"
  - "**/store/**"
  - "**/pages/**"
  - "**/app/**"
  - "**/sites/**"
  - "**/siteler/**"
  - "**/seo/**"
  - "**/sitemap*"
---

> Bu dosyanın paths satırları teknoloji kararından sonra projenin klasör düzenine göre güncellenir (Bölüm 4).

# Vitrin yapısı

- Ana sayfa afişi, ürün ızgarası, kategori listesi, yorum alanı gibi vitrin bölümlerini ortak bileşenlerden kur ve site tasarım değerleriyle giydir.
- Ortak bileşenle yapılamayan vitrin bölümünü o sitenin klasöründe yaz. İkinci bir sitede de gerekince çekirdeğe taşı.
- Sepet, ödeme formu, adres formu, stok kontrolü ve sipariş takibi bütün sitelerde aynı koddur. Yalnız görünümü site tasarımıyla değişir.
- Ana sayfanın hangi bölümlerden oluşacağını sitenin ayar dosyasında yaz. Düzen değişikliği kod değişikliği gerektirmesin.
- Ürünün listede, aramada, önerilerde ve sepette görünen kartını tek bileşenden çıkar.
- İndirimli fiyatı, üstü çizili eski fiyatı ve para birimini her yerde tek fiyat bileşeniyle göster.
- Sayfa başlığı, açıklama, yapılandırılmış veri ve paylaşım görselini sayfa türüne göre ortak bir üreticiden al.
- Ürün ya da kategori adresi değişince eski adresi kalıcı olarak yenisine yönlendir. Site haritası kendiliğinden üretilsin.
