# eticaret

## Proje nedir

**eticaret** (geçici ad), tek yerden yönetilen, birbirinden bağımsız e-ticaret sitelerinin altyapısıdır.

- Bütün sitelerin ortak kullandığı motora **çekirdek** denir: ürün, sepet, ödeme, sipariş, panel.
- O motoru kullanan her mağaza bir **site**dir. Her sitenin kendi markası, tasarımı, ayarları ve ayrı veritabanı vardır.
- Siteleri altyapı sahibi barındırır ve günceller. Mağaza sahibi yalnız kendi sitesinin yönetim paneline girer.
- Mağazalar şimdilik yalnız Türkiye'de kurulur.

Projenin kuralları `CLAUDE.md` dosyasındadır.

## Klasörler

| Klasör ya da dosya | Ne işe yarar |
|---|---|
| `CLAUDE.md` | Projenin ana kural dosyası. |
| `temel-paket.md` | Her siteye olduğu gibi kurulan temel özelliklerin listesi. |
| `.claude/rules/` | Konu konu ayrıntılı kurallar. |
| `.claude/commands/` | Projenin kendi komutları. |
| `.claude/settings.json` | İzinler ve yasaklar. |
| `kararlar/` | Numaralı karar kayıtları ve gerekçeleri. |
| `tarihce/` | Yapılan işlerin aylık kısa kaydı. |
| `planlar/` | Büyük işlerden önce yazılan planlar ve site ayarları taslağı. |
| `isler/` | Yapılacak işlerin numaralı kartları. |
| `eklentiler/` | Temel paket dışındaki özelliklerin tarifleri. |

## Çalışma düzeni

Her iş şu altı adımla yürür:

1. **Kart:** Proje sahibi yapılacak işi `isler/` klasöründe numaralı bir karta yazar ya da Claude'a yazdırır.
2. **Plan:** Claude kartı ve ilgili karar kayıtlarını okur, ne yapacağını kısaca anlatır.
3. **Onay:** Proje sahibi planı onaylar ya da değiştirir. Onay gelmeden iş başlamaz.
4. **İş:** Claude işi kartın kendi çalışma kopyasında yapar. Kartta olmayan işe dokunmaz.
5. **Kontrol:** Claude kartın "bitti sayılır" listesini madde madde kontrol eder, eksikleri proje sahibine söyler.
6. **Kayıt:** Claude kartı "bitti" yapar, tarihçeye giriş yazar ve değişikliği kaydeder. Proje sahibi "push" deyince GitHub'a gönderir.

## Komutlar

Projenin kendi komutları `.claude/commands/` klasöründedir.

| Komut | Ne işe yarar |
|---|---|
| `/start` | Oturumun başında kendiliğinden çalışır, elle de çağrılabilir. Projenin durumunu özetler: tarihçedeki son üç giriş, açık kartlar ve açık çalışma kopyaları. Hiçbir dosyayı değiştirmez. |
| `/finish` | Oturumun sonunda çalışır, yalnız proje sahibi çağırır. Kartsız işleri tarihçeye yazar, kaydedilmemiş değişiklikleri gösterir ve onayla kaydedip GitHub'a gönderir, ana dala alınmış çalışma kopyalarını kaldırır, yarım kartları ve bir sonraki adımı söyler. |
| `/is-bitti <kart numarası>` | Kartın bitti sayılır listesini kontrol eder. Eksik yoksa kartı bitti yapar, tarihçeye yazar, kaydedip GitHub'a gönderir. Yalnız proje sahibi çağırır. |

Çekirdek uygulamasını yerelde açmak için `pnpm cekirdek` yazılır. Vitrin http://localhost:3000 adresinde, yönetim paneli http://localhost:3000/yonetim adresinde açılır. Uygulama Örnek Mağaza'yla açılır; başka bir site için `SITE_KLASORU=$PWD/siteler/<kod-adi> pnpm cekirdek` yazılır (karar 0021). Uygulamanın ve veritabanının ayakta olduğunu http://localhost:3000/kapi/herkese-acik/saglik adresi söyler (uç belgesi: `cekirdek/kapi/uclar.md`).

Veritabanı testleri yerel PostgreSQL kutusuyla çalışır (karar 0022). Bilgisayarda Docker gerekir. İlk kez kurarken `.env.example` dosyası `.env` adıyla kopyalanıp şifreler doldurulur, sonra sırayla şunlar yazılır: `pnpm veritabani-baslat`, `pnpm site-veritabani-ac siteler/ornek-magaza`, `pnpm veritabani-guncelle siteler/ornek-magaza`. Sonraki açılışlarda yalnız `pnpm veritabani-baslat` yeterlidir. `pnpm testler` veritabanı kutusu kapalıyken kırmızı biter.

Site klasörlerini ayar şemasından geçirmek için `pnpm site-dogrula` yazılır. Tek site için klasör verilir: `pnpm site-dogrula siteler/ornek-magaza`.

