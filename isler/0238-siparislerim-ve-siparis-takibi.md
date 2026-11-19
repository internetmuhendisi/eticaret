# 0238 · Siparişlerim ve sipariş takibi

## Amaç

Müşteri siparişinin durumunu görebilmeli: üye hesabından siparişlerim ile, üye olmayan sipariş numarası ve e-postasıyla (temel paket: Sipariş, Müşteri hesabı). Bugün sipariş numarası yalnız sipariş alındı sayfasında görünüyor (karar 0141).

Bölüm: Sipariş ve müşteri hesabı. Önce 0234 ve 0237 bitmiş olmalı.

## Olmazsa olmazlar

- Siparişlerim: müşterinin siparişleri en yeni önce, sayfalı; durum, tarih, toplam. Sipariş ayrıntısı: durum, geçmişin müşteriye gösterilen kısmı (iç not ve iç nedenler görünmez), kargo firması, takip numarası ve takip bağlantısı, ürünler (sipariş anındaki ad ve fiyatla), vergi dökümüyle tutar, adresler, ödeme yöntemi, müşteriye not, iadeler.
- Üye olmayanın takibi: sipariş numarası ve e-postayla form; numara ile e-posta eşleşmezse sipariş yokmuş gibi aynı cevap (siparişin var olduğu belli olmaz); robot korumalı ve sıkı sınırlı uç. Gösterilen bilgi 0233'teki kararla.
- Sipariş alındı sayfasındaki e-posta cümlesi ve takip bağlantısı (0233 taslağına göre).
- Sipariş ayrıntısı her iki yolda aynı görünüşten çizilir; tutar ve vergi sipariş kaydından okunur, yeniden hesaplanmaz.
- Müşteri uçları: her müşteri ucunda başkasının siparişini dönmeme senaryosu; kişisel veri taşıyan yanıt önbelleğe girmez; tema demosunda kapalıdır.
- Testler gerçek veritabanıyla: üyenin yalnız kendi siparişlerini görmesi, üye olmayanın eşleşen ve eşleşmeyen numara-e-posta, büyük-küçük harf, sınır ve robot, iç notun görünmemesi, ürün sonradan değişince ayrıntının değişmemesi, iki site. Tarayıcıda klavyeyle siparişlerim ve takip formu (boş, hatalı, bulunamadı, bulundu), iki renkte ve üç genişlikte tarama. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda.

## Sınırlar

- İade talebi formu kart 0239'dadır; bu kartta ayrıntıda yalnız iadelerin görünüşü vardır.
- Müşterinin kendi iptali (ayar açıksa) kart 0239'da iade talebiyle birlikte yazılır.

## Bitti sayılır

- Üye siparişlerini ve ayrıntısını görüyor; üye olmayan numara ve e-postayla siparişini buluyor (tarayıcı testi).
- Başkasının siparişi hiçbir yoldan görünmüyor, eşleşmeyen sorgu siparişin varlığını belli etmiyor (test).
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
