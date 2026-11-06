# Yedek

Sitelerin veritabanı yedeğinin dosyaları (kart 0024, karar 0037). Neden böyle olduğu karar kaydındadır.

| Dosya | Ne yapar |
|---|---|
| `ayar.json` | Depo, her sitenin açık anahtarı ve saklama süresi (gün). Gizli değildir. |
| `gece.sh`, `ortak.sh` | Sunucuda çalışan yedek işi (`/srv/altyapi/yedek/`). |
| `altyapi-yedek.service`, `altyapi-yedek.timer` | Her gece 03:00 (Türkiye saati). |

Değişiklik sunucuya `pnpm yedek-kur` ile gider. Sonuç kaydı sunucuda `/srv/altyapi/yedek/kayit.jsonl` dosyasındadır, `pnpm yedek-kaydi` gösterir.

## Açma anahtarları

Her sitenin açma anahtarı yalnız altyapı sahibinin bilgisayarında durur: `~/.altyapi/yedek-anahtarlari/<ortam>/<kod adı>.txt`. Kopyası şifre yöneticisindedir. **İkisi de kaybolursa o sitenin yedekleri açılamaz.** Yeni site eklenince yeni anahtarın kopyası da şifre yöneticisine konur.

## Bir siteyi geri yükleme

1. `pnpm yedek-geri-yukle siteler/<kod adı> <ortam>` depodaki yedekleri tarih, boyut ve türüyle listeler, başka bir şey yapmaz. Dönülecek yedeği seçin. Boyutu belirgin küçük bir yedek boş veritabanının yedeği olabilir, `geri-yukleme-oncesi` yedeği de bozuk hâlin yedeği olabilir. Son yedekten sonraki veri kaybolur.
2. Önce deneyin: `pnpm yedek-prova siteler/<kod adı> <ortam> --dosya=<yedek>`. Site yedekten sonra yazdıysa fark görünmesi normaldir; yedeğin açılamaması normal değildir.
3. `pnpm yedek-geri-yukle siteler/<kod adı> <ortam> --dosya=<yedek>`. Komut yedeği yan veritabanına açar, site kutusunu durdurur, o anki durumun yedeğini alır, veritabanlarını değiştirir, şifreyi yeniler (karar 0031), eksik veritabanı değişikliklerini uygular ve siteyi açar. Bir adım tutmazsa komut durumu söyler: çoğunlukla eski veri yerindedir ve site açıktır. Eski veri yerine konamazsa ya da durum okunamazsa site bilerek kapalı bırakılır. Şimdilik yalnız deneme ortamında çalışır.
4. `pnpm sunucu-denetle --hizli` ile kontrol edin.

Komut "yarım kalmış" diyorsa (bağlantı kopmuş olabilir) önceki veri `<veritabanı>__eski` adıyla duruyordur. `--eskiye-don` önce şu anki hâlin yedeğini alıp onu yerine koyar. `--eskiyi-sil` şu anki hâli çalışır duruma getirir, sağlıklıysa önceki veriyi siler. Karar vermeden o veritabanını elle silmeyin. Komut "site kapalı bırakıldı" dediyse ve önceki veri beklemiyorsa `--eskiye-don` siteyi açar.

Veritabanı bozuk olduğu için "yedek alınamadı" diyorsa `--son-yedeksiz` ekleyin: o anki durumun yedeği atlanır, önceki veri yerinde saklanır. Bu verinin yedeği olmadığı için silmek ayrı onay ister: `--eskiyi-sil --yedeksiz-onay`. Veritabanı hiç yoksa önce `pnpm sunucu-veritabani siteler/<kod adı> <ortam>`.

## Sunucu kaybolursa

Yeni sunucu (`pnpm sunucu-kur`), gizli bilgiler, veritabanı ve yayın kurulur; `pnpm yedek-kur` çalıştırılır (depoda yedeği olan siteye yeni yedek almaz); sonra her site için 1 ve 3. adımlar uygulanır. Gece işi bu arada boş veritabanını da yedekler, eski yedekler saklama süresi dolunca silinir: geri yüklemeyi hemen yapın. Depo anahtarı `.env` dosyasındadır, açma anahtarları bilgisayarda ve şifre yöneticisindedir. Bu tam senaryo henüz baştan sona denenmedi.

## Silme işareti

Depo anahtarıyla yedek kalıcı silinemez, üstüne yalnız silme işareti konabilir. Gece işi işareti kaldırır ve `temizlik` kaydını başarısız yazar; denetim, onaylanana kadar kırmızı kalır. Sebep ağ kesintisi değilse depo anahtarını Hetzner'de yenileyin. Bakınca: `pnpm yedek-kaydi --temizlik-onayla=<ortam>/<kod adı>`.
