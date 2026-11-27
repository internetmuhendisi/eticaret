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

## Sonuç

- Kullanıcı kararları (karar 0195): raporu yalnız mağaza sahibi görür (`rapor.gor`); satış ödemenin alındığı günde, iade tamamlandığı günde sayılır; çok satanlar kart 0318'de; "bu ay" önceki ayın aynı günleriyle, "geçen ay" ondan önceki ayın tamamıyla karşılaştırılır.
- Rapor modülü `cekirdek/moduller/rapor/` (dönem, satış servisi, CSV), ekran `cekirdek/yonetim-paneli/raporlar/`, uç `rapor-satis-csv`, varsayılan dönem ayarı `raporVarsayilanDonem` (panelde yeri kart 0334), iki kısmi indeks (değişiklik 0068).
- Sorgu hızı 100 bin siparişte (yerel, yedi çalışmanın ortancası): bugün 5 ms, son 30 gün 13 ms, bir yıl 113 ms (karar 0195).
- Testler ve bozmalar `.claude/rules/kurallari-koruyan-kontroller.md`'de (Testler satırı, kart 0317): 35 denetimden 34'ü bozulunca kırmızı; iade sorgusunun ilk durum koşulu yalnız daraltır.
- Taslakla karşılaştırma bilgisayar ve telefonda iki temada yapıldı; ayrılan yerler karar 0195'te.
- Bağımsız kontrolün 13 bulgusundan 12'si düzeldi; ondalıklı vergi oranının yuvarlanması eski sorun, kart 0335. Çalışırken bulunan hat düşüşleri kart 0332 ve 0333.

## Durum

bitti