Sunucudaki düzenin aynısını yerelde açmak için `pnpm yerel-ortam-ac` yazılır (karar 0028). Önde Caddy, arkada veritabanı ve her sitenin kendi kutusu açılır. Örnek Mağaza http://ornek-magaza.localhost:58080 adresinde açılır; port `.env` dosyasındaki `YEREL_ORTAM_PORTU` değeridir. Tek site için klasör verilir: `pnpm yerel-ortam-ac siteler/ornek-magaza`. Kapatmak için `pnpm yerel-ortam-kapat` yazılır, sitelerin verisi silinmez. `pnpm yerel-ortam-testi` Örnek Mağaza'nın yanına geçici bir deneme sitesi açar, iki sitenin yalnız kendi adını ve kendi veritabanını gördüğünü, her kutunun Docker yeniden başlayınca kendiliğinden açılacağını ölçer, sonra ortamı kapatıp deneme sitesini siler; `--acik-birak` eklenirse ortam açık kalır.

GitHub'a her gönderimde kontrol hattı kendiliğinden çalışır (`.github/workflows/kontrol-hatti.yml`, karar 0029). Sırasıyla tür kontrolünü, denetimi, site doğrulamasını, güvenlik taramasını, testleri, Docker görüntüsünü ve yerel ortam denemesini çalıştırır. Hatta gerçek şifre yoktur, `.env` her çalışmada `pnpm hat-ortami-hazirla` ile rastgele şifrelerle üretilir. Bir kaydın hattı yeşil geçip geçmediğini `pnpm hat-sonucu` söyler. Kayıt verilmezse o anki kayda bakar. Dış paketlerin güvenlik taraması tek başına `pnpm guvenlik-taramasi` ile çalışır.

Sunucu Hetzner'de `pnpm sunucu-kur` ile açılır (karar 0030). Komut önce yalnız sunucunun boyutunu, yerini ve güncel aylık fiyatını söyler, hiçbir şey açmaz. Fiyat onaylanınca `pnpm sunucu-kur --onayli` yazılır. Hetzner anahtarı `.env` dosyasında `HETZNER_ANAHTARI` adıyla durur. Sunucu ilk açılışında `sunucu/kurulum/ilk-acilis.yaml` dosyasıyla kendini kurar. Gizli olmayan bilgileri `sunucu/sunucular.json` dosyasına yazılır. Sunucuya `ssh -i ~/.ssh/altyapi_sunucu yonetici@<adres>` ile girilir. `pnpm sunucu-denetle` şifreyle ve kökle girişin kapalı olduğunu, Hetzner duvarında ve dışarıdan bakınca yalnız 22, 80 ve 443'ün açık olduğunu, Docker'ın ve güncellemelerin çalıştığını dışarıdan ölçer. Sunucu, gereken bir güncelleme varsa gece 04:00'te kendiliğinden yeniden başlar. Sürekli çalışan her kutu (bugün sunucuda ön kapı, yerelde veritabanı, Caddy ve siteler) elle durdurulmadıysa yeniden başlayınca kendiliğinden açılır; kural `komutlar/kutu-kurali.mts` dosyasındadır (karar 0033). `--hizli` eklenirse bütün kapılar yerine bilinen kapılara bakar.

Sitelerin gizli bilgileri (veritabanı şifresi gibi) `pnpm sunucu-gizli siteler/<kod-adi> <deneme|canli>` ile sunucunun kendisinde üretilir (karar 0031). Değer bilgisayara gelmez, kayda girmez. Var olan değere dokunulmaz; `--yenile` eklenirse yenilenir, kutu yeni değeri yeniden başlayınca görür. Her sitenin kutusu yalnız kendi gizli bilgi dosyasını görür ve kendi kullanıcı numarasıyla çalışır (`sunucu/site-kullanicilari.json`). Uygulama gizli bilgiyi `gizliBilgi()` ile okur: bilgisayarda `.env`'den, sunucuda dosyadan. `pnpm sunucu-denetle` gizli bilgilerin izinlerini ve kayıt geçmişinde geçmediğini de denetler. `pnpm sunucu-gizli-denemesi` iki sitenin ayrımını sunucuda gerçek kutularla ölçer.

Sitenin sunucudaki veritabanı `pnpm sunucu-veritabani siteler/<kod-adi> deneme` ile açılır (karar 0034). Komut gizli bilgiyi (yoksa) üretir, çekirdeğin görüntüsünü denetleyip sunucuya aktarır, ortamın veritabanı kutusunu kurar, sitenin veritabanını ve kullanıcısını açar, bekleyen değişiklikleri uygular; tekrar çalıştırılabilir. Şimdilik yalnız deneme ortamının veritabanı vardır. `--yenile` ile yenilenen gizli bilgi veritabanı şifresini de değiştirir. `pnpm sunucu-veritabani-denemesi` iki sitenin birbirinin veritabanına giremediğini ve şifre yenilemeyi sunucuda ölçer.

