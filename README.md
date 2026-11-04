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

Çekirdeğin Docker görüntüsünü üretmek için `pnpm cekirdek-goruntusu` yazılır. Görüntü `altyapi-cekirdek:<sürüm>` adını alır ve hemen denetlenir: içinde `.env`, site klasörü ya da gizli bilgi olmamalı, kök kullanıcıyla çalışmamalıdır (karar 0027). Denetim ayrıca `pnpm cekirdek-goruntusu-denetle` ile çalıştırılır, `--kendi-testi` eklenirse bilerek bozulmuş bir görüntüyü yakaladığını gösterir. Çalıştırma örneği `sunucu/cekirdek/Dockerfile` dosyasının başındadır.
