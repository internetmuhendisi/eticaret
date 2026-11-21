# 0287 · Panelde sayfa açılınca odak kaydet çubuğunun durum yazısına geçiyor

## Amaç

Kart 0265'in taslak karşılaştırmasında görüldü: ürün ekranı açılınca kaydet çubuğundaki "Değişiklik yok" yazısının odak çerçevesi görünüyordu (masaüstü, açık tema, sayfa açıldıktan ve bağlandıktan sonra alınan görüntü). Sebep kodda okunarak bulundu, ayrıca ölçülmedi: `KaydetCubugu`'nun (`cekirdek/yonetim-paneli/form/panel-formu.tsx`, kart 0259) "kayıttan sonra Kaydet kapanınca odak kaybolmasın" etkisi ilk çizimde de çalışıyor. Sayfa yeni açıldığında odak gövdededir, Kaydet değişiklik olmadığı için kapalıdır; etki bu durumu kayıttan sonraki durumla karıştırıp odağı durum yazısına veriyor. Klavye kullanıcısı sayfaya girer girmez sayfanın altındaki çubuğa düşer.

Durum yazısı olan bütün ayar formlarında (kargo, ödeme yöntemleri, sipariş ayarları, ürün ekranı) aynı olması beklenir.

## Olmazsa olmazlar

- Önce ölçülür: sayfa açıldıktan sonra odaklanan öğe tarayıcıda okunur, durum yazısı olan her ekranda.
- Odak yalnız kayıttan sonra Kaydet kapandığında taşınır, sayfa açılırken taşınmaz. Kart 0259'un bulgusu (kayıttan sonra odağın kaybolmaması) korunur.
- Sayfa açılınca odağın yerinde kaldığını ölçen tarayıcı testi olur.

## Sınırlar

- Kaydet çubuğunun görünüşü ve metinleri değişmez.

## Bitti sayılır

- Ekranlar açılınca odak gövdede (ya da sayfanın başında), tarayıcıda ölçüldü; düzeltme geri alınınca test kırmızı.
- Kayıttan sonra odağın durum yazısına geçtiğini ölçen var olan test yeşil.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
