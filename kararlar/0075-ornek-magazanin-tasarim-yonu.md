# 0075 · Örnek Mağaza'nın tasarım yönü: Canlı Çarşı

## Tarih

2026-11-09

## Karar

Kullanıcı, beğendiği bir mağazanın ekran görüntüsünden çıkarılan üç yön arasından **A · Canlı Çarşı**'yı Örnek Mağaza için seçti. Seçilmeyen **B · Yumuşak Mevsim** ve **C · Keskin Çizgi** de hazır tema olarak kalacak (kullanıcı kararı). Üç yönün sayfaları ve bütün değerleri `planlar/tasarim-yonu/` altındadır (`genel-bakis.html`, `secenekler.html`). Bu dosyalar taslaktır, ürün kodu değildir.

**Canlı Çarşı'nın değerleri:**

| Değer | Açık tema | Koyu tema |
|---|---|---|
| Zemin | #FFFFFF | #12151B |
| Yüzey (kart görseli, arama) | #F5F6F8 | #1B2029 |
| Yazı | #1B1F27 | #EEF0F4 |
| Soluk yazı | #5A6170 | #A3AAB8 |
| Kenar | #E3E6EB | #2A303B |
| Birincil (düğme, rozet) ve üstündeki yazı | #F29F05 / #1B1F27 | #F5A623 / #12151B |
| İndirimli fiyat | #C62F21 | #FF8577 |
| Alt kısım ve üstündeki yazı | #1E2533 / #E6E9EF | #0B0D11 / #E6E9EF |
| Büyük afiş zemini | #FFE2A8 | #33270F |
| Kutu zeminleri (kategori, kampanya) | #FDF1D6, #E2F0FF, #FFE3E3, #E4F6E8, #EFE6FF | #2E2716, #17263A, #3A1F22, #1A2E22, #262037 |

- **Yazı tipi:** başlıklar Jost (600), metin Inter. Metin boyu 14 px, büyük afiş başlığı 48 px, bölüm başlığı 24 px (telefonda 32 ve 22 px).
- **Köşe:** kart ve kutuda 8 px, rozette 4 px, düğmeler hap biçiminde.
- **Yoğunluk:** masaüstünde bir sırada 5 ürün, telefonda 2; bölümler arası 48 px (telefonda 40 px).
- **Ürün kartı:** ince kenarlı, gölgesiz, görsel açık gri yüzeyde; rozet, üst satır (marka ya da kategori), ad, yıldızlar, fiyat ve üstü çizili eski fiyat.
- **Kontrast:** her yazı-zemin çifti 4,5:1'i geçer; en düşük 5,07:1 (açık), 6,90:1 (koyu).

**Başlangıç bölüm sırası** (üç temada aynı): üst kısım (duyuru şeridi; logo, arama, hesap, favori, sepet; menü), kayan büyük afiş, güven şeridi, kampanya afişleri (üçlü), kategori kutuları, ürün vitrini (öne çıkanlar), yan afişli ürün vitrini (yeni gelenler), görsel ve metin afişleri (ikili), sekmeli vitrin, geri sayımlı fırsatlar, müşteri yorumları, geniş afiş, blog yazıları, marka logoları, bülten kaydı, alt kısım.

**B ve C'nin ayrıldığı yerler:** B kırık beyaz zemin, koyu yeşil vurgu, Manrope, 16 px köşe, kenarsız gölgeli kart, sırada 4 ürün ve geniş boşluktur. C beyaz zemin, koyu lacivert afiş, elektrik mavisi düğme, sarı rozet, büyük harfli Archivo başlık, köşesiz kutu ve sırada 5 üründür. Bütün değerleri taslak dosyasındadır.

## Neden

- Kullanıcı beğendiği görüntüye en yakın olan yönü seçti. Görüntünün havası yoğun, renkli, her türden ürünü bir arada gösteren bir pazardı; Örnek Mağaza da giyim, ev ve elektronik aksesuarı bir arada satıyor.
- B ve C'nin tema olarak kalması, kart 0105'teki "her sitenin kullanabileceği temalar" yapısını ilk günden birden çok temayla denemeyi ve tema değişikliğini (kart 0113) gerçek temalarla sınamayı sağlar.

## Düşünülen diğer yollar

- **B · Yumuşak Mevsim:** Daha sakin ve ferah, ama görüntünün yoğunluğundan uzaklaşıyor. Seçilmedi, hazır tema olarak kalıyor.
- **C · Keskin Çizgi:** Aynı yoğunlukta, daha iddialı bir duruş. Seçilmedi, hazır tema olarak kalıyor.
- **İki yönden parça birleştirmek:** Sunuldu, kullanıcı A'yı olduğu gibi seçti.
- **Yalnız seçilen yönü tema yapmak:** Daha az iş olurdu, ama tema seçme ve tema değiştirme tek temayla anlamlı denenemez. Kullanıcı B ve C'nin de kalmasını istedi.

## Sonuçları

- Kart 0114 üç hazır tema yazar: Canlı Çarşı, Yumuşak Mevsim, Keskin Çizgi. Bu adlar çalışma adıdır, panelde görünecek adlar tema kartında kesinleşir. Örnek Mağaza Canlı Çarşı ile açılır.
- Taslaktaki renk adları (`--zemin`, `--birincil`...) yalnız seçenekleri göstermek içindir. Gerçek tasarım değerlerinin adları ve yapısı kart 0102'de kurulur; değerler oraya bu kayıttan ve taslak dosyasından taşınır, taslak sonra kaynak sayılmaz.
- Taslakta yazı tipleri Google'dan yüklenir. Gerçek sitede sitenin kendi sunucusundan yüklenecek (kart 0102).
- Afiş, kategori ve blog görselleri taslakta ürün fotoğrafları ya da yer tutucudur. Asıl görseller görsel paketiyle gelir (kart 0115). Kategori kutularında iki yer yeni kategorilere ayrıldı.
- Taslaktaki fiyat yazılışı (999,00 ₺) yalnız görünümdür, sitede para biçimi ayarından gelir. Güven şeridindeki ücretsiz kargo sınırı ve kargoya verme süresi ayardan okunacak, taslakta yer tutucudur.
- Ekran görüntüsündeki sitenin logosu, yazıları ve görselleri hiçbir yerde kullanılmadı. İçerik Örnek Mağaza'nın kendi kataloğundandır. Taslak, katalogda yayında olmayan Yün Atkı (taslak durumda) ve Hediye Paketleme (gizli) ürünlerini vitrine koymaz.
