# 0119 · Büyük harfle yazılmış kimlik aynı kimlik sayılsın

## Amaç

Şemalar (`z.uuid()`) büyük harfli kimliği kabul ediyor, servisler ise kimlikleri metin olarak karşılaştırıyor. Kart 0107'nin bağımsız kontrolü bunu menü servisinde gerçek veritabanıyla ölçtü: üstü büyük harfle yeniden verilen alt öğe taşınmış sayılıp kardeşlerin sonuna düştü, değişiklik kaydına sahte bir değişiklik yazılacaktı. Menüde düzeltildi (kimlik şemada küçük harfe çevrilir). Aynı kalıp kategori servisinde de var: `cekirdek/moduller/kategori/semalar.ts` `ust: z.uuid()`, `servis.ts` `tasindi = ust !== eski.ust` ve döngü denetiminde `ust === kimlik`. Büyük harfle kendi üstü verilen kategori taşınmış sayılır; kendi kimliği büyük harfle verilirse döngü denetimini ıskalar, bilinen hata yerine veritabanının kısıtı (beklenmeyen hata) döner. Bu ikisi koddan çıkarıldı, ölçülmedi.

Bölüm: Vitrin. On birinci bölümde açık kartlardan bu bölüme alındı.

## Olmazsa olmazlar

- Önce kategoride iki durum gerçek veritabanıyla ölçülür.
- Kimlik alan bütün şemalar (kategori, ürün, marka, etiket, özellik, düzen ve öteki modüller) aranır; kimliği metinle karşılaştıran her yer bulunur.
- Kimlik tek bir ortak şema parçasıyla küçük harfe çevrilir, her modül onu kullanır (menüdeki `kimlikAlani` oraya taşınır).
- Her düzeltilen yerin testi büyük harfli kimlikle kırmızıdan yeşile döner.

## Sınırlar

- Uçlar ve panel ekranları bu işe girmez.

## Bitti sayılır

- Büyük harfle kendi üstü verilen kategori yerinden ve sırasından oynamıyor, kayda girmiyor (gerçek veritabanıyla test).
- Büyük harfle kendi altına taşınan kategori bilinen hatayla ("dongu") reddediliyor.
- Kimlik alan şemaların hepsi ortak parçayı kullanıyor; kullanmayan yeni şemayı bir kontrol yakalıyor ya da bu yalnız disiplin olarak yazılıyor.

## Durum

yapılacak
