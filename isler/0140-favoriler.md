# 0140 · Favoriler

## Amaç

Müşteri beğendiği ürünü favorilerine ekler, favoriler sayfasından görür. Üye olmayan müşteri de favori ekleyebilir; giriş yapınca favorileri hesabına geçer. Ürün kartındaki ve üst kısımdaki favori düğmesi bugün işlevine bağlı ve gizli (karar 0083, 0085); bu kartla açılır.

Bölüm: Vitrin. Önce 0135 ve 0138 bitmiş olmalı.

## Olmazsa olmazlar

- Girişli müşterinin favorileri veritabanında, kendi hesabına bağlı durur. Müşteri ucu yalnız kendi favorilerini okur ve değiştirir (erişim testindeki müşteri senaryosu).
- Üye olmayan müşterinin favorileri tarayıcısında durur, sunucuya kişisel veri gitmez. Giriş ya da kayıttan sonra hesaptakilerle birleşir, tekrar oluşmaz.
- Ürün kartında, ürün sayfasında ve üst kısımda favori düğmesi ve sayısı; durum sayfa başına tek istekle gelir (hesap durumu gibi, karar 0098).
- Favoriler sayfası ürün kartıyla; görünmez olan ya da silinen ürün listede görünmez, tükenen ürün "Tükendi" ile görünür.
- Favori sınırı vardır, sınır aşılınca anlaşılır uyarı verilir.
- Çerez ve tarayıcıda saklama çerez politikasıyla uyumlu olur; gerekiyorsa hukukçuya soru kart 0063'e not edilir.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- "Favorideki ürün indirime girdi" bildirimi yapılmaz.
- Hesabım sayfasının öteki bölümleri yazılmaz; favoriler sayfası tek başına durur.

## Bitti sayılır

- Üye olmayan müşteri favori ekliyor, giriş yapınca favoriler hesabında, aynı ürün iki kez yok (tarayıcı testi).
- İki müşteri birbirinin favorisini göremiyor ve değiştiremiyor (gerçek veritabanıyla test).
- Düğme klavyeyle çalışıyor, ekran okuyucu durumunu söylüyor, iki temada ve üç genişlikte taramadan geçiyor.
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
