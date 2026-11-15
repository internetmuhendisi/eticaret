# 0207 · Stoğa gelince haber ver testi hatta "Gönderiliyor…"da kaldı

## Amaç

Kart 0152'nin kapanış gönderiminde (2026-11-16, kayıt 35cfc5c, hat çalışması 43769247460) kontrol hattında yalnız bir tarayıcı testi düştü (253 geçti):

- `cekirdek/testler/uctan-uca/stok-bildirimi.test.ts:129` "stoktaki üründe kutu yok; üye olmayan müşteri klavyeyle haber ister, aynı adres bir kez yazılır" (20,9 sn).
- 169. satırda düştü: `expect(tamam).toHaveText(...)`. Beklenen metin teşekkür yazısıydı, gelen "Gönderiliyor…" oldu. Beklemenin sınırı 5 saniye; durum alanı 14 okumanın 14'ünde de "Gönderiliyor…" gösterdi.
- Bu adım üye olmayan müşterinin talebidir: form önce robot sorusunu çözer (`robotluGonder`), sonra herkese açık uca gönderir (`cekirdek/eklentiler/stoga-gelince-haber-ver/form.tsx`).
- Hattın günlüğünde o dakikada sunucu hatası yok.

Aynı kod (05b66a5) bir önceki hat çalışmasında (43733666476) yeşildi. 35cfc5c ile 05b66a5 arasında yalnız kart ve tarihçe dosyaları değişti. Hat yeniden çalıştırılmadı (her çalışma ücretli).

Gönderimin 5 saniyeyi neden aştığı ölçülmedi: robot sorusu mu, uç mu, veritabanı mı, bilinmiyor.

Bölüm: Testler. Kart 0152'de görüldü, ona karıştırılmadı. Benzer: 0166 (stok bildirimi paneli, connection closed).

## Olmazsa olmazlar

- Önce hattın koşuluna yakın yerelde yeniden üretilsin: ayrı kutuda temiz veritabanı, 2 işlemci, tek işçi. Gönderimin hangi parçasında beklendiği zamanla ölçülsün: robot sorusunun alınması ve çözülmesi, uç isteği, sunucudaki iş.
- Sebep ölçülmeden süre sınırı büyütülmez.
- Gerçek bir ürün yavaşlığı çıkarsa (müşterinin gönderimi uzun sürüyorsa) ayrı kart.

## Sınırlar

- Robot korumasının kuralları ve formun davranışı ölçüm hata göstermedikçe değişmez.

## Bitti sayılır

- Sebep ölçümle yazıldı.
- Düzeltmeden sonra test hattın yüküne yakın yerel yükte art arda en az beş kez geçiyor.
- Hat yeşil.

## Durum

yapılacak
