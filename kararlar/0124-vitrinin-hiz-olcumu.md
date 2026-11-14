# 0124 · Vitrinin hız ölçümü ve hedefleri

## Tarih

2026-11-14

## Karar

Vitrinin her sayfa türü (ana sayfa, kategori, marka, etiket, arama, ürün, favoriler, giriş, kayıt, bulunamadı) kontrol hattında hız ölçümünden geçer (`pnpm hiz-olcumu`, kart 0146):

- Çekirdek canlıdaki gibi derlenir (`next build`) ve Next.js'in canlı sunucusuyla açılır; önünde canlıdaki ön kapı gibi şifreli HTTP/2 konuşan bir vekil durur (`komutlar/hiz-sunucusu.mts`).
- Sayfa yavaş telefon koşuluyla açılır: 390 px ekran; Lighthouse'un telefon ayarının (yavaş 4G) tarayıcı içi yavaşlatmadaki karşılığı olan ağ (her isteğe 562,5 ms gecikme, 1,47 Mbit/s indirme); işlemci yavaşlatması. Yavaşlatma makinenin hızına göre her sayfadan önce ayarlanır: sabit bir hesabın süresi ölçülür, referans makinede 4 kattır, hiçbir makinede 2 kattan az değildir.
- Her sayfa üç kez, temiz tarayıcıyla ölçülür; ortanca hedefle karşılaştırılır. Hedefler tek yerdedir (`cekirdek/testler/hiz/hedefler.ts`): ana içerik (LCP) 2,5 sn, yükleme kayması (CLS) 0,1, tıklamaya tepki (INP, menü düğmesi) 200 ms, sayfayla inen JavaScript (sıkıştırılmış) 320 KB. Aşan sayfa hattı durdurur.
- Bugün hedefi aşan sayfalar bir bilinen aşım listesindedir (kullanıcı kararı): kategori ve bulunamadı sayfalarının ana içeriği. Listedeki ölçü hedefi aşabilir ama kendi üst sınırını aşamaz (kategori 3,5 sn, bulunamadı 4,5 sn). Liste yalnız küçülebilir. Düzeltmeleri kart 0196'dadır.

## Neden

- Geliştirme sunucusu kodu sıkıştırmaz ve her isteği yeniden derler; hızı ölçmeye uygun değildir.
- Şifresiz bağlantıda tarayıcı HTTP/1.1 ile aynı anda en çok altı istek açar. Bu durumda görseller koddan sonra iniyordu ve ana içerik canlıdakinden farklı ölçülüyordu (ölçüldü). Canlıda ön kapı HTTP/2 konuşur.
- Hattın makinesi bilgisayardan yaklaşık iki kat yavaştır (playwright.config.ts). Sabit 4 kat yavaşlatma orada 8 kat yavaş bir telefon demek olur, hat rastgele kırmızıya düşerdi. Ayar bir kez yapılınca anlık yüke denk gelip ölçümün tamamını yavaşlatmasız bırakabiliyordu (bağımsız kontrolde ölçüldü: 3,8; 3,4; 1,03 kat); bu yüzden her sayfadan önce yapılır ve alt sınırı vardır.
- İlk ölçüm 150 ms gecikme ve 1,6 Mbit/s ile yapılmıştı. Bunlar Lighthouse'un tahmin yöntemindeki değerlerdir. Tarayıcı içi yavaşlatma gecikmeyi her isteğe bir kez ekler; Lighthouse bu yöntemde gecikmeyi 3,75, hızı 0,9 katına çeker. Eski değerlerle sayfalar olduğundan hızlı ölçülüyordu (kategori 2,07 sn yerine 2,75 sn).
- İlk üç hedef `.claude/rules/performans.md`'deki hedeflerdir.
- Kod sınırı ölçümden konmuştur: ölçülen en büyük sayfa 298 KB'tır. Sınır büyümeyi durdurur; kodun küçültülmesi kart 0194'tür.

## Düşünülen diğer yollar

- **Lighthouse:** Ağır bir pakettir ve hattı yavaşlatır. Aynı ölçümleri tarayıcının kendi ölçüm arayüzüyle yapıyoruz; ağ koşulu Lighthouse'un tarayıcı içi yavaşlatmadaki değerleridir, işlemci yavaşlatması makineye göre ayarlanır.
- **Hedefi aşan iki sayfayı bu kartta düzeltmek:** Bulunamadı sayfası Next.js 16'da tarayıcıda çizilir (karar 0104), kategoride Türkçe harfli yazı tipi dosyası (83 KB) ve kod görselle aynı anda iner; ikisi de derin iştir. Kullanıcı ölçümün bugün kurulmasını, iki sayfanın listeye yazılmasını seçti.
- **Kutunun standalone derlemesiyle ölçmek:** Standalone klasörü çalışma kopyasında eksik toplanıyor, sunucu modülü yüklenemiyordu (ölçüldü). `next start` aynı derlemeyi sunar.
- **Gerçek ziyaretçilerin ölçümleri (alan verisi):** Henüz canlı ziyaretçi yok. Yayından sonra eklenebilir; hattı durduran kontrol yine laboratuvar ölçümü olur.

## Sonuçları

- Hattın her gönderimde bir derleme ve yerelde yaklaşık 5 dakika süren ölçüm yapması gerekir.
- Laboratuvar ölçümü gerçek ziyaretçiyi taklit eder, ölçmez. Tepki süresi yalnız menü düğmesiyle ölçülür. Kayma yalnız yükleme sırasında ölçülür.
- İşlemci ölçüsü makinenin o anki yüküne bağlıdır. Yük değişirse yavaşlatma da değişir (yerelde 4,1 ve 5,4 kat ölçüldü).
- Yerel ortak veritabanında görseller eksik olduğu için ölçüm, temiz bir deneme veritabanında anlamlıdır. Hatta veritabanı her çalışmada sıfırdan açılır; hız ölçümü tarayıcı testlerinden sonra, onların kullandığı aynı veritabanında çalışır.
- Ölçüm bu kararın yazıldığı gün yalnız yerelde denendi; hattaki ilk çalışması ve hattın makinesindeki süresi ilk gönderimle görülür.
