# 0123 · Onay kutusunun hidrasyon uyarısı

## Amaç

Bileşen kataloğunun bölüm kütüphanesi sayfasında tarayıcı konsolunda React'ın hidrasyon uyarısı var (2026-11-10, karar 0089'un karşılaştırması sırasında görüldü).

- Uyarı bölüm formundaki onay kutusundan geliyor (Radix `Checkbox`, gizli `CheckboxBubbleInput`).
- Sunucunun yazdığı stil `opacity: "0"`, tarayıcının beklediği `opacity: 0`. Uyarı metninden okundu, nedeni ölçülmedi.
- Uyarı geliştirme derlemesinde sayfada "1 Issue" göstergesi bırakıyor. Bölüm kütüphanesinin tarayıcı testi konsol hatası sayıyor ve yine de yeşil geçiyor; uyarının konsola hangi seviyede yazıldığı ölçülmedi.

Onay kutusu kayıt formunda ve panelde de kullanılıyor. Aynı uyarı vitrinin gerçek sayfalarında da çıkıyor olabilir, ölçülmedi.

Bölüm: Vitrin. On birinci bölümde açık kartlardan bu bölüme alındı.

## Olmazsa olmazlar

- Önce ölçülür: uyarı hangi sayfalarda çıkıyor (katalog, vitrin kayıt formu, panel)? Canlı derlemede bir etkisi var mı?
- Neden bulunur: Radix'in sürümü mü, React'ın sürümü mü, parçanın kullanımı mı?
- Çözüm ortak parçada yapılır (`bilesenler/parcalar/onay-kutusu.tsx`), kullanan sayfalara yayılmaz.
- Tarayıcı testlerinin konsol denetimi hidrasyon uyarısını da yakalayacak biçimde genişletilir, bozuk örnekle denenir.

## Sınırlar

- Onay kutusunun davranışı ve görünüşü değişmez.

## Bitti sayılır

- Bölüm kütüphanesi ve kayıt sayfasında konsolda hidrasyon uyarısı yok, tarayıcı testi bunu denetliyor.

## Durum

yapılacak
