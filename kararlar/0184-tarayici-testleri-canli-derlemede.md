# 0184 · Tarayıcı testleri canlıdaki gibi derlenmiş çekirdekte çalışır

## Tarih

2026-11-25

## Karar

Tarayıcı testleri geliştirme sunucusunda (`next dev`) değil, canlıdaki gibi derlenmiş çekirdekte (`next build`, `next start`, deneme ortamı) çalışır (`komutlar/tarayici-sunucusu.mts`). Isınma (kart 0222, 0164) bu aşamadan kalkar.

Yalnız geliştirme sunucusunda görünenler ikinci, kısa bir aşamada ölçülür (`pnpm tarayici-testleri-gelistirme`, `playwright.gelistirme.config.ts`). Bu aşama hatta asıl aşamadan hemen sonra çalışır ve şunları içerir:
- **Geliştirme taraması:** her sayfa geliştirme sunucusunda gerçek veriyle açılır, konsol temiz olmalıdır (`gelistirme-taramasi.test.ts`). Vitrinin her sayfa türü sitenin kataloğundaki kayıtla, bileşen kataloğunun her parçası kendi sayfasıyla, panelin ayrıntı ekranları veritabanındaki ilk kayıtla açılır. React'ın yalnız geliştirmede yazdığı uyarılar burada yakalanır. Tarama geliştirme sunucusunda çalıştığını denetler (geliştirme göstergesi): canlı sunucuda boş yere yeşil kalmaz.
- **Etiketli testler** (`gelistirme-etiketleri.ts`): hidrasyon uyarısını ölçen üç test iki aşamada da çalışır (`@gelistirmede-de`), bilerek hata veren deneme sayfasının iki testi yalnız bu aşamada çalışır (`@yalniz-gelistirmede`).

## Neden

Hat 45665957128 sunucu günlüklü ilk kırmızı hattı (kart 0226). Arama sayfası takımın başında birkaç kez 0,5 saniyede açılmıştı. Bir istekte ise 11,7 saniye sürdü; bunun 11,2 saniyesi Next.js'in payıydı (derleme), uygulamanın payı 0,5 saniyeydi. Tarayıcıda o sırada "[Fast Refresh] rebuilding" yazıyordu. Bütün takımda Next.js payı 1,5 saniyeyi aşan istekler aynı dakikaya toplandı: ısınmadan hemen sonra Turbopack'in önbelleğini diske yazdığı dakika ("Finished writing to filesystem cache in 44s"). Kart 0251, 0281 ve 0282'nin düşüşleri aynı kalıptaydı: bekleme sırasında tarayıcıda "rebuilding", istek cevapsız.

Geliştirme sunucusu yolları istendikçe derler ve kendi derlemesini arada yeniden yapabilir. Isınma ve bekleme süreleri bu işin etrafından dolanıyordu, yeni yollarla ve yük altında her seferinde yeniden düşüyordu. Canlı sunucu çalışırken hiçbir şey derlemez.

Canlı derleme hatta yarım dakika sürer (hız ölçümünün günlüğü: "Compiled successfully in 18.7s"). Çekirdeğin bütün sayfaları istekte çizilir (`ƒ`, derlemenin yol tablosu); önceden sabitlenen tek sayfa Next.js'in genel hata sayfasıdır. Testlerin yazdığı veri bu yüzden canlı derlemede de görünür.

## Düşünülen diğer yollar

- **Turbopack'in kalıcı önbelleğini hatta kapatmak.** Takılmaların toplandığı dakikayı ortadan kaldırabilirdi, ama önbellek yazımı yalnız bir hattın bir anıyla örtüşüyor. Kart 0251 ve 0282'nin düşüşleri takımın ortasındaydı, onların sebebi ölçülmedi. Geliştirme sunucusunun öteki derleme turlarını kapatmazdı.
- **Isınmayı genişletmek, beklemeleri uzatmak.** Kart 0222 ve 0164 bunu yaptı, düşüşler sürdü. Uzun bekleme gerçek yavaşlığı da gizler.
- **Bütün takımı iki sunucuda çalıştırmak.** Hattın süresini iki katına çıkarırdı.
- **Hata denemesi sayfasını test için bir değişkenle canlı derlemede açmak.** Canlı koda yalnız test için bir anahtar koyardı. Sayfa geliştirme aşamasında kendi koşuluyla zaten açılıyor.

## Sonuçları

- Tarayıcı testleri canlıda çalışan koda daha yakındır: sıkıştırılmış kod, canlı React, Next.js'in canlı yolu.
- React'ın geliştirme uyarıları (anahtar, iç içe öğe, denetimli ve denetimsiz alan, hidrasyon farkı) yalnız sayfa açılışında (geliştirme taraması) ve etiketli testlerde ölçülür. Önce `konsoluDinle` kullanan otuz kadar test dosyası ve ekran ölçümü bunları etkileşimlerde de yakalıyordu. Artık asıl aşamadaki etkileşimlerde (pencere, form, istemcide sonradan çizilen satırlar) çıkan geliştirme uyarısı yakalanmaz; bu yalnız disiplindir. Canlı derleme hidrasyon hatasının kendisini yine numarasıyla (React #418) hata olarak yazar, `konsoluDinle` onu sayar.
- React'ın geliştirmedeki çift çizimi ve çift etkisi (StrictMode) de yalnız geliştirme aşamasında kalır: temizlenmeyen etki ya da saf olmayan çizim artık asıl aşamanın etkileşimli testlerinde ortaya çıkmaz.
- Geliştirme taramasında sipariş ve müşteri ayrıntısı yalnız veritabanında kayıt varsa açılır; hatta asıl aşamanın testleri yazmıştır. Yeni ayrıntı ekranı taramaya elle eklenir, yalnız disiplindir.
- Isınmanın ikinci tarayıcı turu (kart 0164) ve ağ değişikliğinde bir kez yeniden deneme kalktı: tarama tek turdur. Etiketli beş testin derleme beklemesi riski küçüktür, ölçülmedi.
- Next.js'in canlı sunucusu istek satırı yazmaz. Asıl aşamanın sunucu günlüğünde (`sunucu/olusan/tarayici-sunucu-gunlugu.log`, karar 0181) yalnız uygulamanın kendi satırları vardır; istek satırları geliştirme aşamasının günlüğündedir. Derleme payı ölçülecek bir şey olmadığı için asıl aşamada bu satırlara gerek kalmadı.
- Hat iki aşama çalıştırır. Geliştirme aşaması ısınmayı (yolların istenmesi) ve taramayı yapar, birkaç dakika sürer; asıl aşamadan ısınma ve derleme beklemesi kalkar.
- Yerelde `pnpm tarayici-testleri` her çalışmada çekirdeği derler (yarım dakika kadar). 3000 portunda açık bir sunucu varsa onu kullanır (`reuseExistingServer`): elle açılmış geliştirme sunucusuyla da çalışır, ama hattın ölçtüğü canlı derleme o değildir.
- Hız ölçümü kendi derlemesini yapar (`komutlar/hiz-sunucusu.mts`); iki aşama aynı derlemeyi paylaşmaz, derleme kısa olduğu için ortak bir yol kurulmadı.
- Yeni bir testin yalnız geliştirmede anlamı varsa etiket alır. Etiketi unutmak yalnız disiplindir: test asıl aşamada düşerse görülür. Süzgeçler ayar dosyalarında düz yazılır (yayın komutu ayar dosyalarını korur, etiket dosyasını korumaz); etiket adlarıyla aynılığını `cekirdek/testler/isinma.test.ts` denetler.
