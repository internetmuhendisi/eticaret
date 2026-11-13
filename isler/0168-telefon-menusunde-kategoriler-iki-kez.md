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

## Notlar (2026-11-14)

- Önce ve sonra görüntüsü (taze kurulmuş Örnek Mağaza, 390 px): önce yan pencerede Giyim, Ev ve Yaşam, Elektronik Aksesuar, Spor ve Outdoor, Kişisel Bakım iki kez, başlıksız listeleniyordu. Sonra en üstte kapalı tek "Kategoriler" satırı, altında ana menü; "Kategoriler" açılınca kategoriler girintili içinde.
- Karar 0120.
- Bağımsız kontrolün bulgularıyla düzeltildi: "Kategoriler" açıkken koyu temada da taranır; iç akordeonun başlıkları h4 (pencere h2, "Kategoriler" h3); logo satırı birden çok kategori menüsü seçse de tek "Kategoriler" çizilir; sıra ve başlık düzeyi jsdom testinde.
- Kabul edilen fark (bağımsız kontrol): masaüstündeki menü satırı "Kategoriler" düğmesini kendi `kategoriMenusu` alanından alır (elle kurulmuş bir menü de seçilebilir), telefon menünün türüne bakar. Menü satırına elle kurulmuş bir menü kategori diye konursa masaüstünde düğmenin altında, telefonda düz listede görünür. Bugün böyle bir site yok.

## Durum

bitti
