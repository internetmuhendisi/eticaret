# 0212 · Sepet ve kargo

## Amaç

Müşteri ürünü sepete ekler, adedini değiştirir, sepette doğru fiyatı, kargo ücretini ve toplamı görür (temel paket: Sepet ve ödeme, Kargo). Bugün vitrinde sepet işlevi kapalıdır: ürün kartında ve üst kısımda sepet düğmesi görünmez (kart 0108, 0109).

Bölüm: Sepet ve ödeme. Önce 0211, 0155 ve 0193 bitmiş olmalı.

## Olmazsa olmazlar

- Sepet modülü (`cekirdek/moduller/sepet/`): satılabilir birim ve adet. Üye olmayan müşterinin sepeti de tutulur; giriş yapınca hesaptakiyle birleşir (favorilerdeki gibi, karar 0110). Nerede saklandığı teknik karardır, karar kaydına yazılır.
- Sepete ekleme ürün sayfasından (seçili birim) ve ürün kartından (basit ürün; varyantlı üründe ürün sayfasına gider). Üst kısımdaki sepet sayısı ve sepet düğmesi işlevle açılır.
- Adet kuralları: ürünün en az ve en çok alım adedi, stok takibi açık birimde stoktan fazlası eklenmez. Satılabilirlik yalnız `stokDurumu` ile bulunur (kart 0155 bittikten sonra fiyatsız birim de satılamaz).
- Sepet her açılışta sunucuda yeniden hesaplanır: fiyat `gosterilecekFiyatlar`, vergi `vergiHesapla`, stok `stokDurumlari`. Tarayıcıdan gelen tutar kullanılmaz. Fiyatı değişen, stoğu azalan, tükenen, silinen ya da görünmez olan satır müşteriye söylenir; satılamayan satır ödemeye geçmeyi durdurur.
- Kargo hesabı tek yerde (`cekirdek/moduller/kargo/`): teslimat bölgesi başına sabit ücret ve ücretsiz kargo sınırı. Başlangıçta tek bölge vardır. Sınır indirimden önceki ya da sonraki tutara göre hesaplanır (`planlar/site-ayarlari.md`). Kargo gerektirmeyen ürünler ücreti etkilemez; sepetin hepsi böyleyse kargo yoktur. Kargonun vergisi kargo vergi sınıfından gelir (karar 0061).
- Sepet, ödeme, sipariş ve e-posta tutarı aynı hesaplama işlevinden alır (iş kuralları).
- Panel: kargo ücreti ve ücretsiz kargo sınırı ekranı, ayar şemasından. Değişiklik kaydına girer.
- Ürün kartının, ürün sayfasının ve üst kısmın sepet parçaları ortak bileşen kütüphanesinden; ürün kartında sepet düğmesi bugünkü yerinde açılır.
- Testler gerçek veritabanıyla: fiyat, indirim, vergi dahil ve hariç, kargo sınırının iki ayarı, kargo gerektirmeyen ürün, adet sınırları, aynı anda iki sekmede değişiklik, birleşme, iki site. Tarayıcıda klavyeyle ekleme ve adet değiştirme, iki renkte ve üç genişlikte tarama. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Ödeme adımı, stok ayırma ve sipariş bu kartta yoktur (0213, 0214).
- Kupon ve kampanya yoktur; hesap kupon satırına yer bırakır.
- Eklentiler yazılmaz: ücretsiz kargo hedefi, kalıcı sepet, sepeti paylaşma, desiye göre kargo.

## Bitti sayılır

- Müşteri ürünü sepete ekleyip adedini değiştirebiliyor, sepette satır, ara toplam, kargo, vergi dökümü ve toplam doğru (test).
- Fiyatı değişen ve tükenen satır sepette söyleniyor, satılamayan satırla ödemeye geçilmiyor (test).
- Kargo ücreti ve sınırı panelden değişiyor, değişiklik kaydına giriyor.
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
