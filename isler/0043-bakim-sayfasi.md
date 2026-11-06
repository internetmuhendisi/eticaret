# 0043 · Bakım sayfası

## Amaç

Site güncellenirken ya da bir sorun çıktığında ziyaretçi boş bir hata ekranı yerine mağazanın adını taşıyan "bakımdayız" sayfası görür (temel paket, bakım modu).

Önce 0042 bitmiş olmalı: yayın yeşil hat ister.

## Olmazsa olmazlar

- Sayfa uygulamanın içinde değil ön kapıda durur: uygulama düşmüşken de açılır.
- Kendiliğinden: sitenin kutusu kapalıysa, cevap vermiyorsa ya da sağlık ucu veritabanının düştüğünü söylüyorsa sayfa görünür, düzelince kendiliğinden kalkar.
- Elle: `pnpm bakim <site klasörü> <ortam> ac|kapat|durum`. Yalnız o siteyi etkiler, öteki sitelere dokunmaz.
- Elle açık bakım, sayfa yenilenince ve yeni yayında korunur.
- Cevap 503 ve `Retry-After` taşır: arama motorları bunu geçici sayar. Sağlık ucu bakımda da açık kalır, kontroller gerçek durumu görür.
- Metin tek yerden okunur, renkler tasarım değerlerinden gelir. Sitenin metni site ayarıdır, boşsa ortak metin görünür.
- `pnpm sunucu-denetle` elle açık bakımı söyler, 24 saatten uzun açık kaldıysa kırmızıdır. Yayın bakım açıkken de çalışır.
- Bakım açılınca, kapanınca sonuç kayda yazılır.

## Sınırlar

- Satış öncesi "Yakında açılıyoruz" hâli ayrı iştir (`planlar/komutlar.md`, kart 0041).
- Mağaza sahibinin panelden bakım açması ve sahip panelinde gösterim, o paneller gelince eklenir.
- Bakım başlayınca ziyaretçiye ya da mağaza sahibine bildirim gitmez.
- Canlı ortam adresi henüz yok, ölçüm deneme adresinde yapılır; kod ortama bağlı yazılmaz.

## Bitti sayılır

- Örnek Mağaza'nın kutusu durdurulunca deneme adresinde sayfa 503 ile açılıyor, kutu açılınca site kendiliğinden dönüyor.
- Veritabanı durdurulunca sayfa görünüyor, açılınca kalkıyor.
- `pnpm bakim` ile açılıp kapanıyor; yeni yayından sonra da korunuyor.
- Bir sitenin bakımı geçici ikinci bir siteyi etkilemiyor.
- Sayfa üç genişlikte yatay kaydırmasız, konsol hatasız ve erişilebilirlik ölçümünden geçiyor.
- Bilerek bozulan ayar ön kapıyı düşürmüyor: Caddy doğrulaması kurulumdan önce durduruyor.

## Durum

yapılacak
