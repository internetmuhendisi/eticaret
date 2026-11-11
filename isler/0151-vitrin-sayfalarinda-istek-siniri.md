# 0151 · Vitrin sayfalarında istek sınırı ve bot taramaları

## Amaç

Vitrin sayfalarında istek sınırı yok. Kart 0120'den beri vitrinde karşılığı olmayan her adres, `/wp-login.php` gibi bot taramaları da, çerçeveli "bulunamadı" sayfasını çiziyor. Bu sayfa veritabanını iki kez okuyor: çerçevenin bağlamı ve kategorilerin bağlamı (karar 0104, bağımsız kontrolün bulgusu). Toplu tarama sitenin veritabanını gereksiz yorabilir. Sorgu sayısı ölçülmedi, koddan çıkarıldı.

Bölüm: Vitrin. Kart 0120'de görüldü, ona karıştırılmadı.

## Olmazsa olmazlar

- Önce ölçülür: bir "bulunamadı" isteğinin sorgu sayısı ve süresi, normal bir vitrin sayfasıyla karşılaştırılarak.
- Vitrin sayfalarının istek sınırı kapının sınır yapısıyla tek yerden kurulur (IPv6 ilk 64 bit, kart 0045); sınır aşılınca müşteriye anlaşılır bir sayfa gösterilir.
- Gerekirse "bulunamadı" sayfasının bağlamı tek okumaya indirilir.
- Arama motoru botlarının gerçek sayfaları taraması engellenmez.

## Sınırlar

- Ön kapıda (Caddy) ayrı bir koruma bu kartın işi değildir; gerekirse ayrı kart.

## Bitti sayılır

- Ölçüm yazıldı.
- Sınırı aşan istek kesiliyor, sınır altındaki ziyaretçi etkilenmiyor (test).

## Durum

yapılacak
