# 0026 · Site derlemede değil, uygulama açılırken okunur

## Tarih

2026-11-04

## Karar

- Çekirdek uygulaması site olmadan derlenir. Derlenen pakette hiçbir sitenin adı ya da ayarı yoktur.
- Site klasörü uygulama açılırken bir kez okunur ve şemadan geçirilir (`cekirdek/izleme/acilis.ts`, `instrumentation.ts`). Değişken yoksa ya da klasör geçersizse sebep ölümcül seviyede günlüğe yazılır ve süreç 1 koduyla kapanır.
- Kök düzen `dynamic = "force-dynamic"` ile işaretlidir: bütün vitrin ve panel sayfaları istekte hazırlanır. Sayfa başlıkları `generateMetadata` ile istekte üretilir.
- Siteyi okuyan kod dosya yüklenirken değil, ilk çağrıda okur (`cekirdek/metinler/site-metni.ts`: `siteDili()`, `metin()`, `bicim()`).
- Önbellek: site klasörü süreç boyunca bellekte kalır, yalnız uygulama yeniden başlayınca yeniden okunur. Site klasörü yalnız yayınla değiştiği ve yayın kutuyu yeniden başlattığı için ayrıca silinmesi gerekmez. Sayfaların kendisi şimdilik önbelleğe alınmaz.

## Neden

- Docker görüntüsü siteden bağımsız olmalı, aynı görüntü her siteyle çalışmalı (karar 0013, 0021). Derlemede okunan site görüntünün içine girerdi.
- Vitrin ve panelin her sayfası sitenin dilini, adını ve ayarlarını kullanır. Derlemede hazırlanabilecek siteden bağımsız sayfa yoktur.
- Geçersiz klasörle açılmamak, yanlış ayarla satış yapan bir siteyi ilk istekten önce durdurur. Sebep günlükte yazdığı için yayın komutu ve sahip paneli onu görebilir.
- Şu an sayfalar yalnız bellekteki ayarı okuyor, istekte hazırlamanın maliyeti çok düşüktür.

## Düşünülen diğer yollar

- Her site için ayrı derleme ve ayrı görüntü: Seçilmedi. Görüntü sayısı site sayısıyla artar, aynı çekirdek sürümünün sitelerde aynı kod olduğu güvencesi kalkar (karar 0011).
- Next.js'in bileşen önbelleği (Cache Components) ile sayfanın sabit kısmını derlemede, siteye bağlı kısmını istekte hazırlamak: Şimdilik seçilmedi. Siteden bağımsız sabit kısım yok, kurulum ve kurallar ağırlaşır. Ürün listeleri gelince önbellek kuralıyla birlikte yeniden düşünülür.
- Site bilgisini ortam değişkenlerine dökmek: Seçilmedi. Ayarlar şemadan geçen bir dosyadır (karar 0021), değişkenlere dökmek ikinci bir yer yaratır.
- Siteyi ilk istekte okumak, açılışta okumamak: Seçilmedi. Geçersiz klasör ancak ilk ziyaretçi geldiğinde anlaşılır, yayın komutunun sağlık kontrolü bunu görmeyebilir.

## Sonuçları

- Hiçbir sayfa derlemede hazırlanmaz. Ürün sayfaları gelince hangi verinin ne kadar önbellekte tutulacağı ayrıca tanımlanır (`.claude/rules/performans.md`).
- Siteyi okuyan yeni kod da dosya yüklenirken değil, çağrıldığında okumalıdır. Bunu `cekirdek/metinler/testler/site-metni.test.ts` site metni için denetler; derleme de değişkensiz yapıldığı sürece yeni bir ihlal derlemeyi kırar.
- Site klasörünü değiştirmek uygulamanın yeniden başlatılmasını gerektirir.
- Next.js açılış kontrolünü ve sayfaları ayrı paketlere derler. Okunan site bu yüzden sürecin ortak alanında (`globalThis`) tutulur; yoksa sayfalar klasörü yeniden okurdu ve açılışta doğrulanan site sayfaların kullandığı site olmazdı. Bunu `cekirdek/ayar-semasi/testler/calisan-site.test.ts` denetler.
- Next.js "Ready" satırını açılış kontrolünden önce yazar ve geçersiz klasörle kapanan süreç bir an bağlantı kabul eder, yanıt vermez. Yayın komutu ve sağlık kontrolü "Ready" satırına değil, çıkış koduna ve sağlık ucunun yanıtına bakmalıdır (kart 0021).
- Docker görüntüsü (kart 0015) artık site olmadan derlenebilir.
