# 0021 · Yayın komutu ve geri dönüş

## Amaç

Bir site tek komutla yayınlanır, sorun çıkarsa tek komutla önceki sürüme döner (`.claude/rules/calisma-duzeni.md`, `planlar/cekirdek-ve-siteler.md` 3. bölüm).

Önce 0017 ve 0020 bitmiş olmalı.

## Olmazsa olmazlar

- `komutlar/` altında yayın komutu. Bir seferde bir site.
- Sürümü yalnız sitenin kimlik dosyasından okur, başka yerde sürüm yazılmaz.
- Kontrol hattının son sonucu yeşil değilse çalışmaz (`pnpm hat-sonucu`, karar 0029). Yayınlanacak kaydın hat dosyası ana daldakiyle aynı değilse de çalışmaz; hattı zayıflatan bir kaydın kendi hattı yeşil biter (karar 0029, Sonuçları).
- Sırayla: veritabanı değişikliklerini uygular, yeni kutuyu açar, sağlık ucunu yoklar, sağlıklıysa trafiği yeniye verir.
- Sağlık kontrolü geçmezse eski kutu çalışmaya devam eder, komut durur ve sebebi söyler.
- Geri dönüş: önceki sürüme tek komutla dönülür. Veritabanı değişikliği yedekten dönmeyi gerektiriyorsa komut bunu söyler ve durur.
- Her çalıştırma yayın kaydına yazılır: site, sürüm, zaman, sonuç.
- Ön kapı (karar 0032): sitenin Caddy satırı `denemeSatiri` ile üretilir ve `kurmaBetigi`'nin listesine girer (`komutlar/on-kapi.mts`). Liste o betikte tek yerdedir; listede olmayan satırı sonraki `pnpm sunucu-kur` siler. Site kutusu kendi ağındadır, ortak `altyapi` ağına bağlanmaz; ön kapı sitenin ağına bağlanır. Bir site kutusunun başka bir sitenin kutusuna ulaşamadığı ölçülür.
- Site kutusu gizli bilgileri `kutuGizliTanimi` ile alır (karar 0031). Gizli bilgi yenilenince (`pnpm sunucu-gizli --yenile`) veritabanı kullanıcısının şifresi de aynı adımda değişir ve kutu yeniden başlatılır; yarım kalırsa site eski şifreyle açık kalır.

## Sınırlar

- Yeni site kurma ve site güncelleme komutları yazılmaz, onlar önce elle yapılır (`planlar/komutlar.md`).

## Bitti sayılır

- Deneme sitesi komutla yayınlanıyor ve sağlık ucu yeni sürümü söylüyor.
- Bilerek bozulmuş bir sürüm yayınlanınca site eski sürümde açık kalıyor.
- Geri dönüş komutu siteyi önceki sürüme döndürüyor.
- Yayın kaydında üç çalıştırma da görünüyor.

## Durum

yapılacak
