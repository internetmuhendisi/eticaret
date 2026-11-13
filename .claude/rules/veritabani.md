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
- Dışarıdan gelen kimlik koda girmeden küçük harfe çevrilir (karar 0112): şemalarda yalnız `kimlikSemasi`, şemadan geçmeyen kimlikte (servisin kimlik değişkeni) kodda karşılaştırmadan önce `kimligiDuzelt`; kimlik biçimi `kimlikMi` ile denetlenir (üçü `cekirdek/veritabani/kimlik.ts`). Zod'un kimlik doğrulayıcısını başka yerde çağırmak testte kırmızıdır (`cekirdek/testler/kimlik-semasi.test.ts`); servis değişkeninin çevrilmesi yalnız disiplindir.
- Değişiklik üretmek: `pnpm veritabani-degisikligi-uret --name <kisa-ad>`, sonra dosyanın ilk satırına geri dönüş notu yazılır. Uygulamak: `pnpm veritabani-guncelle siteler/<kod-adi>`.
- Yerel veritabanı (yerel posta kutusuyla birlikte açılır): `pnpm veritabani-baslat`, `pnpm veritabani-durdur`. Siteye veritabanı açmak: `pnpm site-veritabani-ac siteler/<kod-adi>`.
- Sunucuda (karar 0034): `pnpm sunucu-veritabani siteler/<kod-adi> <ortam>` veritabanını açar ve değişiklikleri sitenin kendi kutu kullanıcısıyla uygular. Değişiklikleri uygulayan parça çekirdeğin görüntüsündedir (`cekirdek/veritabani/sunucuda-guncelle.ts`); yeni değişiklik eklenince görüntü yeniden üretilir.
- Tablolar `cekirdek/veritabani/tablolar/`, `cekirdek/moduller/*/model.ts`, `cekirdek/eklentiler/*/model.ts` ve `cekirdek/arka-plan-isleri/model.ts` dosyalarındadır; değişiklik üreten araç hepsini okur.
- Site kullanıcısı başka sitelerin sayaçlarını, oturumlarını ve ad listelerini okuyamaz (`komutlar/site-ust-bilgi.mts`, karar 0053). İzinler sitenin veritabanındadır: yeni veritabanı açan ya da yedekten açan her yol `ustBilgiKapatmaSql` çalıştırır. Sitenin veritabanına yönetici olarak bağlanan her komut `guvenliOturum` kullanır: yoksa site kendi işlevini yönetici yetkisiyle çalıştırabilir. Bu ayar yetki düşürmez: yönetici oturumunda sitenin tablosunu, görünümünü okuyan sorgu yazma. Yedek provası bugün bunu yapıyor, kart 0068 bitene kadar birden çok mağazalı sunucuda çalıştırılmaz.
- Veri ayrımı iki katmanlıdır: veritabanının izinleri (`komutlar/site-veritabani-ac.sql`) ve bağlantı kuralları (`sunucu/veritabani/pg_hba.conf`, karar 0023). İkisini `cekirdek/testler/veri-ayrimi.test.ts` ayrı ayrı denetler.
- Açma betiği paralel çalışabilir: bütün sitelerde ortak izin kayıtları kilitle sırayla değişir (karar 0048). Geçici test veritabanını `denemeVeritabaniAc` açar, yarıda kalan açma artık bırakmaz.
