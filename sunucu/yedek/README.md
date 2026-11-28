# Yedek

Sitelerin veritabanı ve dosya yedeğinin dosyaları (kart 0024, karar 0037; dosyalar kart 0093, karar 0207). Neden böyle olduğu karar kayıtlarındadır.

| Dosya | Ne yapar |
|---|---|
| `ayar.json` | Depo, her sitenin açık anahtarı ve saklama süresi (gün). Gizli değildir. |
| `gece.sh`, `ortak.sh` | Sunucuda çalışan yedek işi (`/srv/altyapi/yedek/`): her sitenin veritabanı, ardından dosyaları. |
| `altyapi-yedek.service`, `altyapi-yedek.timer` | Her gece 03:00 (Türkiye saati). |

Değişiklik sunucuya `pnpm yedek-kur` ile gider; kurulum her sitenin dosya yedeğini de hemen alır. `pnpm yedek-denemesi` sunucudaki betikleri kullanır: betik değiştiyse önce `pnpm yedek-kur`. Sonuç kaydı sunucuda `/srv/altyapi/yedek/kayit.jsonl` dosyasındadır, `pnpm yedek-kaydi` gösterir.

## Dosyalar

Sitenin dosyaları (`/srv/altyapi/dosyalar/<ortam>/<kod adı>`) depoda `<ortam>/<kod adı>/dosyalar/` altında, her biri ayrı şifreli ve kilitli durur. Her gece yalnız yeni dosyalar ve kilidi bitmeye yaklaşanların yeni kopyası gider. Elle: `sudo /srv/altyapi/yedek/gece.sh --dosya <ortam> <kod adı>` ya da `pnpm yedek-al`. Geri yükleme dosyaları kendisi getirir: seçilen yedeğin gösterdiği ama diskte olmayan dosyalar depodan indirilir, diskteki hiçbir dosya silinmez. Diskteki bir dosyanın içeriği kayıtla tutmuyorsa (bozulmuş ya da değiştirilmiş) geri yükleme durur ve adını söyler: o dosyayı inceleyip adını değiştirerek kenara alın (`<ad>.bozuk`), komutu yeniden çalıştırın; yedekteki kopyası gelir. Kaydı olmayan ve kaydı olup diskte olmayan dosyaları sitenin günlük dosya temizliği hata izleme aracına bildirir; kaydı olmayan dosya kendiliğinden silinmez.

## Açma anahtarları

Her sitenin açma anahtarı yalnız altyapı sahibinin bilgisayarında durur: `~/.altyapi/yedek-anahtarlari/<ortam>/<kod adı>.txt`. Kopyası şifre yöneticisindedir. **İkisi de kaybolursa o sitenin yedekleri açılamaz.** Yeni site eklenince yeni anahtarın kopyası da şifre yöneticisine konur.

## Bir siteyi geri yükleme

1. `pnpm yedek-geri-yukle siteler/<kod adı> <ortam>` depodaki yedekleri tarih, boyut ve türüyle listeler, başka bir şey yapmaz. Dönülecek yedeği seçin. Boyutu belirgin küçük bir yedek boş veritabanının yedeği olabilir, `geri-yukleme-oncesi` yedeği de bozuk hâlin yedeği olabilir. Son yedekten sonraki veri kaybolur.
2. Önce deneyin: `pnpm yedek-prova siteler/<kod adı> <ortam> --dosya=<yedek>`. Site yedekten sonra yazdıysa fark görünmesi normaldir; yedeğin açılamaması ya da bir dosyanın depoda kopyasının olmaması normal değildir.
3. `pnpm yedek-geri-yukle siteler/<kod adı> <ortam> --dosya=<yedek>`. Komut yedeği yan veritabanına açar, yedeğin gösterdiği ama diskte olmayan dosyaları depodan getirir, site kutusunu durdurur, o anki durumun yedeğini alır, veritabanlarını değiştirir, şifreyi yeniler (karar 0031), eksik veritabanı değişikliklerini uygular ve siteyi açar. Bir adım tutmazsa komut durumu söyler: çoğunlukla eski veri yerindedir ve site açıktır. Eski veri yerine konamazsa ya da durum okunamazsa site bilerek kapalı bırakılır. Şimdilik yalnız deneme ortamında çalışır.
4. `pnpm sunucu-denetle --hizli` ile kontrol edin.

Komut "yarım kalmış" diyorsa (bağlantı kopmuş olabilir) önceki veri `<veritabanı>__eski` adıyla duruyordur. `--eskiye-don` önce şu anki hâlin yedeğini alıp onu yerine koyar. `--eskiyi-sil` şu anki hâli çalışır duruma getirir, sağlıklıysa önceki veriyi siler. Karar vermeden o veritabanını elle silmeyin. Komut "site kapalı bırakıldı" dediyse ve önceki veri beklemiyorsa `--eskiye-don` siteyi açar.

Veritabanı bozuk olduğu için "yedek alınamadı" diyorsa `--son-yedeksiz` ekleyin: o anki durumun yedeği atlanır, önceki veri yerinde saklanır. Bu verinin yedeği olmadığı için silmek ayrı onay ister: `--eskiyi-sil --yedeksiz-onay`. Veritabanı hiç yoksa önce `pnpm sunucu-veritabani siteler/<kod adı> <ortam>`.

## Demo siteyi sıfırlama

`pnpm site-sifirla siteler/<kod adı> <ortam>` yalnız kimliğinde türü `demo` olan siteyi sıfırlar (karar 0100): bütün verisi silinir, site yayındaki sürümüyle boş veritabanından açılır, arka plan süreci başlangıç verisini (katalog, menüler, düzen) yeniden kurar. Yol geri yüklemeyle aynıdır: boş veritabanı yana açılır, kutu durur, o anki verinin yedeği alınır (`sifirlama-oncesi`), veritabanları yer değiştirir; bir adım tutmazsa eski veri yerine döner. Sıfırlamadan dönmek için o yedeğe geri yüklenir. Dosya klasörüne dokunulmaz. Yönetici hesapları da silinir: sonra `pnpm sunucu-yonetici-ac`.

## Sunucu kaybolursa

Yeni sunucu (`pnpm sunucu-kur`), gizli bilgiler, veritabanı ve yayın kurulur; `pnpm yedek-kur` çalıştırılır (depoda yedeği olan siteye yeni yedek almaz); sonra her site için 1 ve 3. adımlar uygulanır. Gece işi bu arada boş veritabanını da yedekler, eski yedekler saklama süresi dolunca silinir: geri yüklemeyi hemen yapın. Depo anahtarı `.env` dosyasındadır, açma anahtarları bilgisayarda ve şifre yöneticisindedir. Bu tam senaryo henüz baştan sona denenmedi.

## Silme işareti

Depo anahtarıyla yedek kalıcı silinemez, üstüne yalnız silme işareti konabilir. Gece işi işareti kaldırır ve `temizlik` kaydını başarısız yazar; denetim, onaylanana kadar kırmızı kalır. Sebep ağ kesintisi değilse depo anahtarını Hetzner'de yenileyin. Bakınca: `pnpm yedek-kaydi --temizlik-onayla=<ortam>/<kod adı>`.
