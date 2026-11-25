# 0287 · Panelde yenileme sırasında sayfa başlığı bir an boşalıyor

## Amaç

Hattın 44956487389 numaralı çalışmasında (kart 0264) ürün seçenekleri tarayıcı testi erişilebilirlik taramasında "document-title" hatası verdi. İzde şu görüldü: ürün ekranında tekrarlı değerle Kaydet 409 (çakışma) aldı, panel sayfayı sunucudan yeniledi (`router.refresh`, `cekirdek/yonetim-paneli/panel-islemi.ts`). Yenileme yanıtı geldikten sonra sayfanın `<title>` öğesi yaklaşık 1,3 saniye yoktu, tarama da bu araya denk geldi.

Test, yenilemenin bitmesini ve başlığın dolu olmasını bekleyecek biçimde düzeltildi (hat düzeltmesi, 2026-11-22). Başlığın boşalmasının kendisi ölçülmedi. Bu boşalma yalnız geliştirme sunucusunda mı oluyor, canlı derlemede (`next start`) de oluyor mu, bilinmiyor. Yerelde 4 denemede üretilemedi.

## Olmazsa olmazlar

- Önce ölçülür: panelde bir işlemden sonraki yenilemede, canlı derlemede ve geliştirme sunucusunda, `<title>` öğesinin kaybolup kaybolmadığı ve ne kadar süre yok kaldığı (örneğin `MutationObserver` ile) ölçülür.
- Canlı derlemede de boşalıyorsa sebebi bulunur ve düzeltilir. Sebep Next.js ya da React'taysa karar kaydıyla yazılır.
- Yalnız geliştirme sunucusunda boşalıyorsa bu not edilir, tarama yardımcısının beklemesi (kart 0288) yeterli sayılır.

## Sınırlar

- Panelin çakışmadan sonra sayfayı yenilemesi değiştirilmez: o davranış bilerek yazılmıştır (kart 0143).

## Bitti sayılır

- İki derlemede de ölçüm yapıldı, sonuç kartın notlarına yazıldı.
- Düzeltme gerektiyse düzeltme geri alınınca kırmızıya düşen bir test var.
- Bağımsız kontrol yapıldı.

## Notlar

