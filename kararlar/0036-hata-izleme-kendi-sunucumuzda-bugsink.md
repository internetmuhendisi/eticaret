# 0036 · Hata izleme aracı kendi sunucumuzda Bugsink

## Tarih

2026-11-05

## Karar

- **Araç:** Hata izleme aracı Bugsink'tir. Kendi sunucumuzda (Hetzner Falkenstein, Almanya) çalışır. Hesap ve ücret yoktur. Hata kayıtları sunucumuzdan çıkmaz (0009). Seçimi kullanıcı yaptı. Bugsink, Sentry'nin gönderim biçimini kabul eder; ileride başka bir araca geçmek gönderim adresinin değişmesidir.
- **Kutu:** Her ortamın kendi kutusu vardır. Şimdilik yalnız denemede açıktır: `hata-izleme-deneme`. Görüntü sürümü ve özetiyle sabittir (`bugsink/bugsink:2.6.2@sha256:…`).
  - Kutu görüntünün kendi kök olmayan kullanıcısıyla (`bugsink`, 14237) çalışır. Dosya sistemi salt okunurdur, yetkisi yoktur, yeniden başlayınca açılır (0033).
  - Verisi SQLite'tır, `/srv/altyapi/hata-izleme/<ortam>/veri` klasöründe durur.
  - Portu açılmaz. Ağı (`altyapi-hata-izleme-<ortam>`) dışarıya kapalıdır (`internal`). Bu ağda yalnız ön kapı ve hata izleme kutusu durur. Kutu internete çıkamaz, Bugsink'e kurulum bilgisi gönderilmez.
  - Tanım `komutlar/hata-izleme.mts` dosyasındadır, kurulumu `pnpm sunucu-hata-izleme` yapar. `pnpm sunucu-kur` da ön kapıdan sonra bu adımı çalıştırır.
- **Adres:** Dışarıdan `altyapi--hata.deneme.eticaretmagazasi.com` adresinden ulaşılır. Adresteki iki tire hiçbir sitenin kod adıyla çakışmaz.
  - Ön kapı bu adreste yalnız gönderim yollarını (`/api/<proje>/store/` ve `/api/<proje>/envelope/`, POST ve tarayıcının OPTIONS sorusu) 1 MB gövde sınırıyla kutuya geçirir. Geri kalan her yol 404'tür: yönetim ekranı, giriş sayfası ve okuma ucu dışarıya kapalıdır.
  - Yönetim ekranı yalnız SSH tüneliyle açılır (`pnpm hata-izleme-ac`). Tek kullanıcı vardır, kimse kendi kaydını açamaz. İlk girişten önce şifre `pnpm hata-izleme-ac --sifre` ile belirlenir.
- **Projeler:** Her sitenin kutuda kod adıyla bir projesi vardır. Yayın komutu projeyi (yoksa) açar ve gönderim adresini site kutusuna `HATA_IZLEME_ADRESI` ile, ortamı `HATA_IZLEME_ORTAMI` ile verir (`komutlar/yayin.mts`). Proje, veritabanı değişikliklerinden önce hazırlanır. Hazırlanamazsa yayın durur ve veritabanına dokunulmaz: hataları izlenmeyen bir site yayına çıkmaz. Hata kayıtlarını dışarıdan kimse okuyamaz. Gönderim adresi sayfada açık durduğu için o projeye herkes olay gönderebilir; Bugsink'in proje başına sınırı (5 dakikada 1.000, saatte 5.000 olay) taşmayı keser.
- **Gizli bilgiler:** İmza anahtarı, yönetici şifresi ve yönetim anahtarı sunucuda üretilir, `/srv/altyapi/gizli/<ortam>/altyapi--hata-izleme/` klasöründe durur (0031).
  - İmza anahtarı ve şifre kutuya dosyayla bağlanır. Kutunun içinde açılışta ortam değişkenine yazılır, kutunun tanımında ve `docker inspect` çıktısında görünmez.
  - Yönetim anahtarı kök kullanıcıya aittir, kutuya hiç bağlanmaz. Komutlar onu sunucuda okuyup kutunun içindeki istemciye girdiden verir.
  - Gönderim adresi gizli değildir. Yalnız o projeye hata göndermeye izin verir ve tarayıcıya da gider.
