# 0218 · Boş sepet sayfası hız hedefini aşıyor

## Amaç

Kart 0212'nin gönderiminde (`e51eb29`) kontrol hattının hız ölçümü sepet sayfasında kırmızı oldu: ana içerik 4452 ms, hedef 2500 ms (kayma 0,075, tepki 88 ms, kod 296 KB; öteki sayfalar hedefin içinde). Ölçülen sayfa boş sepettir.

Kodda görülen neden: sepet tarayıcının deposunda durur (karar 0135), sunucu sepeti bilmez. Sayfa sunucuda iskeletle çizilir, "Sepetiniz boş" ekranı ancak sayfanın kodu tarayıcıda çalışınca gelir. Favoriler sayfasında aynı sorun karar 0125 ile çözülmüştü. Sepet sayfasını kart 0212 hız ölçümüne ekledi, ölçüm göndermeden önce yerelde çalıştırılmadı.

Öneri: tarayıcıdaki sepet durumu her değişiklikte sepetteki ürün sayısını küçük bir çereze de yazar. Sunucu çerezde ürün görmezse boş hâli hemen çizer, ürün görürse iskelet çizer. Favorilerdeki çözümün aksine kimse yanlış ekran görmez: sepet zaten bu tarayıcıdadır. Yalnız çerez silinip depo kalırsa bir an boş ekran görünür.

## Olmazsa olmazlar

- Çereze yalnız sayı yazılır, birim ya da fiyat yazılmaz. Okuma ve yazma tek yerde olur (sepetin deposu).
- Boş sepette sunucunun HTML'inde boş hâl vardır. Dolu sepette iskelet vardır, tutarlar yine yalnız sunucunun hesabından gelir.
- Hız ölçümü sepet sayfasında hedefin içinde kalır. Sayfa bilinen aşım listesine eklenmez (liste yalnız küçülür).
- Hidrasyon uyarısı olmaz (konsol denetimi), ekran ölçümü ve sepet testleri geçer.
- Karar kaydı yazılır.

## Sınırlar

- Sepetin saklandığı yer değişmez (karar 0135).
- Öteki sayfaların hızı bu kartın işi değildir (kart 0196).

## Bitti sayılır

- Yerelde temiz deneme veritabanıyla `pnpm hiz-olcumu` sepet sayfasında yeşil; eski kodda kırmızı.
- Çerezin yazılması ve sunucunun boş hâli birim testinde, bozularak kırmızıya düşüyor.
- Kontrol hattı yeşil.

## Durum

yapılacak
