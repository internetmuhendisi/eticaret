# 0217 · Üst üste binen bildirimlerin kapat düğmesi

## Amaç

Aynı anda birden çok bildirim açıkken bildirimler üst üste toplanır; arkadaki bildirimlerin kapat düğmesi öndekinin altında kalır, ortasına basılınca öndeki bildirime gidilir. Erişilebilirlik taraması bunu "target-size" ile yakalar. Kart 0212'nin sepet sayfasında, iki ürün arka arkaya çıkarılınca ölçüldü: üç bildirimin ikisinin kapat düğmesi basılamıyordu (1280 px). Aynı durum favoriler sayfasında da olabilir, ölçülmedi.

Öneri: bildirim alanı bildirimleri açık (yığılmamış) gösterir ya da aynı anda tek bildirim görünür; seçim ölçülerek yapılır.

Bölüm: Yönetim paneli.

## Olmazsa olmazlar

- Düzeltme yalnız ortak bildirim parçasındadır (`bilesenler/parcalar/bildirim.tsx`); sayfa kendi bildirimini yeniden yazmaz.
- Birden çok bildirim açıkken her kapat ve eylem düğmesinin ortasına basılınca kendisine gidilir (`basilan-alan.ts` ölçüsüyle), üç genişlikte.
- Bileşen sahnesine birden çok bildirim açan örnek eklenir ve taramadan geçer.
- Sepet testi (`cekirdek/testler/uctan-uca/sepet.test.ts`) boş sepeti taramadan önce bildirimleri kapatıyor; bu kapatma kaldırılır, tarama bildirimler açıkken geçer.

## Sınırlar

- Bildirimlerin süresi, metni ve yeri değişmez.

## Bitti sayılır

- Birden çok bildirimli tarama ve basılan alan ölçümü katalogda ve sepet sayfasında yeşil; eski parçayla kırmızı.
- Sepet testindeki bildirim kapatma kaldırıldı.

## Durum

yapılacak
