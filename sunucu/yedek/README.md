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

1. `pnpm yedek-kaydi` ile dönülecek yedeği seçin. Son yedekten sonraki veri kaybolur.
2. Önce deneyin: `pnpm yedek-prova siteler/<kod adı> <ortam> --dosya=<yedek>`. Site yedekten sonra yazdıysa fark görünmesi normaldir; yedeğin açılamaması normal değildir.
3. `pnpm yedek-geri-yukle siteler/<kod adı> <ortam> --dosya=<yedek>`. Komut o anki durumun yedeğini alır, yedeği yan veritabanına açar, site kutusunu durdurur, veritabanlarını değiştirir, şifreyi yeniler (karar 0031), eksik veritabanı değişikliklerini uygular ve siteyi açar. Bir adım tutmazsa eski veritabanı yerine döner.
4. `pnpm sunucu-denetle --hizli` ile kontrol edin.

## Sunucu kaybolursa

Yeni sunucu (`pnpm sunucu-kur`), gizli bilgiler, veritabanı ve yayın kurulur; `pnpm yedek-kur` çalıştırılır; sonra her site için 3. adım uygulanır. Depo anahtarı `.env` dosyasındadır, açma anahtarları bilgisayarda ve şifre yöneticisindedir. Bu tam senaryo henüz baştan sona denenmedi.

## Silme işareti

Depo anahtarıyla yedek kalıcı silinemez, üstüne yalnız silme işareti konabilir. Gece işi işareti kaldırır ve `temizlik` kaydını başarısız yazar; denetim kırmızıya düşer. Kaydı görünce depo anahtarını Hetzner'de yenileyin.
