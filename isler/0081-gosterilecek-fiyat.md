# 0081 · Gösterilecek fiyat

## Amaç

Vitrin, sepet ve e-posta bir ürünün fiyatını tek işlevden alır: geçerli fiyat, vergi durumu, eski fiyat ve fiyatın yanındaki metin bir arada gelir (temel paket: Fiyat, Vergi).

Önce 0075 ve 0080 bitmiş olmalı.

## Olmazsa olmazlar

- Geçerli fiyat, sitenin vergi ayarına göre (dahil ya da hariç) gösterilecek tutara çevrilir. Hesap 0075'teki vergi işlevini kullanır.
- Fiyatın yanındaki ek metin ("KDV dahil" gibi) mağaza sahibinin ayarıdır.
- İndirimli üründe eski fiyat fiyat geçmişinden hesaplanır. Son 30 günün en düşük fiyatını göstermek mağaza sahibinin ayarıdır, varsayılanı açıktır.
- Tutar ortak biçimleyiciden geçer (`cekirdek/metinler/bicimleyici.ts`), para birimi ve biçimi site ayarından gelir.

## Sınırlar

- Fiyat bileşeni ve ekran tasarımı yazılmaz.
- Varyantlı üründe fiyat aralığı 0085'tedir (Katalog 2).
- 30 gün kuralının yasal dayanağı hukukçuya sorulacak; bu kart yalnız ayarı ve hesabı kurar.

## Bitti sayılır

- 30 gün içinde fiyatı birkaç kez değişmiş bir üründe eski fiyat elle hesaplanan değerle aynı (test).
- Ayar kapalıyken eski fiyat indirimden önceki satış fiyatı.
- Vergi dahil ve hariç sitede gösterilen tutar ve ek metin doğru.
- Çekirdekte para simgesi ve vergi adı kodda geçmiyor.

## Durum

yapılacak
