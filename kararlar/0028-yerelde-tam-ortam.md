# 0028 · Yerelde tam ortam: Caddy, veritabanı ve site başına kutu

## Tarih

2026-11-04

## Karar

- **Komutlar:** `pnpm yerel-ortam-ac [siteler/<kod-adi> ...]` ortamı açar, `pnpm yerel-ortam-kapat` kapatır, `pnpm yerel-ortam-testi` iki siteyle dener. Ortak kod `komutlar/yerel-ortam.mts` dosyasındadır.
- **Yapı:** Veritabanı (`sunucu/compose.yaml`), Caddy (`sunucu/yerel-ortam.yaml`, `sunucu/caddy/Caddyfile`) ve site kutuları tek Docker projesidir (`altyapi-yerel`). Site kutularının tanımı ve Caddy'nin site satırları site listesinden üretilir ve kayda girmeyen `sunucu/olusan/` klasörüne yazılır. Kutu tanımı JSON'dur, Docker Compose onu da okur.
- **Görüntü:** Her site kendi kimlik dosyasındaki çekirdek sürümünün görüntüsüyle açılır (`altyapi-cekirdek:<sürüm>`, karar 0011, 0027). Görüntü yoksa ve sürüm şu anki çekirdeğin sürümüyse üretilir, değilse komut durur. `--goruntuyu-yenile` görüntüyü şu anki kodla yeniden üretir.
- **Adresler:** Site `http://<kod-adi>.localhost:<YEREL_ORTAM_PORTU>` adresinde açılır. Tarayıcılar ve bu bilgisayar `.localhost` adlarını kendi döngü adresine çözer, bu yüzden bilgisayarın ad ayarına dokunulmaz. Caddy `127.0.0.1` ve `::1` üzerinde, yalnız bu bilgisayara açılır. Tanınmayan adres 404 döner. Site kutularının portu dışarıya açılmaz, kutuya yalnız Caddy ulaşır (karar 0024).
- **Gizli bilgiler:** Yalnız `.env` dosyasından okunur. `VERITABANI_ADRESI` hangi sitenin kullanıcısını taşıyorsa o site onu kullanır, bugün Örnek Mağaza. Öteki siteler `VERITABANI_ADRESI_<KOD_ADI>` satırını kullanır. Satır yoksa komut şifreyi kendisi üretir ve `.env`'ye ekler. Üretilen dosyalara şifre yazılmaz, yalnız değişkenin adı yazılır. Değer kutuya ortam değişkeniyle gider ve ekrana basılmaz.
- **Açılış sırası:** Önce veritabanı açılır. Sonra her sitenin veritabanı ve kullanıcısı açılır, numaralı değişiklikler uygulanır; ikisi de var olan komutların yoludur. Ardından kutular açılır. Kutular sağlık ucundan yoklanır. Caddy, siteler ayağa kalkınca açılır. Komut her sitenin sağlık ucunu Caddy üzerinden açmadan bitmez.
- **Deneme sitesi:** Kalıcı ikinci bir site `siteler/` altına konmaz, orası gerçek ve demo mağazaların yeridir. Deneme `sunucu/olusan/deneme-siteleri/deneme-<ek>` klasöründe, varsayılan ayarlarla açılan geçici bir sitedir. Kapatma komutu deneme sitesini veritabanı, kullanıcısı ve `.env` satırıyla birlikte siler.

## Neden

- Sunucuda da her site kendi kutusunda, önde Caddy ile çalışacak (karar 0013). Yerelde aynı düzen kurulunca yönlendirme, ayrı veritabanı ve ayrı kutu sunucuya gitmeden denenir.
- Site listesinden üretmek, yeni siteyi eklemeyi elle dosya düzenlemekten çıkarır. Aynı kural ileride sunucuda da kullanılabilir.
- Görüntüyü kimlikteki sürümden seçmek, sitenin "hangi sürümde olmalı" sorusunun tek cevabını kullanır (karar 0011).
- `.localhost` adları ek ayar gerektirmez, her bilgisayarda aynı çalışır.
- Kutunun portu açık olsaydı istemci adres başlığını kendisi yazıp istek sınırını atlatabilirdi (karar 0024).

## Düşünülen diğer yollar

- Site kutularını elle yazılmış tek bir compose dosyasında tutmak: Seçilmedi. Her yeni site için dosya elle değişirdi, ikinci deneme sitesi kayda girerdi.
- Kalıcı ikinci demo site: Seçilmedi. Demo site Örnek Mağaza'dır (karar 0007). Kalıcı bir deneme sitesi çekirdekte site adı geçmez testine ve site doğrulamasına da girerdi.
- `/etc/hosts` dosyasına adlar yazmak: Seçilmedi. Bilgisayarın ayarına dokunur, her bilgisayarda ayrıca yapılması gerekir.
- Her sitenin şifresini `.env`'ye elle yazmak: Seçilmedi. Yerelde şifrenin değeri önemli değildir, unutulan satır ortamı açılmaz bırakırdı.
- Caddy'nin güvendiği vekilleri (`trusted_proxies`) ayarlamak: Gerek görülmedi. Ayar varken de yokken de, her istekte başka bir sahte başlık yazan istemcinin sınırı doldurduğu ölçüldü. Bunun beklenen sebebi şu: Caddy gerçek istemci adresini başlığın sonuna yazar, uygulama da son değeri alır. Caddy'nin başlığı tam olarak nasıl yazdığı ayrıca gözlenmedi. Deneme, Caddy istemcinin başlığını olduğu gibi iletecek biçimde bozulunca kırmızıya düşüyor.

## Sonuçları

- Docker, ortamı açan klasörün dosyalarını kutulara bağlar. Ortam bir çalışma kopyasından açılırsa veritabanı kutusu o kopyanın dosyasına bağlanır. Çalışma kopyası kaldırılmadan önce ortam kapatılmalı ya da ana klasörden yeniden açılmalıdır.
- Kapatma komutu veritabanını da kapatır. Testler için veritabanı yeniden `pnpm veritabani-baslat` ile açılır.
- Kutu içindeki ortam değişkeni `docker inspect` ile görülebilir. Sunucuda gizli bilginin nasıl saklanacağı kart 0019'un işidir.
- Yerelde şifreli bağlantı yoktur, sertifika kart 0020'de gelir.
- Deneme, görüntü üretimi ve kutu açılışı sürdüğü için `pnpm testler` içinde değildir. Yayın hattına kart 0017'de bağlanır.
