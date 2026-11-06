---
paths:
  - "cekirdek/veritabani/**"
  - "**/model.ts"
  - "**/*.sql"
  - "siteler/*/baslangic/**"
  - "sunucu/yedek/**"
---

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

## Araçlar ve komutlar (karar 0022)

- Erişim Drizzle ile yapılır. Kimlik, zaman ve tutar alanları yalnız `cekirdek/veritabani/turler.ts` dosyasından alınır.
- Değişiklik üretmek: `pnpm veritabani-degisikligi-uret --name <kisa-ad>`, sonra dosyanın ilk satırına geri dönüş notu yazılır. Uygulamak: `pnpm veritabani-guncelle siteler/<kod-adi>`.
- Yerel veritabanı: `pnpm veritabani-baslat`, `pnpm veritabani-durdur`. Siteye veritabanı açmak: `pnpm site-veritabani-ac siteler/<kod-adi>`.
- Sunucuda (karar 0034): `pnpm sunucu-veritabani siteler/<kod-adi> <ortam>` veritabanını açar ve değişiklikleri sitenin kendi kutu kullanıcısıyla uygular. Değişiklikleri uygulayan parça çekirdeğin görüntüsündedir (`cekirdek/veritabani/sunucuda-guncelle.ts`); yeni değişiklik eklenince görüntü yeniden üretilir.
- Tablolar `cekirdek/veritabani/tablolar/` ve `cekirdek/moduller/*/model.ts` dosyalarındadır; değişiklik üreten araç ikisini de okur.
- Veri ayrımı iki katmanlıdır: veritabanının izinleri (`komutlar/site-veritabani-ac.sql`) ve bağlantı kuralları (`sunucu/veritabani/pg_hba.conf`, karar 0023). İkisini `cekirdek/testler/veri-ayrimi.test.ts` ayrı ayrı denetler.
