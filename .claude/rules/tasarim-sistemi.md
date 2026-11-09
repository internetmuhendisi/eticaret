---
paths:
  - "bilesenler/**"
  - "cekirdek/temalar/**"
  - "siteler/*/tema/**"
  - "**/*.css"
---

# Tasarım sistemi

Tasarım değeri, renk, yazı boyutu, boşluk gibi tasarımı oluşturan ve tek yerde tanımlanan değerdir.

- Renkler koda elle yazılmaz, tek bir yerden (tasarım değerlerinden) gelir.
- Renk, yazı tipi, yazı boyutu, boşluk, köşe yarıçapı, gölge ve katman sırasını tek dosyada tanımla. Tasarımı değiştirmek o dosyayı değiştirmek demektir.
- Rengi "birincil", "zemin", "yazı", "tehlike" gibi anlamlı adlarla kullan. Renk kodu ya da paletten ham renk yazma.
- Vitrin tasarımını sitenin seçtiği temadan al. Tema, tasarım değerlerinin tamamını ve koyu tema değerlerini tanımlar. Temasız site kurulmaz, yeni site bir temanın varsayılanlarıyla başlar.
- Temalar çekirdekte durur ve bütün sitelerde ortaktır. Yalnız tek bir siteye tasarlanan tema o sitenin klasöründe durur, o sitede "Mağaza sahibi temayı değiştirebilir" ayarı kapalıdır.
- Mağaza sahibi temanın yalnız açtığı değerleri değiştirir: renk, yazı tipi, köşe ve düğme biçimi, logo, ana sayfa düzeni. Tema her ayar için varsayılanı ve izin verilen seçenekleri tanımlar. Boşluk ölçeği, genişlik sınırları ve katman sırası gibi değerler her zaman temadan gelir, serbest kod ya da stil yazılamaz.
- Vitrinin son tasarımı temanın değerleri ile sitenin tema ayarlarının birleşimidir. Bu birleşimi tek yerde üret, bileşenler yalnız sonucu okur.
- Mağaza sahibinin seçtiği renkleri kaydetmeden önce kontrast kontrolünden geçir. Geçmezse yayınlamadan önce uyar ve okunur bir ton öner.
- Tema seçimi ve tema ayarı değişikliği önce taslak olarak kaydedilir, önizlemede görülür, yayınlanınca yeni bir sürüm olur. Her yayınlanan sürümü sakla, önceki sürüme tek adımda dönülebilsin. Tema değişikliği ürüne, içeriğe ve menülere dokunmaz.
- Yönetim paneli bütün sitelerde aynı görünür. Panel siteden yalnız logo ve ana rengi alır.
- Panelin siteden aldığı ana rengi kontrast kontrolünden geçir. Geçmezse okunur bir tonunu türet.
- Koyu tema değerlerini aynı dosyada ayrıca tanımla. Koyu temayı bileşen bileşen yamama.
- Uyarı, başarı ve hata renklerinin doygun tonunu yalnız zemin ve işarette kullan. Yazı için okunur tonunu kullan.
- Boşluk, genişlik ve yazı boyutunu tanımlı ölçekten seç. Rastgele piksel değeri yazma.
- Açılır pencere, menü ve bildirimin üst üste sırasını tanımlı katman sırasından al.
- Yalnız tanımlı köşe yarıçaplarını ve gölgeleri kullan.
- Telefon, tablet ve masaüstü genişlik sınırlarını tasarım değerlerinden al. Elle genişlik sınırı yazma.
- Bütün ikonları tek setten al. "Düzenle", "sil", "sepete ekle" gibi bir kavramın ikonu her yerde aynıdır ve tek ikon sözlüğünden okunur.
- Bir öğe değişirken animasyonu yalnız değişen özelliğe uygula.
- Tasarım değerleri değişince tasarım sistemi belgesini aynı değişiklikte güncelle.

## Araçlar (karar 0076)

- Değerler `bilesenler/tasarim-degerleri/degerler.ts` dosyasındadır, belgesi aynı klasörün `README.md` dosyasıdır. Stil Tailwind CSS 4 sınıflarıyla, yalnız oradaki adlarla yazılır (`bg-birincil`, `p-4`, `tablet:`).
- Tailwind'in kendi teması yüklenmez: hazır palet, hazır ölçü ve hazır kırılma noktası yoktur. Serbest değer (`w-[37px]`, `bg-(--x)`, `bg-zemin/[0.37]`, `[&>svg]:p-4`), sayıyla katman (`z-37`), 0 ve 2 dışında kenar kalınlığı (`border-7`), `dark:`, hazır palet rengi ve satır içi stilde ölçü denetimde hatadır.
- Gereken değer yoksa önce `degerler.ts`'e eklenir. Yeni yazı-zemin eşleşmesi kontrast listesine de eklenir.
- Sitenin değerlerini yalnız `cekirdek/temalar/birlesim.ts` verir. Kök düzen onları sayfaya CSS değişkeni olarak yazar.
- Yeni CSS dosyası açılmaz. Stil sınıfla yazılır, temel stil `tailwind.css` içindedir.
- Yazı tipleri sitenin kendi sunucusundan yüklenir (`@fontsource-variable` paketleri), dış sunucudan yüklenmez.
