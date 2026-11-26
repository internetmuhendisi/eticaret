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

## Sonuç

### Büyümenin kaynağı

Yöntem (kart 0295'in yolu): çekirdek canlıdaki gibi derlendi, yalnız ölçüm için kaynak haritası açıldı (kayda girmedi). Sayfanın parçaları istemci listesinden ve kök parçalardan okundu, her parçanın baytları kaynak haritasıyla özgün dosyalara dağıtıldı. Bu yöntem hız ölçümünden yaklaşık 4–6 KB az sayar.

| Sayfa (sıkıştırılmış, KB) | b0434df (0312'den önce) | ana dal (0312 ve 0313) | 0329 sonu |
|---|---|---|---|
| Havale bildirimi | 297,7 | 299,8 | 296,7 |
| Ürün | 297,6 | 299,7 | 296,6 |
| Sepet | 286,8 | 288,9 | 289,6 |

Büyümenin kaynakları (havale bildirimi, +2,1 KB):
- `sepet-gorunumu.tsx` +0,74 KB: sepet sayfası ile her sayfadaki sepet penceresi aynı dosyadaydı; kupon alanı, geçmeme nedenleri ve özetin kupon satırı bütün sayfalara gidiyordu.
- `kayitlar/kampanya.ts` +0,27 KB: sepet deposu yalnız kodun uzunluğunu okuyordu, kaydın tamamı gidiyordu (kart 0313'ün panel listeleri dahil).
- Vitrin metinleri +0,31 KB: sepetin kupon metinleri (vitrin metinleri tek dosyadır, kalır).
- Sepet durumu ve deposu +0,2 KB: kuponun her sepet hesabına gitmesi (gereklidir, kalır).
- Gerisi (Radix ve öteki parçalar arasında ±0,4 KB) parçaların yeniden bölünmesi: sayfa bir parça fazla indiriyordu.

Kart 0313 vitrine yalnız kampanya kaydındaki listelerle ulaşıyordu; kayıt artık sepet deposuna gitmez.

### Yapılan

- Sepet penceresinin içi `sepet-penceresi-icerigi.tsx`'e, satırın ortak parçaları `satir-parcalari.tsx`'e, özet ve kupon nedeni `sepet-ozeti.tsx`'e alındı; `sepet-gorunumu.tsx` yalnız sepet sayfasının kodudur. Kullananlar (ödeme, sipariş sayfaları, Siparişlerim, panelin elle siparişi) ihtiyaç duydukları dosyayı içe aktarır.
- Kupon kodunun biçimi ve uzunluğu `kayitlar/kupon-kodu.ts`'e alındı; kampanya kaydı onları oradan alır (tek tanım).
- Pencere ve sepet durumundan sepet sayfasının dosyasına, özetine ve kampanya kaydına içe aktarma zinciri varmaz (`cekirdek/testler/vitrin-kodu.test.ts`); iki bozma kırmızıya düştü.
- Hız ölçümü yerelde hattın koşuluyla (ayrı kutuda temiz veritabanı, iki işlemci, boş dosya klasörü): 17/17 yeşil; ürün 303, havale bildirimi 303, sipariş takibi 302 KB (hatta 305, 306, 305).

## Durum

çalışılıyor
