# 0250 · Girişli müşteri sayfalarının ekran ve hız ölçümü

## Amaç

Ekran ölçümü (`ekran-olcumu.test.ts`) ve hız ölçümü (`pnpm hiz-olcumu`) vitrin sayfalarını girişsiz açar (`vitrin-sayfalari.ts`). Kart 0237'nin Hesabım sayfaları (Adreslerim, Favorilerim, Hesap bilgileri) girişsiz müşteriyi girişe yönlendirdiği için bu ölçümlere girmez: taramaları, yana kayma ve konsol denetimi kendi tarayıcı testlerindedir (`hesabim.test.ts`), ama dört genişlikte basılan alan ölçümü ve hız ölçümü (ana içerik, kayma, tepki, kod boyutu) yoktur. Kart 0238'in Siparişlerim'i de aynı durumda olacak.

## Olmazsa olmazlar

- Ölçüm sayfa listesi girişli müşteri isteyen sayfayı ayırt eder; ölçüm önce deneme müşterisiyle giriş yapar (kendi istemci adresiyle, sıkı istek sınırına takılmadan).
- Hız ölçümünde girişli sayfa derlenmiş çekirdekte, yavaş telefon koşuluyla ölçülür; Adreslerim dolu defterle.
- Hedefi aşan sayfa kontrol hattını durdurur (bilinen aşım listesine eklenmez).

## Sınırlar

- Hesap sayfalarının kendisi değişmez; ölçüm bir sorun bulursa ayrı kart açılır.

## Bitti sayılır

- Hesabım sayfaları ekran ölçümünde dört genişlikte ve iki temada, hız ölçümünde hattın koşulunda ölçülüyor; sonuçlar kartta yazılı.

## Durum

yapılacak