- **Gönderim:** Hazır Sentry paketi kullanılmaz. Olayı çekirdekteki küçük bir dosya kurar ve gönderir (`cekirdek/izleme/hata-izleme-araci.ts`). Aynı dosya sunucuda ve tarayıcıda çalışır.
  - Araca yalnız hata katmanının verdiği maskelenmiş kayıt gider. Olay gönderilmeden hemen önce bir kez daha bütünüyle maskelenir.
  - Her olay site kod adı, çekirdek sürümü (etiket ve `release`), ortam ve kaynak (sunucu ya da tarayıcı) ile etiketlenir.
  - Sunucuda araç açılışta bağlanır (`hata-izleme-baglantisi.ts`, `instrumentation.ts`). Gönderim adresi yoksa (bilgisayarda, testte) bağlanmaz.
  - Tarayıcıda kök düzen bağlantı parçasını çizer (`istemci-hata-izleme.tsx`). Parça bölüm sınırlarının, sayfa ve kök hata ekranının yakaladığı hataları, yakalanmamış hataları ve karşılanmamış söz (Promise) hatalarını gönderir. Araç sayfanın ömrü boyunca bir kez bağlanır, parça kaldırılınca çözülmez: kök düzen bozulunca Next.js onu bu parçayla birlikte kaldırır, kök hata ekranının hatası da gitmelidir. İstek çerezsiz gider. Bir sayfa açılışında en çok 10 olay gider.
  - Adresin sorgu kısmı (doğrulama anahtarı, arama metni) araca gitmez. Tarayıcıda yalnız sayfanın yolu eklenir. Sunucuda Next.js'in istek hatası yoluna sorgu kısmını da yazar; kayda yalnız yol girer. Yığındaki dosya adreslerinin sorgu kısmı da atılır. Hata mesajının içine yazılmış bir adres yalnız maskeden geçer.
  - Yığın Chrome ve Node.js biçiminde de, Safari ve Firefox biçiminde de çözülür.
  - Araca ulaşılamazsa sunucu günlüğe uyarı yazar, uygulama çalışmaya devam eder. Sunucuda olay sayısının sınırı yoktur; bir döngüdeki hata her istekte bir gönderim yapar, taşmayı Bugsink'in proje sınırı keser.
