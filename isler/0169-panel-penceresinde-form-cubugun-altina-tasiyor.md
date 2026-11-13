# 0169 · Panelin düzenleme penceresinde form kaydet çubuğunun altına taşımasın

## Amaç

Müşteri gezisinde (2026-11-13) ölçüldü: vitrin bölümleri ekranında bölüm düzenleme penceresi açılınca formun devamı ("Düğme yazısı", "Adres" alanları) alttaki "Vazgeç / Kaydet ve yayınla" çubuğunun altında da görünüyor. Bilgisayarda ve telefonda aynı.

## Olmazsa olmazlar

- Formun kaydırılan alanı çubuğun üstünde biter; çubuk pencerenin en altındadır, altında içerik görünmez.
- Aynı yan pencere kalıbını kullanan öteki ekranlarda (menü öğesi formu, Slider sayfası) aynı hata aranır.
- Tarayıcı testi: pencerenin her alanı kaydırılarak görünür, çubuğun altında görünen öğe yok; üç genişlikte.

## Sınırlar

- Formun alanları ve kaydetme davranışı değişmez.

## Bitti sayılır

- Pencerede çubuğun altında form öğesi görünmüyor (tarayıcı testi, eski hâlde kırmızı).
- Önce ve sonra ekran görüntüsü karşılaştırıldı.

## Notlar (2026-11-14)

- Neden ölçüldü: yan pencerenin kaydırılan içeriği `p-6` iç boşlukludur, tarayıcı `sticky bottom-0` çubuğu bu iç boşluk kadar yukarıda tutar. Negatif kenar boşluğu tek başına yetmedi (ölçüldü). Çubuk iç boşluk kadar aşağıya yapışır (`-bottom-6`) ve iç boşluğu kendi alt boşluğuyla kaplar.
- Ortak parça `YanPencereAltCubugu` (kütüphane): vitrin bölümleri ve menüler formları aynı çubuğu kopyalamıştı, ikisi de ona çevrildi.
- Önce ve sonra ölçümü (taze Örnek Mağaza, Slider düzenleme ve menü öğesi formu, 1280, 768 ve 390 px): önce üç genişlikte çubuğun altında 24 px kalıyor, o aralıkta form görünüyordu (6 ölçüm noktası). Sonra çubuk pencerenin alt kenarında, altında görünen öğe 0. Menü öğesi formu kısadır, çubuk yapışmaz; orada önce de sorun yoktu.

## Durum

yapılacak
