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

2026-11-14, Örnek Mağaza, temiz deneme veritabanı. Hız: yavaş telefon (390 px, yavaş 4G, işlemci yerel makinede 4,1 kat), üç ölçümün ortancası; LCP ana içerik, CLS kayma, INP menü düğmesine tepki, kod sıkıştırılmış JavaScript.

| Sayfa | Önce LCP | Sonra LCP | CLS | INP | Kod önce → sonra |
|---|---|---|---|---|---|
| Ana sayfa | 1,51 sn | 1,16 sn | 0,004 | 96 ms | 309 → 289 KB |
| Kategori | 2,63 sn | 2,07 sn | 0,008 | 112 ms | 318 → 298 KB |
| Marka | 1,76 sn | 1,21 sn | 0,001 | 72 ms | 318 → 298 KB |
| Etiket | 1,91 sn | 1,26 sn | 0,001 | 56 ms | 318 → 298 KB |
| Arama | 1,75 sn | 1,13 sn | 0,002 | 56 ms | 318 → 298 KB |
| Ürün | 1,79 sn | 1,58 sn | 0,000 | 80 ms | 318 → 298 KB |
| Favoriler | 3,48 sn | 1,06 sn | 0,001 | 96 ms | 310 → 290 KB |
| Giriş | 1,07 sn | 1,08 sn | 0,031 | 72 ms | 310 → 290 KB |
| Kayıt | 1,03 sn | 1,08 sn | 0,030 | 72 ms | 310 → 290 KB |
| Bulunamadı | 2,98 sn | 2,29 sn | 0,001 | 48 ms | 309 → 288 KB |

"Önce" ölçümleri HTTP/2 vekiliyle, değişikliklerden önceki derlemededir. Giderilenler: her sayfaya giden zod (hesap durumu ve kök hata ekranı üzerinden), listenin ilk kartlarının ve öncelikli görsellerin yüklenme önceliği, çerezsiz favorilerin iskeleti (karar 0125). Bulunamadı sayfası sınıra en yakın olandır: Next.js 16 onu tarayıcıda çizer (karar 0104), kodla birlikte gelir.

Ekran: on sayfa türü 320, 390, 768 ve 1280 px'te, iki temada yana kaymadan, konsol hatasız ve taramadan geçer. Basılan alanı küçük bulunan iki yer düzeltildi: alt kısmın kısa adlı bağlantıları, ürün sayfasında başlığın üstündeki kategori bağlantısı.

Taslakla karşılaştırma (kategori, arama, ürün, favoriler, bulunamadı; iki tema, telefon ve bilgisayar): farklar kart 0195'te.

## Durum

yapılacak
