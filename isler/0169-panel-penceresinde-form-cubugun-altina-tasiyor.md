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

## Durum

yapılacak
