# 0196 · Kategori ve bulunamadı sayfaları hız hedefine girsin

## Amaç

Kart 0146'nın hız ölçümünde iki sayfanın ana içeriği (LCP) yavaş telefonda 2,5 saniye hedefini aşıyor ve kullanıcı kararıyla bilinen aşım listesinde duruyor (`cekirdek/testler/hiz/hedefler.ts`, karar 0124): kategori 2,78 sn, bulunamadı 3,66 sn (Lighthouse'un tarayıcı içi yavaş 4G değerleriyle, yerelde).

- **Bulunamadı:** Next.js 16 `notFound()` sayfasını sunucuda HTML olarak çizmez, tarayıcıda çizer (karar 0104). İlk görünüm ve ana içerik kod inince gelir.
- **Kategori:** ana içerik ilk ürün görselidir. Görsel öncelikli yüklense de kodla (yaklaşık 300 KB) ve dört yazı tipi dosyasıyla (Inter'in Türkçe harfleri taşıyan dosyası 83 KB, toplam yaklaşık 170 KB) aynı anda iner.

Bölüm: Vitrin.

## Olmazsa olmazlar

- Bulunamadı sayfasının sunucuda HTML olarak çizilip çizilemeyeceği ölçülerek araştırılsın; durum kodu 404, `noindex` ve çerçeve korunsun.
- Yazı tiplerinin yüklenmesi ölçülsün: Türkçe harfler için daha küçük bir alt küme, önyükleme ya da öncelik; seçilen yol karar kaydına yazılsın.
- İki sayfa hedefe girince bilinen aşım listesinden çıkarılsın.

## Sınırlar

- Yazı tipinin kendisi (tasarım) değişmez.
- Tarayıcıya giden kodun genel küçültülmesi kart 0194'tür.

## Bitti sayılır

- Kategori ve bulunamadı sayfası hız ölçümünde hedefin içinde, bilinen aşım listesi boş; ölçümler karta yazıldı.

## Durum

yapılacak
