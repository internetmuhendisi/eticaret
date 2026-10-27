---
paths:
  - "**/db/**"
  - "**/database/**"
  - "**/veritabani/**"
  - "**/migrations/**"
  - "**/*.sql"
  - "**/schema*"
  - "**/prisma/**"
  - "**/drizzle/**"
  - "**/models/**"
  - "**/seed*"
  - "**/backup*/**"
---

> Bu dosyanın paths satırları teknoloji kararından sonra projenin klasör düzenine göre güncellenir (Bölüm 4).

# Veri modeli ve veritabanı

İndeks, veritabanında aramayı hızlandıran sıralı dizindir.

- Bir sitenin müşterisi, siparişi ve ürünü başka bir sitede asla görünmesin. Bu ayrımı gerçek veritabanıyla test et.
- Kimlikleri tahmin edilemeyen benzersiz kodlarla, tarihleri saat dilimli zamanla, para tutarlarını sabit ondalıklı sayıyla tut.
- Silinen kaydı önce silinmiş olarak işaretle, belirli süre sonra kalıcı sil. Sipariş ve fatura kayıtlarını kalıcı silme.
- Sorguları parametreli yaz. Kullanıcı girdisini sorguya metin olarak ekleme.
- Bir listede her satır için ayrı sorgu atma. Gereken veriyi tek seferde al.
- Her yeni tablonun hangi alanlara göre aranacağını ve indekslerini belgeye yaz.
- Tablo değişikliklerini araçla üretilen, numaralı değişiklik dosyalarıyla yap. Elle değişiklik yapma.
- Yeni alanı önce veritabanına ekle, onu kullanan kodu sonra devreye al. Aynı yayında çıkıyorlarsa önce veritabanı değişikliği uygulanır.
- Her veritabanı değişikliğinin başına geri alınabilir mi yoksa yedekten mi dönülür, yaz. Not taşımayan değişiklik yayına çıkmaz.
- Her veritabanı değişikliğini canlının kişisel bilgileri silinmiş bir kopyasında uygulayarak dene.
- Veritabanının düzenli yedeğini al ve geri yüklemeyi belirli aralıklarla dene.
- Listeleri sayfa sayfa yükle. Bir sayfadaki kayıt sayısının üst sınırı olsun.