- **Deneme:** `pnpm hata-izleme-denemesi <site klasörü>` yayındaki sitede iki hatayı bilerek çıkarır. Sunucudaki hata, site kutusunun içinde uygulamanın hata katmanından geçer (`izleme/hata-denemesi.mjs`, yalnız `docker exec` ile çalışır). Tarayıcıdaki hata, deneme adresi gerçek bir tarayıcıda açılarak çıkarılır. İki hatanın da içinde uydurma e-posta, telefon, şifre, kart, oturum anahtarı ve sorgu değeri vardır. Komut araçtaki kayıtları okur ve şunları ölçer:
  - site, sürüm ve ortam etiketi var,
  - ön kapının 1 MB gövde sınırı çalışıyor (sitenin gönderim adresiyle 2 MB'lık istek 413 alıyor),
  - uydurma değerlerin hiçbiri açık değil, e-posta kısaltılmış,
  - ziyaretçi, istek, çerez, başlık alanı ve IP adresi yok.
- **Denetim:** `pnpm sunucu-denetle` ölçer:
  - kutunun gerçek ayarı tanımıyla aynı, kutu sağlıklı, portu kapalı,
  - kutu yalnız kendi ağına bağlı, ağ dışarıya kapalı, ağda ön kapı ve hata izleme kutusundan başka kutu yok,
  - ön kapıda yönetim ekranı, giriş sayfası ve okuma ucu GET ve POST ile 404, gönderim yolu araca ulaşıyor,
  - gizli bilgi dosyaları doğru sahipte ve izinle duruyor.

## Neden

- **Veri yeri:** Hata kayıtları maskeli olsa da yol, ürün adı ve mesaj gibi kişisel veriye yakın bilgi taşıyabilir. Kendi sunucumuzda kalınca yeni bir veri işleyen ya da yurt dışı aktarım tarafı eklenmez.
- **Bugsink'in boyutu:** Tek kutudur, SQLite ile çalışır. Sentry'nin kendi kurulumu ise Kafka, ClickHouse ve onlarca kutu ister, 8 GB'lık sunucuya sığmaz. GlitchTip de PostgreSQL, Redis ve ayrı bir iş kutusu ister.
- **Hazır paket kullanılmaması:** Sentry'nin Next.js paketi istek başlıklarını, çerezleri, gezinme izini ve ziyaretçi adresini kendiliğinden toplayabilir; bunlar maskeden geçmeden giderdi. Gönderim biçimi küçük ve belgelidir; kendi dosyamızla araca yalnız ne verdiğimiz gider. Kart 0014'ün bıraktığı tek bağlama yeri de böylece korunur.
- **Yönetim ekranının kapalı olması:** Dışarıya açık bir giriş sayfası saldırı yüzeyidir. Yalnız altyapı sahibi baktığı için tünel yeter.
- **Yayının durması:** Kural, canlıdaki hatanın kullanıcıdan önce görülmesini istiyor. Hata izleme projesi olmadan açılan site bu kuralı sessizce çiğnerdi.

## Düşünülen diğer yollar

- **Sentry'nin Almanya (Frankfurt) bölgesi, ücretsiz plan:** Önerildi, kullanıcı seçmedi. Bakımı yoktu ve sunucumuz sıkıntıdayken de çalışırdı. Ama hesap gerektiriyordu, kayıtlar üçüncü bir firmaya gidiyordu, kota aşılınca ücretli plana (ayda 26–29 $) geçmek gerekebilirdi.
- **GlitchTip'i kendi sunucumuzda çalıştırmak:** Seçilmedi. Üç-dört kutu ve ayrı veritabanı gerekir; bakımı daha ağırdır.
- **Sentry'nin hazır paketiyle göndermek (`@sentry/nextjs`):** Seçilmedi (yukarıdaki neden).
- **Tarayıcı hatalarını kendi ucumuzla sunucu günlüğüne almak:** Seçilmedi (0025). Tarayıcı doğrudan araca gönderir; araç kendi istek sınırını uygular.
- **Hata izleme verisini sitelerin PostgreSQL kutusunda tutmak:** Seçilmedi. Bugsink PostgreSQL'i yalnız "muhtemelen çalışır" diye anıyor. Sitelerin veritabanı kutusuna altyapının bir verisini koymak ayrımı bulandırırdı.

## Sonuçları

- **Bakım:** Bugsink'in güncellenmesi bizim işimizdir. Yükseltmede etiket ve özet değişir. Görüntünün açılış komutu değişmişse kurulum durur; tanımdaki komut elle karşılaştırılır.
- **Sunucuyla birlikte düşmesi:** Sunucu düşerse hata izleme de düşer. Sitenin açık olup olmadığını dışarıdan yoklamak ayrı bir iştir (zamanlanmış kontroller). Uyarıların telefona ya da e-postaya gelmesi de bu karara girmedi.
- **Yedek:** Hata kayıtları gece yedeğine henüz girmiyor; gece yedeği kartında (0024) karar verilecek. Kayıtlar kaybolursa siteler çalışmaya devam eder, yalnız geçmiş hatalar gider.
- **Geri dönüş:** Geri dönüş, dönülen yayının kendi kutu tanımını kullanır. Bu karardan önceki bir yayına dönülürse site hata izlemesiz açılır.
- **Şifre:** Kutunun açılışta verdiği yönetici şifresi yalnız hiç kullanıcı yokken kullanılır. Sonradan belirlenen şifre kutu yeniden başlayınca korunur (bilgisayarda ölçüldü).
- **Bilgisayarda araç yok:** Yerel ortamda gönderim adresi verilmez, hatalar yalnız günlüğe yazılır.
- **Deneme kayıtları:** Deneme komutunun kayıtları araçta kalır, işaretleriyle ayırt edilir. Yayın denemesinin geçici siteleri (`yayin-deneme-a`, `yayin-deneme-b`) araçta da proje açar. Bugsink'in ucunda proje silme yoktur; projeler her denemede yeniden kullanılır.
- **Yönetim anahtarı:** Anahtar 40 hanedir. Sunucu denetiminin kayıt geçmişi araması yalnız 64 haneli değerleri arar, bu anahtarı aramaz. Anahtar hiçbir komutun çıktısına basılmaz.
- **Ölçümler:**
  - Bugsink görüntüsü bu ayarlarla bilgisayarda açılıp ölçüldü: kutu sağlıklı açıldı, `docker inspect` çıktısında imza anahtarı ve şifre geçmedi.
  - Compose, tanımdaki `$` işaretlerini kendi değişkeni sayıp boşaltıyordu (imza anahtarı boş gitti, kutu açılmadı). Komutta `$$` yazılır, bunun testi `komutlar/testler/hata-izleme.test.ts` içinde.
  - Rastgele işarette 10 haneli bir rakam dizisi maskeye takıldı. Deneme işareti bu yüzden yalnız harftir. İşaret mesajın sonundadır: ardından iki nokta gelseydi ve işaret rastgele "otp" gibi bir parça taşısaydı, maske e-postayı bütünüyle silerdi (bağımsız kontrol buldu).
  - Sunucuda: `pnpm sunucu-hata-izleme` iki kez çalıştırıldı, ikincisinde hiçbir şey değişmedi. `pnpm sunucu-denetle --hizli` yeşil. Kutu internete çıkamıyor (`Network is unreachable`), sunucu kutuya ulaşıyor (tünel), `docker inspect`'te imza anahtarı geçmiyor. Proje olmayan bir numaraya ve anahtarsız gönderim 403, sitenin anahtarıyla 2 MB'lık gönderim 413 aldı.
  - Örnek Mağaza bu kayıtla deneme adresine yayınlandı. `pnpm hata-izleme-denemesi siteler/ornek-magaza` yeşil: sunucudaki ve tarayıcıdaki hata araçta `ornek-magaza`, `0.1.0` ve `deneme` etiketleriyle görüldü. Kayıtlarda e-posta kısaltılmış, şifre, kart ve oturum anahtarı gizlenmiş, telefonun yalnız son iki hanesi kalmış. IP adresi, çerez ve istek başlığı yok.
