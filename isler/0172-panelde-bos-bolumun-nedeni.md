# 0172 · Panel, bugün boş olduğu için vitrinde görünmeyen bölümü söylesin

## Amaç

Müşteri gezisinde (2026-11-13) görüldü: "Geri sayımlı fırsatlar" panelde görünür işaretli, ama vitrinde yok, çünkü bugün bitiş tarihli süren indirim yok. Panel blog ve bülten bölümlerinde nedeni yazıyor ("Vitrinde görünmüyor"), bu bölümde hiçbir şey söylemiyor; mağaza sahibi bölümün neden görünmediğini anlamaz.

## Olmazsa olmazlar

- Vitrinde içeriği boş kaldığı için çizilmeyen her bölüm (fırsatlar, ürün vitrini, sekmeli vitrin, marka logoları, yorumlar gibi) panelde "Şu an vitrinde görünmüyor" işaretini ve bölüme göre nedenini alır (örneğin "Bitiş tarihli süren indirim yok; indirim girilince görünür.").
- Boşluk vitrinin kullandığı kaynakla aynı sorgudan bulunur; iki ayrı kural yazılmaz.
- Gerçek veritabanıyla test: boş kaynakta işaret var, ürün gelince yok; tarayıcıda işaret görünüyor.

## Sınırlar

- Bölümün kendisi ve vitrindeki davranışı değişmez.

## Bitti sayılır

- Bitiş tarihli indirim yokken "Geri sayımlı fırsatlar" panelde nedeniyle işaretli (test).
- Önce ve sonra ekran görüntüsü karşılaştırıldı.

## Durum

yapılacak
