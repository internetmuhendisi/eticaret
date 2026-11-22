# 0166 · Bileşen kataloğunda koyu tema sitenin ayarından bağımsız açık

## Tarih

2026-11-22

## Karar

Bileşen kataloğu (`/gelistirme/bilesenler`, karar 0078) sitenin tema değerlerini kendi düzeninde yeniden yazar. Bu yazımda koyu tema, sitenin `koyuTema` ayarından bağımsız olarak açıktır (`katalogTasarimCss`, `cekirdek/temalar/birlesim.ts`; kart 0290). Değerler kök düzenin vitrin değerlerinin üstüne yazılır; panelin yolu da budur. Vitrin, koyu teması kapalı sitede açık kalır.

## Neden

- Katalog geliştiricinin aracıdır: parçaları sitenin renkleriyle iki temada göstermek, taramak ve karşılaştırmak için vardır. Koyu teması kapalı sitede (Örnek Mağaza, f68f046) katalog koyu temayı hiç çizmiyordu.
- Bileşen sahnesinin ve katalogun "koyu" taramaları o değişiklikten beri sessizce açık renklerle çalışıyordu; parçaların koyu temadaki okunurluğu ölçülmüyordu. Hattaki renk seçimi testi bunu yakaladı (44991848901).

## Düşünülen diğer yollar

- **Testin sitenin koyu tema ayarını okuması** (tasarım değerleri testinin yolu): Seçilmedi. Test geçerdi, ama koyu teması kapalı sitede parçaların koyu temadaki hâli hiçbir yerde görülmez ve taranmazdı.
- **Örnek Mağaza'da koyu temayı yeniden açmak:** Seçilmedi. Vitrinin açık kalması kullanıcı kararıdır.

## Sonuçları

- Koyu teması kapalı sitede katalog, vitrinin hiç göstermediği koyu temayı gösterir. Katalog yalnız geliştirmede ve deneme ortamında açıktır, mağaza sahibi görmez.
- Birim testi katalog CSS'inin koyu değerleri yazdığını, tarayıcı testleri iki temada taramayı ölçer.
