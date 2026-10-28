# 0003 · Her sitenin ayrı veritabanı vardır

## Tarih

2026-10-28

## Karar

Her site kendi veritabanında çalışır. Siteler aynı veritabanını paylaşmaz.

## Neden

- Siteler birbirinin verisini görmemeli (değişmez kural 2). Ayrı veritabanında bir sorgu hatası bile başka sitenin verisine ulaşamaz.
- Her site çekirdeğin farklı bir sürümünde çalışabilmeli (değişmez kural 3). Farklı sürümler farklı tablo yapısı isteyebilir, ortak veritabanında bu mümkün olmaz.
- Her site tek başına yedeklenip geri yüklenebilmeli (`.claude/rules/cok-siteli-yapi.md`).

## Düşünülen diğer yollar

- Tek veritabanı, her kayıtta site bilgisi: Seçilmedi. Veri ayrımı her sorgunun doğru yazılmasına bağlı kalır, siteler farklı sürümde çalışamaz, tek siteyi geri yüklemek zorlaşır.
- Tek veritabanı içinde her siteye ayrı bölüm: Seçilmedi. Ayrım daha güçlüdür ama siteler yine aynı sunucu kaynağını ve aynı yedeği paylaşır, site site geri yükleme ayrı veritabanına göre zordur.

## Sonuçları

- Site sayısı kadar veritabanı olur, her biri ayrı izlenir ve yedeklenir.
- Veritabanı değişiklikleri site site, o sitenin çekirdek sürümüne göre uygulanır.
- Sahip panelindeki satış ve sipariş özetleri tek sorguyla alınamaz, her sitenin veritabanından ayrı toplanır.
