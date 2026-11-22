# 0290 · Bileşen kataloğu koyu temayı sitenin ayarından alıyor

## Amaç

Hattın 44991848901 numaralı çalışmasında katalog testi "renk seçimi cihazın tercihini geçersiz kılar" kırmızıydı: cihaz koyu temadayken katalog sayfasının zemini beyaz kaldı. Örnek Mağaza'nın vitrininde koyu tema kullanıcı kararıyla kapatıldı (f68f046). Katalog sayfaları kök düzenin vitrin CSS'ini kullanıyor (`sitenTasarimCss`), bu CSS sitenin `koyuTema` ayarı kapalıyken koyu değerleri yazmıyor.

Katalog geliştiricinin aracıdır: parçaları sitenin renkleriyle iki temada göstermek için vardır. Panel gibi koyu temayı her zaman cihazdan ya da renk seçiminden almalıdır.

## Olmazsa olmazlar

- Katalogun düzeni sitenin tema değerlerini koyu tema açık olarak yazar; değerler tek yerden gelir (`cekirdek/temalar/birlesim.ts`).
- Vitrinin kendisi değişmez: koyu tema kapalı sitede vitrin açık kalır.
- Önce ölçülür: yerelde katalog testi koyu tema kapalı sitede kırmızı, düzeltmeyle yeşil.

## Sınırlar

- Sitenin koyu tema ayarı ve vitrinin davranışı değişmez.

## Bitti sayılır

- Katalog testi ("renk seçimi…") koyu tema kapalı sitede yeşil; düzeltme geri alınınca kırmızı.
- Birim testi katalogun CSS'inin koyu değerleri yazdığını ölçer.
- Bağımsız kontrol yapıldı.

## Notlar

- Karar 0166: katalog düzeni sitenin değerlerini koyu tema açık olarak yeniden yazar (panelin yolu); testin ayarı okuması seçilmedi, çünkü koyu teması kapalı sitede parçaların koyu hâli hiç taranmazdı.
- f68f046'dan beri bileşen sahnesinin ve katalogun "koyu" taramaları açık renklerle çalışıyordu; düzeltmeyle gerçek koyu temada 24 + 84 test yeşil.

## Durum

bitti
