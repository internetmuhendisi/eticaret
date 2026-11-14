# 0124 · Vitrinin hız ölçümü ve hedefleri

## Tarih

2026-11-14

## Karar

Vitrinin her sayfa türü (ana sayfa, kategori, marka, etiket, arama, ürün, favoriler, giriş, kayıt, bulunamadı) kontrol hattında hız ölçümünden geçer (`pnpm hiz-olcumu`, kart 0146):

- Çekirdek canlıdaki gibi derlenir (`next build`) ve Next.js'in canlı sunucusuyla açılır; önünde canlıdaki ön kapı gibi şifreli HTTP/2 konuşan bir vekil durur (`komutlar/hiz-sunucusu.mts`).
- Sayfa yavaş telefon koşuluyla açılır: 390 px ekran, yavaş 4G (150 ms gecikme, 1,6 Mbit/s indirme), işlemci yavaşlatması. Yavaşlatma makinenin hızına göre ayarlanır: sabit bir hesabın süresi ölçülür, referans makinede 4 kattır.
- Her sayfa üç kez, temiz tarayıcıyla ölçülür; ortanca hedefle karşılaştırılır. Hedefler tek yerdedir (`cekirdek/testler/hiz/hedefler.ts`): ana içerik (LCP) 2,5 sn, yükleme kayması (CLS) 0,1, tıklamaya tepki (INP, menü düğmesi) 200 ms, sayfayla inen kod (sıkıştırılmış JavaScript) 320 KB. Aşan sayfa hattı durdurur.

## Neden

- Geliştirme sunucusu kodu sıkıştırmaz ve her isteği yeniden derler; hızı ölçmeye uygun değildir.
- Şifresiz bağlantıda tarayıcı HTTP/1.1 ile aynı anda en çok altı istek açar. Bu durumda görseller koddan sonra iniyordu ve ana içerik canlıdakinden farklı ölçülüyordu (ölçüldü). Canlıda ön kapı HTTP/2 konuşur.
- Hattın makinesi bilgisayardan yaklaşık iki kat yavaştır (playwright.config.ts). Sabit 4 kat yavaşlatma orada 8 kat yavaş bir telefon demek olur, hat rastgele kırmızıya düşerdi.
- İlk üç hedef `.claude/rules/performans.md`'deki hedeflerdir.
- Kod sınırı ölçümden konmuştur: ölçülen en büyük sayfa 298 KB'tır. Sınır büyümeyi durdurur; kodun küçültülmesi kart 0194'tür.

## Düşünülen diğer yollar

- **Lighthouse:** Ağır bir pakettir ve hattı yavaşlatır. Aynı ölçümleri tarayıcının kendi ölçüm arayüzüyle yapıyoruz; ağ ve işlemci koşulu Lighthouse'un telefon ayarıyla aynıdır.
- **Kutunun standalone derlemesiyle ölçmek:** Standalone klasörü çalışma kopyasında eksik toplanıyor, sunucu modülü yüklenemiyordu (ölçüldü). `next start` aynı derlemeyi sunar.
- **Gerçek ziyaretçilerin ölçümleri (alan verisi):** Henüz canlı ziyaretçi yok. Yayından sonra eklenebilir; hattı durduran kontrol yine laboratuvar ölçümü olur.

## Sonuçları

- Hattın her gönderimde bir derleme ve yaklaşık 3 dakika ölçüm yapması gerekir.
- Laboratuvar ölçümü gerçek ziyaretçiyi taklit eder, ölçmez. Tepki süresi yalnız menü düğmesiyle ölçülür. Kayma yalnız yükleme sırasında ölçülür.
- İşlemci ölçüsü makinenin o anki yüküne bağlıdır. Yük değişirse yavaşlatma da değişir (yerelde 4,1 ve 5,4 kat ölçüldü).
- Yerel ortak veritabanında görseller eksik olduğu için ölçüm, temiz bir deneme veritabanında anlamlıdır; hat temiz veritabanıyla çalışır.
