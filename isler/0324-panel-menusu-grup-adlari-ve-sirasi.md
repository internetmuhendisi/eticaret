# 0324 · Panel menüsünün grup adları ve sırası taslaktan ayrı

## Amaç

Kart 0301'in ekran görüntüsü onaylanan panel taslağıyla (karar 0157, `planlar/tasarim-yonu/panel.html`) karşılaştırılırken üç fark görüldü, kart 0301'e karıştırılmadı:

- Taslakta ürün ekranlarının grubu "Katalog", kodda "Ürünler" (`yonetim.grup.urunler`). Grubun içinde de "Ürünler" sayfası olduğu için menüde aynı ad iki kez geçiyor.
- Taslakta grupların sırası Satış, Katalog, İçerik, Vitrin, Ayarlar; kodda Satış, Ürünler, Vitrin, İçerik, Ayarlar (`panelGruplari`).
- Taslakta sayfa yolunun ilk adımı "Panel", kodda kökün adı "Karşılama" (menüdeki adıyla aynı).

Bölüm: Yönetim paneli 2 (kart 0301 sırasında bulundu).

## Olmazsa olmazlar

- Grubun adı ve grupların sırası taslaktaki gibi olur ya da farkın bilerek kaldığı kullanıcıya sorulup yazılır.
- Sayfa yolunun ilk adımının adı kullanıcıya sorulur (menüdeki "Karşılama" ile aynı mı, "Panel" mi).
- Değişen grup adı ya da sıra testlerde (`sayfa-agaci.test.ts`, `panel-yetkisi.test.tsx`).

## Sınırlar

- Sayfaların adresleri ve izinleri değişmez.

## Bitti sayılır

- Menünün grupları, adları ve sırası testte; panel çerçevesinin tarayıcı testi ve taraması geçiyor.
- Ekran görüntüsü taslakla yan yana kondu.

## Durum

yapılacak
