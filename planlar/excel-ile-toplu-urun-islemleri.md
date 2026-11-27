# Plan: Excel ile toplu ürün işlemleri eklentisi (kart 0315)

Durum: 2026-11-27'de kullanıcıya özetlendi ve onaylandı. Tarif: `eklentiler/excel-ile-toplu-urun-islemleri.md` (2026-11-27'de onaylandı). Taslak: `planlar/tasarim-yonu/panel-2.html`, "Excel (eklenti)" sayfası; taslağın kararları karar 0185'te.

## Kullanıcının kararları

- Taslakla (karar 0185): her birleşim bir satır, tek sayfa; boş hücre değiştirmez, "-" siler; hatalı satırı olan dosya hiç uygulanmaz.
- Tarifle (2026-11-27): dosya indirildiği andaki değerlerle karşılaştırılır (dokunulmayan hücre değişmez, iki yanda değişen hücre hatalı satır); dosyadan silinen satır hiçbir şeyi silmez; sitede olmayan kategori, marka ve etiket hatalı satırdır.
- Ayarlar: eklenti açık mı (altyapı sahibi, varsayılan kapalı, Örnek Mağaza'da açık), bir dosyada en çok satır (`excelSatirSiniri`, altyapı sahibi, varsayılan 5.000).
- Planla (2026-11-27): "Durum" hücresi boş yeni ürün taslak açılır; Örnek Mağaza'da eklenti açılır.

## Bu siteye uyarlananlar (teknik kararlar)

- Kütüphane: `read-excel-file` ve `write-excel-file` (bakımlı, tek bağımlılıkları sıkıştırma kütüphanesi). `exceljs` 2023'ten beri yayın almadı, SheetJS'in npm'deki sürümünde bilinen açık var. Güvenlik taramasından geçmeden eklenmez.
- Dosya iki sayfadır: "Ürünler" (satırlar) ve "Bilgi" (dışa aktarmanın kimliği, tarih, sütunların kısa açıklaması). Kimlik bu sayfadan okunur; yoksa ya da 30 günden eskiyse dosya elle hazırlanmış sayılır.
- Ürün kodu ürünün adres adıdır. Adı değişmiş ürünün eski adresi de ürünü bulur (eski adresler). Seçenekli yeni ürünün satırları aynı ürün koduyla gruplanır; kodsuz satır seçeneksiz yeni ürün olur, adres adı adından üretilir. Birleşimi ürün kodu ile seçenekler tanır.
- Hücreler: tutar sayı hücresi (iki ondalık), okurken sayı ya da sitenin para biçiminde yazı; tarih ve saat sitenin saat diliminde "2026-12-08 23:59" yazısı; durum Türkçe adı (Taslak, Yayında, Gizli, Arşiv; Zamanlanmış yalnız değişmeden kalabilir); kategoriler yoluyla ("Giyim › Kadın"), birden çoğu ";" ile; özellikler "Ad: değer" ve ";" ile, değer panelin yazılışıyla. Bütün metin hücreleri metin türünde yazılır, formül hiç yazılmaz.
- Dışa aktarma ve içe aktarma arka plan işidir (tek iş en çok 300 saniye): satırlar partilerle işlenir, her parti sonraki partiyi kuyruğa koyar. Dışa aktarılan dosya ve yüklenen dosya eklentinin tablosunda durur (dosya servisinin görsel ve belge yollarına girmez); yüklenen dosya iş bitince ya da vazgeçilince silinir.
- Yüklenen dosya açılmadan önce denetlenir: .xlsx imzası, 10 MB, açılmış hâlinin boyutu (sıkıştırma bombası), satır sınırı.
- Her satır kendi işleminde ve var olan servislerle yazılır: ürün, seçenek ve birleşim (`urunServisi`), fiyat (`fiyatYaz`), stok (`stokDuzelt`, görülen miktarla), kategori, marka, etiket ve özellik bağları (ürün değişikliği). Satırın uygulandığı işaret aynı işlemde yazılır: iş yarıda kalırsa kaldığı satırdan sürer, aynı satır iki kez yazılmaz.
- Önizlemeden sonra sitede değişen satır uygulanmaz ("uygulanamadı" ve nedeni), ötekiler uygulanır.
- Dışa aktarma ve içe aktarma yöneticinin kendisinindir: dosyayı yalnız hazırlayan indirir (fiyat ve stok sütunları onun izniyle yazıldı), önizlemeyi yalnız yükleyen uygular. Bir yöneticinin tek açık içe aktarması olur; yeni dosya öncekini vazgeçilmiş sayar.
- İzinler var olanlardır: dışa aktarma `urun.gor` (fiyat sütunları `fiyat.gor`, stok `stok.gor`), içe aktarma `urun.degistir` (fiyat değiştiren satır `fiyat.degistir`, stok değiştiren `stok.duzelt`). Yeni izin yok.

## Çekirdekte yapılacaklar (bağlantı noktası değil, kayıt satırı)

- Stok sebeplerine "Excel ile içe aktarma" (`excel-ice-aktarma`, elle seçilemez); veritabanındaki denetim aynı değişiklikle.
- Altyapı ayarı `excelSatirSiniri` (ayar şeması, site ayarları belgesi).

## Veri

- `excel_disa_aktarmalari`: kimlik, yönetici, durum (hazırlanıyor, hazır, hatalı), kapsam (bütün ürünler ya da listenin süzgeçleri), sayılar, birimlerin indirildiği andaki değerleri, dosya, zamanlar. 30 gün saklanır.
- `excel_ice_aktarmalari`: kimlik, yönetici, durum (denetleniyor, önizleme, uygulanıyor, bitti, vazgeçildi, okunamadı), dosya adı ve dosya, dışa aktarmanın kimliği, sayılar, zamanlar. 30 gün saklanır.
- `excel_ice_aktarma_satirlari`: iş, satır numarası, sonuç (eklenecek, değişecek, değişmeyecek, hatalı), ürün ve birim, değişiklikler (alan, şimdiki, yeni), neden, uygulandı mı ve uygulama sonucu.

## Ekranlar

- Ürünler listesinin komut çubuğunda "Excel" (eklenti açıkken).
- "Excel ile içe ve dışa aktar" sayfası (Ürünler'in alt sayfası, sayfa ağacında `eklenti`): dışa aktar kartı, içe aktar kartı, önizleme, uygulanıyor ve sonuç hâlleri (taslaktaki gibi). Sayfa açıkken iş sürüyorsa durum belirli aralıklarla sorulur.

## Uçlar

Dışa aktarmayı başlat, durumu, dosyayı indir; dosyayı yükle (`-yukle`, yükleme sınırı), içe aktarmanın durumu ve önizlemesi, uygula, vazgeç. Uç belgesine ve erişim testine girer.

## Arka plan işleri

Dışa aktarma partisi, içe aktarmanın denetim partisi, uygulama partisi, günlük temizlik (saklama süresi; eklenti kapalıyken de çalışır).

## Testler

- Gerçek veritabanıyla: değiştirilmeden yüklenen dosyanın hiçbir şey değiştirmemesi (arada siparişle stok düşmüş olsa da), fiyat, indirim, stok ve ortak bilgilerin değişmesi ve geçmişleri ve değişiklik kaydı, yeni ürün ve yeni birleşim, var olan ürüne yeni seçeneğin reddi, boş hücre ve "-", dosyada olmayan ürün, hatalı satırlar ve nedenleri (okunamayan tutar, olmayan kategori, marka, etiket, aynı birleşim iki satırda, satırlar arasında çelişen ortak bilgi), iki yanda değişen hücre, izni olmayanın fiyat ve stok satırı, satır ve boyut sınırı, .xlsx olmayan ve bozuk dosya, sıkıştırma bombası, formül hücresinin metin olarak yazılması, önizlemeden sonra değişen satır, yarıda kalan işin kaldığı satırdan sürmesi, varyantlı ürün, kapalı eklenti (servis, uç, iş, panel), temizlik, iki site.
- Uçlar gerçek istekle: izinler, başka yöneticinin dosyası ve işi, kapalı eklentide bulunamadı.
- Tarayıcıda klavyeyle dışa aktarma ve indirme, dosya yükleme, önizleme (hatalı ve hatasız), uygulama ve sonuç; iki renkte ve üç genişlikte tarama.
- Kapalı hâlin gerçek uygulamada bir kez ölçülmesi, bilerek bozma (her `eklentiAcikMi` ve ağaçtaki `eklenti` alanı dahil), taslakla karşılaştırma, bağımsız kontrol.

## Sınırlar

Siparişleri dışa aktarma (kart 0316), başka sistemden veri taşıma, görsellerin ve uzun açıklamanın dosyada olması (görsel ve biçimli metin panelde düzenlenir), panel içi bildirim (kart 0280).
