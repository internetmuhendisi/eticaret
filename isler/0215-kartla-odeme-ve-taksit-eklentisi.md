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

## Durum

yapılacak
