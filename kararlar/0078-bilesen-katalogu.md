# 0078 · Bileşen kataloğu: yeri, açıldığı ortamlar ve kapsam kontrolü

## Tarih

2026-11-09

## Karar

Ortak kütüphanenin parçaları tek bir katalogda canlı örnekleriyle görünür (kart 0104). Katalog geliştirmede ve deneme ortamında açıktır. Canlıda kapalıdır.

**Yer ve yapı:**
- Adres: `/gelistirme/bilesenler`. Bu, 0.33.0'daki deneme sahnesinin adresidir; sahne kataloğun ana sayfası oldu.
- Her parçanın kendi sayfası vardır: `/gelistirme/bilesenler/<parça>`. Parça sayfası canlı örneği, dosyayı ve parçayı kullanan dosyaları gösterir.
- Kod `cekirdek/katalog/` altındadır:
  - `kayit.ts`: parça listesi.
  - `ornekler/`: her parçanın örneği, kütüphanedeki dosyayla aynı adla.
  - `katalog-sayfasi.tsx`: sayfa.
  - `acik-mi.ts`: açılma kuralı.
  - `kapi.ts`: sayfa içindeki ikinci kapı.
  - `tarama.ts`: kaynak taraması.
  - `kullanimlar.json`: kullanıldığı yerler listesi.
- Her parça bir kütüphane dosyasıdır: `bilesenler/` altındaki her `.tsx` dosyası, alt klasörlerde ve yeni klasörlerde de. Testler ve shadcn kaynağı bunun dışındadır. `.ts` dosyaları yardımcıdır, bileşen `.tsx` dosyasında yazılır.

**Açıldığı yerler:**
- Geliştirme sunucusunda ve deneme ortamındaki kutuda açılır (`NODE_ENV=development` ya da `SITE_ORTAMI=deneme`).
- Canlı kutuda ve ortamı bilinmeyen kutuda adres 404'tür. İki kapı vardır:
  - **Asıl kapı ara katmandadır** (`cekirdek/uygulama/proxy.ts`). `/gelistirme` altındaki her istek, katalog kapalıysa sayfaya ulaşmadan gövdesiz 404 alır: RSC isteği, ön yükleme, HEAD ve öteki yöntemler de.
  - Adres çözülmüş hâliyle karşılaştırılır. Kodlanmış yazılış (`/%67elistirme/...`, `/gelistirme%2F...`) önce kapıdan geçmeden panel dalına düşüyordu (bağımsız kontrol, ölçüldü). Çözülemeyen adres de katalog adresi sayılır.
  - **İkinci kapı sayfadadır** (`kapi.ts`). Düzen, her sayfa ve her sayfa bilgisi (`generateMetadata`) onu ayrıca çağırır.
  - Yalnız düzende `notFound()` yetmez. Next.js 16 düzenle sayfayı ayrı çizer: içerik 404'ün gövdesinde gidiyordu, RSC isteğinde 200 dönüyordu. Bağımsız kontrol bunu gerçek görüntüde ölçtü.
- Değişken eksik ya da yanlışsa katalog kapalı kalır.
- Yayın komutu her site kutusuna ortamını `SITE_ORTAMI` ile verir. Değişkenin adı ve ortamların adları (`siteOrtamlari`) `cekirdek/kayitlar/site.ts`'tedir. Komutların ortam listesi bu adlara tür kontrolüyle bağlıdır.
- Deneme adresinde katalog herkese açıktır, giriş istemez (kullanıcı kararı). Arama motorlarına kapalıdır.
- Bunun için katalog canlı derlemeye ve görüntüye girer. Karar 0077'deki geliştirmeye özel sayfa düzeni (`page.deneme.tsx`, `pageExtensions`) kaldırıldı. Bu, 0077'nin "Deneme sahnesi" bölümünü değiştirir; 0077'nin geri kalanı geçerlidir.

**Renk ve genişlik:**
- Seçim adrestedir: `?renk=acik|koyu`, `?genislik=telefon|tablet|masaustu`.
- Renk sayfanın kökündeki `data-renk` özniteliğine yazılır. Adı "renk"tir, "tema" değildir: tema, kart 0105'teki hazır temalardır. Tasarım değerlerinin CSS'i bu öznitelik için açık ve koyu değerleri ayrıca yazar, cihazın tercihinin önüne geçer. Öznitelik kökte olduğu için gövdeye çizilen pencere ve menüler de seçilen renkte görünür.
- Genişlik seçilince sayfa o genişlikte bir çerçevede (`iframe`) aynı renkle açılır. Çerçeve sayfadan genişse kendi kutusunda kayar.
- Tema seçimi kart 0105'le gelir. Bugün katalog sitenin tasarım değerleriyle çizilir.

**Kapsam kontrolü:**
- Kütüphanedeki her parça dosyası `kayit.ts`'te olmalıdır.
- Dosyanın dışa açtığı her parça örneklerde içe aktarılmalıdır. Parça, büyük harfle başlayan işlev, sabit, değişken ya da sınıftır; yeniden aktarılan ad da sayılır.
- Varsayılan aktarma varsayılan içe aktarmayla karşılanır.
- Toplu yeniden aktarma (`export *`) hiç karşılanmaz: parçalar adlarıyla aktarılır. `export * as Ad` ise Ad adıyla karşılanır.
- Eksik olan test kırmızıdır (`cekirdek/katalog/testler/kapsam.test.ts`).
- Yalnız türü alan aktarma kullanım sayılmaz.

