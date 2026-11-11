# 0144 · İlk eklenti: stoğa gelince haber ver

## Amaç

Tükenen ürünün sayfasında müşteri e-postasını bırakır, ürün stoğa girince ona e-posta gider. Vitrine, panele ve e-postaya dokunan ilk eklentidir (`temel-paket.md`). Eklenti ekleme komutu henüz yok: bu eklenti `eklentiler/README.md`'deki adımlarla elle kurulur, komut sonra bu kurulumdan çıkarılır (kart 0145).

Bölüm: Vitrin. Önce 0138 bitmiş olmalı.

## Olmazsa olmazlar

- Önce tarif yazılır: `eklentiler/stoga-gelince-haber-ver.md`, katalogdaki tarif başlıklarıyla. Ayarlar ve varsayılanları kullanıcıya sunulur (üye olmayan müşteri de isteyebilir mi, talep ne kadar saklanır).
- Plan `planlar/` klasörüne yazılır, kullanıcı onaylar.
- Eklentinin çekirdekte nerede durduğu, nasıl açılıp kapandığı ve çekirdeğe hangi noktalardan bağlandığı (stok artışı, ürün sayfası, e-posta, panel) bir karar kaydına yazılır. Bağlantı noktaları siteye özel değil, her eklentinin kullanabileceği biçimde kurulur.
- Eklenti kurulunca kapalı başlar, site ayarından açılır.
- Talep kaydı: ürün ya da birleşim, e-posta, durum. Aynı e-posta aynı birleşime bir kez yazılır. Form robot korumalı ve istek sınırlıdır.
- Stok sıfırdan yukarı çıkınca e-postalar arka plan kuyruğundan gider, her talep bir kez. Stok aynı anda yeniden biterse kalan talepler bekler.
- E-posta onay ve aydınlatma kuralına uyar; e-posta adresi yalnız bu iş için kullanılır.
- Panelde ürünün bekleyen talep sayısı görünür (en küçük ekran, plan aşamasında kararlaştırılır).
- Kapatılınca vitrindeki form kalkar, talepler silinmez, e-posta gitmez.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Eklenti ekleme komutu bu kartta yazılmaz (kart 0145).
- SMS ve panel bildirimi yapılmaz.

## Bitti sayılır

- Tarifin "bitti sayılır" listesi tek tek denendi.
- Stoğa giren üründe her talep sahibine bir e-posta gidiyor, aynı anda iki stok girişinde de bir kez (gerçek veritabanı ve posta kutusuyla test).
- Kapalı eklentide form yok ve e-posta gitmiyor (test).
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
