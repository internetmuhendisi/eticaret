# 0281 · Arama testi ilk geçişte 5 saniyede bitmedi

## Amaç

Kart 0258'in hattı (44886141462, kayıt eb8db1f) yalnız bir testle kırmızıydı, 302 test geçti: `cekirdek/testler/uctan-uca/arama.test.ts` satır 103 ("üstteki kutudan klavyeyle aranır…"). Takımın ilk testidir. Enter'dan sonra `/arama?ara=SISLI+CANTA+…` adresine geçiş 5 saniyelik `toHaveURL` beklemesinde bitmedi ("waiting for … navigation to finish", gelen adres boş). 0258 aramaya dokunmadı. Testin izi hatta 14 gün durur.

## Olmazsa olmazlar

- Sebep izden okunur: geçiş neyi bekledi (sayfanın derlenmesi, istek, sınır), ölçülerek yazılır.
- Isınma (`isinma.ts`) aranan metinli arama adresini ve formun GET gönderimini kapsıyor mu, ölçülür.
- Düzeltme hattın koşulunda (temiz veritabanı, iki işlemci) art arda çalıştırılarak denenir; beklemeyi yalnız uzatmak sebep yazılmadan yapılmaz.

## Sınırlar

- Kart 0157'nin (yük altında 60 saniye aşımı) işine karışmaz.

## Bitti sayılır

- Sebep ölçümle yazıldı.
- Düzeltme hattın koşulunda art arda yeşil; düzeltme geri alınınca düşüş üretilebiliyorsa kırmızı.

## Durum

yapılacak
