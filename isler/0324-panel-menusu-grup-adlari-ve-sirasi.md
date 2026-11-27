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
- Bağımsız kontrolün bulgularıyla katalogdaki panel yolu örneği "Panel" ile başlar, yolun testi tablette (768) de çalışır. Kart 0186'dan kalan kırık (sunucudaki panel denemesi açılış sayfasının başlığını "Karşılama" bekliyor) kart 0336'ya yazıldı.
- Ekran görüntüsü taslakla yan yana kondu.

## Sonuç

- Kullanıcı kararıyla (karar 0200) menünün grupları taslaktaki gibi: Satış, Katalog, İçerik, Vitrin, Ayarlar; ürün ekranlarının grubu "Katalog". Sayfa yolunun ilk adımı "Panel" (menüdeki ad "Karşılama" kaldı). Adresler ve izinler değişmedi.
- Grupların adı ve sırası ile yolun kökü birim testlerinde ve panel çerçevesinin tarayıcı testinde (taramayla) ölçülür.
- Ekran görüntüsü taslakla yan yana kondu (bilgisayar genişliği; görüntü geçici klasörde): menünün grupları ve sayfa yolu taslakla aynı.

## Durum

bitti
