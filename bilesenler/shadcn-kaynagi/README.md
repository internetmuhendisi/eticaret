# shadcn/ui asıl kaynakları

Ortak parçalar (`bilesenler/parcalar/`) shadcn/ui'dan uyarlanmıştır (kart 0103, karar 0077). Bu klasörde parçaların uyarlandıkları asıl hâlleri, shadcn'in kayıt adresinden indirildiği gibi durur. Kayıt adresi `https://ui.shadcn.com/r/styles/new-york-v4/<parça>.json`, ilk indirme tarihi 2026-11-09.

Bu dosyalar kod değildir: hiçbir yerden içe aktarılmaz, denetime girmez. Yalnız güncellemede farkı görmek için saklanır.

| shadcn parçası | Bizim parçamız |
|---|---|
| button | `dugme.tsx` (Dugme, IkonDugmesi), `form/form.tsx` (GonderDugmesi) |
| input | `giris-alani.tsx` |
| textarea | `uzun-metin-alani.tsx` (kart 0106, indirme 2026-11-09) |
| label | `etiket.tsx` |
| select | `secim-kutusu.tsx` |
| checkbox | `onay-kutusu.tsx` |
| dropdown-menu | `acilir-menu.tsx` |
| popover | `acilir-panel.tsx` (kart 0267, indirme 2026-11-23) |
| dialog | `pencere.tsx` |
| sheet | `yan-pencere.tsx` |
| tabs | `sekmeler.tsx` |
| card | `kart.tsx` |
| badge | `rozet.tsx` |
| alert | `uyari.tsx` |
| sonner | `bildirim.tsx` |
| tooltip | `ipucu.tsx` |
| skeleton | `iskelet.tsx` |
| spinner | `yukleniyor.tsx` |
| carousel | `serit.tsx` |
| accordion | `akordeon.tsx` |

## Güncelleme

1. `pnpm shadcn-farki`: her parçanın bugünkü hâlini indirir, burada saklananla karşılaştırır, değişenlerin farkını yazar.
2. Değişiklik bizim parçamıza elle uyarlanır: sınıflar tasarım değerlerinin adlarıyla, metinler kullanan sayfadan, ikonlar ikon sözlüğünden.
3. `pnpm shadcn-farki --kaydet`: yeni asıl hâli saklar. Böylece bir sonraki fark yalnız yeni değişiklikleri gösterir.
4. Radix, Sonner ve Embla paketlerinin sürümü ayrıca güncellenir. Parçanın tarayıcı testi (`cekirdek/testler/uctan-uca/bilesenler.test.ts`) her güncellemeden sonra çalışır.
