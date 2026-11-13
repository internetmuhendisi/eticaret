# 0188 · Yan pencerede odaklanan alan alt çubuğun arkasında kalmasın

## Amaç

Kart 0169'un bağımsız kontrolü bir risk gördü, ölçülmedi. Yan pencerede uzun formda Tab ile aşağı inilince tarayıcı odaklanan alanı ancak pencerenin alt kenarına kadar kaydırır. Sabit alt çubuk (`YanPencereAltCubugu`) yaklaşık 56 px yer kaplar, odaklanan alan çubuğun arkasında kalabilir (WCAG 2.4.11, odak gizlenmemeli). Bu durum kart 0169'dan önce de vardı. Projede `scroll-padding` yok.

## Olmazsa olmazlar

- Tarayıcıda ölç: panelin Slider formunda ve vitrinin filtre penceresinde Tab ile inilirken odaklanan öğe çubuğun arkasında kalıyor mu, üç genişlikte.
- Kalıyorsa yan pencerenin içeriği alt çubuğun yüksekliği kadar `scroll-padding` alır (tasarım değerlerinden), sayfadaki sabit çubuklar için de aynısı aranır.
- Tarayıcı testi: her odakta öğe çubuğun üstünde görünür; düzeltmesiz hâlde kırmızı.

## Sınırlar

- Çubuğun görünüşü değişmez.

## Bitti sayılır

- Odak ölçümü yazıldı; sorun varsa düzeltildi ve test kırmızıdan yeşile döndü.

## Durum

yapılacak
