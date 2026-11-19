# 0247 · Tema değişikliği yarış testinin süre sınırı

## Amaç

`cekirdek/moduller/tema/testler/tema-degisikligi.test.ts` içindeki "tema değişikliği ile bölüm ekleme birbirini ezmez" testi bütün birim takımında iki kez üst üste (kart 0235 ve 0236'nın çalışmalarında) Vitest'in 5 saniyelik varsayılan sınırına takıldı; tek başına 16/16 geçiyor. Test üç kez yeni site açıp yarış kuruyor, yük altında 5 saniyeyi aşıyor.

## Olmazsa olmazlar

- Testin süresi ölçülür (tek başına ve takımla); sınırı ölçüme göre verilir ya da test hızlandırılır.
- Testin yakaladığı yarış bozulunca yine kırmızıya düşer.

## Sınırlar

- Tema servisinin kendisi değişmez.

## Bitti sayılır

- Bütün birim takımı art arda üç kez çalıştırıldığında bu test düşmüyor.

## Durum

yapılacak
