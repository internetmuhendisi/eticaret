# 0209 · Yayın denemesi ikinci yayını mağaza adıyla ayırt edemiyor

## Amaç

Kart 0208'in düzeltmesinden sonra (2026-11-16, kayıt 191ed89, hat 43800453476 yeşil) `pnpm yayin-denemesi` 16 ölçümün 15'ini geçti. Kalan ölçüm "ikinci yayın: vitrin yeni adı gösteriyor" (`vitrin "Yayın Denemesi A1"`, beklenen A2).

Sebep koddan okundu:

- Deneme iki yayını kimlikteki adı değiştirerek ayırt ediyor (`gorunenAd`, A1 sonra A2; `komutlar/yayin-denemesi.mts`, kart 0021'den beri).
- Kart 0069 ve 0071'den beri vitrindeki ad mağaza ayarından okunur. Başlangıç değeri kimlikten bir kez yazılır, dosya değişince değişmez (`magazaninAdi`, `cekirdek/moduller/magaza-ayarlari/servis.ts`). Bu yüzden ikinci yayında da ad A1 kalır.
- Eski h1 kalıbı (kart 0208) adı hep boş okuduğu için bu ölçüm o zamandan beri yeşil olamıyordu; asıl sorun ortaya çıkmıyordu.
- Aynı nedenle geri dönüşten sonra "vitrin A1" ölçümü yeni ve eski yayını ad üzerinden ayırt etmiyor. Geri dönüşün kendisi başka ölçümlerle gösteriliyor: etkin yayın 1, arka plan süreci önceki yayında, yayın kaydı `yayin:basarili yayin:basarisiz yayin:basarili geri-donus:basarili`.

Bölüm: Yayın. Kart 0147 ve 0208'in kontrolünde görüldü, onlara karıştırılmadı.

## Olmazsa olmazlar

- Deneme iki yayını sitenin gerçekten değişen bir işaretiyle ayırt eder: ikinci yayında görünen, geri dönüşte eskisine dönen bir değer. Mağaza ayarı gibi veritabanında kalan değer bu işe yaramaz.
- İşaretin iki yayın arasında değiştiği ve geri dönüşte eskisine döndüğü ölçülür; işaret değişmeyecek biçimde bozulunca ölçüm kırmızıya düşer.
- Düzeltmeden sonra `pnpm yayin-denemesi` yeşil biter (yeşil hat gerekir, yani gönderim).

## Sınırlar

- Yayın ve geri dönüş komutunun davranışı değişmez; yalnız denemenin ölçümü düzelir.
- Mağaza adının ayardan okunması (kart 0071) değişmez.

## Bitti sayılır

- İkinci yayın ve geri dönüş, veritabanında kalmayan bir işaretle ayırt ediliyor.
- `pnpm yayin-denemesi` yeşil.

## Yapılanlar

- Deneme iki yayını sitenin ilk logosuyla ayırt eder: birinci yayında bir logo, ikinci yayında (ve bozuk sürümde) başka bir logo. Logolar denemede üretilir (`komutlar/yayin-denemesi-logosu.mts`). Logo ucu dosyayı dışarıdan, ön kapı üzerinden bayt bayt verir (`disaridanIste` artık gövdeyi bayt olarak da döndürür).
- Ölçümler: ilk yayında birinci logo; bozuk yayından sonra birinci logo; ikinci yayında ikinci logo; geri dönüşte yine birinci logo. Mağaza adı yalnız ilk yayında ölçülür.
- Test (`komutlar/testler/yayin-denemesi-logosu.test.ts`): iki logo farklı ve site doğrulamasından geçiyor; karar yalnız beklenen logoda evet diyor, iki logo aynıysa hiç evet demiyor. İki logo aynı yapılınca iki test, karardaki farklılık koşulu kaldırılınca bir test kırmızıya düştü.
- Sunucudaki deneme gönderimden sonra çalıştırılır.

## Durum

bitti
