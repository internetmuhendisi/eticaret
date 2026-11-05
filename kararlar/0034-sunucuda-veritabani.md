# 0034 · Sunucuda ortam başına bir veritabanı kutusu, site başına ağ, değişiklikler görüntüdeki parçayla

## Tarih

2026-11-05

## Karar

- **Kutu:** Sunucuda her ortamın kendi PostgreSQL kutusu vardır (`veritabani-<ortam>`). Görüntüsü ve bağlantı kuralları yerel ortamla aynıdır. Görüntünün sürümü yalnız `sunucu/compose.yaml`'da yazar, kuralların tek dosyası `sunucu/veritabani/pg_hba.conf`'tur (0023).
  - Kutu `postgres` kullanıcısıyla (70) çalışır. Dosya sistemi salt okunurdur, bütün yetkiler kaldırılmıştır, yetki yükseltme kapalıdır. Yeniden başlama kuralı `kaliciKutu`'dur (0033).
  - Portu dışarıya ve sunucuya açılmaz.
  - Verisi `/srv/altyapi/veritabani/<ortam>/veri` klasöründedir. Tanım `komutlar/sunucu-veritabani.mts` dosyasındadır.
  - Şimdilik yalnız deneme ortamının veritabanı vardır. Canlı ortam alan adı bağlanınca eklenir (kullanıcı kararı). Ortamların listesi `veritabaniOrtamlari`'dır.
- **Ağ:** Her sitenin bir ortamda kendi ağı vardır: `site-<ortam>-<kod adı>`. Veritabanı kutusu her sitenin ağına `veritabani` adıyla bağlanır.
  - Bağlantılar elle yapılmaz, kutu tanımına sunucudaki site listesinden yazılır. Liste, ortamın gizli bilgi klasöründeki sitelerdir.
  - Ağları bu tanım kurar. Yayın komutu (0021) sitenin kutusunu bu ağa bağlar.
- **Yönetici şifresi:** Sunucuda üretilir ve `/srv/altyapi/gizli/<ortam>/altyapi--veritabani/yonetici_sifresi` dosyasında durur. Dosya `postgres` kullanıcısına aittir, izni 0400'dür.
  - Klasörün adında yan yana iki tire geçer, hiçbir kod adı böyle olamaz. Bu yüzden klasör hiçbir siteyle çakışmaz.
  - Yerleşim denetimi ve kayıt geçmişi araması bu dosyayı da kapsar (0031).
  - Yönetici olarak yalnız kutunun içinden, yerel soketle bağlanılır (`docker exec`). Şifre ağdan girişi kapatmak içindir.
- **Sitenin veritabanı ve kullanıcısı:** Bilgisayarda kullanılan SQL betiğiyle açılır (`komutlar/site-veritabani-ac.sql`). Şifre betiğin önüne eklenir:
  - Bilgisayarda ortam değişkeninden (`\getenv`) gelir.
  - Sunucuda kök kabuğu şifreyi sitenin gizli bilgi dosyasından okur, biçimini (64 hane) denetler ve psql'e girdiden gönderir.
  - Şifre hiçbir komut satırında görünmez, sunucudan çıkmaz.
  - Betik PostgreSQL'in hatalı komutu günlüğe yazmasını kapatır (`log_min_error_statement = panic`), böylece şifre taşıyan komut günlüğe girmez.
- **Değişiklikler:** Çekirdeğin görüntüsünde değişiklikleri uygulayan tek bir dosya ve değişiklik dosyaları durur (`/uygulama/veritabani/`). Dosya `cekirdek/veritabani/sunucuda-guncelle.ts`'ten esbuild ile, kullandığı paketler içine gömülerek üretilir.
  - Geçici bir kutuda çalışır: sitenin kutu kullanıcısıyla, sitenin ağında, salt okunur ve yetkisiz. Yalnız o sitenin gizli bilgi dosyası bağlanır.
  - Bilgisayardaki kurallar sunucuda da geçerlidir: notsuz, sırası bozuk ya da sonradan değişmiş değişiklik uygulanmaz (0011). Adres verilen siteye ait değilse hiçbir şey uygulanmaz.
