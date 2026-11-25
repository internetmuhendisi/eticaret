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

## Notlar

- İzden (hat 44893316647, 2026-11-25): ürün adı yazıldıktan 250 ms sonra `GET /kapi/yonetici/elle-siparis-urunleri?ara=…` gitti, testin 5 saniyesi boyunca cevap almadı (izde durum -1); istekten 0,2 sn sonra tarayıcıda "[Fast Refresh] rebuilding" başladı, 1,3 ve 1,9 sn süren iki tur ve bir üçüncüsü geldi. Öneri listesi açılmadı çünkü istek bir derleme turunu bekledi; kayıt arama kutusu doğru çalıştı. Aynı uç ısınmada isteniyor; kart 0226'nın yerel denemesinde ilk gerçek istekte `next.js: 1.1ms` ile döndü. Hangi yolun derlendiği izde yok.
- Sebep kart 0251 ile aynı aile: o kartın notlarına yazıldı. Kullanıcı kararıyla (2026-11-25) üç kart (0251, 0282, 0281) bir sonraki kırmızı hattın sunucu satırlarıyla (kart 0226) birlikte sürer.
- Kart 0251 ile çözüldü (2026-11-25, karar 0184): tarayıcı testleri canlıdaki gibi derlenmiş çekirdekte çalışır, sebep ve ölçüm 0251'in Sonuç bölümünde. Hattın koşulunda elle sipariş ve arama testleri art arda beşer kez 25/25.

## Durum

yapılacak
