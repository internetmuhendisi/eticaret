# 0208 · Yayın denemesi mağaza adını eski kalıpla okuyor

## Amaç

Kart 0147'nin kontrolünde (2026-11-16, kayıt ca8b1b7) `pnpm yayin-denemesi` kırmızı bitti; 4 ölçüm kaldı:

- yayın;
- bozuk sürümden sonra sitenin eski yayınıyla açık kalması;
- ikinci yayın;
- geri dönüş.

Dördünde de vitrinden okunan mağaza adı boştu (`vitrin ""`). Geri kalan 12 ölçüm geçti. Yayın kaydı `yayin:basarili yayin:basarisiz yayin:basarili geri-donus:basarili` sırasını gösteriyor, arka plan süreci de önceki yayına döndü.

Sebep ölçüldü:

- Deneme adı `<h1>([^<]*)</h1>` kalıbıyla okuyor (`komutlar/yayin-denemesi.mts:108`).
- Ana sayfada bölüm varken başlık yalnız ekran okuyucudadır ve sınıf taşır (kart 0110). Canlı Örnek Mağaza'da ölçülen başlık: `<h1 class="sr-only">Örnek Mağaza</h1>`. Kalıp bunu bulamaz.
- Kart 0129 aynı sorunu yerel ortam denemesinde ortak işlevle düzeltti (`vitrinBasligi`, `komutlar/yerel-ortam.mts`, testi `komutlar/testler/vitrin-basligi.test.tsx`). Yayın denemesi o düzeltmeden kaldı.
- Aynı kalıp projede başka yerde yok (arandı).

Bölüm: Yayın. Kart 0147'de görüldü, ona karıştırılmadı. Kart 0147'nin "geri dönüş komutunun bu sürümde çalıştığı biliniyor" maddesi bu karta bağlıdır.

## Olmazsa olmazlar

- Yayın denemesi adı `vitrinBasligi` ile okur; ikinci bir kalıp yazılmaz.
- Okumanın bölümlü ve bölümsüz ana sayfada tuttuğu var olan testle gösterilir. Yayın denemesinin bu işlevi kullandığı bir testle ya da bozmayla gösterilir.
- Düzeltmeden sonra `pnpm yayin-denemesi` yeşil biter. Deneme yeşil hattan geçmiş kayıt ister, yani gönderim gerekir.

## Sınırlar

- Yayın ve geri dönüş komutunun davranışı değişmez; yalnız denemenin okuması düzelir.

## Bitti sayılır

- Yayın denemesi adı ortak işlevle okuyor.
- `pnpm yayin-denemesi` yeşil.

## Durum

yapılacak
