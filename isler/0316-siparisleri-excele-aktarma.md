# 0316 · Siparişleri Excel'e aktarma

## Amaç

Mağaza sahibi siparişlerini muhasebe ve kargo işleri için Excel dosyası olarak indirebilmeli. Temel paket yalnız satış raporunun CSV indirmesini sayar; sipariş listesinin dışa aktarmasının temel pakette mi, Excel eklentisinde mi olduğu kart 0311'de kullanıcıya sorulur.

Bölüm: Yönetim paneli 2. Önce 0311 bitmiş olmalı; eklentideyse 0315.

## Olmazsa olmazlar

- Sipariş listesinin süzgeçleriyle (tarih aralığı, durum, ödeme yöntemi, kargo firması; kart 0267) dışa aktarma; sütunlar kart 0311'in kararıyla (sipariş, kalem, tutar, kupon, vergi dökümü, teslimat ve fatura bilgisi).
- Kişisel bilgisi silinmiş siparişte kişisel alanlar boştur; izin `siparis.gor`, dışa aktarma değişiklik kaydına girer (kişisel veri çıkışı).
- Büyük dışa aktarma arka plan işinde, belleği aşmadan; formül hücresi etkisiz yazılır.

## Sınırlar

- İçe aktarma yoktur.

## Bitti sayılır

- Gerçek veritabanıyla süzgeçlerin dosyaya uyması, tutarların siparişle aynı olması, silinmiş kişisel veri, formül hücresi, izin ve kayıt, iki site.
- Tarayıcıda klavyeyle indirme ve dosyanın içeriği; iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
