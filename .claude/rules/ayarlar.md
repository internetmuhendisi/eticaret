---
paths:
  - "**/settings/**"
  - "**/config/**"
  - "**/ayarlar/**"
  - "**/site-settings*"
  - "**/sites/**"
  - "**/siteler/**"
  - "**/planlar/site-ayarlari.md"
  - "**/.env.example"
---

> Bu dosyanın paths satırları teknoloji kararından sonra projenin klasör düzenine göre güncellenir (Bölüm 4).

# Ayarlar ve siteye özel davranış

Site ayarı, siteden siteye değişebilen ve varsayılan değeriyle tanımlı davranıştır.

- Bir sitede farklı çalışması gereken davranışı koda koşul olarak yazma, çekirdeğe ayar olarak ekle. "Bu site ise şunu yap" diye site adına göre koşul yazma.
- Sitenin bütün ayarlarını türü, varsayılan değeri, açıklaması ve kimin değiştirdiğiyle tek bir ayar şemasında tanımla.
- Altyapı sahibinin ayarını site klasöründe tut, yayınla değiştir. Mağaza sahibinin ayarını sitenin veritabanında tut; site klasöründe yalnız başlangıç değeri olur ve kurulumdan sonra okunmaz (karar 0010).
- Her ayarın varsayılanı olsun. Ayar verilmemişse sistem varsayılanla çalışır.
- Fiziksel, dijital, hizmet gibi ürün türlerini site başına açılıp kapanan ayar yap.
- Yönetim panelindeki ayar ekranlarını ayar şemasından üret.
- Ödeme anahtarı, şifre gibi gizli bilgileri ayar dosyasına yazma. Korumalı ortam değişkenlerinde (`.env` dosyasında) tut.
