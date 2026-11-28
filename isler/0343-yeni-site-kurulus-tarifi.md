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

## Sonuç

- **Döküm (2026-11-28, Örnek Mağaza).**
  - Bilgisayarda: `siteler/ornek-magaza/` (`kimlik.json`, `ayarlar.json`, `KURALLAR.md`, `baslangic/` on dosya ve 61 görsel (36 MB), `marka/logo.png`, `testler/` altı dosya), `sunucu/site-kullanicilari.json` (numara 1), `sunucu/yedek/ayar.json` (`siteler.deneme.ornek-magaza`), `~/.altyapi/yedek-anahtarlari/deneme/ornek-magaza.txt`.
  - Sunucuda: `/srv/altyapi/gizli/deneme/ornek-magaza/` (kök, 0700; `veritabani_adresi` ve `iki_asama_anahtari` 30001, 0400), `site_ornek_magaza` veritabanı ve kullanıcısı, `site-deneme-ornek-magaza` ağı (veritabanı ve ön kapı bağlı), `/srv/altyapi/yayin/deneme/ornek-magaza/` (yayın 15, 16, 17; `etkin` 17; `kayit.jsonl`), `/srv/altyapi/dosyalar/deneme/ornek-magaza/` (30001, 0700), ön kapı satırı `caddy/siteler/ornek-magaza.caddy`, gece yedeğinin site bilgisi `/srv/altyapi/yedek/siteler/deneme/ornek-magaza` (kök, 0400), hata izlemede `ornek-magaza` projesi, kutular `site-deneme-ornek-magaza-17` ve `-arka-plan` (219 MB ve 58 MB, sınır 1 GB). Sunucunun belleği 7,6 GB, kullanılan 1,3 GB; disk %8.
  - Komutun yapmadığı, elle yapılan adımlar: site numarasını yayın komutu yazıyor ve kayıt dışı değişiklik bırakıyor (`siteNumarasiAl`, sonraki yayın kilitte durur); `pnpm yedek-kur` de `sunucu/yedek/ayar.json`'u kayıt dışı bırakıyor; açma anahtarının şifre yöneticisine kopyası; `KURALLAR.md`, `marka/`, `testler/` ve `baslangic/` elle; sahip paneli yok; panel denemesi ikinci tam yetkili yönetici istiyor; hata izleme denemesi ortamın veritabanını kısa süre durduruyor (aynı ortamdaki bütün siteler etkilenir).
  - Sahipsiz bir Docker ağı bulundu (`tmpgqfqqg9czh_default`, 2026-11-05, bağlı kutusu yok): kart 0353.
- **Tarif.** Tek tanım `komutlar/kurulus-tarifi.mts`: girdi (kod adı, görünen ad, tür, çekirdek sürümü, altyapı sahibinin ayarları, başlanacak demo), on bir adım (her birinin komutu ya da elle nedeni, öncekileri, denetimi, geri alışı, geri alınamazlığı), site klasörünün parçaları ve kaynakları, on iki sunucu kaydı (`sunucuKayitlari`) ve betikle ölçülmeyen dört kayıt (`digerKayitlar`), kuru çalıştırma (`kuruCalistir`). Metni `planlar/komutlar.md` "Yeni site kurmak".
- **Kuru çalıştırma.** Örnek Mağaza ve Tema Galerisi'nin `kimlik.json` ve `ayarlar.json`'u girdiden aynen üretilir; Örnek Mağaza'nın numarası ve sunucu kayıtları ölçülen düzenle aynıdır, Tema Galerisi sıradaki numarayı (2) alır (`komutlar/testler/kurulus-tarifi.test.ts`). `KURALLAR.md`, `marka/`, `testler/` ve `baslangic/`'in içeriği siteye özeldir ya da demodan gelir, tariften üretilmez; tarif yalnız var olduklarını bekler.
- **Sunucu denetimi tarifi okur.** Yayındaki her sitenin tarifteki sunucu kayıtları sahibi ve izniyle ölçülür (`kayitOlcumBetigi`, `kayitHatalari`); Örnek Mağaza'da 12 kayıt yeşil, `pnpm sunucu-denetle --hizli` yeşil. Dosya klasörü yayındaki sürüm 0.15.0'dan eskiyse istenmez.
- **Kod adı.** `kodAdiKullanimHatalari` `siteler/` ile numaralar dosyasına birlikte bakar, bozuk örnekleriyle. Numara hesabı tek yerde (`yeniSiteNumarasi`, `siteNumarasiAl` de onu kullanır), ön kapı satırının yolu tek yerde (`onKapiSatirDosyasi`).
- **Denemeler.** 15 denetim bilerek bozularak denendi, her biri kırmızıya düştü (dosya klasörünün izni, gerçek mağazanın teslim adımları, numara dosyası, sıra, rol kaydı, ölçümün gelmeyen satırı, dosya türü, betiğe girmeyen ad, varsayılan kuralı, ölçülemedi, boş dosya, dosya klasörü koşulu, öteki kayıtların ve yedek kaydının kuranı, psql hatası). `siteDosyalari`'nın ayar denetimi ikinci katman çıktı, kaldırıldı. Komut testleri 602/602, tür kontrolü temiz.
- **Bağımsız kontrolün bulgularıyla düzeltilen:** eski sürümlü sitede yeni ölçümün yanlış kırmızısı (bütün yayınları durdururdu), tarifte eksik `etkin`, yedek ve hata izleme kayıtları, denetim adımının paylaşılan sunucudaki uyarıları, yedek adımının geri alınamazlığı, kopyalanmış yollar ve numara hesabı, veritabanı yanıt vermezken "yok" yerine "ölçülemedi", boş dosya, ayarlarda varsayılanla aynı değer, zayıf testler (Tema Galerisi'nin numarası, betik satırları, numara sırası), plan tablosunun kodla farkları ve eski "bitti sayılır" maddeleri.
- **Bu karta kalmayanlar.**
  - Asıl adres girdisi kart 0344'te gelir: biçimi orada kararlaştırılır. Bugün deneme adresi kod adından türer (karar 0032).
  - Demo girdisinin doğrulanması kart 0345'tedir.
  - Kod adı denetimini ve numarayı kayıttan önce yazmayı komut kart 0350'de çağırır. Yayın komutunun numarayı yazması ve `yedek-kur`'un kayıt dışı değişikliği de orada ele alınır.
  - Plan tablosunun tanımla aynı kalması yalnız disiplindir.

## Durum

bitti
