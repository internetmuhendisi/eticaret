# 0147 · Örnek Mağaza'nın vitrini canlıya çıkıyor

## Amaç

Bölümün sonunda Örnek Mağaza'nın vitrini bütün sayfalarıyla yayınlanır: kategori, arama, ürün, yorum, favoriler, stoğa gelince haber ver, panelin vitrin ve tema ekranları. "Canlı" bugünkü deneme adresidir (`ornek-magaza.deneme.eticaretmagazasi.com`); gerçek alan adına geçilmez (karar 0101).

Bölüm: Vitrin. Bölümün son işi; öteki kartlar bitmiş olmalı.

## Olmazsa olmazlar

- Yayın deneme adresine yapılır. Örnek Mağaza demo sitedir: arama motorlarına kapalı kalır, gerçek ödeme almaz (karar 0007).
- Kimlik yeni çekirdek sürümüne çıkar, sürüm notu yazılır, sitenin testleri çalışır.
- Veritabanı değişiklikleri yayın komutuyla uygulanır. Kataloğa yeni eklenen veri (örnek yorumlar gibi) kurulu veritabanına girmiyorsa ne yapılacağı kullanıcıya sorulur (karar 0100'deki sıfırlama yolu ya da yeni kurulum).
- Yayından sonra sağlık kontrolü, sunucu denetimi ve deneme adresinde tarayıcıyla gezinti: her sayfa türü telefon ve bilgisayarda açılıyor.
- Stoğa gelince haber ver eklentisinin Örnek Mağaza'da açık olup olmayacağı kullanıcıya sorulur.

## Sınırlar

- Gerçek alan adına geçiş bu kartta yapılmaz; ilk gerçek mağazanın teslimiyle ayrı iş olur.
- Gerçek mağazalara dokunulmaz.

## Bitti sayılır

- Deneme adresinde her sayfa türü açılıyor, sağlık ve sunucu denetimi yeşil.
- Geri dönüş komutunun bu sürümde çalıştığı biliniyor (yayın komutunun denemesi).

## Yayın (2026-11-16)

Kullanıcı kararları:
- Veritabanı sıfırlanır. Tarihli indirimler 16 Kasım 2026 18:00 – 8 Aralık 2026 00:00'a (İstanbul) kaydırılır. Eski fiyat ancak indirim katalog kurulduktan sonra başlarsa görünür (karar 0074).
- Stoğa gelince haber ver eklentisi açık kalır. Sunucuda gerçek e-posta gönderimi yok (kart 0060): talep alınır, e-posta gitmez.
- Tema Galerisi bu işte kurulmaz. Panelin "Demoyu gez" bağlantısı şimdilik açılmayan adrese gider.
- Açık vitrin kartları yayını beklemez.

Yapılanlar:
- **Hazırlık.** Örnek Mağaza'nın testleri 149/149 geçti. Bir indirim bilerek eski tarihine alınınca katalog testi kırmızıya düştü. Site doğrulaması, tür kontrolü, denetim ve sürüm notu testi geçti. Hat yeşil (43789960761, kayıt ca8b1b7). Stoğa gelince haber ver testi bu çalışmada geçti.
- **Yayın.** 0.52.0'dan 0.76.0'a, yayın 13. Veritabanı değişiklikleri yayın komutuyla uygulandı. Sağlık ucu 0.76.0 ve ayakta veritabanını söylüyor.
- **Sıfırlama.** `pnpm site-sifirla` ile yapıldı. Önceki verinin yedeği: `20261116T031032Z-sifirlama-oncesi.dump.age`. Katalog, menüler ve düzen kutuda kuruldu. Görselli katalog kutuda ilk kez kuruldu (kart 0128'in ölçülmemiş maddesi). Yönetici hesapları silindi; panel için yönetici açılacak (kullanıcı).
- **Sunucu denetimi.** Yeşil, 78 madde.
- **Gezinti.** Deneme adresinde 12 sayfa telefon (390 px) ve bilgisayar (1280 px) genişliğinde açıldı:
  - sayfalar: vitrinin on sayfa türü, tükenmiş üründe haber ver kutusu, panel girişi;
  - her birinde durum kodu beklenen, yana kayma yok, konsol hatası yok, 400 ve üstü istek yok, yüklenmeyen görsel yok;
  - ana sayfada yorum bölümü, ürün sayfasında yorumlar ve tükenmiş üründe "Stoğa gelince haber verelim" kutusu görünüyor.

  "Bitmeden yakalayın" bölümü indirimler 18:00'de başlayana kadar çizilmez, bu beklenir.
- **Yayın denemesi.** 16 ölçümün 12'si geçti. Kayıt geri dönüşü başarılı yazdı, arka plan süreci de önceki yayına döndü. Dört ölçüm, mağaza adını eski bir kalıpla okuduğu için kırmızı bitti (kart 0208, düzeltildi). Denemenin yeniden çalıştırılması 0208'in hattına bağlı.

Açık: 16 Kasım 18:00'den sonra eski fiyatın ve fırsatlarda dört ürünün görünmesi tarayıcıyla kontrol edilir (kart 0128'in son maddesi).

## Durum

bitti
