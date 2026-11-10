# 0133 · Birim testleri çok yüklü makinede 5 saniyelik sınırı aşıyor

## Amaç

Kart 0092 sırasında (2026-11-11) bütün birim takımı makine çok yüklüyken (yük ortalaması 40–47, 32 çekirdek) beş kez çalıştı. Kart 0092'nin testleri geçti, ama dört başka test Vitest'in 5 saniyelik varsayılan sınırını aşıp düştü. Hiçbirinde yanlış sonuç yoktu, hepsi "Test timed out in 5000ms":

- `cekirdek/moduller/tema/testler/tema-degisikligi.test.ts` "tema değişikliği ile bölüm ekleme birbirini ezmez": beş çalışmanın beşinde. Daha önce yük 15–35'te iki çalışmanın ikisinde. Tek başına yük 23–32'de 1,3 saniye sürüyor.
- `cekirdek/moduller/menu/testler/servis.test.ts` "öğe ve menü sayısının sınırı tutar": bir kez.
- `cekirdek/moduller/fiyat/testler/gosterim.test.ts` "mağaza sahibinin metni, boş metin ve vergi adı olmayan site": bir kez.
- `cekirdek/moduller/urun/testler/varyant.test.ts` "en çok yüz birleşim": bir kez.

Kontrol hattında bu testler üç çalışmada da geçti. Hattın makinesi yavaşlarsa düşebilirler.

## Olmazsa olmazlar

- Önce ölçülür: her testin yüksüz, yüklü ve hattaki süresi; süre neye gidiyor (veritabanı kilidi beklemesi, çok sayıda yazım, şifre özetleme).
- Sınır yükseltilecekse nedeni ve ölçümü testte yazılır (kart 0088 ile aynı yol). Testin denediği şey zayıflamaz.
- Tema testindeki yarış gerçekten sıra kuruyorsa beklemenin süresi ölçülür: yük altında kilit beklemesi mi uzuyor, yoksa iş mi.

## Sınırlar

- Uygulamanın kodu bu iş için değişmez; değişecekse ayrı karar olur.

## Bitti sayılır

- Bütün birim takımı yük ortalaması 40'ın üstündeyken art arda beş kez bu dört testte düşmeden geçiyor; ölçüm kartın kapanışında yazılı.

## Durum

yapılacak
