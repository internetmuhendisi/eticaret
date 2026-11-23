# 0298 · Sipariş listesinin süzgeçlerinin sorgu hızı

## Amaç

Kart 0267'nin bağımsız kontrolünde bulundu, ölçülmedi. Panelin sipariş listesinde:

- Kargo firması süzgecinin seçenekleri her sayfa açılışında bütün siparişlerden okunur (`siparisYonetimi.kargoFirmalari`, tekrarsız ad sorgusu). `kargo_firmasi` üzerinde indeks yoktur.
- Tarih süzgeci `olusturma_zamani` ile süzer. Durum seçili değilken ("Tümü", "Bakılması gereken") uyan tek sütunlu indeks yoktur; `siparisler_durum_zaman` yalnız durum seçiliyken işe yarar. Varsayılan sıralama da (`en-yeni`) aynı sütundadır.
- Dilin harf sırası her açılışta ayrıca sorulur (`harfSirasi`, `pg_collation`).

İlk yıl 5–30 mağaza için önemsiz görünüyor (karar 0169 kargo sorgusunun yavaşlayabileceğini yazıyor), ama ölçülmedi.

Bölüm: Yönetim paneli.

## Olmazsa olmazlar

- Önce ölçülür: çok siparişli (örneğin 100 bin) deneme veritabanında listenin süzgeçsiz, tarihli ve kargo süzgeçli açılışının sorgu planı ve süresi.
- Ölçüm gerekiyorsa indeks (numaralı veritabanı değişikliğiyle) ya da seçeneklerin başka kaynaktan okunması; seçim ölçümle.

## Sınırlar

- Süzgeçlerin davranışı değişmez.

## Bitti sayılır

- Ölçüm karta yazıldı; gerekiyorsa düzeltme ve düzeltmeden sonraki ölçüm.

## Durum

yapılacak
