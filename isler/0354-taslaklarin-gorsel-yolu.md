# 0354 · Eski taslakların görsel yolu

## Amaç

Kart 0345 Örnek Mağaza'nın görsellerini `siteler/ornek-magaza/baslangic/gorseller/` klasöründen demo paketine (`cekirdek/demolar/demo1/baslangic/gorseller/`) taşıdı. Onaylanmış altı taslak (`planlar/tasarim-yonu/` altında `panel.html`, `panel-2.html`, `sayfalar.html`, `secenekler.html`, `sepet-ve-odeme.html`, `siparis-ve-hesap.html`) görselleri hâlâ eski klasörden okuyor; o klasör artık yok, taslaklarda görseller açılmıyor. Ekran kartları kendi görüntülerini bu taslaklarla karşılaştırır (karar 0075), görselsiz taslak karşılaştırmayı zorlaştırır. Kart 0346'da bulundu (2026-11-28; altı dosyada eski yol ölçüldü, klasörde yalnız `ayarlar.json`, `tema.json`, `vergi.json` kaldı).

Bölüm: Yeni mağaza.

## Olmazsa olmazlar

- Altı taslağın görsel yolu demo paketinin klasörüne çevrilir; başka satırına dokunulmaz.
- Taslaklar tarayıcıda açılınca yüklenmeyen görsel kalmaz (ölçüm).

## Sınırlar

- Taslakların içeriği ve görünüşü değişmez (kart 0346'nın "var olan taslaklar değişmez" sınırı yalnız o kart içindi; bu kart yalnız yolu düzeltir).

## Bitti sayılır

- Altı taslakta eski yol geçmiyor; her taslak açılınca bütün görselleri yükleniyor.

## Durum

yapılacak
