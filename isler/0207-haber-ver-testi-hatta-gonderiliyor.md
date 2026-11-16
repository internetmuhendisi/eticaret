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

## Ölçüm (2026-11-16)

Sonuç: düşüş yerelde yeniden üretilemedi, sebep bilinmiyor. Kullanıcı kararıyla hatta düşen tarayıcı testinin izi saklanır (karar 0131). Kart, izle bir sonraki düşüşe kadar açık kalır.

- **Ortam.** Ayrı kutuda temiz veritabanı, iki işlemci (`taskset -c 0,1`), tek işçi. Testin bir kopyasına geçici zaman kaydı eklendi, kayda girmedi. Kayıt şunları yazdı: Enter'a basılması, robot sorusunun istenmesi ve gelmesi, talebin gönderilmesi ve cevabı, teşekkürün görünmesi.
- **Gönderimin akışı.** Form robot sorusunu açılışta değil, gönderirken ister (`ertele: true`). Gönderim üç adımdır: soruyu almak, tarayıcıda çözmek, talebi göndermek.
- **Ölçülen süreler (Enter'dan teşekküre):**

  | Koşul | Sonuç | Süre |
  |---|---|---|
  | Yüksüz, 3 kez | 3/3 | 0,2–0,3 sn |
  | İki işlemciyi meşgul eden yükle, 20 kez | 20/20 | en çok 0,33 sn; çözüm en çok 0,19 sn |
  | Hattaki sıra (şifre sıfırlama dosyası, ardından bu dosya), 3 tur | 3/3 | en çok 0,34 sn |
  | Önbelleksiz sunucu (`.next` silinerek), 3 kez | 3/3 | 1,83–1,86 sn |
  | Bütün takım, hattaki gibi (temiz veritabanı, önbelleksiz sunucu), 2 tur | 254/254, 254/254 (33,3 ve 33,7 dk) | 0,82 sn |

  Önbelleksiz sunucuda süre robot sorusu ve talep uçlarının ilk isteğinde uzadı. Tarayıcı sırasıyla 0,6–0,7 ve 0,7–0,9 sn bekledi, sunucunun yazdığı iş süresi ise 80–250 ms'ydi. Fark büyük olasılıkla ilk derlemedir. İki kat yavaş bir makinede bile 5 saniyeyi açıklamaz.
- **Elenenler.**
  - Tarayıcıdaki çözüm her koşulda 0,2 saniyenin altında kaldı.
  - İstek sınırı bekletmez, hemen 429 döner; form o durumda kendi hata metnini gösterir.
  - Hattın günlüğünde testin 20 saniyesine ait sunucu satırı yok.
- **İz kaydı (karar 0131).**
  - `playwright.config.ts`'de `trace: "retain-on-failure"` açıldı.
  - Hat, tarayıcı testleri kırmızı biterse `test-results/` klasörünü 14 gün saklar ("Düşen tarayıcı testlerinin izi").
  - Bütün takım izle aynı koşulda 254/254 geçti: 36,8 dk (izsiz 33,3 ve 33,7 dk, yaklaşık yüzde 10 uzun). En uzun test 47,3 sn (izsiz 46,4); 60 saniyelik sınırın altında.
  - Bilerek bozulan iki testin izi saklandı, aynı dosyada geçen testinki silindi. İz her isteğin zamanını ve bekleme süresini taşıyor.
  - Hat adımının gerçekten çalışması ilk kırmızı hatta görülecek, yerelde denenemez.
- **Bir sonraki adım.** Bu test hatta yeniden düşerse hattın sonucundaki izden üç adımın süresi okunur, sebep oradan aranır.

## Durum

yapılacak
