# 0193 · Yatay ürün kartında fiyata yer kalsın

## Amaç

Yatay (kompakt) ürün kartında sepete ekle ve favori düğmeleri fiyatın yanında durur. İkisi birlikteyken 320 px'te fiyata yalnız 70 px kalıyor: "225,00 ₺" bile sığmıyor, simge alt satıra iniyor ("225,00" / "₺", "140,00 –" / "250,00" / "₺"). Kart 0190'ın kontrolünde katalogda ölçüldü. Bugün vitrinde sepet işlevi kapalı olduğu için müşteri görmüyor; sepet açılınca sekmeli vitrin ve "Kategoriye göre" gibi yatay kart kullanan bölümlerde görünür.

Bölüm: Vitrin. Sepet işlevi açılmadan önce yapılır.

## Olmazsa olmazlar

- Dar ekranda fiyat ve düğmelerin yerleşimi bir ürün kararıdır (örneğin düğmeler fiyatın altına iner ya da yalnız biri kartta kalır); kullanıcıya seçenekler taslakla birlikte sorulsun.
- 320 px'te yatay kartta tek tutar bölünmesin, simge tutardan ayrılmasın; düğmeler 44 px kalsın.

## Sınırlar

- Dikey ve büyük görselli kart değişmez.
- Fiyatın yazılışı değişmez (kart 0190).

## Bitti sayılır

- Yatay kart sepet ve favoriyle 320, 360 ve 390 px'te fiyatın her satırında tutar ve simge birlikte; kart 0190'ın tarayıcı testi yatay kartı da ölçüyor, eski hâlinde kırmızı.
- Kartın taraması ve klavye sırası (ad, sepet, favori) değişmeden geçiyor.

## Durum

yapılacak
