# 0132 · Kontrol hattı eski çekirdek sürümündeki siteyi açamıyor

## Amaç

Yerel ortam denemesi her siteyi kimliğindeki çekirdek sürümünün görüntüsüyle açar (`komutlar/yerel-ortam.mts`, `goruntuyuHazirla`). Kontrol hattı her çalışmada temiz makinede başlar, yalnız şu anki çekirdeğin görüntüsünü üretebilir. Bu yüzden kimliği eski bir sürümde duran bir site varsa hat son adımda kırmızıya düşer: "altyapi-cekirdek:0.50.0 görüntüsü yok... burada üretilemez".

Kart 0129 sırasında görüldü (2026-11-11, çalışma 42914059742): çekirdek 0.51.0'a çıkarılırken (karar 0096) Örnek Mağaza'nın kimliği 0.50.0'da kalmıştı. Hat o günden beri bu adıma gelmediği için görünmemişti. Kart 0129'da Örnek Mağaza'nın kimliği 0.52.0'a çıkarıldı.

Bugün tek site var. Siteler çoğalınca her site kendi sürümünde kalacağı için (değişmez kural 3) hat çekirdeğin her sürüm artışında kırmızıya düşer, ya da her artışta bütün sitelerin kimliği değişmek zorunda kalır.

Bölüm: Yeni mağaza. On altıncı bölümde açık kartlardan bu bölüme alındı; siteler farklı sürümlerde kalacağı için kart 0350'den önce.

## Olmazsa olmazlar

- Hattın yerel ortam denemesinin hangi sitelerle ve hangi sürümle çalışacağı kararlaştırılır: örneğin yalnız şu anki çekirdeğin sürümündeki siteler ve deneme sitesi, eski sürümdeki siteler için açık bir "ölçülmedi" satırı.
- Eski sürümdeki sitenin denemeden çıkarıldığı sessiz kalmaz, çıktıda yazar.
- Çekirdeğin sürümünü artıran iş, deneme sitesinin kimliğini ne zaman artıracağını bilir: kural tek yerde yazılır.

## Sınırlar

- Sitelerin kimliğindeki sürüm kendiliğinden değişmez (değişmez kural 3).
- Hattın öteki adımları değişmez.

## Bitti sayılır

- Kimliği eski sürümde duran bir site varken hat yeşil biter ve o sitenin ölçülmediğini yazar; bir testle ya da bilerek eski kimlikle bir kez çalıştırılarak gösterilir.

## Durum

yapılacak
