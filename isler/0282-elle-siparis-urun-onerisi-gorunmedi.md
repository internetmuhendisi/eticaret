# 0282 · Elle sipariş testinde ürün önerisi 5 saniyede görünmedi

## Amaç

Kartlar 0259, 0188 ve 0227'nin kapanış kaydının hattı (44893316647, kayıt c6aebdb) yalnız bir testle kırmızıydı: 303 test geçti, 1 düştü, 3 çalışmadı; birim testleri 3701/3701 yeşil. Düşen test `cekirdek/testler/uctan-uca/elle-siparis.test.ts` "panelden klavyeyle elle sipariş", satır 163: ürün kutusuna testin ürününün adı ("Elle deneme b8d8991f") yazıldıktan sonra `getByRole("option")` 5 saniyede görünmedi ("element(s) not found"). 0259 elle sipariş ekranının ürün aramasına dokunmadı. Hattın günlüğünde düşüş sırasında "[Fast Refresh] rebuilding" satırı yok. Testin izi hatta 14 gün durur.

Kart 0251 aynı testin başka bir adımıdır ("Siparişi oluştur"daki POST'un derlemeyi beklemesi); iki düşüşün aynı sebepten gelip gelmediği ölçülmedi.

## Olmazsa olmazlar

- Sebep izden okunur: ürün arama isteği gitti mi, ne kadar sürdü, cevabı ne oldu, öneri listesi neden açılmadı; ölçülerek yazılır.
- Sebep 0251 ile aynı çıkarsa ikisi tek düzeltmeyle kapanır ve 0251'e not yazılır; farklıysa bu kartta kalır.
- Düzeltme hattın koşulunda (temiz veritabanı, iki işlemci) art arda çalıştırılarak denenir; beklemeyi yalnız uzatmak sebep yazılmadan yapılmaz.

## Sınırlar

- Elle siparişin kendisi (kart 0236) ve kayıt arama kutusunun davranışı, sebep onları göstermedikçe değişmez.
- Kart 0281'in (arama testi) işine karışmaz.

## Bitti sayılır

- Sebep ölçümle yazıldı.
- Düzeltme hattın koşulunda elle sipariş testi art arda beş kez yeşil; düzeltme geri alınınca düşüş üretilebiliyorsa kırmızı.

## Durum

yapılacak
