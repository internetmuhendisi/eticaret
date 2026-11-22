# 0292 · Ürün ekranının galeri bölümünde yasak ARIA özniteliği

## Amaç

Hat 45045593092'de (kart 0291'in gönderimi, 2026-11-22) `cekirdek/testler/uctan-uca/urun-secenekleri.test.ts:110` onay penceresinin taramasında kırmızıydı: axe `aria-prohibited-attr` kuralı `#urun-galeri` içindeki bir öğeyi işaretledi. Bölüm kart 0266'da (galeri) eklendi; o kartın hattı ödeme sorunuyla başlamadığı için hatada ilk kez burada görüldü. Rolü ad almaya izin vermeyen bir öğeye `aria-label` verilmiş olabilir (`cekirdek/yonetim-paneli/urunler/galeri-bolumu.tsx`, listenin adı); ölçülmedi.

## Olmazsa olmazlar

- Hangi öğenin hangi özniteliği taşıdığı hattın izinden (`tarayici-testleri-izi`) ya da yerelde ölçülür.
- Öğe izin verilen bir rolle ya da görünen başlığa bağlanarak adlandırılır; galeri bölümü iki renkte ve üç genişlikte taramadan geçer.
- Aynı kalıp (rolsüz öğeye `aria-label`) öteki panel ekranlarında da aranır.

## Sınırlar

- Galerinin davranışı değişmez.

## Bitti sayılır

- `urun-secenekleri.test.ts` ve `urun-galeri.test.ts` yerelde yeşil; düzeltme geri alınınca tarama kırmızı.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
