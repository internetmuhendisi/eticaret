# 0285 · Şemanın kendi hata kodları kapıda kayboluyor

## Amaç

Kart 0284'ün bağımsız kontrolünde bulundu. Uç şemasında alana özel bir kod yazılabiliyor, örneğin `min(1, "secenek-gerekli")` ya da menünün `hata("kod-bicimi")`. Ama kapı (`cekirdek/kapi/uc.ts`) doğrulama hatasında yalnız zod'un kodunu döndürüyor (`too_small`, `custom`), yazılan kodu taşımıyor. Bu yüzden ekranın o kodlar için yazdığı eşleme kapı yolundan hiç çalışmıyor.

Kart 0284 kapıda ödeme seçeneklerinde bu açığı ekranda kapattı: `too_small` doğrudan seçeneklerin metnine eşleniyor. Menü kodunun biçimi gibi öteki yerlerde ise alan yalnız genel "geçerli değil" metnini alıyor. Bu son durum ölçülmedi, kod okunarak bulundu. Uç belgesi (`cekirdek/kapi/uclar.md`) de bazı yerlerde bu kodların döndüğünü yazıyor.

Aynı taramada iki not daha çıktı:
- Şemanın kodunu metne çeviren işlev üç yerde kopya duruyor: `cekirdek/yonetim-paneli/kodlu-form.ts`, `menuler/hatalar.ts` ve `vitrin-bolumleri/hatalar.ts`.
- Kargo firması adı, banka adı ve hesap sahibi alanlarında uzunluk sınırı yok. Şemanın sınırını aşan yazı alanın hatası yerine genel metne düşüyor.

## Olmazsa olmazlar

- Önce ölçülür: şemada özel kodu olan bütün uç alanları listelenir, her birinin kapıdan hangi kodla döndüğü gerçek istekle görülür.
- Şemanın kendi kodu kapıdan yanıta taşınır, ya da bu kodlar şemadan kaldırılıp ekranın eşlemesi zod kodlarına göre yazılır. Hangi yolun seçildiği tek cümleyle gerekçelendirilir ve uç belgesi buna göre düzeltilir.
- Şema kodunu metne çeviren işlev tek yerde durur, öteki iki kopya onu kullanır.
- Kargo firması ve banka hesabı penceresinde sınırı aşan yazı alanın altında söylenir.

## Sınırlar

- Kapının hata zarfının biçimi (alan ve kod) değişmez, en çok mevcut alanlara doğru değer yazılır.
- Kart 0284'te yapılan ekran düzeltmeleri geri alınmaz.

## Bitti sayılır

- Özel kodlu her alanın kapıdan dönen kodu testte ölçüldü.
- Düzeltme geri alınınca test kırmızıya düşüyor.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
