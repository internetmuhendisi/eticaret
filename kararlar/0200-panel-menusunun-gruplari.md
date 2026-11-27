# 0200 · Panel menüsünün grupları ve sayfa yolunun başı

## Tarih

2026-11-27

## Karar

Panel menüsünün grupları onaylı taslağın (karar 0157) adı ve sırasıyladır: Satış, Katalog, İçerik, Vitrin, Ayarlar (kart 0324, kullanıcı kararı). Ürün ekranlarının grubu "Ürünler" değil "Katalog"dur. Karşılama ve Raporlar grupsuz olarak en üstte kalır. Sayfa yolunun ilk adımı "Panel"dir, kökün menüdeki adı ("Karşılama") değil; bağlantısı yine panelin açılış sayfasıdır.

## Neden

- Grubun adı "Ürünler" iken içindeki ilk sayfa da "Ürünler"di; menüde aynı ad iki kez geçiyordu.
- Taslak onaylıydı; sıra farkı kart 0301'in karşılaştırmasında bulundu.
- Açılış sayfası pano oldu, başlığı günün selamıdır (karar 0199); yolun başı belli bir sayfayı değil bütün paneli adlandırır.

## Düşünülen diğer yollar

- **"Ürünler" grubunu ve bugünkü sırayı korumak:** Kullanıcı taslağı seçti.
- **Yolun başında menüdeki adı ("Karşılama") göstermek:** Kullanıcı "Panel"i seçti.

## Sonuçları

- Grubun koddaki adı da `katalog` oldu (`panelGruplari`); sayfaların adresleri ve izinleri değişmedi.
- Yolun başının adı tek yerdedir (`sayfaYoluKokAdi`, metin `yonetim.sayfaYoluKok`).
- Rol tablosundaki izin grupları (Ekip > Roller) modüllere göredir, menünün gruplarından ayrıdır; değişmedi.
