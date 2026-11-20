# 0253 · Vitrine yalnız vitrinin metinleri gitsin

## Amaç

Ekran metinlerinin tamamı (`cekirdek/metinler/tr.json`) her vitrin sayfasıyla tarayıcıya gidiyor: tarayıcıdaki `useMetin` bütün dil dosyasını içe aktarır (kart 0194'te bulundu). Sıkıştırılmış 34 KB'ın yalnız 12 KB'ı vitrinin ve ortak metinlerdir; panelin metinleri 14,6 KB, geliştirme ve katalog 5,4 KB, ayar açıklamaları 3,2 KB (2026-11-20 ölçümü). Kart 0239'un metinleri havale bildirimi sayfasını 319'dan 322 KB'a, sipariş takibini 315'ten 321 KB'a çıkardı; sınır 320 KB (`cekirdek/testler/hiz/hedefler.ts`). Kart 0239 bu kartı bekliyor (kullanıcı kararı: sınır yükseltilmez, önce metinler küçülür).

Bölüm: Vitrin. Kart 0194'ün metin maddesidir; 0194'ün öteki maddeleri (Radix, bildirim kütüphanesi, zod) bu kartta yok.

## Olmazsa olmazlar

- Vitrinin tarayıcı koduna yalnız vitrinin ve ortak metinler girer; panelin tarayıcı koduna panelin ve ortak metinler. Hangi bölümün nereye gittiği ölçülür (derleme çıktısı ve hız ölçümünün kod boyutu).
- Tek metin dosyası kuralı (metinler.md) bozulmaz: metinler yine yalnız `tr.json`'da yazılır; ayrım üretilen ya da içe aktarılan parçalarla yapılır, elle ikinci kopya yazılmaz.
- Bir tarayıcı bileşeni kendi tarafında olmayan bir anahtarı kullanırsa tür kontrolünde ya da testte kırmızı olur (sessizce boş metin çizilmez).
- Sunucuda çizilen metinler değişmez (sunucu bütün dosyayı okur).
- Hız ölçümü bütün vitrin sayfalarında yeşil; kod sınırı ölçülen değerlere göre karar kaydıyla aşağı çekilir.

## Sınırlar

- Metinlerin içeriği ve ekranların görünüşü değişmez.
- Kart 0239'un kodu bu karta karışmaz; 0239 bu kart ana dala alındıktan sonra onun üzerine taşınır.

## Bitti sayılır

- Vitrinin en büyük sayfasının kodu ölçülerek küçüldü; ölçümler karta yazıldı.
- Yanlış taraftaki anahtarı kullanan tarayıcı bileşeni kontrolde kırmızı (bozuk örneğiyle).
- Birim, tarayıcı ve hız ölçümü yeşil; kod sınırı yeni değere çekildi (karar kaydı).

## Durum

yapılacak
