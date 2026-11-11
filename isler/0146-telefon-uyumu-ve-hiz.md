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

## Durum

yapılacak
