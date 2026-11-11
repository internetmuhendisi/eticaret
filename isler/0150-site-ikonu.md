# 0150 · Site ikonu (tarayıcı sekmesindeki ikon)

## Amaç

Tarayıcı sekmesinde ve yer imlerinde mağazanın ikonu görünmüyor. Tarayıcı her sayfada kendiliğinden `/favicon.ico` istiyor; kart 0120'den beri bu istek ara katmanda gövdesiz 404 alıyor (karar 0104). Bu düzenleme, isteğin veritabanını okuyan "bulunamadı" sayfasına düşmemesi için yapıldı, ikonun yerini tutmaz.

Bölüm: Vitrin. Kart 0120'de görüldü, ona karıştırılmadı.

## Olmazsa olmazlar

- Ürün kararı kullanıcıya sorulur: ikon mağazanın logosundan mı türetilir, ayrı mı yüklenir, yoksa ikisi de mi olur? Mağaza sahibi panelden değiştirebilir mi?
- Her sitenin kendi ikonu vardır, başka sitenin ikonu görünmez. Site ayarı olarak önerilir (varsayılanı ve Örnek Mağaza için önerilen değeriyle).
- İkon adresi sayfa bilgisinden verilir; `/favicon.ico` isteği de veritabanını okuyan bir sayfaya düşmez.
- Telefonun ana ekran ikonu (`apple-touch-icon`) da düşünülür.

## Sınırlar

- Panelin ikonu ayrı konudur, gerekirse ayrı kart.

## Bitti sayılır

- Örnek Mağaza'nın sekmesinde ikonu görünüyor (tarayıcı testi).
- İkon isteği bulunamadı sayfasını çizmiyor (test).
- İki site birbirinin ikonunu görmüyor (test).

## Durum

yapılacak
