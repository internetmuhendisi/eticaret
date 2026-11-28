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

## Sonuç

- **Kural.** Yerel ortam denemesinin proje sitesi Örnek Mağaza'dır (karar 0007). Örnek Mağaza yalnız kimliği şu anki çekirdeğin sürümündeyse açılır.
  - Karar tek işlevde: `yerelDenemeSecimi` (`komutlar/yerel-ortam.mts`). Eski ya da başka sürümdeki site açılmaz; yerelde eski görüntü olsa da açılmaz, sonuç makineye bağlı olmaz.
  - Açılmayan site sessiz kalmaz: "ölçülmedi" satırı çıktının başında ve özet satırının altında yazılır.
  - Yerine e-posta gönderen ikinci bir geçici deneme sitesi açılır. Siteler arası ölçümler (veri ayrımı, dosya klasörü) ve e-postanın iki dalı (gönderen var ve yok) sürer.
  - O hatta Örnek Mağaza'nın kendi verisine bağlı ölçümler yapılmaz: kart 0309'un uzun kurulumu, kart 0328'in `onde=` satırı, kendi logosu ve adı. Site kendi güncellemesinde ölçülür.
- **Deneme sitesinin sürümü.** Geçici deneme sitesinin kimliği her açılışta çekirdeğin o anki sürümünü alır, elle artmaz. Proje sitelerinin kimliği yalnız kendi güncelleme işinde artar (değişmez kural 3). Kural `cekirdek/surum-notlari/README.md`'de yazılı.
- **Ölçümler.**
  - `komutlar/testler/yerel-ortam-secimi.test.ts` (seçim, satır ve denemenin seçimi kullanması), `deneme-sitesi-ayarlari.test.ts` (gönderen adresli ayar şemadan geçer). Dokuz bozma ayrı ayrı denendi, her biri kırmızıya düştü. Denemenin kuralı kullanması yalnız yazıyla denetlenir (deneme Docker ister).
  - Komutların testleri (717), tür kontrolü ve denetim yeşil.
  - Örnek Mağaza'nın kimliği çalışma kopyasında geçici olarak 0.80.0 yapılarak (bilgisayarda 0.80.0 görüntüsü varken) `pnpm yerel-ortam-testi` üç kez çalıştırıldı. Kimlik her seferinde geri alındı, kayda girmedi.
  - İlk çalışma 3 ölçümde kırmızıydı: geçici deneme siteleri e-posta göndermediği için kayıt ve şifre sıfırlama e-postası gelmedi. Yerine açılan site gönderen adresi aldı.
  - Sonraki iki çalışma yeşil bitti: 79/79, "ölçülmedi" satırı başta ve özette.
- **Bağımsız kontrolün bulgularıyla düzeltilen.**
  - Belgeler kuralı "proje siteleri" diye genel söylüyordu, kod yalnız Örnek Mağaza'ya bakıyor.
  - Satır özette yoktu.
  - Örnek Mağaza'ya bağlı ölçümlerin o hatta yapılmadığı yazılı değildi.
  - "Klasör yalnız seçimden geçer" denetimi doğrudan kullanımı yakalamıyordu.
  - Deneme sitesinin ayarları ve "deneme sitesini siler" yorumları eskimişti.
- **Sonraki kartlara.**
  - `pnpm yerel-ortam-ac` klasör verilmeden açılınca hâlâ eski sürümdeki Tema Galerisi'ni (0.76.0) açmaya çalışıp görüntü yok hatasıyla düşer. Hat adımı değil, bu kartın dışında bırakıldı.
  - Hatta ilk sonuç, çekirdek Örnek Mağaza'dan önce bir sürüm artınca görülür (kart 0351 öncesi).

## Durum

çalışılıyor
