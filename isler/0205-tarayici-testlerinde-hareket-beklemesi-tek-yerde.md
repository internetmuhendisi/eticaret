# 0205 · Tarayıcı testlerinde hareket beklemesi tek yerde

## Amaç

Tarayıcı testleri bir ölçümden önce sayfadaki hareketlerin (animasyon ve geçiş) bitmesini bekler. Bu bekleme `document.getAnimations()` ile on dört test dosyasında ayrı ayrı yazılmış (`cekirdek/testler/uctan-uca/`).

Kopyalar birbirinden ayrışmış durumda:

- Bir kısmı sonsuz hareketleri (ör. yükleniyor göstergesi) ayıklıyor, bir kısmı ayıklamıyor.
- Bir kısmı iptal edilen hareketin hatasını yutuyor, bir kısmı yutmuyor.

Ayıklamayan kopya sonsuz bir hareket varken hiç bitmez. Kart 0204'ün bağımsız kontrolü bunu "tek yerde tanımla" kuralına aykırı buldu. Kart 0204 yalnız `katalog.test.ts` içindeki iki kopyayı `hareketlerBitsin` yardımcısında birleştirdi; aynı dosyada ayıklamayan üç kopya daha kaldı.

Bölüm: Testler.

## Olmazsa olmazlar

- Bekleme ortak bir yardımcıda tanımlanır (`sayfa-hazir.ts` ve `konsol.ts` gibi) ve her test onu kullanır.
- Kopyalar arasındaki farklar (sonsuz hareketlerin ayıklanması, iptal edilen hareketin hatası) tek tek incelenir. Davranışı değişen her test yeniden çalıştırılır.
- Yeni bir kopyanın yazılması bir denetimle yakalanır, bozuk örneğiyle.

## Sınırlar

- Testlerin ölçtüğü kurallar değişmez.

## Bitti sayılır

- `uctan-uca/` altında `getAnimations` yalnız ortak yardımcıda geçer.
- Bütün tarayıcı takımı hattın koşulunda geçer.

## Durum

yapılacak
