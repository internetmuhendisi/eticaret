# 0061 · Maskenin uzun metindeki süresi

## Amaç

Kart 0032'de ölçüldü: `"a.".repeat(100000) + "@"` biçiminde 200.000 karakterlik metni `metniMaskele` yaklaşık 7 saniyede işliyor, bu sırada süreç başka iş yapamıyor. Ana dalda da aynı süre ölçüldü, kart 0032'den önce de vardı. Sebep bağlantı adresi kuralı olarak ölçüldü (`cekirdek/izleme/maskele.ts`, `<şema>://kullanici:sifre@sunucu`). Saldırganın böyle bir metni hata kaydına sokup sokamadığı ölçülmedi; ön kapının gövde sınırı 1 MB'tır.

## Olmazsa olmazlar

- Önce metnin dışarıdan gelen bir yoldan maskeye ulaşıp ulaşamadığı ölçülür.
- Maskeden geçen metnin uzunluğu sınırlanır ya da kural doğrusal süreli yazılır. Aynı sınıf başka kuralda da aranır.

## Sınırlar

- Maskenin yakaladıkları azalmaz: mevcut maske testleri değişmeden geçer.

## Bitti sayılır

- Aynı metin süre sınırı içinde işleniyor, test bunu gösteriyor.

## Durum

yapılacak
