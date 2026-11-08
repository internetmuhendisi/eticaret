# 0109 · Ürün kartı ve fiyat gösterimi

## Amaç

Ürünün listede, vitrin bölümlerinde, aramada ve önerilerde görünen kartı tek bileşendir. Tema bu kartın birkaç görünüm tipinden birini seçer. Fiyat her yerde tek fiyat bileşeniyle gösterilir.

Bölüm: Tasarım. Önce 0103 ve 0105 bitmiş olmalı.

## Olmazsa olmazlar

- Ürün kartı: görsel, marka, ad, fiyat, indirim oranı rozeti, stok durumu, puan alanı (yorumlar gelince dolar), favori ve sepete ekle eylemi.
- En az üç görünüm tipi: dikey kart, yatay kompakt kart (sekmeli vitrin gibi dar yerler için), görseli büyük kart. Tip temadan ya da bölümün görünüm seçeneğinden gelir.
- Fiyat bileşeni geçerli fiyatı, üstü çizili eski fiyatı, para birimini ve vergi metnini çekirdeğin gösterilecek fiyat işlevinden alır (karar 0067). Varyantlı üründe aralık gösterir.
- Tükenmiş ve zamanlanmış ürün kartta doğru görünür, stok durumu çekirdekten gelir (karar 0069).
- Görsel çekirdeğin ürettiği boyutlardan doğru olanı alır, alternatif metni vardır.
- Kart ve fiyat katalogda her tipte ve her durumda (indirimli, tükenmiş, varyantlı, görselsiz, uzun adlı) gösterilir.

## Sınırlar

- Sepete ekleme ve favori işlemleri yazılmaz (Vitrin bölümü); eylemler yalnız yer olarak durur.

## Bitti sayılır

- Kartın her tipi ve her durumu katalogda, iki temada, üç genişlikte kontrol edildi.
- Fiyat bileşeni çekirdek işlevle aynı sonucu gösteriyor (test).
- Uzun ad ve büyük fiyat kartı taşırmıyor.

## Durum

yapılacak
