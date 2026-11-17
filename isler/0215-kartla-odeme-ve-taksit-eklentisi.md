# 0215 · Kartla ödeme ve taksit eklentisi

## Amaç

Müşteri ödeme adımında kartıyla, isterse taksitle öder. Ödeme kuruluşuyla konuşan ilk eklentidir ("Derste örnek gösterilen eklentiler", `eklentiler/README.md`, kod adı `kartla-odeme`). Eklenti `/eklenti-ekle kartla-odeme` ile kurulur (kart 0145); komut tarifi olmayan eklentide durur.

Bölüm: Sepet ve ödeme. Önce 0214 bitmiş olmalı.

## Olmazsa olmazlar

- Önce tarif yazılır: `eklentiler/kartla-odeme.md`, katalogdaki tarif başlıklarıyla. Ayarlar ve varsayılanları kullanıcıya sunulur.
- Ödeme kuruluşu kullanıcıya sorulur: karşılaştırma (komisyon, taksit desteği, test ortamı, verinin yeri, sözleşme koşulları) bugünkü fiyatlarla, kaynağıyla sunulur, bir öneri yapılır. Seçim bir karar kaydına yazılır.
- Yalnız ödeme kuruluşunun test ortamı kullanılır. Gerçek ödeme kullanıcının onayı olmadan alınmaz (`CLAUDE.md`, Yasaklar).
- Anahtarlar gizli bilgidir: `cekirdek/kayitlar/gizli-bilgiler.ts` kaydına eklenir, yalnız `gizliBilgi()` ile okunur, ayar dosyasına yazılmaz.
- Kart bilgisi sitenin sunucusuna gelmez ve saklanmaz; kart ödeme kuruluşunun formunda ya da sayfasında girilir. 3D Secure doğrulaması yapılır.
- Ödemenin başarılı olduğu tarayıcıdan gelen bilgiyle değil, ödeme kuruluşunun doğrulamasıyla kabul edilir. Bildirim ucu imzayla doğrulanır; aynı bildirim iki kez gelse de sipariş bir kez işlenir (iş kuralları).
- Başarılı ödemede sipariş "hazırlanıyor" durumuna geçer; başarısız ya da yarıda kalan ödemede ayrılan stok serbest kalır, müşteri ödeme adımına hata metniyle döner.
- Taksit seçenekleri ödeme kuruluşundan gelir, ödeme adımında kartın ilk hanelerine göre gösterilir; taksitli toplam müşteriye açıkça yazılır.
- Siteler her gün ödeme kuruluşunun kayıtlarıyla karşılaştırılır, uyuşmayan sipariş hata izlemeye ve yöneticiye bildirilir (iş kuralları; yönetici bildirimi on üçüncü bölümün e-postalarıyla gelirse orada bağlanır).
- Eklenti kapalı başlar; kapalıyken ödeme yöntemleri listesinde yoktur, uçları bulunamadı verir.
- Ödeme yöntemleri kaydına (kart 0214) eklenti olarak bağlanır; çekirdeğin ödeme modülü eklentiyi tanımaz.
- Testler: ödeme kuruluşunun test ortamıyla ya da onun belgelenmiş test kartlarıyla başarılı, başarısız, yarıda kalan ödeme; iki kez gelen bildirim; imzasız ve yanlış imzalı bildirimin reddi; tarayıcıdan gelen "başarılı"nın yok sayılması; kapalı eklenti; karşılaştırmada uyuşmazlık. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Banka sanal POS bağlantısı ayrı eklentidir (`banka-sanal-pos`).
- Kartla iade ve kısmi iade on üçüncü bölümdeki iade akışıyla gelir.
- Gerçek ödeme alınmaz, ödeme kuruluşuyla sözleşme yapılmaz.

## Bitti sayılır

- Tarifin "bitti sayılır" listesi tek tek denendi.
- Test ortamında kartla ve taksitle sipariş baştan sona geçiyor; iki kez gelen bildirim siparişi bir kez işliyor (test).
- Kapalı eklentide kartla ödeme seçeneği yok (test).
- Taslakla karşılaştırma yapıldı.

## Notlar (2026-11-17)

Kullanıcının kararları ve teknik kurallar karar 0142'de, tarif `eklentiler/kartla-odeme.md`, plan `planlar/kartla-odeme.md`.

