# 0155 · Fiyatsız ama stoklu birleşim ürünün genel durumunda "stokta" sayılıyor

## Amaç

Kart 0138'in testinde görüldü (2026-11-12): fiyatı girilmemiş ama stoğu olan bir birleşim, ürünün genel stok durumunu (`urunStokDurumu`, `cekirdek/moduller/stok/durum.ts`) "stokta" yapıyor. Fiyatı olmayan birim satın alınamaz (karar 0071) ve fiyat aralığı onu satılabilir saymaz. Bu yüzden öteki birleşimleri tükenmiş bir ürünün kartında "Tükendi" rozeti çıkmıyor; listenin tükenmişlik süzgeci (`tukenmisUrunKosulu`) ve "tükenen ürünü gizle" ayarı da ürünü stokta sayıyor.

Ürün sayfası (kart 0138) bu durumu kendi verisinde düzeltti (fiyatsız birimi genel duruma saymaz, yazısı "Tükendi"). Kural çekirdeğin tek işlevinde olmalı, sayfada değil.

Bölüm: Ürün ve stok. Benzer: karar 0069, 0071.

## Olmazsa olmazlar

- Önce ölçülür: fiyatsız stoklu birleşimi olan ürünün kartı, listesi ve "gizle" ayarındaki görünürlüğü gerçek veritabanıyla yazılır.
- "Satılabilir" tanımına fiyatın da girip girmeyeceği kullanıcıya ürün kararı olarak sorulur (stoğu olan ama fiyatı girilmemiş ürün listede görünsün mü?).
- Karar verilince kural tek yerde yazılır; kart, liste süzgeci, filtre ("stoktakiler"), ilgili ürünler ve ürün sayfası aynı işlevi kullanır. Ürün sayfasındaki geçici kural kaldırılır.

## Sınırlar

- Sepet ve sipariş kuralları bu işe karışmaz.

## Bitti sayılır

- Fiyatsız stoklu birleşimin her yerde aynı sonucu verdiği gerçek veritabanıyla testte.
- Ürün sayfası genel durumu çekirdeğin işlevinden alıyor.

## Durum

yapılacak
