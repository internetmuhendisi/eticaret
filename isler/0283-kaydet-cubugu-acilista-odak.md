# 0283 · Kaydet çubuğu sayfa açılırken odağı "Değişiklik yok" yazısına alıyor

## Amaç

Kart 0263'ün ekran görüntüsünde görüldü: değişiklik yokken kapalı Kaydet düğmesi olan sayfa formunda (`KaydetCubugu`, `degisiklikGerekli`; ürün ekranı, kargo ekranı) sayfa açılır açılmaz odak çubuğun durum yazısına ("Değişiklik yok") geçiyor, yazının çevresinde odak çerçevesi görünüyor. Sebep `cekirdek/yonetim-paneli/form/panel-formu.tsx` içindeki etki: Kaydet kapalıyken ve odak sayfanın gövdesindeyken durum yazısına odaklar; sayfa ilk açıldığında da odak gövdededir, kural yalnız kayıttan sonra kapanan Kaydet için yazılmıştı (kart 0259, bağımsız kontrolün bulgusu).

Sonuç: ekran okuyucu sayfaya girerken başlık yerine "Değişiklik yok"u okur, Tab sırası formun ortasından başlar, uzun sayfada tarayıcı o noktaya kaydırabilir. Ölçülmedi, yalnız görüntüde görüldü.

## Olmazsa olmazlar

- Odak durum yazısına yalnız Kaydet açıkken kapanınca (kayıttan sonra) geçer; sayfa ilk açıldığında geçmez.
- Tarayıcı testinde: sayfa açıldığında odak durum yazısında değildir; kayıttan sonra yine durum yazısına geçer.
- Aynı kalıbın başka bir yerde olup olmadığı aranır.

## Sınırlar

- Kaydet çubuğunun görünüşü değişmez.

## Bitti sayılır

- Kural düzeltildi, iki durum tarayıcıda ölçüldü, düzeltme geri alınınca test kırmızı.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
