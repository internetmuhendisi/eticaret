# 0345 · Demo paketi

## Amaç

Tema ile demo ayrı kavramlardır. Tema vitrinin görünüşüdür (karar 0080, 0092). Demo bir sektöre özel, dolu bir mağazadır: kategoriler, ürünler ve görselleri, menüler, ana sayfa düzeni, sayfalar, blog, önerilen tema. Bugün bu içerik her sitenin kendi `baslangic/` klasöründedir ve yalnız boş veritabanına bir kez yazılır (karar 0070, 0094). Demo bir pakete dönüşmeli: yeni site onunla başlayabilsin (kart 0350), açık bir mağaza panelden onu içe aktarabilsin (kart 0347, 0348). Örnek Mağaza'nın içeriği ilk paket olur (demo1).

Bölüm: Yeni mağaza. Önce 0343 bitmiş olmalı.

## Olmazsa olmazlar

- Paketin biçimi: kodu, adı, sektörü, kısa açıklaması, önizleme görseli, önerilen tema ve düzeni; katalog, görseller, menüler, düzen, sayfalar, blog, kuponlar. Mağazanın kendisine ait olanlar pakette yoktur: mağaza adı, logo, iletişim ve satıcı bilgileri, ödeme ve kargo ayarları, vergi, e-posta metinleri, ekip. Hangi parçanın pakette olduğu bir listede tek yerde yazılır; kart 0347 aynı listeyi okur.
- Paketlerin yeri klasör düzenine yazılır (`.claude/rules/klasor-duzeni.md` ve kural dosyalarının `paths` satırları aynı değişiklikte). Paket çekirdeğin parçasıdır ya da ayrı sürümlenir; seçim gerekçesiyle karar kaydına yazılır (kural 3: çekirdekteki değişiklik hiçbir siteye kendiliğinden gitmez; paketin yeni hâli kurulu mağazayı değiştirmez).
- Paketin doğrulaması bugünkü site doğrulamasının başlangıç denetimlerini kullanır (katalog, galeri, düzen ve adres adı, menüler, sayfalar, görsel dosyaları); bozuk örnekleriyle. Paket hiçbir siteye, mağaza adına ya da sitenin koduna başvuramaz (kural 1; `site-adi-yok.test.ts` paketleri de tarar).
- Örnek Mağaza'nın içeriği `demo1` paketine taşınır, Örnek Mağaza paketten başlar; boş veritabanında kurulan Örnek Mağaza bugünküyle aynı kataloğu, menüleri, düzeni, sayfaları, blogu ve kuponları alır (`siteler/ornek-magaza/testler/` değişmeden geçer). Tema Galerisi de aynı paketten başlar (karar 0127: Örnek Mağaza'nın kopyası).
- Paketin içeriğinin sitenin diline ve para birimine bağlılığı yazılır: bugün paketler Türkçe ve TL'dir; başka ülkede kurulacak site için ne olacağı (kod ülkeye bağlı yazılmaz) karar kaydında.
- Siteye özel kodu çekirdeğe sokmaz; sitenin `baslangic/` klasöründe pakette olmayan parçalar (ayarlar, vergi, tema seçimi) kalır.

## Sınırlar

- Panelden içe aktarma kart 0347 ve 0348'dedir; bu kart yalnız boş veritabanına kurulumu paketten yapar.
- Elektronik demosu kart 0349'dadır.
- Örnek Mağaza'nın canlı veritabanı değişmez; yayın kart 0351'dedir.

## Bitti sayılır

- Karar kaydı (paketin yeri, sürümü, parçaların listesi, dil ve para birimi) yazıldı.
- `demo1` paketi doğrulamadan geçiyor, bozuk örnekleri kırmızı.
- Örnek Mağaza ve Tema Galerisi paketten başlıyor; sitelerin testleri değişmeden yeşil; boş veritabanında kurulum bugünkü sonuçla aynı (test).
- Klasör düzeni ve `paths` satırları güncel.

## Sonuç

- **Kararlar (2026-11-28), karar 0203.**
  - Kullanıcı kararları:
    - Paket metinlerinde mağazanın adı yer tutucuyla (`{magazaAdi}`) yazılır, kurulumda mağazanın adı konur.
    - Tema Galerisi paketi kullanır, yalnız ana sayfa düzenini kendinden alır ("Öne çıkanlar" 10 ürün). Site paketin bir parçasını kendi dosyasıyla değiştirebilir ve bunu `demoParcasiSiteden` ayarına yazar.
  - Teknik kararlar:
    - Paketler `cekirdek/demolar/<kod>/`'dadır ve çekirdekle sürümlenir; görüntüye girmez.
    - Yayın komutu paketi site klasörüyle aynı kayıttan çıkarıp kutuya `/cekirdek/demolar` olarak bağlar.
    - Paket dilini, para birimini, saat dilimini ve ürünlerinin vergi sınıflarını tanımında yazar; uymayan site o paketle başlayamaz.