- **Görüntünün aktarımı:** Görüntü bilgisayarda denetlenir. Sunucuda aynı kimlikte görüntü yoksa `docker save` ile ssh üzerinden doğrudan aktarılır. Ayrı bir görüntü deposu kullanılmaz.
- **Komutlar:**
  - `pnpm sunucu-veritabani <site klasörü> <ortam>` sırayla şunları yapar: gizli bilgiyi (yoksa) üretir, görüntüyü aktarır, veritabanı kutusunu kurar, sitenin veritabanını ve kullanıcısını açar, değişiklikleri uygular. Tekrar çalıştırılabilir.
  - `pnpm sunucu-gizli --yenile` veritabanı şifresini aynı adımda yeni değere eşitler.
  - `pnpm sunucu-veritabani-denemesi` iki siteyle ayrımı ve şifre yenilemeyi sunucuda ölçer.
  - `pnpm sunucu-denetle` veritabanı kutusunun gerçek ayarını tanımıyla karşılaştırır.

## Neden

- **Ortam başına ayrı kutu:** Gizli bilgi şablonu her ortamda aynı veritabanı adını ve `veritabani` adresini kullanır. Ayrı kutu, deneme ile canlının verisini ve kullanıcılarını birbirinden ayırır.
- **Site başına ağ:** Site veritabanına ulaşır, başka bir sitenin ağına bağlı değildir. Ortak tek ağda her site kutusu ötekine ulaşabilirdi. Sunucuda henüz site kutusu olmadığı için iki site kutusunun birbirine ulaşamadığı ölçülmedi, yayın komutunda (0021) ölçülür.
- **Ağların tanımda tutulması:** Kutu yeniden kurulunca bağlantılar kaybolmaz. Elle yapılan bağlantı, kutunun ilk yeniden kuruluşunda siteleri veritabanından koparırdı.
- **Görüntüdeki parça:** Değişiklik dosyaları ve onları uygulayan kod, çekirdeğin o sürümüyle birlikte gelir. Sitenin veritabanı, kutusunun çalışacağı sürümün değişiklikleriyle güncellenir. Ayrı bir araç kurulmaz, yerelde ölçülen yol sunucuda da çalışır.
- **Değişikliklerin sunucuda uygulanması:** Bilgisayardan tünelle bağlanmak sitenin şifresini bilgisayara getirirdi (0031 bunu yasaklar).
- **Tek dosyaya gömme:** Next.js derlerken kullandığı paketleri kendi içine gömüyor. Görüntüde değişiklik aracının paketleri ayrıca bulunmuyor (ölçüldü). Bütün paket klasörünü görüntüye koymak geliştirme paketlerini de taşırdı.
- **Doğrudan aktarım:** Görüntü deposu ek bir hesap, anahtar ve erişim kuralı ister. Tek sunucu için aktarım yeterlidir, görüntü sunucuya denetlenmiş olarak gider.
- **Kök olmayan, salt okunur kutu:** Veritabanı süreci ele geçirilse bile sunucuda yetki kazanamaz, görüntünün dosyalarını değiştiremez.

## Düşünülen diğer yollar

