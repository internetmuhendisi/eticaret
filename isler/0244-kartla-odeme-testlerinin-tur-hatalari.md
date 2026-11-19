# 0244 · Kartla ödeme testlerinin tür hataları

## Amaç

Kart 0235'te modül testleri geçici bir ayarla tür denetiminden geçirilirken (kart 0056) ana dalda da var olan yedi hata görüldü: `cekirdek/eklentiler/kartla-odeme/testler/servis.test.ts` (imzası kurulan bildirim gövdesinde dizinle erişim, TS4111, beş satır; `odemeAyarla`'nın "sahtecilik-red" sonucunu almaması, TS2345) ve `sahte-kurulus.ts` (rapordaki `paidPrice` okuması, TS7053). Testler çalışıyor, tür denetimi yalnız geçici ayarla yapıldığı için hat bunları görmüyor.

## Olmazsa olmazlar

- Yedi hata düzelir; testlerin davranışı değişmez.
- Dosyalar geçici ayarla tür denetiminden hatasız geçer.

## Sınırlar

- Modül testlerinin kalıcı olarak tür denetimine alınması kart 0056'dır.

## Bitti sayılır

- Geçici ayarla `cekirdek/eklentiler/kartla-odeme/**/*.ts` tür denetiminden hatasız geçiyor; dosyanın testleri yeşil.

## Durum

yapılacak
