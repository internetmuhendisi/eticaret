# 0317 · Satış raporu ve rapor altyapısı

## Amaç

Temel paketin Yönetim paneli satırındaki satış raporu (dönem karşılaştırması; ciro, sipariş, ortalama sepet, çok satanlar, kupon, iade, oran oran vergi; CSV indirme) bugün yok. Öteki raporlar (kart 0318) ve pano (kart 0186) aynı altyapıyı kullanır.

Bölüm: Yönetim paneli 2. Önce 0311, 0312 ve 0298 bitmiş olmalı.

## Olmazsa olmazlar

- Rapor servisi: tarih aralığı sitenin saat dilimiyle (gün sınırları kart 0267'nin kuralıyla), dönem karşılaştırması (önceki dönem), hangi siparişlerin ve iadelerin sayıldığı kart 0311'in kararıyla tek yerde.
- Satış raporu: ciro, sipariş sayısı, ortalama sepet, kupon indirimi, iade, oran oran vergi, günlük ya da haftalık seri; grafik ve tablo (grafikte tablo karşılığı ekran okuyucuya açık).
- CSV indirme; tutarlar sitenin para biçimiyle değil, makinece okunur biçimde (karar kaydında).
- Sorgu hızı: ilk yılın en büyük mağazası ölçeğinde (karar kaydında yazılır) ölçülür.
- İzin: rapor görme ayrı izin.

## Sınırlar

- Ürün, müşteri ve kupon raporları kart 0318'dedir.

## Bitti sayılır

- Gerçek veritabanıyla gün sınırında milisaniyeler, yaz saati, iptal ve kısmi iade, kuponlu sipariş, başka para birimi, karşılaştırma dönemi, CSV'nin ekranla aynı olması, izin, iki site.
- Tarayıcıda klavyeyle tarih aralığı ve karşılaştırma, boş dönem; iki renkte ve üç genişlikte tarama.
- Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
