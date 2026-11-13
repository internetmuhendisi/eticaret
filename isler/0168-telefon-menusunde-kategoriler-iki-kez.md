# 0168 · Telefonun yan menüsünde kategoriler iki kez görünmesin

## Amaç

Müşteri gezisinde (2026-11-13) ölçüldü: telefonda yan menü önce ana menüyü, sonra kategori menüsünü başlıksız alt alta listeliyor. Örnek Mağaza'da Giyim, Ev ve Yaşam gibi beş satır iki kez geçiyor; birinde alt kategori oku var, ötekinde yok.

## Olmazsa olmazlar

- Kullanıcı kararı: bilgisayardaki menü satırı gibi. Kategori menüsü yan pencerede tek bir "Kategoriler" satırıdır, dokununca açılır (akordeon); ana menünün bağlantıları onun altında durur.
- Her site için geçerli çekirdek davranışıdır; siteye özel kod yok.
- Karar 0083'ün yerine geçen kısım için yeni karar kaydı.
- Birim ve tarayıcı testi: telefonda kategori bağlantıları yan pencerenin en üst düzeyinde bir kez, "Kategoriler" açılınca alt kategorileriyle görünüyor; klavye ve tarama.

## Sınırlar

- Masaüstündeki menü satırı değişmez.
- Menü verisi ve menü servisi değişmez.

## Bitti sayılır

- Telefonda yan menüde aynı kategori en üst düzeyde iki kez görünmüyor (tarayıcı testi).
- Pencere açıkken iki renkte taramadan geçiyor, Escape odağı geri veriyor.
- Önce ve sonra ekran görüntüsü karşılaştırıldı.

## Durum

yapılacak