- **Bütün ortamlar ve siteler için tek kutu:** Seçilmedi. Deneme ile canlının kullanıcı adları çakışırdı, bir ortamdaki sorun ötekini etkilerdi.
- **Site başına ayrı PostgreSQL kutusu:** Seçilmedi. Her site için ayrı süreç ve bellek demek. 30 sitede sunucunun belleği yetmezdi. Ayrım izinler ve bağlantı kurallarıyla zaten iki katlı (0023).
- **Değişiklikleri bilgisayardan tünelle uygulamak:** Seçilmedi. Şifre bilgisayara gelirdi.
- **Değişiklik aracı için ayrı görüntü:** Seçilmedi. Çekirdek görüntüsüyle sürümü ayrışabilirdi, iki görüntünün denetimi ve aktarımı gerekirdi.
- **Görüntüyü sunucuda üretmek:** Seçilmedi. Sunucuya kaynak kod ve derleme araçları gerekirdi. Denetim bilgisayarda yapıldığı için sunucudaki üretim ayrıca denetlenmeliydi.
- **Görüntü deposu (GitHub, Docker Hub):** Seçilmedi. Şimdilik tek sunucu var. Sunucu sayısı artınca yeniden bakılır.
- **Şifreyi psql'e ortam değişkeniyle vermek (`docker exec -e`):** Seçilmedi. Değer `docker exec`'in komut satırında görünürdü.

## Sonuçları

- **Yeni sitede kısa kesinti:** Yeni bir sitenin veritabanı açılınca kutunun tanımı değişir (yeni ağ) ve kutu yeniden kurulur. O ortamdaki bütün siteler birkaç saniye veritabanına ulaşamaz. Denemede kutu iki kez yeniden kuruldu (deneme sitesi eklenince ve silinince), ardından yeni açılan bağlantılar kuruldu. Açık bir bağlantı havuzunun kendiliğinden yeniden bağlandığı ölçülmedi, çünkü sunucuda henüz site kutusu yok (0021). Canlı ortamda yeni site açmak bu yüzden sitelerin az ziyaret aldığı saate bırakılmalıdır.
- **Yayın öncesi yeni görüntü:** Görüntü artık değişiklik dosyalarını da taşır. Değişiklik eklenince görüntü yeniden üretilmelidir. Eski bir görüntüyle sunucuda değişiklik uygulanamaz.
- **Görüntünün boyutu ve kimliği:** Aktarılan görüntü yaklaşık 75 MB'tır (ölçüldü, `docker save`). Aynı kimlikteki görüntü yeniden gönderilmez. Kimlik bilgisayardaki görüntüden okunduğu için, bilgisayarda aynı sürüm yeniden üretilirse sunucudaki görüntü de değişir. Hangi kaydın yayınlandığını yayın komutu (0021) ayrıca tutmalıdır.
- **Şifre yenilemede kesinti:** Şifre yenilenince PostgreSQL'deki şifre hemen değişir. Çalışan site kutusu eski dosyayı görmeye devam eder, yeniden başlatılana kadar yeni bağlantı kuramaz. Bugün sunucuda site kutusu yok. Yayın komutu (0021) yenilemeyle kutuyu aynı adımda yeniden başlatmalıdır.
- **Şifre yenilemenin yarım kalması:** Gizli bilgi yenilenip şifre eşitleme yarıda kalırsa ya da veritabanı kutusu çalışmıyorsa komut hata verir. Komut yeniden çalıştırılınca şifre eşitlenir. Kutu hiç yoksa eşitlenecek bir şey yoktur.
- **Site ağları dışarıya kapalı değildir:** Site ağları (`internal` değil) veritabanı kutusunun internete çıkmasına da yol açar. Sitelerin dışarıya (ödeme, e-posta) çıkması gerekeceği için ağlar kapatılmadı, karar yayın komutunda (0021) yeniden verilir.
- **Denetim:** Sunucudaki bağlantı kuralı dosyasının projedekiyle aynı olduğunu ve kutunun yalnız sitelerin ağlarına bağlı olduğunu `pnpm sunucu-denetle` ölçer. Şifre denetimi değerin bütününe bakar, satır sonu kabul edilmez. psql'in hata çıktısı şifreyi taşıyan satırlardan arındırılarak gösterilir.
- **Yedek:** Veritabanının yedeği yoktur, kart 0024'tedir. Veri klasörü silinirse deneme verisi kaybolur.
- **Yeniden başlama:** Kutunun yeniden başlama kuralı ölçüldü. Sunucunun yeniden başlatılması bu kutuyla ayrıca denenmedi, kural 0033'te ön kapıyla denendi.
