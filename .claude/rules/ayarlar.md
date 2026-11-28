---
paths:
  - "cekirdek/ayar-semasi/**"
  - "cekirdek/moduller/magaza-ayarlari/**"
  - "cekirdek/yonetim-paneli/ayarlar/**"
  - "siteler/**"
  - "cekirdek/demolar/**"
  - "cekirdek/kayitlar/demo-paketi.ts"
  - "planlar/site-ayarlari.md"
  - "**/.env.example"
---

# Ayarlar ve siteye özel davranış

Site ayarı, siteden siteye değişebilen ve varsayılan değeriyle tanımlı davranıştır.

- Bir sitede farklı çalışması gereken davranışı koda koşul olarak yazma, çekirdeğe ayar olarak ekle. "Bu site ise şunu yap" diye site adına göre koşul yazma.
- Sitenin bütün ayarlarını türü, varsayılan değeri, açıklaması ve kimin değiştirdiğiyle tek bir ayar şemasında tanımla (`cekirdek/ayar-semasi/ayarlar.ts`). Kimliğin şeması `kimlik.ts`, site klasörünü okuyan ve doğrulayan tek yol `site-klasoru.ts` dosyasındadır. Doğrulama komutu: `pnpm site-dogrula`.
- Uygulama hangi siteyi çalıştırdığını yalnız `SITE_KLASORU` ortam değişkeninden öğrenir (karar 0021). Site derlemede değil, uygulama açılırken okunur; siteyi okuyan kod dosya yüklenirken değil, çağrıldığında okur (karar 0026).
- Altyapı sahibinin ayarını site klasöründe tut, yayınla değiştir. Mağaza sahibinin ayarını sitenin veritabanında tut; site klasöründe yalnız başlangıç değeri olur ve kurulumdan sonra okunmaz (karar 0010).
- Altyapı sahibinin ayarı `ayarSemasi`'na (`ayarlar.json`), mağaza sahibinin ayarı `magazaAyarSemasi`'na (`baslangic/ayarlar.json`) yazılır. Mağaza sahibinin ayarı yalnız `cekirdek/moduller/magaza-ayarlari/servis.ts` ile okunur ve değişir; ayar veritabanında ilk kez yokken başlangıç değeriyle bir kez yazılır (karar 0055). Başlangıç dosyasının değeri bundan sonra kullanılmaz ama dosya her açılışta doğrulanır. Ayarın şemasını daraltan değişiklik kayıtlı değerleri dönüştüren bir veri değişikliğiyle gelir ve sitelerin başlangıç dosyalarını da düzeltir, yoksa okuma ya da açılış durur.
- Her ayarın varsayılanı olsun. Ayar verilmemişse sistem varsayılanla çalışır.
- Fiziksel, dijital, hizmet gibi ürün türlerini site başına açılıp kapanan ayar yap.
- Yönetim panelindeki ayar ekranlarını ayar şemasından üret.
- Ödeme anahtarı, şifre gibi gizli bilgileri ayar dosyasına yazma. Bilgisayarda `.env` dosyasında, sunucuda sitenin gizli bilgi dosyalarında tut. Yeni gizli bilgiyi `cekirdek/kayitlar/gizli-bilgiler.ts` kaydına ekle, uygulamada yalnız `gizliBilgi()` ile oku (karar 0031).
- Sitenin başlangıç içeriği (katalog, görseller, menüler, düzen, sayfalar, blog, kuponlar) bir demo paketinden gelebilir: `cekirdek/demolar/<kod>/`, site `baslangicDemosu` ayarıyla seçer (karar 0203). Parçaların listesi tek yerdedir (`cekirdek/kayitlar/demo-paketi.ts`). Site bir parçayı kendi başlangıç dosyasıyla değiştirecekse onu `demoParcasiSiteden` ayarına yazar; yazılmayan parça sitede bulunursa doğrulama durur. Paket dilini, para birimini, saat dilimini ve ürünlerinin vergi sınıflarını tanımında (`paket.json`) yazar, uymayan site o paketle başlayamaz. Paketin metninde mağazanın adı `{magazaAdi}` yer tutucusuyla yazılır, kurulumda mağazanın adı konur.
