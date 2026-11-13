# 0162 · Terim sözlüğü dosyası yok

## Amaç

Kurallar ürünün kavramlarının tek adını bir terim sözlüğü dosyasında tutmayı ister (`.claude/rules/metinler.md`, `klasor-duzeni.md`: `cekirdek/metinler/` altında). Karar 0101 de panelde "Slider", vitrinde "kayan afiş" adlarının sözlükte eşleştirilmesini söyler. Kart 0142 sırasında bakıldı: projede böyle bir dosya yok. Panelde "Slider" adı bölüm tarifinin metin anahtarından gelir (`vitrin.bolum.kayanAfis.ad`), tek yerdedir; ama kavram adlarının listesi hiçbir yerde yazılı değil.

## Olmazsa olmazlar

- `cekirdek/metinler/` altında terim sözlüğü dosyası: kavram, tek adı, kodda kullanılan adı, gerekiyorsa panelde ve vitrinde farklı görünen adı (Slider / kayan afiş).
- Sözlükteki adların metin dosyasıyla tutarlı olduğunu gösteren bir kontrol ya da kontrolsüzse "yalnız disiplin" işareti.

## Sınırlar

- Metinlerin kendisi yeniden yazılmaz.

## Bitti sayılır

- Sözlük dosyası var ve kural dosyaları ona bağlantı veriyor.
- Kayan afiş ve Slider eşleşmesi sözlükte yazılı.

## Durum

yapılacak
