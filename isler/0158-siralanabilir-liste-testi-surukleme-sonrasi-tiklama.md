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

## Durum

yapılacak
