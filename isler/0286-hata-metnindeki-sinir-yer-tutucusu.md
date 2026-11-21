# 0286 · Panelin hata metninde "{sinir}" yer tutucusu doldurulmuyor

## Amaç

Kart 0264'te kod okunurken bulundu, ölçülmedi. Bazı hata metinleri yer tutucu taşıyor: `yonetim.urun.hata.secenek-siniri` ("Bir üründe en çok {sinir} seçenek olabilir."), `deger-siniri`, `birlesim-siniri`, `yonetim.ozellik.hata.ozellik-siniri` ve `secenek-siniri`. Panelin kodlu hata yolu (`cekirdek/yonetim-paneli/kodlu-form.ts`: `kodluAlanHatalari`, `kodluHataMetni`) metni anahtarla okuyor (`metin(anahtar)`), yer tutucuyu doldurmuyor. Bu yüzden özellik ekranında sınır aşılınca alanın altında ya da özette "{sinir}" yazısının aynen görünmesi beklenir.

Kart 0264'ün seçenekler bölümü kendi sınır yazısını doldurarak yazıyor. Ürün ekranının sunucudan dönen sınır hatası da aynı yoldan geçiyor (`birlesim-siniri`).

## Olmazsa olmazlar

- Önce ölçülür: özellik ekranında seçenek sınırı ve ürün ekranında birleşim sınırı aşılınca görünen metin tarayıcıda okunur.
- Yer tutucu taşıyan bütün hata metinleri listelenir. Değeri metni gösteren tek yerde doldurulur, her ekran ayrı ayrı doldurmaz. Sınırın değeri kayıttan okunur (`varyantSinirlari`, `ozellikSinirlari`).
- Doldurulmamış yer tutucunun ekrana düşmesini yakalayan bir test olur.

## Sınırlar

- Metinlerin cümleleri değişmez.

## Bitti sayılır

- İki ekranda sınır metni sayıyla görünüyor, tarayıcıda ölçüldü; düzeltme geri alınınca test kırmızı.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
