# 0139 · Ürün yorumları ve puan

## Amaç

Müşteri ürüne puan verip yorum yazar, yorum mağaza onaylayınca yayınlanır (temel paket, Vitrin). Ana sayfadaki müşteri yorumları bölümü (kart 0112) ve ürün kartındaki puan bu veriyle açılır.

Bölüm: Vitrin. Önce 0138 bitmiş olmalı.

## Olmazsa olmazlar

- Yorum modülü: puan (1–5), başlık ve metin, yazanın görünen adı, durum (onay bekliyor, yayında, reddedildi), değişiklik kaydı.
- Yalnız girişli müşteri yorum yazar. "Yalnız satın alanlar yorum yapabilir" ve "Doğrulanmış alıcı etiketi" site ayarıdır (`planlar/site-ayarlari.md`). Sipariş modülü henüz yok: satın alma denetimi siparişe bağlanacak tek bir işlevle yazılır, bugün hiçbir müşteriyi satın almış saymaz. Bu yüzden "yalnız satın alanlar" açıkken kimse yorum yazamaz. Varsayılan açık kalır, Örnek Mağaza'da kapalıdır (kullanıcı kararı, 2026-11-11); değer `planlar/site-ayarlari.md` tablosuna yazılır.
- Onay ve red için yönetici ucu yazılır (izinleriyle, uç belgesi ve erişim testi). Panel ekranı on dördüncü bölümdedir.
- Ürün sayfasında ortalama puan, puan dağılımı, onaylı yorumlar ve sayfalama; ürün kartındaki puan ve ana sayfanın yorum bölümü aynı veriden. Yorum işlevi açılınca bölüm kendiliğinden çizilir (karar 0090).
- Yorum metni düz metin olarak saklanır ve çizilir, bağlantı ve HTML çalışmaz. Yorum formu robot korumalı ve istek sınırlıdır.
- Örnek Mağaza'nın başlangıç kataloğuna onaylı örnek yorumlar eklenir.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Panelde yorum yönetim ekranı ve "onay bekleyen yorum" bildirimi bu kartta yazılmaz.
- Yoruma görsel eklenmez, mağaza cevabı yazılmaz.

## Bitti sayılır

- Onaylanmamış ve reddedilen yorum hiçbir yerde görünmüyor, ortalamaya girmiyor (gerçek veritabanıyla test).
- İki ayarın her değeri testte.
- Tarayıcıda yorum formu klavyeyle dolduruluyor, iki temada ve üç genişlikte taramadan geçiyor.
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
