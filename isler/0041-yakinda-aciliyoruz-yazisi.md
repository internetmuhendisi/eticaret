# 0041 · Ana sayfada "Yakında açılıyoruz." yazısı

## Amaç

Örnek Mağaza'nın ana sayfasında başlığın altında "Yakında açılıyoruz." yazısı görünsün. Yazı siteye gömülmez, her sitenin açıp kapattığı bir ayardır. İş, çekirdeğin ilk güncellemesini (0.1.0 → 0.2.0) Örnek Mağaza'da elle izlemek ve geri dönüşü gerçek bir değişiklikle denemek için de kullanılır (`planlar/komutlar.md`, "Bir siteyi güncellemek").

## Olmazsa olmazlar

- Yeni site ayarı: ana sayfada "Yakında açılıyoruz." yazısı görünsün mü. Varsayılanı kapalı, Örnek Mağaza'da açık.
- Yazı ortak metin dosyasındadır, koda gömülmez.
- Çekirdek 0.2.0 olur, sürüm notu yazılır. Örnek Mağaza'nın kimliği 0.2.0 olur.
- Önce bilgisayarda bakılır, kullanıcı onaylar. Üç genişlikte (telefon, tablet, dizüstü) sayfa yana kaymaz.
- Deneme adresine yayınlanır, sonra `pnpm geri-don` ile önceki yayına dönülür, sonra yeniden yayınlanır.
- Güncelleme tarifi elle izlenir, öğrenilenler tarife yazılır.

## Sınırlar

- Bakım modu değildir: vitrin kapanmaz, yalnız bilgi yazısı görünür.
- Mağaza sahibinin bu ayarı panelden değiştirmesi bu işe girmez (panelde ayar ekranı yok).

## Bitti sayılır

- Ayar açıkken yazı başlığın altında görünüyor, kapalıyken görünmüyor (testte).
- Kullanıcı yazıyı bilgisayarda gördü ve onayladı.
- Deneme adresinde yazı görünüyor, sağlık ucu 0.2.0 diyor.
- Geri dönüşten sonra yazı kalkıyor ve sağlık ucu 0.1.0 diyor; yeniden yayından sonra yazı geri geliyor ve 0.2.0 diyor.
- Sürüm notu yazıldı, güncelleme tarifine öğrenilenler eklendi.

## Durum

yapılacak
