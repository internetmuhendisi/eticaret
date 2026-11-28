# 0068 · Yedek provası sitenin kodunu yönetici yetkisiyle çalıştırabiliyor

## Amaç

Kart 0037'nin bağımsız kontrolü ölçtü: yedek provasının canlı veritabanındaki özet sorgusu (`komutlar/yedek.mts` `ozetSql`, `provaBetigi`; `komutlar/yedek-denemesi.mts` `veritabaniOzeti`) tablo içeriğini yönetici olarak `t::text` ile okuyor. Ele geçirilmiş bir site kendi veritabanına tür dönüşümü ya da tablo yerine görünüm koyarsa kodu süper kullanıcı olarak çalışır (`rolsuper` `t` oldu, yerelde). Bu bütün sitelerin verisini açar, değişmez kural 2'yi çiğner. Açık kart 0024'ten beri vardır. `guvenliOturum` (karar 0053) bunu kapatmaz: arama yoluna bağlı değildir.

**Bu kart bitene kadar `pnpm yedek-prova` ve `pnpm yedek-denemesi` birden çok mağazalı sunucuda çalıştırılmaz.** Gece yedeği etkilenmez: `pg_dump` bu yola kapalıdır (ölçüldü). Prova zamanlanmış değildir, elle çalışır.

İkinci bir mağaza açılmadan önce yapılmalı.

Bölüm: Yeni mağaza. On altıncı bölümde açık kartlardan bu bölüme alındı; kart 0350'den (ikinci mağaza) önce.

## Olmazsa olmazlar

- Canlı veritabanında sitenin nesnesini (tablo içeriği, görünüm, dönüşüm, işlev) yönetici olarak çalıştıran sorgu kalmaz. `SET ROLE` yetmez: oturumun asıl kullanıcısı yönetici kaldıkça işlev rolü geri alabilir. Yol ya sitenin kendi kullanıcısıyla bağlanmak ya da içeriği `pg_dump` ile okumaktır; seçim ölçülerek yapılır, karar kaydına yazılır.
- Geri yükleme ölçülür: `pg_restore --role=<site>` asıl kullanıcı yöneticiyken çalışıyor; yedekteki bir kısıtlama ya da varsayılan ifadesinin yükleme sırasında rolü geri alıp alamadığı denenir (bağımsız kontrol sonuçlandıramadı). Açıksa aynı işte kapatılır.
- Doğrulanmayan öteki veritabanı ayarları denenir: `session_authorization`, `local_preload_libraries`, `session_replication_role`.
- Saldırılar veri ayrımı testine girer, gerçek betikle çalışır.

## Sınırlar

- Karar 0037'nin prova ölçüsü (canlıyla karşılaştırma) korunur.

## Bitti sayılır

- Dönüşüm ve görünüm saldırısı gerçek prova betiğinde `rolsuper` değiştirmiyor, testle gösteriliyor.
- Geri yükleme ölçümü karar kaydında yazılı.

## Durum

yapılacak
