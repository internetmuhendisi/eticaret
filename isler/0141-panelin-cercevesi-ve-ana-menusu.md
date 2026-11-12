# 0141 · Panelin çerçevesi ve ana menüsü

## Amaç

Yönetici girişi ve iki aşamalı giriş var (kartlar 0027, 0028), ama girişten sonra panel boş. Bu bölümün panel ekranları (vitrin bölümleri, menüler) ve on dördüncü bölümün ekranları aynı çerçeveye oturmalı: ana menü, sayfa yolu, komut çubuğu.

Bölüm: Vitrin. Önce 0134 bitmiş olmalı.

## Olmazsa olmazlar

- Ana menü, sayfa yolu ve sayfa başlıkları tek sayfa ağacından üretilir (`.claude/rules/yonetim-paneli.md`).
- Yetkisi olmayan kullanıcı menüde o sayfayı görmez; yetki sunucudan okunur.
- Her panel sayfası aynı iskeletle: komut çubuğu, altında içerik. Eylemlerin adı ve ikonu tek dosyadan.
- Telefonda ana menü yan pencerede açılır, panel telefonda kullanılabilir.
- Girişten sonraki açılış sayfası: pano bugün yoktur, yerine boş bir karşılama sayfası durur (pano on dördüncü bölümde).
- Panelde altyapı adı yalnız giriş sayfasında ve alt köşede küçük görünür.
- Sıralanabilir küçük liste ortak parça olarak yazılır (bölüm ve menü ekranları kullanır); liste motoru gelince ona bağlanır.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Pano, ürün, sipariş ve ayar ekranları on dördüncü bölümdedir.
- Giriş, kurulum ve çıkış akışı değişmez.

## Bitti sayılır

- Menü yalnız yetkili sayfaları gösteriyor (rol başına test).
- Tarayıcıda menü klavyeyle geziliyor, telefonda yan pencerede açılıyor, iki temada ve üç genişlikte taramadan geçiyor.
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
