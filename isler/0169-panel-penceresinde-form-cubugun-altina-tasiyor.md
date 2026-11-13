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
- Bağımsız kontrolün bulgularıyla düzeltildi: aynı form Slider sayfasında kartın içinde duruyordu, çubuk telefonda kartın iki yanından 8 px taşıyordu (sayfada `bottom-0 mx-0 px-0`, testte üç genişlikte). Çubuktaki `pb-6` ve `-mb-6` gereksiz çıktı (yapışmış çubuğun altına 24 px boşluk ekliyordu): vitrinin filtre penceresindeki aynı kalıp (kart 0136) yalnız `-bottom-6` ile doğruydu, o da ortak parçaya çevrildi. İç boşluk değeri (6) iki yerde yazılı, yorumla bağlı; ayrışması yalnız disiplin. Odaklanan alanın çubuğun arkasında kalma riski ölçülmedi, kart 0188.
- Kaçak: katalog örneğine eklenen alt çubuklu ikinci yan pencere öteki örnekle aynı düğme metnini taşıyordu; bütün parçaları tek sayfada gösteren bileşen sahnesinde iki aynı adlı düğme oldu, sahnenin altı taraması ve yan pencere klavye testi kırmızıydı. Yalnız katalogun yan pencere sayfası çalıştırılmıştı; bütün tarayıcı takımında görüldü. Örnek kendi metnini aldı, sahnenin taradığı pencerelere eklendi.

## Durum

bitti
