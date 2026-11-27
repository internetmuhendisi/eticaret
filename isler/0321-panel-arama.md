# 0321 · Panelde arama

## Amaç

Temel paketin Yönetim paneli satırında panel arama (sipariş, ürün, stok kodu, barkod, müşteri) var, bugün yok. Mağaza sahibi telefondaki müşteriye cevap verirken siparişi ya da ürünü tek kutudan bulabilmeli.

Bölüm: Yönetim paneli 2 (kullanıcının kararıyla bu bölüme eklendi). Önce 0311 bitmiş olmalı.

## Olmazsa olmazlar

- Panelin üst çubuğunda arama kutusu (yeri ve klavye kısayolu taslakta); sonuçlar türlerine göre gruplu: sipariş (numara, müşterinin adı ve e-postası), ürün (ad, stok kodu, barkod; birleşimin stok kodu ve barkodu ürünü bulur), müşteri (ad, e-posta).
- Arama kuralı var olanlarla aynı: Türkçe harfsiz ve büyük harfle bulma, `%` ve `_` joker değil (kart 0137, 0143).
- Sonuçlar izinle süzülür: izni olmayan türün grubu hiç görünmez, sorgu da yapılmaz.
- Kişisel bilgisi silinmiş sipariş numarasıyla bulunur, adla ve e-postayla bulunmaz.
- Öneriler klavyeyle gezilir (ok, Enter, Escape), sonuç sayısı canlı bölgede duyurulur; istek sınırı vardır.

## Sınırlar

- Blog, sayfa ve kupon aramaya girmez (kendi listelerinde aranır).

## Bitti sayılır

- Gerçek veritabanıyla her türde bulma, harf kuralı, joker, birleşimin stok kodu ve barkodu, silinmiş kayıt, silinmiş kişisel veri, izin süzgeci (sorgu sayılarak), iki site; uç erişim testinde beklentiden.
- Tarayıcıda klavyeyle arama, gruplar ve sonuca gitme; iki renkte ve üç genişlikte tarama.
- Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

bitti
