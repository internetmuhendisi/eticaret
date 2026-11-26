# 0246 · Süresi dolan havalenin iptalinin tek akışa alınması

## Amaç

Süresi dolan havalenin kendiliğinden iptali (`havaleIptalTaramasi`, `cekirdek/moduller/siparis/iptal.ts`) kendi stok geri koymasını yapar ve `siparis_iadeleri`'ne satır yazmaz. Kart 0235 iptal ve iadeyi tek akışa aldı (`iadeServisi`); "siparişin düşürüp geri konmamış adedini geri koy" kuralı bugün iki yerde yazılı (kart 0235'in bağımsız kontrolünün bulgusu).

Bölüm: Yönetim paneli 2 (açık kartlardan alındı). Kuponun iptal ve iadede geri hesabı tek akışa dayandığı için 0312'den önce yapılır.

## Olmazsa olmazlar

- Tarama iptali `iadeServisi` ile, sistem işlemi olarak yapar; geçmişin nedeni "havale-suresi-doldu" kalır.
- Taramanın bugünkü testleri (bildirimli sipariş, aynı anda iki tarama, hatada sonraki sipariş) yeşil kalır.

## Sınırlar

- Taramanın süresi ve kuralı değişmez.

## Bitti sayılır

- Stoğun geri konma kuralı tek yerde; testler gerçek veritabanıyla yeşil.

## Durum

yapılacak