- Kart 0293 (2026-11-23): aynı belirti vitrinde de görüldü. Hat 45045593092'de `iade-talebi.test.ts` takip sayfasında siparişi iptal ettikten sonraki taramada `document-title` buldu. İzin ağ zamanlarına göre iptal isteği 441,88. saniyede gitti, yenileme (`router.refresh`, `cekirdek/vitrin/siparis/siparis-iptali.tsx`) 442,02'de başlayıp 132 ms'de bitti; tarama 442,43'te, yani yenileme bittikten sonra başladı ve başlık yine yoktu. Panelde ölçülenle aynı: başlık yenileme yanıtından sonra yok kalıyor.
- Yerelde geliştirme sunucusunda, normal ve 4 kat yavaş işlemciyle, `<title>`'ı izleyen bir `MutationObserver` ile iki kez ölçüldü: başlık hiç kaybolmadı. Hatta görülüp yerelde üretilemiyor.
- Kart 0293'te iade talebi testinin taraması başlığın dolmasını bekler (ürün seçenekleri testindeki gibi). Başlığın neden kaybolduğu ve canlı derlemede de olup olmadığı bu kartın ölçümüdür; tarama beklemeleri kart 0288 ile tek yere toplanır.
- Ölçüm (2026-11-25):
  - Hat 45579570940'ta (kayıt b8ea35f) `musteriler.test.ts` "müşteri ayrıntısı light 375" `document-title` ile düştü. İzin sayfa görüntüleri birleştirilerek okundu: not kaydından sonraki yenilemenin yanıtı geldikten sonra başlık hâlâ yerindeydi; yeni içerik sayfaya işlendiği anda (~250 ms sonra) `<title>` kalktı, ~340 ms sonra (tarama sürerken) geri geldi. Yenilemeden hemen önce tarayıcıda "[Fast Refresh] rebuilding … done" vardı.
  - Mekanizma Next.js 16.4.6'da (kodda okundu; gözlenen 300–340 ms boşluklarla uyuyor, bölümün baştan kurulduğu ayrıca ölçülmedi): yenilemenin cevabında sayfa bilgisini taşıyan bölümün anahtarı isteğin kimliğinden üretilir (`next/dist/server/app-render/app-render.js`, `getFlightMetadataKey(requestId)`). Her yenilemede anahtar değişir, React bölümü (`Suspense name="Next.Metadata"`) baştan kurar. Sayfa bilgisi o anda çözülmemişse eski başlık kalkar, yenisi React'in gösterim bekletmesinden (300 ms) sonra gelir. Ölçülen boşluklar 300–340 ms.
  - Yerelde ölçüldü (`window.next.router.refresh()`, `<title>`'ı izleyen `MutationObserver`, yenileme başına 4 sn; yüksüz makine). Geliştirme sunucusunda müşteri ayrıntısında, sayfa bilgisi geciktirilmeden: listeden geçişle 15 yenilemenin 3'ünde, doğrudan açılışla 15'in 4'ünde başlık kayboldu (her biri ~300 ms). Müşteri listesinde 15'in 0'ı; favorilerde sayfa bilgisi 1,5 sn geciktirilince de 3'ün 0'ı.
  - Canlı derlemede (`next build`, `next start`) aynı sayfada 35 yenilemenin hiçbirinde kaybolmadı: gecikmesiz 15, sayfa bilgisi 300 ms ve 1500 ms geciktirilince 10'ar (gecikme ölçüm için geçici olarak `panelSayfaBilgisi`'ne kondu, kayda girmedi). Müşteri listesinde de 15'in 0'ı. Yani hız farkı değil: canlıda yavaş sayfa bilgisi de başlığı boşaltmadı. Geliştirme sunucusunda neden olup canlıda neden olmadığı ayrıca ölçülmedi.
  - Önceki şüphe (kod güncellemesi, "Fast Refresh") tek başına sebep değil: tarayıcı bileşeni dosyası değiştirilerek tetiklenen güncellemeden sonraki 3 yenilemede başlık kaybolmadı.
  - Bağımsız kontrolün bulguları: anahtar canlıda da her istekte değişir (çalışan kod `next/dist/compiled/next-server/app-page-turbo.runtime.prod.js`, `key: <istek kimliği>+"m"`; kimlik canlıda her istekte `nanoid()`). Akan sayfa bilgisi iki modda aynıdır (`next/dist/server/lib/streaming-metadata.js` yalnız sınırlı botlarda kapatır), `needsFullTree` bu uygulamada devrede değildir (`cacheComponents` yok), istemcinin yönlendiricisinde geliştirmeye özel dal görülmedi. Canlıda boşluk olmamasının sebebi kodda bulunamadı (aday: React'in geliştirme yapısı ya da zamanlama); yalnız ölçümle gösterildi. Ölçümün sınırları: yüksüz makine, sayfa başına 10–15 deneme (geliştirmedeki ~%23 oranın birkaç kat küçüğü dışlanamaz), iki panel sayfası, yalnız `refresh()` (işlemden sonraki yenileme ve sayfa geçişi canlıda denenmedi), tek tarayıcı.
  - Sonuç: başlığın boşalması ölçülen koşulda yalnız geliştirme sunucusunda oluyor; canlıda olmadığı ölçümle gösterildi, sebebi bilinmiyor ve bir Next.js ya da React güncellemesiyle değişebilir. Kartın kuralına göre düzeltme yok; tarama yardımcısının başlığı beklemesi (kart 0288) yeterli sayılır. 0288 yapılana kadar başlığı beklemeyen her tarama (bugün 40 dosyada `new AxeBuilder` var; kart 0288 31 diyordu) bir yenilemeden hemen sonra taranırsa hatta aynı biçimde düşebilir.

## Durum

bitti
