# 0158 · Sıralanabilir liste testi sürüklemeden hemen sonra tıklıyor

## Amaç

Kart 0119'un kapanış kontrolünde katalogdaki "sıralanabilir liste: klavyeyle, düğmeyle ve fareyle taşınır, Escape geri alır" testi (`cekirdek/testler/uctan-uca/katalog.test.ts`, kart 0141) bütün takımda bir kez, tek başına beş paralel çalışmanın üçünde düştü. Hep aynı adımda düşüyor: fareyle sürüklemeden sonra telefon genişliğinde "Yukarı al: Güven şeridi" düğmesine basılıyor, satır yer değiştirmiyor. Düşen çalışmada düğme odakta, son duyuru sürüklemenin "bırakıldı"sı; tıklama işlenmemiş.

Ölçülmeyen ama kaynaktan çıkan sebep: @dnd-kit fareyle bırakmadan sonra 50 milisaniye boyunca belgeye gelen tıklamayı durdurur (`AbstractPointerSensor.detach`, `setTimeout(this.documentListeners.removeAll, 50)`), sürüklemenin sonundaki tıklama bir şeyi açmasın diye. Test bırakmanın sonucunu görür görmez, 50 milisaniye dolmadan tıklıyor. Bir insan bu kadar hızlı tıklamaz; ürünün hatası değil, testin zamanlaması.

Kart 0123'ün kapanış kontrolünde aynı testin bir adımı daha yük altında düştü (yük ortalaması 21–31): telefon genişliğine geçildikten hemen sonra sayfanın yana kayması 287 piksel ölçüldü. Ana dalda tek işçiyle beş çalışmanın üçü düştü (ikisi yana kaymada, biri tıklamada), bu dalda beşin dördü. Sebebi ölçülmedi; genişlik değişince yerleşimin oturmasından önce ölçülüyor olabilir.

Bölüm: Vitrin.

## Olmazsa olmazlar

- Sebep önce ölçülür (ör. tıklamadan önce 50 milisaniyeyi geçen bekleme ya da tıklamanın durdurulduğunu gösteren kayıt).
- Test, kütüphanenin bu penceresini bilerek ve açıklamasıyla bekler; tahmini bekleme yerine ölçülebilir bir koşul varsa o kullanılır.
- Kullanıcının sürüklemeden sonraki ilk tıklamasının kaybolmadığı (50 milisaniyeden sonra) ölçülür.

## Sınırlar

- Sıralanabilir listenin davranışı değişmez. Bu iş yalnız testin kararlılığıdır. Gerçek bir ürün hatası çıkarsa ayrı kart açılır.

## Bitti sayılır

- Test tek başına art arda en az on kez ve bütün takımla bir kez geçer; telefon adımındaki yana kayma ölçümü de.
- Sebep ve ölçüm karta ya da karar kaydına yazılır.

## Ölçüm (2026-11-15, kart 0204 ile birlikte)

Hattın koşulunda ölçüldü (temiz veritabanı, `taskset -c 0-3`, `--workers=2`).

- **Kaynak.** @dnd-kit 6.3.1 sürükleme başlayınca belgeye yakalama evresinde `click` dinleyicisi ekler (`stopPropagation`). Bıraktıktan sonra bu dinleyiciyi `setTimeout(documentListeners.removeAll, 50)` ile kaldırır.
- **Erken tıklama kayboluyor.** 1280 px'te bırakmadan ~30 ms sonra "yukarı al"a basıldı. Tıklama pencerede görüldü ama gövdeye ulaşmadı ve sıra değişmedi (4/4).
- **50 ms'den sonra çalışıyor.** Sayfada 50 ms'lik bir zamanlayıcı bittikten sonra aynı düğmeye basıldı. Tıklama ulaştı ve sıra değişti (4/4).
- **Testteki aralık sınıra çok yakındı.** Testin gerçek zamanlamasında bırakmayla telefon tıklaması arası sekiz ölçümde 53–111 ms çıktı. Düşen çalışmada da bu tıklama kayboldu (265. satır, sıra değişmedi).
- **Düzeltme.** Test bıraktıktan sonra sayfada aynı süreli bir zamanlayıcıyı bekler. Aynı süreyle sonradan kurulan zamanlayıcı kütüphaneninkinden sonra çalışır, yani tahmini bekleme yoktur. Sonraki telefon tıklaması sürüklemeden sonraki ilk tıklamadır; testin geçmesi bu tıklamanın kaybolmadığını ölçer.
- **Ürün.** Ürünün davranışı değişmedi. 50 ms'lik pencereye bir insanın tıklaması yetişmez.
- Doğrulama (hattın koşulu): test tek başına art arda on kez geçti (10/10). Katalog dosyasıyla beş kez, bütün tarayıcı takımıyla bir kez geçti (257/257). Telefon adımındaki yana kayma ölçümü de her çalışmada geçti.

## Durum

bitti