- **Paket.** `cekirdek/demolar/demo1/`: `paket.json` (Günlük yaşam mağazası; Canlı Çarşı; tr, TRY, Europe/Istanbul; vergi sınıfı `%20`) ve `baslangic/`: Örnek Mağaza'nın katalog, 61 görsel (36 MB), menüler, düzen, sayfalar, blog ve kuponları, kayıt geçmişiyle taşındı.
  - Örnek Mağaza'da yalnız mağazanın kendi dosyaları kaldı (`ayarlar.json`, `vergi.json`, `tema.json`, `marka/`).
  - Tema Galerisi'nin ayrışmış kopyası (katalog, menüler, 58 görsel) silindi.
- **Kod.**
  - Parça listesi (`cekirdek/kayitlar/demo-paketi.ts`).
  - Paketin tanımı ve kendi başına doğrulaması, sitenin içinde paketle doğrulanması (`cekirdek/ayar-semasi/site-klasoru.ts`).
  - Yeni iki site ayarı (`baslangicDemosu`, `demoParcasiSiteden`).
  - Kurulumda mağaza adının sayfalara ve bloğa konması (içerikte HTML kaçırılarak).
  - Yayının paketi çıkarıp yüklemesi ve kutuların bağlantısı, yerel ortamın bağlantısı, görüntüden paketin çıkarılması.
- **Ölçümler.**
  - Bütün birim takımı 4768/4768 (dört işçiyle). Varsayılan işçi sayısıyla 341 test kilit tablosu hatasıyla düştü: kart 0254'te yazılı yerel sorun, ana dalda da var.
  - `pnpm site-dogrula` iki sitede geçti, tür kontrolü ve denetim temiz.
  - Örnek Mağaza'nın testleri gerçek veritabanıyla geçiyor; boş veritabanına paketten kurulum bugünkü katalog, menü, düzen, blog ve kuponu veriyor.
  - "Hakkımızda" sayfasının metni değişti: "{magazaAdi}, 2026'da…" ve açıklama "Mağazamızı tanıyın…" (ek ada göre değiştiği için). Kurulumda "Örnek Mağaza" kondu (test).
  - Tema Galerisi artık demo1'in menülerini, sayfalarını, blogunu ve kuponlarını, güncel indirim tarihleriyle alır.
  - Yerel ortam denemesinde paketi kullanan iki site kutuda açıldı. Görüntü bu dalın kaydından yeniden üretildi; ilk çalışma bilgisayarda kalan eski 0.81.0 görüntüsüyle açılmadı (kart 0090).
  - Yerel ortamda 74 ölçüm geçti; kalan 5'i yerel ortak veritabanında bekleyen 330 bin eski iş yüzünden kuyruğa bağlı ölçümler (kart 0094'te yazılı ortam sorunu).
  - Paketten kurulum kutuda ölçülmedi (yerel veritabanı kurulu), testlerde ölçüldü.
- **Testler.** `cekirdek/ayar-semasi/testler/demo-paketi.test.ts`, `komutlar/testler/yayin-paketi.test.ts`, sayfa ve blog kurulumu (`cekirdek/moduller/icerik/testler/`), Örnek Mağaza'nın sayfaları, site adı, para birimi ve vergi taramaları.
  - 27 denetim ayrı ayrı bilerek bozularak denendi, her biri kırmızıya düştü.
  - İkinci katman çıkan ya da yalnız disiplin kalanlar:
    - Bugün tek dil (tr) olduğu için dil uyumu ikinci katmandır.
    - Yayının yalnız sitenin paketini çıkardığı tek paketle ayırt edilemez (kart 0349 ikinci paketi getirir).
- **Bağımsız kontrolün bulgularıyla düzeltilen.**
  - Para birimi ve vergi taramaları pakete takılıyordu.
  - Mağaza adı HTML içeriğe kaçırılmadan giriyordu.
  - Yer tutucu sitenin değiştirdiği parçada, blog kategorisinde ve yazının öteki alanlarında denetlenmiyordu. Ad konunca alanın sınırı ölçülmüyordu.
  - Paketin düzen, menü, kupon, blog ve görsel parçalarının bozuk örnekleri yoktu; düzenin blog kategorisi pakette denetlenmiyordu.
  - Tanımda dil ve saat dilimi varsayılana düşüyordu, önizleme yolu kalıpsızdı.
  - Paketin kayıttan çıkarılması `git` hatasını gizleyebiliyordu.
  - Paketin görüntünün derleme içeriğine girmesi, dosya yollarının iki yerde yazılması, tarifteki kaynak, `vitrin.md`'nin `paths` satırı ve karar kaydındaki dosya yolu.
- **Sonraki kartlara.**
  - Kimlikteki 0.81.0 bu koddan farklı bir çekirdeği gösteriyor: sürüm artırımı ve Örnek Mağaza'nın canlı veritabanındaki içeriğin pakete bağlanması kart 0351'de.
  - Tema Galerisi'nin kimliği 0.76.0'da; yayında değil, o sürümün görüntüsüyle açılmaz.
  - Panelde bütün paketlerin sunulması kart 0347'de.

## Durum

bitti
