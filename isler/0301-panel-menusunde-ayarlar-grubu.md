# 0301 · Panel menüsünde "Ayarlar" grubu

## Amaç

Onaylanan panel taslağında (karar 0157, `planlar/tasarim-yonu/panel.html`) menünün son grubu "Ayarlar"dır: Mağaza bilgileri, Sipariş ayarları, Ödeme yöntemleri, Kargo ve Ekip. Bugün bu ekranlar menüde "Satış" altında, siparişler ve müşterilerle karışık duruyor. Kart 0278'de Mağaza bilgileri de taslağa uymadan Satış altına konuldu.

Bölüm: Yönetim paneli 2 (açık kartlardan alındı). Kart 0278 sırasında bulundu. E-posta metinleri ekranı (0279) Ayarlar grubuna gireceği için ondan önce yapılır.

## Olmazsa olmazlar

- Sayfa ağacına (`cekirdek/yonetim-paneli/sayfa-agaci.ts`) "Ayarlar" grubu eklenir; Mağaza bilgileri, Sipariş ayarları, Ödeme yöntemleri, Banka hesapları ve Kargo oraya, taslağın sırasıyla taşınır. Banka hesaplarının yeri taslakta yoktur; ödeme yöntemlerinin yanında önerilir.
- Sayfa yolunda grubun adı taslaktaki gibi görünür.
- Telefondaki yan pencerede de aynı gruplar durur.

## Sınırlar

- Sayfaların adresleri ve izinleri değişmez.
- Ekip ekranı kart 0274'tedir. Kart 0274 "Ayarlar" grubunu açtı (Ekip ve Hesabım orada); bu kart öteki ayar ekranlarını gruba, taslağın sırasıyla Ekip'ten önce taşır.

## Bitti sayılır

- Menünün grupları ve sırası testte (`panel-yetkisi.test.tsx`, `sayfa-agaci.test.ts`).
- Panel çerçevesinin tarayıcı testi ve taraması geçiyor.
- Ekran görüntüsü taslakla yan yana kondu.

## Sonuç

- Sayfa ağacında (`sayfa-agaci.ts`) Mağaza bilgileri, Sipariş ayarları, Ödeme yöntemleri, Banka hesapları ve Kargo "Ayarlar" grubunda, taslağın sırasıyla Ekip ve Hesabım'dan önce; Satış'ta yalnız Siparişler ve Müşteriler kaldı. Adresler ve izinler değişmedi; telefondaki yan pencere aynı menüden çizilir.
- Sayfa yolu kök, sayfanın grubu, üst sayfalar ve sayfanın kendisidir (`sayfaYoluAdimlari`): grubun adı bağlantısız ara adımdır, bütün gruplarda. `SayfaYolu` parçası adressiz adımı düz yazı çizer; katalog örneği ve katalogdaki tarayıcı testi (yol sayısı, bağlantı sayısı, adressiz adımın bağlantı olmaması) güncellendi.
- Testler: gerçek menünün grupları ve Satış ile Ayarlar'ın sırası, yolun adımları (`sayfa-agaci.test.ts`); gerçek düzende mağaza sahibi ve görevlide Ayarlar grubu, sayfadaki yolda bağlantısız grup (`panel-yetkisi.test.tsx`). Grubun Satış'a dönmesi, sıranın bozulması, yoldan grubun çıkması ve grubun bağlantı çizilmesi ayrı ayrı bozularak kırmızıya düştü.
- Panel ve katalog birim testleri (47 dosya, 420 test), tür kontrolü, denetim; tarayıcıda panel çerçevesi (masaüstü menü, telefon yan penceresi, geniş logo, iki renkte ve üç genişlikte tarama) ve katalogdaki sayfa yolu (tarama, üç genişlikte basılan alan) 10/10 geçti.
- Ekran görüntüsü (masaüstünde sayfa yolu ve yan menü, telefonda menü penceresi) taslakla yan yana kondu: Ayarlar grubu ve sırası taslakla aynı. Taslaktan ayrı kalan grup adı ("Katalog"), grup sırası (İçerik ve Vitrin) ve yolun ilk adımı ("Panel") kart 0324'te.
- **Hat 45784138336 (010674b).** Tür kontrolü, birim takımı ve iki aşamalı tarayıcı testleri yeşil (menü ve sayfa yolu testleri dahil). Hattın yerel ortam denemesi kart 0328 yüzünden kırmızı, bu kartla ilgisiz.

## Durum

bitti
