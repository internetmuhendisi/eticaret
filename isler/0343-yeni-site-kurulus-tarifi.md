# 0343 · Bir sitenin kuruluş tarifi

## Amaç

Örnek Mağaza yıllar içinde parça parça, elle kuruldu (kart 0023 ve sonrası; `planlar/komutlar.md`, "Elle yaparken"). Yeni bir mağaza sıfırdan değil tek komutla açılacak (kart 0350). Bunun için önce bir sitenin bugün neyden oluştuğu tek bir tarifte toplanmalı: hangi klasörler ve dosyalar, hangi ayarlar, veritabanı ve kullanıcısı, gizli bilgiler, adres ve alan adı kaydı, ön kapı satırı, hata izleme projesi, yedek, kutular. Tarif bir kez doğru yazılınca her yeni site aynı yoldan açılır.

Bölüm: Yeni mağaza. Bölümün ilk işi.

## Olmazsa olmazlar

- Örnek Mağaza'nın bugünkü kuruluşu dosya dosya, sunucuda kayıt kayıt çıkarılır: site klasörü (`kimlik.json`, `ayarlar.json`, `baslangic/`, `marka/`, `testler/`, `KURALLAR.md`), `sunucu/site-kullanicilari.json`, gizli bilgi dosyaları, veritabanı ve kullanıcısı, ön kapı satırı, hata izleme projesi, gece yedeği ve anahtarı, dosya klasörü, yayın kaydı. Elle yapılmış ve hiçbir komutun yapmadığı her adım ayrıca listelenir.
- Tarif `planlar/komutlar.md`'nin "Yeni site kurmak" bölümünü bugünkü duruma getirir: "henüz yapılamayanlar" listesi kapanır ya da kalanlar nedeniyle yazılır; her adımın hangi komutla yapıldığı, hangi sırayla ve neyin önkoşulu olduğu yazar.
- Tarif kodda tek bir tanımdır (adımların listesi ve her adımın yaptığı, denetlediği, geri alışı); kart 0350'nin komutu ve sunucu denetimi aynı tanımı okur, adımları yeniden yazmaz (çalışma düzeni: tek yerde tanımla).
- Siteden siteye değişen her değer (kod adı, görünen ad, adres, sipariş öneki, tema listesi, eklentiler, başlanacak demo) tarifin girdisidir; tarif girdisiz hiçbir değer üretmez, girdiler ayar şemasından ve kimlik şemasından doğrulanır.
- Tarif Örnek Mağaza'nın girdileriyle "kuru çalıştırılınca" (hiçbir şey yazmadan) Örnek Mağaza'nın bugünkü site klasörünü ve sunucu kayıtlarını üretir; fark varsa ya tarif ya Örnek Mağaza düzeltilir ve nedeni yazılır. Bu karşılaştırma bir testtir.
- Kod adının başka sitece kullanılmadığı tek bir denetimde ölçülür (bugün `siteler/` ile `site-kullanicilari.json` ayrı ayrı, `planlar/komutlar.md` kart 0023 notu).
- Adres biçimi kart 0344'tedir; tarif adresi girdisinden alır.

## Sınırlar

- Komutun kendisi (soru sorma, onay, yayın) kart 0350'dedir.
- Demo paketinin biçimi kart 0345'tedir; tarif yalnız "başlanacak demo" girdisini taşır.
- Güncelleme ve teslim tarifleri değişmez.
- Sahip paneli yazılmaz (tarifin "sahip panelinde göründü" adımı yok olarak kalır).

## Bitti sayılır

- Örnek Mağaza'nın kuruluşunun dökümü kartın sonucunda.
- `planlar/komutlar.md` "Yeni site kurmak" güncel; elle kalan adımlar nedeniyle yazılı.
- Tarifin tek tanımı var; Örnek Mağaza'nın girdileriyle kuru çalıştırma bugünkü klasörü ve kayıtları üretiyor (test).
- Kod adı denetimi iki yere birlikte bakıyor, bozuk örneğiyle.

## Durum

yapılacak
