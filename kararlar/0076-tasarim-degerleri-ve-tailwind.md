# 0076 · Tasarım değerleri ve Tailwind CSS'in bağlanışı

## Tarih

2026-11-09

## Karar

Vitrinin ve panelin bütün tasarım değerleri tek dosyadadır: `bilesenler/tasarim-degerleri/degerler.ts`. Tailwind CSS 4 bu dosyadan beslenir ve yalnız oradaki adları tanır (kart 0102).

- **İki tür değer:** Temadan temaya değişen **tema değerleri** (renkler ve gölgeler açık ve koyu temada ayrı, yazı tipleri, kalınlıklar, yazı ölçeği, köşeler) Tailwind'e CSS değişkeni olarak tanıtılır: `bg-birincil` sınıfı `var(--renk-birincil)` okur. Değişkenlerin değerini kök düzen sayfa açılırken bir `<style>` öğesiyle yazar (`css.ts`). Bütün temalarda aynı olan **sabit değerler** (boşluk ölçeği, genişlikler, kırılma noktaları, katman sırası) derlemede sınıflara yazılır.
- **Birleşim tek yerde:** Sayfaya yazılan değerleri `cekirdek/temalar/birlesim.ts` üretir. Değerler şemaya uymazsa sayfa düşmez: hata kaydedilir, sayfa başlangıç değerleriyle açılır. Bugün bütün siteler başlangıç değerleriyle açılır. Tema yapısı (kart 0105) bu işlevi temanın değerleri ile mağaza sahibinin değişikliklerinin birleşimine çevirir, bileşenler değişmez.
- **Tailwind'e bağlanış:** Tailwind'in kendi teması (`tailwindcss/theme.css`) hiç yüklenmez. Yalnız sıfırlama (`preflight.css`) ve sınıflar (`utilities.css`) yüklenir. Adlar `tailwind.ayar.ts` ile verilir (Tailwind 4'ün `@config` desteği). Bu dosya adları ve sabit değerleri `degerler.ts`'ten okur, kendisi değer yazmaz. CSS değişkenlerinin adları tek işlevden gelir (`degisken-adlari.ts`), ayar ve `css.ts` aynı işlevi kullanır.
- **Kapatılan Tailwind özellikleri:** Hazır renk paleti, hazır boşluk çarpanı (`p-37` gibi her sayı), hazır yazı boyları, köşeler, gölgeler, yazı tipleri, kalınlıklar, genişlikler ve kırılma noktaları (`sm:`, `md:`). Bunlar yazılırsa hiçbir şey çizilmez. Kırılma noktalarının adları `tablet:`, `masaustu:`, `genis:`.
- **Denetimin yakaladıkları:** Tailwind'de kapatılamayan kalıpları kod denetimi hata sayar:
  - köşeli parantezli serbest değer (`w-[37px]`) ve değişkenle değer (`bg-(--x)`)
  - serbest saydamlık ve satır yüksekliği (`bg-zemin/[0.37]`)
  - köşeli parantezli özellik, seçici ve kırılma noktası (`[&>svg]:p-4`, `[@media(...)]:p-4`)
  - sayıyla katman sırası (`z-37`)
  - kenar ve çizgide 0 ve 2 dışında sayı (`border-7`)
  - bileşende koyu tema yaması (`dark:`)

  Hazır palet rengi ve satır içi stilde ölçü de denetimde hatadır.
- **Ad çakışması:** Tailwind'de renk ile yazı boyu (`text-`), yazı tipi ile kalınlık (`font-`) aynı önekle yazılır. İki türün adları çakışmaz (afiş başlığının boyu `afis-basligi`, afiş zemininin rengi `afis`). Her sınıfın kendi türünün değişkenini yazdığı testte ölçülür.
- **Koyu tema:** Koyu değerler aynı dosyada tanımlıdır ve cihazın tercihine göre (`prefers-color-scheme`) açılır. "Vitrinde koyu tema" site ayarı tema yapısıyla bağlanır (kart 0105).
- **Değerlerin güvenliği:** Sayfaya yazılan her değer önce şemadan geçer. Renk yalnız `#RRGGBB`, ölçü yalnız sayı ve birim, yazı tipi yalnız harf, rakam, boşluk, tire ve virgül olabilir. `; { } < > " '` geçemez: değer başka bir CSS kuralı ya da HTML yazamaz. Mağaza sahibinin seçeceği değerler de bu yoldan geçecek.
- **Yazı tipleri:** Inter ve Jost `@fontsource-variable` paketlerinden gelir. Dosyaları derlemede uygulamanın kendi dosyalarına kopyalanır, sitenin sunucusundan yüklenir. Adları tırnaksız yazılır.
- **Kontrast:** Yazı-zemin ve işaret-zemin çiftleri `degerler.ts`'te listelenir. Testi her çifti açık ve koyu temada ölçer: yazı en az 4,5:1, işaret en az 3:1 (`kontrast.ts`, WCAG 2.2 formülü).

## Neden

- Aynı çekirdek görüntüsü her sitede çalışır (karar 0027). Renk derlemede sınıfa gömülseydi her site için ayrı görüntü gerekirdi. CSS değişkeniyle görüntü tek kalır, değer siteden gelir. Mağaza sahibinin renk değişikliği de yeniden derleme istemez.
- Tailwind'in kendi teması yüklenmeyince yasak değerler kendiliğinden çalışmaz. Denetimin yakalaması gereken şey Tailwind'in kapatamadığı birkaç kalıpla sınırlı kalır.
- Adları TypeScript dosyasında tutmak, testlerin ve ileride tema şemasının (kart 0105) aynı listeyi okumasını sağlar. Ayrı bir CSS dosyasında tutulsaydı adlar iki yerde yazılırdı.

## Düşünülen diğer yollar

- **Tailwind'in CSS içinde `@theme` ile tanımlanması:** Tailwind 4'ün önerdiği yol budur. Ama adlar CSS dosyasında, değerler ve testler TypeScript'te olurdu. Ya iki kopya ya da CSS'i üreten bir betik gerekirdi. `@config` aynı sonucu tek kaynakla verir. Bedeli, Tailwind'in eski yapılandırma desteğine bağlı kalmaktır.
- **Tailwind'in temasını yükleyip `--*: initial` ile silmek:** Aynı sonucu verir ama silinmesi unutulan bir ad (gelecek sürümde eklenen) sessizce açılırdı. Hiç yüklememek daha güvenli.
- **Her site için derlemede renk gömmek:** Siteye özel görüntü gerekir, karar 0027'ye aykırı.
- **CSS modüllerinde devam etmek:** Modüllerde ham ölçü ve renk yazılabilir, denetimi zordur. Tailwind'in sınıfları tek bir ad listesine bağlanabildiği için tercih edildi. Kart 0103'te shadcn/ui da Tailwind'le gelir.
- **Yazı tiplerini `next/font` ile yüklemek:** Next.js'e bağlı kalırdı ve yazı tipi derlemede sabitlenirdi. Fontsource paketleri düz CSS ile sahip panelinde de aynı biçimde çalışır.

## Sonuçları

- Tailwind'in alışılmış sınıfları (`text-sm`, `bg-red-500`, `md:`, `p-7`) çalışmaz. Yalnız tasarım değerlerindeki adlar kullanılır, yeni bir değer gerekirse önce `degerler.ts`'e eklenir.
- Tailwind'in her sayıyı kabul ettiği sınıflardan katman sırası ile kenar ve çizgi kalınlığı denetlenir. Saydamlık (`opacity-37`), ızgara sütunu, sıra, döndürme, büyütme, süre ve kesirli genişlik (`w-7/9`) ölçek dışıdır ve serbesttir.
- Denetim sınıfa benzeyen her yazıyı arar. Düz bir metinde `[...]:`, `z-1`, `dark:` ya da `to-white` geçerse de hata verir. Ekran metni zaten metin dosyasındadır, kod içindeki böyle bir metin yeniden yazılır.
- Değişkene verilen stil (`style={degisken}`), CSS dosyasına elle yazılan değer ve sınıf adının parçalardan birleştirilmesi denetimden kaçar. Bunlar yalnız disiplindir. Yeni CSS dosyası yalnız `bilesenler/tasarim-degerleri/` altında ve uygulamaların stil girişi olarak açılır.
- Tailwind'in sıfırlaması tarayıcının başlık ve paragraf boşluklarını kaldırır. Başlıklar tasarım değerlerinden boyut alır, sayfanın ana içeriği (`main`) alt alta, ölçekteki aralıkla dizilir.
- Canlı Çarşı'nın birincil turuncusu beyaz zeminde 2,16:1'dir. Düğmeyi üstündeki yazı tanıttığı için standarda uyar. Ama birincil renk tek başına bir şeyi göstermek için (onay kutusu, ilerleme) kullanılmaz.
- Sahip paneli henüz bir uygulama değildir. Tailwind ve stil girişi kuruldu, derlenmesi testte ölçülür, sayfada görülmedi.
- Değerler bugün yalnız başlangıç değerleridir. Temaya taşınmaları ve sitenin değerleri kart 0105'tedir.