Karttan ayrılan yerler:
- Anahtarlar `cekirdek/kayitlar/gizli-bilgiler.ts`'e değil, ayrı bir kayda yazıldı (`disaridan-gizli-bilgiler.ts`, okuma `disaridanGizliBilgi`): sunucuda üretilmezler, yoksa hata değildir, ve gizli bilgi okuyucusunun içe aktarılması veri ayrımı testinde yalnız iki dosyaya açıktır.
- Taksit seçimi ödeme adımında değil iyzico'nun formunda (kullanıcı kararı); ödeme adımı taksit tablosu göstermez.
- Çekirdekte iki yeni bağlantı noktası kuruldu: ödeme yöntemi noktası ve kapının dış kuruluş dönüşü (planda yazılı, kullanıcı planı onayladı).

Bitti sayılır, tek tek:
- Tarifin listesi: kapalı eklentide yöntem, başlatma, taksit ucu, panel satırı ve ürün sayfası satırı yok (birim testi; panelin kapalı hâli servisle, yuva `kullanilabilirYontemler` ile); dönüş ve bildirim yalnız başlatılmış ödemeyi tamamlar. Açıkken sahte kuruluşla kartla ve 3 taksitle sipariş (birim ve tarayıcı), gerçek deneme ortamında kartla 3D Secure'lu ödeme ve dönüş (elle, karar 0142). Başarısız ve yarıda kalan ödemede sipariş yok, ayırma bırakılır, müşteri hata metniyle döner (birim ve tarayıcı). Tarayıcının "başarılı"sı yok sayılır (test). İmzasız ve yanlış imzalı bildirim reddedilir, iki kez ve aynı anda gelen dönüş ve bildirim tek sipariş kurar (test). Stok yokken ve fiyat değişince ödeme iptal edilir (sahte kuruluşla test, gerçek iptal elle). Karşılaştırma üç uyuşmazlığı bulur (sahte kuruluşla test). Taksit satırı ayara göre, tablo kuruluştan (test, gerçek taksit sorgusu elle 6 banka). Kontroller ve testler aşağıda.
- Test ortamında taksitle sipariş: sahte kuruluşla test edildi; gerçek deneme ortamında deneme kartı için yalnız tek çekim çıktı, **taksitli ödeme gerçek ortamda ölçülmedi**.
- Kapalı eklentide kartla ödeme yok (test). Kapalı hâlin gerçek uygulamada bir kez ölçülmesi (komutun 6. adımı) yapılmadı: Örnek Mağaza'nın anahtarsız hâli tarayıcı testlerinde zaten yöntemi gizler, birim testleri kapalı hâli uçta, serviste ve yuvada ölçer.
- Taslakla karşılaştırma: ödeme adımı (kart reddedildi) ve ürün sayfası, iki temada, telefon ve bilgisayarda görüntüyle. Hata kutusu taslaktaki gibi ödeme yöntemi bölümüne taşındı, taksit satırının yazı boyu taslağa getirildi. Farklar kullanıcı kararıdır (form iyzico'nun sayfasında, taksit iyzico'nun formunda) ya da yuvanın yeridir (taksit satırı stok yazısının altında, taslakta fiyatın altında).

Bağımsız kontrol yedi bulgu verdi (üçü yüksek): yeniden onayın ödemesi dışarıda başlamış oturumu silmesi, belirsiz sonucun başarısız sayılması (gerçek ortamda da ölçüldü), son adet yarışı, incelemedeki ödemenin süreyle düşmesi, taramanın tıkanması, belirtecin erişim anahtarı gibi çalışması, iptalden sonra sonucun "ödendi" kalması. Altısı düzeltildi ve testlendi, sonuncusu karar 0142'de sınır olarak yazıldı.

Son kontroller (çalışma kopyasında, yerel ortak veritabanı): biçim, denetim, denetimin kendi testi, tür kontrolü, site doğrulaması geçti. Birim: 3428 testin 4'ü düştü, dördü süre aşımı (kart 0133); tek başına yeniden çalışınca yalnız indirim oranı testi üçte bir düştü (kart 0202). Tarayıcı: 283 testin 7'si düştü: altısı ekran ölçümünde yerel veritabanında eksik görsellerin 404'ü (değişiklikten bağımsız), biri panelin ödeme yöntemleri testi (yöntemi adıyla bulma "Kartla öde"yi tanımıyordu, düzeldi; aynı testin son adımı ara sıra düşüyor, kart 0223). Hız ölçümü 13/13.

## Durum

yapılacak
