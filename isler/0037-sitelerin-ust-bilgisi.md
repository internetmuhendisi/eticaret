# 0037 · Siteler birbirinin üst bilgisini görmez

## Amaç

Bir sitenin veritabanı kullanıcısı başka sitenin tablolarına ulaşamıyor (kartlar 0012, 0036). Ama aynı PostgreSQL'deki bütün veritabanı ve kullanıcı adlarını (`pg_database`, `pg_roles`) okuyabiliyor. Başka sitelerin sayaçlarını (`pg_stat_database`: eklenen satır, işlem sayısı) ve oturumlarının kullanıcı adlarını (`pg_stat_activity`) da görebiliyor. Bu sayaçlar bir mağazanın işlem hacmi hakkında kabaca fikir verir. Değişmez kural 2'ye göre siteler birbirinin verisini görmemeli.

Kart 0012'nin bağımsız kontrolünde fark edildi (karar 0023, bilinen sınır).

## Olmazsa olmazlar

- Hangi sistem görünümlerinin site kullanıcısından kapatılabileceği ve kapatmanın uygulamayı, Drizzle'ı ya da yedek araçlarını bozup bozmadığı ölçülür.
- Kapatılamayanlar için seçenekler ve bedelleri yazılır, örneğin her siteye ayrı PostgreSQL kutusu (karar 0013'te bellek nedeniyle seçilmemişti).
- Seçilen yol veri ayrımı testine eklenir.

## Sınırlar

- Sunucu kurulumu bu işe girmez (0018).

## Bitti sayılır

- Site kullanıcısı başka sitelerin sayaçlarını göremiyor, ya da göremez hâle getirilemiyorsa bu bir karar kaydıyla kabul edilmiş.
- Veri ayrımı testi seçilen sınırı denetliyor.

## Durum

yapılacak
