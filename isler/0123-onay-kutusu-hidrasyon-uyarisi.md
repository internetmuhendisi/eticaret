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

## Ölçüm (2026-11-13)

- Onay kutusunu kullanan sayfalar gerçek tarayıcıda açılıp konsoldaki bütün iletiler seviyeleriyle toplandı: katalogda bölüm kütüphanesi, onay kutusu ve yan pencere örneği, vitrinde kayıt sayfası, ana sayfa ve filtreli kategori sayfası. Her sayfa üç kez açıldı.
- Sayfaların hiçbirinde hidrasyon uyarısı çıkmadı. Ölçüm, onay kutusunun ve Radix'in gizli alanının sayfada gerçekten çizildiğini de saydı: bölüm kütüphanesinde 5 kutu ve 2 gizli alan, kayıt sayfasında 3 kutu ve 3 gizli alan.
- Uyarı şu koşulların hiçbirinde çıkmadı:
  - geliştirme derlemesi, normal ve 4 kat yavaş işlemci;
  - canlı derleme (`next build`, deneme ortamı), normal ve 4 kat yavaş işlemci; ama canlı derlemede React öznitelik uyuşmazlığını hiç yazmaz, bu ölçüm uyarının olmadığını göstermez, yalnız sayfanın hatasız açıldığını gösterir (bağımsız kontrolün bulgusu);
  - uyarının görüldüğü günün kodu (karar 0089'un kaydı, 0a3b9eb), geliştirme derlemesi, normal ve 4 kat yavaş işlemci.
- Radix, React ve Next.js'in sürümü o günden beri değişmedi (1.8.1, 19.3.1, 16.4.3). Onay kutusu parçası da değişmedi.
- Neden: Radix'in gizli alanı, JavaScript'siz form çalışsın diye sunucuda bilerek çizilir; stili sabittir (`opacity: 0`). Tarayıcının ilk çizimi bunu aynen üretir, sonra alan formun dışındaysa kaldırılır. Uyuşmazlık ancak sayfa canlanmadan önce kutunun durumu değişirse ya da React'ın uyarı metni başka bir alanın farkını (ör. ölçülen genişlik) bu stille birlikte gösterirse olur. Bunu yeniden üretecek koşul bulunamadı; uyarı metnindeki `opacity` farkı React'ın sunucu değerini metin olarak yazmasından gelebilir. Bu bir varsayımdır, ölçülmedi.
- Sonuç: onay kutusu parçasında değişiklik yapılmadı (görünüşü ve davranışı değişmedi). Kartın kontrol maddesi kuruldu: tarayıcı testlerinin konsol denetimi tek yardımcıda (`cekirdek/testler/uctan-uca/konsol.ts`) ve hidrasyon uyarısını hangi seviyede yazılırsa yazılsın hata sayıyor. Bölüm kütüphanesi (iki renkte) ve kayıt sayfası bu denetimden geçiyor. Uyarı yeniden çıkarsa test kırmızı olur. Sınır: asıl uyarı yeniden üretilemediği için denetimin onu yakaladığı yalnız React'ın ileti metinlerinden alınan örneklerle gösterildi (`konsol.test.ts`), gerçek bir uyuşmazlıkla gösterilmedi.

## Durum

yapılacak
