# Tema Galerisi

Hazır temaların gezilebilir demosu (kart 0116, karar 0127).

- Site ayarı `temaDemosu` açıktır:
  - Ziyaretçi temayı adresten seçer (`/?tema=canli-carsi`, `yumusak-mevsim`, `keskin-cizgi`) ve yalnız gezer.
  - Hesap, giriş, sipariş, yorum ve bildirim yoktur.
  - Site arama motorlarına kapalıdır.
- Gerçek satış yapılmaz. E-posta göndermez (gönderen adresi yok), eklenti açmaz. Site kimseye teslim edilmez.
- Kataloğu, menüleri ve düzeni Örnek Mağaza'nın 2026-11-15 tarihindeki başlangıç dosyalarının kopyasıdır (`baslangic/`). Bundan sonra Örnek Mağaza'dan bağımsızdır. Örnek Mağaza'nın logosu ve iletişim bilgileri alınmadı: mağaza adı yazıyla görünür.
- Örnek ürünlerin durumları (taslak, zamanlanmış, indirimli, tükenmiş) Örnek Mağaza'nın `KURALLAR.md` tablosuyla aynıdır. O tablo yalnız Örnek Mağaza için testlidir.
- "Öne çıkanlar" 10 üründür (kullanıcı kararı, kart 0116): üç tema aynı düzeni paylaşır. Canlı Çarşı ve Keskin Çizgi'de geniş ekranda iki dolu sıradır, Yumuşak Mevsim'de 4 + 4 + 2. Örnek Mağaza'nın düzenine beş ürün eklendi; "Yeni gelenler"in son dört ürünü bilerek seçilmedi. Testi `testler/demo.test.ts`.
