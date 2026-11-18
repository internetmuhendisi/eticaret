# 0231 · Yarış testinde süre aşımında açık işlem bırakılmıyor

## Amaç

Kart 0230'un bağımsız kontrolü kodda şunu buldu (ölçülmedi): sırayı kuran yarış testlerinin çoğunda `kilitBekleyeniGor` süre aşımıyla düşerse açık duran işlemin `birak()` çağrısı hiç yapılmıyor. Örnek: sipariş servisinin iki yarış testi.

- İşlem bağlantıyı tutmaya devam eder.
- Test dosyasının kapanışı takılabilir.
- Asıl hatanın yerine süre aşımı ya da takılma görülebilir.

Tema değişikliği testi `try/finally` ile korunuyor (`cekirdek/moduller/tema/testler/tema-degisikligi.test.ts`).

## Olmazsa olmazlar

- Önce ölçülür: `kilitBekleyeniGor` bilerek düşürülünce (ör. rakip başlatılmadan) dosyanın kapanışının takılıp takılmadığı ve hangi hatanın göründüğü.
- Takılıyorsa açık işlemin bırakılması tek yerde çözülür: ör. `kilitBekleyeniGor` çevresinde ortak bir yardımcı ya da `try/finally` kalıbı. Her teste ayrı kopya yazılmaz.
- `kilitBekleyeniGor` kullanan bütün testler aynı kalıba geçer.

## Sınırlar

- Testlerin denetlediği kurallar ve sıraları değişmez.
- Kart 0230'un kuralı ("rakip ilk işlem kilidi aldıktan sonra başlar") korunur.

## Bitti sayılır

- Takılma ölçüldü (ya da takılmadığı ölçülüp kart kapatıldı).
- Bilerek düşürülen yarış testi asıl hatasıyla düşüyor, dosya takılmadan kapanıyor; eski kalıpla farkı ölçüldü.
- Kontrol hattı yeşil.

## Durum

yapılacak