Bir site `pnpm yayinla siteler/<kod-adi> deneme` ile deneme adresine yayınlanır (karar 0035). Komut yalnız kontrol hattı yeşil geçmiş, kaydedilmemiş değişikliği olmayan ve hat dosyası ana daldakiyle aynı olan bir kayıtla çalışır. Site klasörü ve çekirdeğin görüntüsü bu kayıttan gelir, sürüm kimlik dosyasından okunur. Yeni kutu eski kutunun yanında açılır; sağlık ucu içeriden ve dışarıdan geçerse trafik ona verilir, geçmezse eski kutu hiç kesilmeden çalışır. `pnpm geri-don siteler/<kod-adi> deneme` bir önceki başarılı yayına döner; arada "yedekten" notlu bir veritabanı değişikliği varsa dönmez. `pnpm yayin-kaydi siteler/<kod-adi> deneme` her çalıştırmayı gösterir. `pnpm yayin-denemesi` bunların hepsini iki geçici siteyle sunucuda ölçer.

Her site önce deneme adresinde açılır: `<kod-adi>.deneme.eticaretmagazasi.com` (karar 0032). Alan adındaki `*.deneme` kayıtlarını `pnpm alan-adi` kurar. Komut önce ne değişeceğini söyler, onaydan sonra `pnpm alan-adi --onayli` yazılır. Cloudflare anahtarı `.env` dosyasında `CLOUDFLARE_ANAHTARI` adıyla durur. Sunucuda önde Caddy çalışır (`sunucu/on-kapi/`). Caddy sertifikaları kendisi alır ve yeniler, `http://` isteğini `https://` adresine yönlendirir, deneme adreslerini arama motorlarına kapatır. `pnpm sunucu-kur --onayli` ön kapıyı da kurar. `pnpm sunucu-denetle` ön kapıyı `kapi--yoklama.deneme.eticaretmagazasi.com` adresindeki yoklama kutusundan dışarıdan ölçer.

Sitelerin hataları kendi sunucumuzdaki Bugsink'te izlenir (karar 0036). Kurmak ya da güncellemek için `pnpm sunucu-hata-izleme` yazılır; `pnpm sunucu-kur --onayli` da kurar. Yayın komutu her sitenin projesini açar ve sitenin kutusuna gönderim adresini verir. Hatalar site adı, çekirdek sürümü ve ortamla etiketlenir, maskelenmiş gider. Yönetim ekranı dışarıya kapalıdır: `pnpm hata-izleme-ac` bir SSH tüneli açar, ekran http://localhost:9000 adresinde görünür. İlk girişten önce şifre `pnpm hata-izleme-ac --sifre` ile bir kez belirlenir. `pnpm hata-izleme-denemesi siteler/<kod-adi>` yayındaki sitede sunucuda ve tarayıcıda bilerek hata çıkarır, araçtaki kaydı ölçer.

Site düşünce ya da elle bakıma alınınca ziyaretçi bakım sayfası görür (karar 0038). `pnpm bakim <site klasörü> <ortam> ac|kapat|durum` elle açar ve kapatır, vitrin ve panel birlikte kapanır. `pnpm bakim-denemesi` bütünü deneme adresinde ölçer.

Sitelerin veritabanı ve dosyaları her gece 03:00'te ayrı ayrı yedeklenir (karar 0037 ve 0207, `sunucu/yedek/README.md`). `pnpm yedek-kur` kurar, `pnpm yedek-al` elle yedek alır, `pnpm yedek-kaydi` sonuçları gösterir, `pnpm yedek-prova` geçici bir veritabanında dener, `pnpm yedek-geri-yukle` tek siteyi geri yükler, `pnpm site-sifirla` demo siteyi boş veritabanıyla yeniden açar, `pnpm yedek-denemesi` bütünü sunucuda ölçer.

Çekirdeğin çalışan sürümü `cekirdek/surum.ts` dosyasında, her sürümün notu `cekirdek/surum-notlari/<sürüm>.md` dosyasında yazar. Not, sürümde neyin değiştiğini, sitelere etkisini, güvenlik açığı kapatıp kapatmadığını ve veritabanı değişikliklerini söyler. Sürüm değişince not aynı değişiklikte yazılır; notu olmayan sürümü test yakalar. Örnek Mağaza `0.1.0` ile https://ornek-magaza.deneme.eticaretmagazasi.com adresinde çalışır. `pnpm sunucu-denetle` yayındaki her sitenin adresini, arama motorlarına kapalı olduğunu ve sağlık ucundaki sürümü de ölçer.

Çekirdeğin Docker görüntüsünü üretmek için `pnpm cekirdek-goruntusu` yazılır. Görüntü `altyapi-cekirdek:<sürüm>` adını alır ve hemen denetlenir: içinde `.env`, site klasörü ya da gizli bilgi olmamalı, kök kullanıcıyla çalışmamalıdır (karar 0027). Denetim ayrıca `pnpm cekirdek-goruntusu-denetle` ile çalıştırılır, `--kendi-testi` eklenirse bilerek bozulmuş bir görüntüyü yakaladığını gösterir. Çalıştırma örneği `sunucu/cekirdek/Dockerfile` dosyasının başındadır.
