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

## Sonuç

- Sebep (yerelde ölçüldü, hattaki hatayla aynı): ürün ekranının bölüm kutuları rolsüz `Kart`'tı (div) ve `aria-labelledby` ile başlığından ad alıyordu; ARIA'da yasak. axe bunu her taramada on bir bölümde yalnız "gözden geçir" sayıyordu. Onay penceresi açılınca Radix sayfanın geri kalanını `aria-hidden` ile gizler, `aria-live` öğelerini ve üstlerini açık bırakır: galerideki `SiralanabilirListe`'nin duyuru alanı yüzünden `#urun-galeri` açık kalıyor, başlığı gizleniyor; ad görünmeyen başlığa bağlı, içi okunmuyor, axe ihlal sayıyor.
- Düzeltme: başlığıyla adlanan yedi kart `role="region"` aldı: ürün ekranının bölümleri, panelde iade talebi kutusu, vitrinde sipariş alındı sayfasının üç kartı, sipariş ayrıntısı ve havale kartı (aynı kalıbın taranan bütün yerleri; liste, bölge ve gezinme öğelerine ad zaten geçerli).
- Koruma: `Kart`'ın türü ad verilince `region` ya da `group` rolü ister; bozuk örnekleri `bilesenler/parcalar/testler/kart.test.tsx`.
- Ölçümler: `urun-secenekleri.test.ts` ve `urun-galeri.test.ts` yerelde 2/2 yeşil; ürün ekranının rolü kaldırılınca seçenekler testi `aria-prohibited-attr` `#urun-galeri` ile kırmızı. Ödeme, sipariş takibi ve iade talebi tarayıcı testleri 13/13 yeşil. Tür kuralı kaldırılınca dört bozuk örnek, vitrin kartından rol silinince tür kontrolü kırmızı.
- Bağımsız kontrol: kök sebebi ve çözümü doğruladı, kaçırılmış yer bulmadı (144 adlı açılış etiketi tarandı), var olan testleri etkileyen bir şey görmedi; kalıcı koruma önerisi uygulandı.

## Durum

bitti
