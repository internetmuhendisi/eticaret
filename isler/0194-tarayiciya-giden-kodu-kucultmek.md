# 0194 · Tarayıcıya giden kodu küçültmek

## Amaç

Kart 0146'nın hız ölçümünde her vitrin sayfasıyla sıkıştırılmış 288–298 KB JavaScript iniyor; yavaş telefonda (1,47 Mbit/s) bu tek başına yaklaşık 1,6 saniye. Sınır şimdilik 320 KB (`cekirdek/testler/hiz/hedefler.ts`, karar 0124): büyümeyi durdurur, küçültmez. Ölçümde görülen büyük parçalar:

- Ekran metinlerinin tamamı (`cekirdek/metinler/tr.json`, 79 KB, sıkıştırılmış yaklaşık 19 KB) her sayfayla tarayıcıya gidiyor: `useMetin` bütün dil dosyasını alır.
- Radix parçaları yaklaşık 60 KB; bildirim kütüphanesi (sonner) 10 KB, her ürün kartının favori düğmesiyle geliyor.
- Zod (sıkıştırılmış yaklaşık 30 KB) formlu sayfalarda: giriş, kayıt, bülten, yorum yazma, stok bildirimi formu. Form açılmadan da sayfayla iniyor.

Bölüm: Vitrin.

## Olmazsa olmazlar

- Her parçanın hangi sayfayla neden indiği ölçülsün (derleme çıktısı ve tarayıcıdaki istekler).
- Metinler sayfanın gerçekten kullandıklarıyla sınırlansın ya da kullanılmayanlar tarayıcıya gitmesin; tek metin dosyası kuralı (metinler.md) bozulmasın.
- Yalnız tıklanınca gereken kod (form doğrulaması, bildirim) gerektiği anda yüklensin.
- Küçülme hız ölçümüyle ölçülsün; kod sınırı ölçülen yeni değere çekilsin (karar kaydı).

## Sınırlar

- Davranış ve görünüş değişmez.
- Next.js ve React'ın kendi çalışma kodu bu kartın işi değil.

## Bitti sayılır

- En büyük vitrin sayfasının kodu ölçülerek küçüldü; ölçümler karta yazıldı, kod sınırı yeni değere çekildi.
- Hız ve ekran ölçümü yeşil.

## Durum

yapılacak
