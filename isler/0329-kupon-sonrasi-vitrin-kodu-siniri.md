# 0329 · Kupondan sonra vitrin kodu sınırı aşıldı

## Amaç

Hat 45861763869 (8bdbd9cb, kart 0312'nin gönderimi) yalnız hız ölçümünde kırmızı: ürün sayfası (305 KB, sınırın üstünde) ve havale bildirimi (306 KB) sıkıştırılmış JavaScript sınırını (305 KB, karar 0152) aştı. Kart 0312'den önceki ölçümde (hat 45795286832, b0434df) ürün 303, havale bildirimi 304 KB'tı; aradaki gönderimde yalnız kart 0328 (test) ve kart 0312 (kupon: sepet durumu, kupon alanı, özetin kupon satırı) var. Bütün vitrin sayfaları yaklaşık 2 KB büyüdü. Büyümenin hangi dosyadan geldiği ölçülmedi.

## Olmazsa olmazlar

- Büyüme derlemenin kaynak haritasıyla dosya dosya ölçülür (kart 0295'in yolu); sebep ölçümle yazılır.
- Yalnız sepet sayfasının kullandığı kupon kodu (kupon alanı, geçmeme nedenleri, metinleri) öteki sayfaların koduna gitmez; sepet durumunun her sayfada yüklenen kısmı kupon için yalnız depodaki kodu taşır.
- Ürün ve havale bildirimi sayfası 305 KB'ın altına iner; hız ölçümü yerelde hattın koşuluyla yeşil.
- Kart 0313'ün (panelin kupon ekranları) vitrine bir şey ekleyip eklemediği aynı ölçümle denetlenir.

## Sınırlar

- Kod sınırı yükseltilmez, bilinen aşım listesine sayfa eklenmez.
- Kupon davranışı değişmez.

## Bitti sayılır

- Kaynak haritasıyla ölçülen büyüme ve sebebi kartın sonuç notunda.
- Yerelde hız ölçümü (temiz deneme veritabanı, hattın koşulu) bütün sayfalarda yeşil; ürün ve havale bildirimi sayfasının kodu yazılı.
- Var olan sepet, kupon ve ödeme testleri yeşil.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