**Kullanıldığı yerler:**
- `pnpm katalog-kullanimlari` kütüphane dosyalarını içe aktaran bütün kaynak dosyaları bulur ve `kullanimlar.json`'a yazar.
- Taranan klasörler `cekirdek/`, `bilesenler/` ve `sahip-paneli/`'dir. Testler, katalog ve shadcn kaynağı sayılmaz.
- Dosyanın kodla aynı olduğunu bir test denetler.
- Tarama düzenli ifadeyle yapılır: TypeScript 7'nin JavaScript arayüzü yoktur (ölçüldü). Dosyalar Biome'dan geçtiği için aktarma satırları tek biçimdedir.

## Neden

- Katalog kütüphanedeki her değişikliğin etkisini tek yerde gösterir. Liste kütüphaneden türetilmez, elle yazılır: her parçanın anlamlı örneği ve seçenekleri ancak elle yazılabilir. Unutmayı test yakalar.
- Deneme ortamında açık olması kataloğu bilgisayar kurmadan, telefondan da görmeyi sağlar. Katalogda mağaza verisi yoktur, yalnız örnek metinler vardır.
- Kapının ortam değişkeninin varlığına değil değerine bağlı olması güvenli tarafa düşer: unutulan değişken kataloğu açmaz.
- "Kullanıldığı yerler" listesinin dosyada durması gerekir: görüntüde kaynak kod yoktur, sayfa listeyi canlıda hesaplayamaz.
- Ayrı bir sayfa (deneme sahnesi) ile ayrı bir katalog tutmak aynı örneklerin iki kopyası olurdu. Klavye ve tarama testleri kataloğun ana sayfasında çalışır.

## Düşünülen diğer yollar

- **Kataloğu yalnız geliştirmede tutmak (0077'deki gibi):** Daha az kod derlemeye girerdi. Kart deneme ortamında açılmasını istiyor; kullanıcı kataloğu ancak deneme adresinden görebilir.
- **Deneme adresinde girişle açmak:** Panel girişi istemek mümkündü. Kullanıcı herkese açık olmasını seçti; katalogda veri yoktur.
- **Storybook gibi ayrı bir araç:** Ayrı bir derleme, ayrı bağımlılıklar ve ayrı bir sunucu demekti. Katalog sitenin kendi düzeninde, sitenin tasarım değerleriyle ve gerçek metin okuyucusuyla çizilir; ayrı araçta bunlar taklit edilirdi.
- **Parça listesini kütüphaneden kendiliğinden türetmek:** Bir parçanın anlamlı örneğini kod üretemez. Kendiliğinden liste, eksik örneği gizlerdi.
- **Kullanıldığı yerleri istekte hesaplamak:** Görüntüde kaynak kod yoktur.
- **İki temayı yan yana çizmek:** Tasarım değerleri sayfanın kökündedir. Açılır parçalar gövdeye çizildiği için yan yana iki tema parçalarda doğru görünmezdi. Seçim sayfanın tamamını değiştirir.

## Sonuçları

- Katalog ve örnekleri görüntüye girer, her sitenin kutusunda bulunur. Kapalı olduğu ortamda bile kodu oradadır.
- `SITE_ORTAMI` yalnız 0.34.0 ve sonraki yayınlarda verilir. Eski görüntü değişkeni okumaz.
- Yeni bir parça eklenince üç yer değişir:
  - `kayit.ts`
  - örnek dosyası
  - `ornekler.tsx`'teki eşleme (tür kontrolü eksik eşlemeyi yakalar)

  Bir parçayı kullanan dosya eklenince `pnpm katalog-kullanimlari` çalıştırılır, yoksa test kırmızıdır.
- Düzenli ifadeyle taramanın kabul edilen sınırları:
  - Yorum içine yazılmış bir aktarma satırı da kullanım sayılır.
  - Ad alanıyla içe aktarma (`import * as`) örnekte kullanım sayılmaz.
  - `require` ve `.js` dosyaları taranmaz; projede yoktur.
  - Tek satırda birden çok ad (`export const A = 1, B = 2`) ve parçalanarak aktarma (`export const { Root: A } = X`) tanınmaz. Kütüphane her parçayı kendi satırında yazar; yeni dosya zaten dosya düzeyinde kırmızıdır.
- Kapalı ortamı yerel ortam denemesi aynı görüntüde ölçer. Kutunun içinde ikinci bir süreç açılır: bir kez canlı ortamla, bir kez değişken hiç yokken (`env -u`). Her biri ayrı portta açılır ve ortam değişkeniyle bulunup kapatılır (Next.js süreç adını değiştirir). Ölçülenler:
  - Port önce boştur, sonra kapanır.
  - Vitrin açılır.
  - Katalog düz istekte, RSC isteğinde, ön yüklemede, HEAD'de ve adresin başka yazılışlarında 200 almaz, içeriği gövdede gitmez.
  - İki asıl adres ve iki kodlanmış yazılış tam 404 alır, yani ara katmanın kapısından geçer; panel yönlendirmesi kabul edilmez.

  Gerçek canlı ortam henüz yoktur.
- Renk sayfa yüklendikten sonra yazılır. `?renk=` ile açılan sayfa bir an cihazın renginde görünebilir; bu ölçülmedi.
- Önizleme çerçevesinin yüksekliği sabit 900 pikseldir, daha uzun sayfa çerçevenin içinde kayar. Yalnız katalogda kullanılır.
- Görüntü farkı karşılaştırması (önceki sürümle) bu kararda yoktur, ekran ölçümü kontrolüyle gelir.
