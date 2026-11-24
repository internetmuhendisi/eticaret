# 0303 · Kaydet çubuğu sayfa açılınca odağı alıyor

## Amaç

Panelin ortak kaydet çubuğu (`KaydetCubugu`, `durumYazisi` ile) sayfa ilk açıldığında odağı "Değişiklik yok" yazısına taşıyor. Çubuktaki etki "Kaydet kapanınca odak kaybolmasın" diye yazıldı (kart 0259). Ama odak gövdedeyken ve Kaydet kapalıyken de çalışıyor; sayfa açılışı tam bu durum.

Kart 0272'de Blog ekranının görüntüsünde görüldü. Blog anahtarının kartı sayfanın başında olduğu için odak listeye gelmeden oraya düşüyor. Durum yazılı öteki ayar formlarında da (Kargo, Sipariş fişi, Mağaza bilgileri) aynı kod çalışır, ölçülmedi.

## Olmazsa olmazlar

- Odak yalnız Kaydet'teyken (kayıttan sonra kapanınca) durum yazısına geçer; sayfa açılışında ve sayfa yenilenince geçmez.
- Klavyeyle gelen kullanıcı sayfanın başından başlar.

## Sınırlar

- Kaydet çubuğunun görünüşüne dokunulmaz.

## Bitti sayılır

- Tarayıcıda Blog, Kargo ve Sipariş ayarları sayfası açılınca odak gövdededir; kayıttan sonra odak durum yazısına geçer (var olan test).
- Düzeltme geri alınınca yeni test kırmızıya düşer.

## Durum

yapılacak
