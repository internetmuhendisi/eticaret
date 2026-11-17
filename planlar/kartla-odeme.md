# Kartla ödeme eklentisinin planı (kart 0215)

Tarif: `eklentiler/kartla-odeme.md`. Kurulum `/eklenti-ekle` adımlarıyla (kart 0145), çalışma kopyası `.claude/worktrees/0215`.

## Kullanıcının kararları (2026-11-17)

| Soru | Karar |
|---|---|
| Ödeme kuruluşu | iyzico (karşılaştırma ve kaynaklar karar 0142'de) |
| Taksit seçimi nerede | iyzico'nun formunda, kartın ilk hanelerine göre. Ürün sayfasındaki pencere bankalara göre genel tabloyu gösterir. |
| Ödeme alındı ama ayırma süresi dolup ürün satıldıysa | Ödeme aynı gün iyzico'nun iptal ucuyla geri alınır, sipariş kurulmaz, müşteri ödeme adımına metinle döner. |
| Örnek Mağaza | Açık, iyzico'nun deneme ortamında |
| Kart formu nerede | iyzico'nun sayfasına gidilir, ödeyince sitemize dönülür (form sayfamıza gömülmez) |
| Alıcının kimlik numarası | Sorulmaz: kurumsal faturada vergi numarası, bireyselde yer tutucu `11111111111`. Canlıya geçmeden iyzico'ya teyit. |

Önerilen ayarlar (tarif, Ayarlar): eklenti kapalı başlar (Örnek Mağaza açık), ortam deneme, ürün sayfasında taksit "göster", en çok taksit 12 (Örnek Mağaza 6).

## Çekirdekte kurulacak bağlantı noktaları

Eklenti çekirdeğe yalnız bağlantı noktalarından bağlanır (karar 0117). Bugünkü noktalar yetmez, iki yeni nokta kurulur:

1. **Ödeme yöntemi noktası** (`cekirdek/eklentiler/odeme-yontemleri.ts`): kayıttaki yöntem (`kart`) bir eklentiye bağlıdır; eklenti kapalıysa yöntem kapalı sayılır (`kullanilabilirYontemler`). "Siparişi onayla"da eklentili yöntem seçildiyse ödeme servisi oturumu ve ayırmayı yazar, siparişi kurmaz, eklentinin `baslat` işlevini çağırır; işlev müşterinin gideceği adresi verir. Başlatılamazsa ayırma bırakılır, müşteri "yontem-ulasilamadi" görür. Ödeme formu adres dönünce oraya gider.
2. **Dış kuruluşun kapıya dönüşü** (`ucTanimla`'da `disKurulus` beyanı): ödeme kuruluşunun tarayıcıyla geri gönderdiği form isteği (başka siteden gelir, sahte istek denetimi uygulanmaz, çerez kullanılmaz) ve sunucudan sunucuya bildirim. Girdi form ya da JSON gövdedir, istek sınırı `bildirim` (bol), uç `Yonlendirme` döndürerek 303 verebilir. Doğruluk imzadan ve ödeme kuruluşuna yapılan sorgudan gelir, istekten gelmez.

Ayrıca sipariş genelleşir: yöntem `kart`, durum "hazırlanıyor" (kayıtta geçişleriyle), siparişin tahsilat bilgisi (`tahsilat`: ödenen tutar, taksit, kartın son dört hanesi) siparisiKur girdisinden yazılır; sipariş alındı sayfası bunu gösterir.

## Eklenti

- `cekirdek/eklentiler/kartla-odeme/`: `model.ts` (kart ödemeleri), `iyzico.ts` (kuruluşa özgü tek dosya: imza, ödeme formu, sonuç, iptal, taksit, rapor, bildirim imzası; zaman aşımı), `servis.ts` (başlat, tamamla, iptal, taksit tablosu, karşılaştırma), `semalar.ts`, `isler.ts` (günlük karşılaştırma, terk edilmiş ödemelerin sonucu), ürün sayfası yuvası, `testler/`.
- Uçlar: `POST /kapi/herkese-acik/kartla-odeme/donus` (tarayıcı dönüşü, 303), `POST /kapi/herkese-acik/kartla-odeme/bildirim` (imzalı bildirim), `GET /kapi/herkese-acik/kartla-odeme/taksitler` (ürün sayfası tablosu).
- Tamamlama tek işlevdir (dönüş, bildirim ve karşılaştırma aynısını çağırır): iyzico'dan sonucu sorar, imzasını doğrular, başarılıysa siparişi oturumdan kurar. Oturum satırı kilitli, sipariş oturuma tekil: iki dönüş bir sipariş. Stok yoksa ödemeyi iptal eder.
- Gizli bilgiler: `KARTLA_ODEME_ANAHTARI`, `KARTLA_ODEME_GIZLI_ANAHTARI`.

## Testler

- Sahte iyzico (yerel HTTP sunucusu, belgelerdeki biçim ve imzalar) ile: başarılı, taksitli, başarısız, yarıda kalan ödeme; iki kez dönüş ve bildirim; imzasız ve yanlış imzalı bildirim; tarayıcıdan gelen "başarılı"; stok yokken iptal; kuruluşa ulaşılamaması; kapalı eklenti; karşılaştırmada üç uyuşmazlık; iki site.
- Gerçek iyzico deneme ortamı bir kez elle, deneme kartlarıyla baştan sona (anahtarlar kullanıcıdan); hatta değil.
- Tarayıcıda ödeme adımından sahte kuruluşa gidip dönme, hata kutusu, taksit penceresi; iki renk, üç genişlik, klavye.
- Her denetim bilerek bozularak kırmızıya düşürülür.
