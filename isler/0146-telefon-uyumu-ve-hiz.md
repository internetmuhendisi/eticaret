# 0146 · Vitrinin telefon uyumu ve hızı

## Amaç

Vitrin sayfaları canlıya çıkmadan önce bütün vitrin telefonda ve yavaş bağlantıda ölçülür. Kontrol tablosunda "Ekran ölçümü" ve "Hız ve boyut ölçümü" kurulmadı (`.claude/rules/kurallari-koruyan-kontroller.md`); bu kartla kurulur.

Bölüm: Vitrin. Bu bölümün sayfa kartlarından sonra yapılır.

## Olmazsa olmazlar

- Ekran ölçümü: vitrinin her sayfa türü (ana sayfa, kategori, marka, etiket, arama, ürün, favoriler, giriş, kayıt, bulunamadı) 320, 390, 768 ve 1280 px'te açılır; yana kayma, konsol hatası, erişilebilirlik taraması ve dokunma alanı ölçülür. Kontrol hattında çalışır.
- Hız ölçümü: her sayfa türünde yüklenme süreleri (LCP, CLS, INP) ve indirilen kod boyutu yavaş telefon koşuluyla ölçülür. Hedefler `.claude/rules/performans.md` ile karar kaydına yazılır, aşan sayfa hattı durdurur.
- Ölçümle bulunan yavaşlık giderilir: görsel boyutları ve öncelikleri, yazı tiplerinin yüklenmesi, tarayıcıya giden kod.
- Kart 0130 (bülten bağlantısının hizası) bu ölçümden önce kapanır.
- Bütün sayfalar bir kez daha taslakla yan yana, iki temada, telefon ve bilgisayarda karşılaştırılır.

## Sınırlar

- Sunucu tarafı ön bellek ve CDN bu kartta kurulmaz; gerekirse ölçümle ayrı kart açılır.

## Bitti sayılır

- Ekran ve hız ölçümü kontrol hattında, bilerek bozulan bir sayfayla kırmızıya düşüyor.
- Her sayfa türü hedefin içinde; ölçümler karta yazıldı.
- Kontrol tablosunun iki satırı güncellendi.

## Ölçümler

2026-11-14, Örnek Mağaza, temiz deneme veritabanı, yerelde. Hız: 390 px, üç ölçümün ortancası; LCP ana içerik, CLS kayma, INP menü düğmesine tepki, kod sıkıştırılmış JavaScript.

İlk ağ değerleriyle (150 ms, 1,6 Mbit/s; işlemci yaklaşık 4 kat), değişikliklerden önce ve sonra:

| Sayfa | Önce LCP | Sonra LCP | Kod önce → sonra |
|---|---|---|---|
| Ana sayfa | 1,51 sn | 1,16 sn | 309 → 289 KB |
| Kategori | 2,63 sn | 2,07 sn | 318 → 298 KB |
| Marka | 1,76 sn | 1,21 sn | 318 → 298 KB |
| Etiket | 1,91 sn | 1,26 sn | 318 → 298 KB |
| Arama | 1,75 sn | 1,13 sn | 318 → 298 KB |
| Ürün | 1,79 sn | 1,58 sn | 318 → 298 KB |
| Favoriler | 3,48 sn | 1,06 sn | 310 → 290 KB |
| Giriş | 1,07 sn | 1,08 sn | 310 → 290 KB |
| Kayıt | 1,03 sn | 1,08 sn | 310 → 290 KB |
| Bulunamadı | 2,98 sn | 2,29 sn | 309 → 288 KB |

Bağımsız kontrolün bulgusuyla hız ölçümü Lighthouse'un tarayıcı içi değerlerine geçti (562,5 ms, 1,47 Mbit/s; işlemci her sayfadan önce ayarlanır, en az 2 kat). Son durum (hız ölçümünün kendi çıktısı):

| Sayfa | LCP | CLS | INP | Kod |
|---|---|---|---|---|
| Ana sayfa | 2,14 sn | 0,004 | 144 ms | 289 KB |
| Kategori | **2,78 sn** (bilinen aşım, kart 0196) | 0,008 | 64 ms | 298 KB |
| Marka | 2,14 sn | 0,001 | 96 ms | 298 KB |
| Etiket | 2,19 sn | 0,001 | 64 ms | 298 KB |
| Arama | 2,08 sn | 0,002 | 104 ms | 298 KB |
| Ürün | 2,46 sn | 0,000 | 80 ms | 298 KB |
| Favoriler | 1,97 sn | 0,001 | 88 ms | 290 KB |
| Giriş | 1,96 sn | 0,031 | 72 ms | 290 KB |
| Kayıt | 1,96 sn | 0,029 | 96 ms | 290 KB |
| Bulunamadı | **3,66 sn** (bilinen aşım, kart 0196) | 0,001 | 40 ms | 288 KB |

Giderilenler: her sayfaya giden zod (hesap durumu ve kök hata ekranı üzerinden), listenin ilk kartlarının ve öncelikli görsellerin yüklenme önceliği, çerezsiz favorilerin iskeleti (karar 0125). Kategori ve bulunamadı kullanıcı kararıyla bilinen aşım listesinde: bulunamadı sayfasını Next.js 16 tarayıcıda çizer (karar 0104), kategoride Türkçe harfli yazı tipi dosyası (83 KB) ve kod görselle aynı anda iner. Ürün ve ana sayfa sınıra yakın.

Ekran: on sayfa türü 320, 390, 768 ve 1280 px'te, iki temada yana kaymadan, konsol hatasız, 400 ve üstü yanıtsız ve taramadan geçer. Basılan alanı küçük bulunan iki yer düzeltildi: alt kısmın kısa adlı bağlantıları, ürün sayfasında başlığın üstündeki kategori bağlantısı.

Taslakla karşılaştırma (iki tema, telefon ve bilgisayar): ana sayfa (`secenekler.html`), kategori, arama, ürün, favoriler ve bulunamadı (`sayfalar.html`). Marka ve etiket sayfası kategoriyle aynı şablondur; giriş ve kayıt sayfasının taslağı yoktur. Farklar kart 0195'te.

Hız ölçümü bu kartta yalnız yerelde çalıştı; hattaki ilk çalışması gönderimle görülür.

## Durum

yapılacak
