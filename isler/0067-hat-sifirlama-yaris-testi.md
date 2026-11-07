# 0067 · Kontrol hattında şifre sıfırlama yarış testi kırmızı

## Amaç

Kart 0034'ün gönderimi kontrol hattında iki kez aynı yerde kırmızı bitti: `cekirdek/kapi/testler/sifre-sifirlama.test.ts`, "müşteri: sıfırlamayla üst üste binen eski şifreli giriş açık oturum bırakmaz", `expected 500 to be 200`. Yeşil hat olmadan yayın yapılamaz (`pnpm hat-sonucu`).

Nedeni ölçülmedi. Test günlüğü yakaladığı için 500'ün hatası hat kaydında görünmüyor. Yerelde bilgisayarın tek ve iki çekirdeğiyle, bütün testler yanda çalışırken tekrarlanamadı (kart 0037 sırasında). Akla gelen, doğrulanmamış neden: test her 5 ms'de bir sınırsız giriş başlatıyor, yavaş makinede şifre özetleme kuyruğu ve bağlantı havuzu (5 saniye süre) dolunca yenileme isteği bağlantı alamıyor olabilir.

## Olmazsa olmazlar

- Önce neden ölçülür: başarısız olunca testin çıktısı 500'ün asıl hatasını göstersin, hat kaydından okunur.
- Asıl hata üretim kodundaysa (kilit, kilitlenme) kod düzeltilir. Yalnız test yükündeyse test sınırlanır.
- Test eski yarışı yakalamaya devam eder: `sifreDegismediyse` içindeki kilit kaldırılınca kırmızı olur.

## Ölçümler (2026-11-07)

- Hatta 12 çalışmanın 2'si kırmızı: ikisi de `f7ebcad` kaydında, birbirine yakın zamanda. Sonra 10 çalışma üst üste yeşil: `bcbfb57` 1, `kart-0067` 5, `f7ebcad` üzerine yalnız hata gösteren test değişikliği eklenmiş ölçüm dalı 4. Yani hata kayda bağlı görünmüyor, seyrek ve aralıklı.
- 500'ün asıl hatası hiç görülmedi: tekrarlanan çalışmalarda hata çıkmadı. Test artık başarısız olunca asıl hatayı yazıyor, bir sonraki kırmızıda hat kaydından okunur.
- Yerelde tekrarlanmadı: Node tek ve iki çekirdekte, bütün testler yanda çalışırken; veritabanı kutusu 0,3 ve 0,1 işlemciyle. Bu ölçümlerde yenileme başına yalnız 5-21 giriş başladı. Kartın ilk hâlindeki "sınırsız giriş havuzu dolduruyor" tahmini bu ölçümlerle desteklenmedi, çürütülmedi de; bu yüzden test sınırlanmadı.
- `sifreDegismediyse` içindeki kilit kaldırılınca test kırmızı oluyor.

## Sınırlar

- Karar 0052'deki davranış değişmez.

## Bitti sayılır

- Kontrol hattı ana dalda yeşil.
- 500'ün nedeni tarihçede ya da karar kaydında yazılı.

## Durum

yapılacak
