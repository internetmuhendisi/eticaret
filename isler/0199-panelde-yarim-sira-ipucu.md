# 0199 · Panelde ürün bölümünün yarım kalan sırası için ipucu

## Amaç

Temanın geniş ekrandaki ürün sütunu sayısı temaya göre değişir (kart 0124, karar 0126): Canlı Çarşı ve Keskin Çizgi'de 5, Yumuşak Mevsim'de 4. Ürün sayısı bu sayının katı değilse son sıra yarım kalır. Örneğin Yumuşak Mevsim'de 5 ürünlü "Öne çıkanlar"da beşinci ürün alt satırda tek başına durur.

Ürün gizlenmez, çünkü mağaza sahibinin seçtiği ürün sessizce kaybolmamalı. Mağaza sahibi bölümü düzenlerken panelde kısa bir ipucu görür (kullanıcı kararı, 2026-11-14): "Bu temada geniş ekranda bir sırada 4 ürün görünür. 4 ya da 8 ürün seçerseniz son sıra dolu olur."

Bölüm: Yönetim paneli.

## Olmazsa olmazlar

- İpucu yalnız tam genişlikteki dikey kart ızgarasında, ürün sayısı temanın sütun sayısının katı değilken görünür. Yan afişli ızgara, yatay kart ve kaydırmalı şerit için ayrıca ölçülerek karar verilir.
- Sütun sayısı sitenin geçerli temasından okunur (`urunSutunu`), panelde ikinci kez yazılmaz.
- Ürün sayısı bölümün kendi değerinden gelir: elle seçimde seçilen ürün sayısı, kaynaktan gelen listede adet.
- Metin metin dosyasında durur; sayılar biçimleyiciden geçer.
- İpucu kaydetmeyi engellemez, uyarı değil bilgidir.
- Tema değişince (kart 0113) ipucu yeni temanın sayısıyla görünür.

## Sınırlar

- Vitrinde hiçbir ürün gizlenmez, ızgara değişmez.
- Bölümün kendi alanları ve şeması değişmez.

## Bitti sayılır

- İpucu katın dışındaki sayıda görünüyor, katında görünmüyor (test).
- Yumuşak Mevsim'de 5 ürünle görünüyor, Canlı Çarşı'da 5 ürünle görünmüyor (test).
- Panel ekranı iki renkte ve üç genişlikte taramadan geçiyor.

## Durum

yapılacak
