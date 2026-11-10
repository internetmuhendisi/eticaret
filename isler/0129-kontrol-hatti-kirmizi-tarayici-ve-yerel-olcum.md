# 0129 · Kontrol hattı kırmızı: tarayıcı testleri ve yerel ortamdaki ad ölçümü

## Amaç

Kontrol hattı kart 0111'den beri her gönderimde kırmızı, yayın yeşil hat ister. Son çalışmada (42766203129) beş tarayıcı testi düştü: `vitrin-cercevesi.test.ts` ikisi, `katalog.test.ts` üçü.

Ölçülen nedenler:

- Hat arka plan sürecini açmaz, katalog ve düzen kurulmaz. Düzene yazan iki test `hizmet-kullanilamiyor` alır (karar 0092). 0.50.0'dan sonra düzen görsele de başvurduğu için katalogla birlikte düzen kurulumu da gerekir (karar 0094).
- `katalog.test.ts` testlerinin nedeni ayrıca ölçülmeli (`toBeFocused`, zaman aşımı).
- `pnpm yerel-ortam-testi` hatta bu adıma gelmiyor. Bilgisayarda çalışınca `vitrin kendi adını gösteriyor` ölçümü, düzeni olan sitede kırmızı: kart 0110'dan beri başlık `class` taşır, ölçüm `<h1>` kalıbını arar.

Bölüm: Altyapı. Kart 0128'den önce yapılmalı.

## Olmazsa olmazlar

- Hat tarayıcı testlerinden önce katalog, menü ve düzeni kurar, ya da testler görselsiz bir deneme sitesiyle çalışır.
- Yerel ortamdaki ad ölçümü bölümlü ve bölümsüz ana sayfada mağaza adını okur.
- Kalan tarayıcı hataları tek tek ölçülür.

## Sınırlar

- Hat zayıflatılmaz, test kaldırılmaz.

## Bitti sayılır

- Kontrol hattı `main` üzerinde yeşil.

## Durum

yapılacak
