# 0021 · Yayın komutu ve geri dönüş

## Amaç

Bir site tek komutla yayınlanır, sorun çıkarsa tek komutla önceki sürüme döner (`.claude/rules/calisma-duzeni.md`, `planlar/cekirdek-ve-siteler.md` 3. bölüm).

Önce 0017, 0020 ve 0039 bitmiş olmalı. Sunucudaki veritabanı ve değişikliklerin sunucuda uygulanması 0039'dadır.

Yalnız deneme ortamına yayın yapılır (kullanıcı kararı); canlıya yayın alan adı bağlanınca eklenir.

## Olmazsa olmazlar

- `komutlar/` altında yayın komutu. Bir seferde bir site.
- Sürümü yalnız sitenin kimlik dosyasından okur, başka yerde sürüm yazılmaz.
- Kontrol hattının son sonucu yeşil değilse çalışmaz (`pnpm hat-sonucu`, karar 0029). Yayınlanacak kaydın hat dosyası ana daldakiyle aynı değilse de çalışmaz; hattı zayıflatan bir kaydın kendi hattı yeşil biter (karar 0029, Sonuçları).
- Sırayla: veritabanı değişikliklerini uygular, yeni kutuyu açar, sağlık ucunu yoklar, sağlıklıysa trafiği yeniye verir.
- Sağlık kontrolü geçmezse eski kutu çalışmaya devam eder, komut durur ve sebebi söyler.
- Geri dönüş: önceki sürüme tek komutla dönülür. Veritabanı değişikliği yedekten dönmeyi gerektiriyorsa komut bunu söyler ve durur.
- Her çalıştırma yayın kaydına yazılır: site, sürüm, zaman, sonuç.
- Ön kapı (karar 0032): sitenin Caddy satırı `denemeSatiri` ile üretilir ve `kurmaBetigi`'nin listesine girer (`komutlar/on-kapi.mts`). Liste o betikte tek yerdedir; listede olmayan satırı sonraki `pnpm sunucu-kur` siler. Site kutusu kendi ağındadır, ortak `altyapi` ağına bağlanmaz; ön kapı sitenin ağına bağlanır. Bu bağlantı da aynı site listesinden ön kapının kutu tanımına (`onKapiTanimi`) girer; elle (`docker network connect`) yapılırsa kutu yeniden kurulunca kaybolur ve siteler 502 döner. Ziyaretçinin gerçek adresi ortak ağın IPv6'sına bağlıdır, site ağı eklenince `pnpm sunucu-denetle` bunu yeniden ölçer. Bir site kutusunun başka bir sitenin kutusuna ulaşamadığı ölçülür.
- Site kutusu gizli bilgileri `kutuGizliTanimi` ile alır (karar 0031). Gizli bilgi yenilenince (`pnpm sunucu-gizli --yenile`) veritabanı şifresi 0039'a göre aynı adımda değişir; yayındaki kutu da yeniden başlatılır, yarım kalırsa site eski şifreyle açık kalır.
- Sunucudaki site kutuları (veritabanı kutusu 0039'da) yeniden başlama kuralını `kaliciKutu` ile alır (`komutlar/kutu-kurali.mts`, karar 0033). Kutu tanımını yazan dosya `komutlar/testler/kutu-kurali.test.ts`'teki kalıcı dosyalar listesine girer ve orada denetlenir; yeni bir dosya listeye girmezse o test kırmızıdır. Docker yeniden başlayınca kutular sırasız açılır; yeni kutunun sağlık ucu veritabanından önce açılsa da kendiliğinden düzelmelidir.

## Sınırlar

- Yeni site kurma ve site güncelleme komutları yazılmaz, onlar önce elle yapılır (`planlar/komutlar.md`).

## Bitti sayılır

- Deneme sitesi komutla yayınlanıyor ve sağlık ucu yeni sürümü söylüyor.
- Bilerek bozulmuş bir sürüm yayınlanınca site eski sürümde açık kalıyor.
- Geri dönüş komutu siteyi önceki sürüme döndürüyor.
- Yayın kaydında üç çalıştırma da görünüyor.

## Durum

yapılacak
