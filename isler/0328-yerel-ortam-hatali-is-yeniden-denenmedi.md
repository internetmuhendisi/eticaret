# 0328 · Yerel ortam denemesinde hatalı örnek işin yeniden denemesi alınmadı

## Amaç

Hat 45784138336'da (010674b) yerel ortam denemesinin tek kırmızı ölçümü Örnek Mağaza'nın kuyruk ölçümüydü: "arka plan kutusu örnek işi çalıştırıyor, hatalı işi yeniden deneyip bırakıyor" (`basarili=bitti 1, hatali=bekliyor 1, eposta=gonderildi`). Hatalı örnek iş (`hataliDenemeIsi`, en çok 2 deneme, ilk gecikme 1 sn) bir kez denenmiş, ikinci denemesi 60 saniyelik bekleme (`cekirdek/arka-plan-isleri/deneme.ts`) içinde alınmamış. Aynı hatta deneme sitesinde ölçüm geçti (`hatali=hata 2`), kuyruğun başladığı ölçüm de geçti (0 sn). Sebep bilinmiyor; kutunun günlüğü hattın sonucunda yok.

## Olmazsa olmazlar

- Sebep ölçülür: kuyruğun ikinci denemeyi neden geç aldığı (başka uzun iş, yoklama aralığı, açılıştaki işler) kutunun günlüğünden ya da yerelde hattın koşulunda yeniden üretilerek bulunur.
- Ölçüm düşünce kutunun günlüğü ve kuyruğun o anki satırları denemenin ayrıntısına ya da hattın sonucuna yazılır: bir sonraki düşüşün sebebi okunabilsin.
- Düzeltme sebebe göredir; bekleme süresini sebebi bilmeden uzatmak düzeltme sayılmaz.

## Sınırlar

- Kuyruğun öteki kuralları (deneme sayısı, gecikmeler) sebeple ilgili değilse değişmez.

## Bitti sayılır

- Sebep ölçümle yazıldı ya da ölçülemediyse bu söylendi; düşüşte günlük ve kuyruk satırları hattın sonucunda.
- Hattın koşulunda yerel ortam denemesi yeşil.

## Durum

bitti
