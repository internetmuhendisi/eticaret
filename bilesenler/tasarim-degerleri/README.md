# Tasarım sistemi

Vitrinin ve panelin bütün renkleri, yazı tipleri ve ölçüleri `degerler.ts` dosyasındadır. Tasarımı değiştirmek o dosyayı değiştirmektir. Kurallar `.claude/rules/tasarim-sistemi.md`, bağlanışın gerekçesi karar 0076'dadır. Tasarım değerleri değişince bu belge aynı değişiklikte güncellenir.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `degerler.ts` | Bütün adlar ve değerler, açık ve koyu tema; kontrastı ölçülen çiftler; sitede barındırılan yazı tipleri (`yuklenenYaziTipleri`) |
| `tailwind.ayar.ts` | Tailwind'e yalnız bu adları tanıtır, değer yazmaz |
| `tailwind.css` | Ortak stil girişi: sıfırlama, sınıflar, yazı tipleri, temel stil |
| `degisken-adlari.ts` | Tema değerlerinin CSS değişkeni adları (`--renk-birincil`...) |
| `css.ts` | Tema değerlerini şemadan geçirip sayfaya yazılacak CSS'e çevirir; şemaya uymayan değerde hata atar. Koyu tema kapatılabilir: kapalıyken cihazın koyu tercihi yazılmaz (kart 0105) |
| `renk-ozniteligi.ts` | Açık ya da koyu temayı cihazdan bağımsız seçen kök özniteliğinin adı (kart 0104) |
| `kontrast.ts` | İki rengin kontrast oranı (WCAG 2.2) ve bir rengin aynı tonda, ölçüden geçen en yakın açıklığı (`okunurTon`, kart 0105) |
| `testler/ornek-renkler.ts` | Testlerin renk örnekleri: mağaza sahibinin seçebileceği renkleri taklit eder (ham renk yalnız bu klasörde yazılır) |

Uygulamaların stil girişleri `cekirdek/uygulama/stil.css` ve `sahip-paneli/stil.css` yalnız `tailwind.css`'i içe aktarır ve taranacak klasörleri yazar. Sitenin değerlerini `cekirdek/temalar/birlesim.ts` verir: vitrin sitenin temasının değerleriyle ve mağaza sahibinin tema ayarlarıyla, panel bu dosyadaki değerlerle ve sitenin ana rengiyle çizilir (kart 0105, karar 0080). Kök düzen vitrinin, panel düzeni panelin değerlerini sayfaya yazar. Değerler şemaya uymazsa sayfa düşmez: hata kaydedilir, sayfa başlangıç değerleriyle açılır.

## Tema değerleri

Temadan temaya değişir, sayfa açılırken yazılır. Başlangıç değerleri (`varsayilanTemaDegerleri`) karar 0075'teki Canlı Çarşı yönündendir; panelin değerleridir ve Canlı Çarşı teması bunları kullanır. Öteki iki hazır temanın değerleri de aynı dosyadadır: `yumusakMevsimDegerleri` ve `keskinCizgiDegerleri` (kart 0114, karar 0092). Bir tema yalnız `yuklenenYaziTipleri` ve cihazın genel yazı tiplerini kullanabilir. Bu belge adları ve ne için olduklarını anlatır; değerlerin kendisi yalnız `degerler.ts`'tedir.

### Renkler

Sınıfta `bg-`, `text-`, `border-`, `outline-`, `accent-` önekleriyle yazılır: `bg-birincil`, `text-soluk-yazi`. Bunlara ek olarak `transparent`, `current` ve `inherit` vardır.

| Ad | Ne için |
|---|---|
| `zemin` | Sayfanın zemini |
| `yuzey` | Kart görseli, arama kutusu, kapalı düğme gibi ikinci zemin |
| `yazi` | Metin |
| `soluk-yazi` | Açıklama, ikincil metin |
| `kenar` | Kart ve ayraç kenarı (süs; bir öğeyi tanıtmak için yetmez) |
| `alan-kenari` | Giriş alanının kenarı (zeminde en az 3:1) |
| `birincil`, `birincil-ustu` | Ana düğme ve rozet; üstündeki yazı |
| `indirim` | İndirimli fiyat |
| `odak` | Klavye odağının çerçevesi |
| `alt-kisim`, `alt-kisim-ustu`, `alt-kisim-soluk` | Sayfanın alt kısmı |
| `afis`, `afis-ustu` | Büyük afiş zemini ve üstündeki yazı |
| `kutu-1` … `kutu-5` | Kategori ve kampanya kutularının zeminleri |
| `tehlike`, `basari`, `uyari` | Doygun ton: yalnız işaret, kenar ve düğme zemini |
| `tehlike-ustu` | Tehlike düğmesinin yazısı |
| `tehlike-yazi`, `basari-yazi`, `uyari-yazi` | Okunur ton: yazı |
| `tehlike-zemin`, `basari-zemin`, `uyari-zemin` | Kutu zemini |
| `karekod`, `karekod-zemin` | Karekod: koyu temada da açık zeminde koyu |
| `ortu` | Pencerenin arkasındaki örtü; saydamlığıyla kullanılır (`bg-ortu/60`) |

`birincil` işaret değildir: açık zeminde 3:1'in altında kalabilir. Düğmeyi üstündeki yazı tanıtır. Birincil renk tek başına bir durumu göstermek için (onay kutusu, ilerleme) kullanılmaz.

### Öteki tema değerleri

| Tür | Sınıf | Adlar |
|---|---|---|
| Yazı tipi | `font-` | `govde` (Inter), `baslik` (Jost), `kod` |
| Kalınlık | `font-` | `normal`, `orta`, `kalin`, `en-kalin` (düğme ve rozet), `baslik-kalinligi` |
| Yazı boyu (satır yüksekliğiyle) | `text-` | küçükten büyüğe `kucuk`, `govde`, `orta`, `buyuk`, `baslik-4`, `baslik-3`, `baslik-2`, `baslik-1`, `afis-basligi` |
| Köşe | `rounded-` | `kucuk` (rozet), `orta` (kart, alan), `dugme`; ayrıca `none`, `full` |
| Gölge | `shadow-` | `kart`, `acilir`, `pencere`; ayrıca `none` |

Tailwind'de renk ile yazı boyu (`text-`), yazı tipi ile kalınlık (`font-`) aynı önekle yazılır. Bu yüzden iki türün adları çakışmaz; bunu `testler/tailwind.test.ts` denetler.

Başlıklar (`h1`–`h4`) başlık yazı tipini ve boylarını kendiliğinden alır. Gövde metni `govde` boyundadır. Kökün yazı boyuna dokunulmaz: `rem` ölçüleri ziyaretçinin tarayıcı tercihine uyar.

## Sabit değerler

Bütün temalarda aynıdır.

| Tür | Sınıf | Adlar |
|---|---|---|
| Boşluk ölçeği | `p-`, `m-`, `gap-`, `w-`, `h-`, `size-`, `min-h-`... | `0`, `px`, `0.5`, `1`, `1.5`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `11`, `12`, `16`, `20`; `11` parmakla rahat basılan en küçük yüksekliktir |
| Genişlik sınırı | `max-w-` | `karekod`, `panel`, `yan-menu`, `form`, `arama`, `metin`, `icerik` |
| Kırılma noktası | önek | `tablet:`, `masaustu:`, `genis:`; önek yoksa telefon |
| Katman sırası | `z-` | alttan üste `taban`, `ust-kisim`, `yan-pencere`, `pencere`, `acilir`, `bildirim`; açılır parçalar (menü, seçim listesi, ipucu) pencerelerin üstündedir |
| Kenar ve çizgi kalınlığı | `border`, `outline`, `ring`, `decoration`, `underline-offset`... | öneksiz (1 px), `2`, `0` |

`w-full`, `w-1/2`, `min-h-dvh` gibi oranlar ve Tailwind'in sayı almayan sınıfları kullanılabilir. Saydamlık, ızgara sütunu, sıra, döndürme, büyütme ve süre gibi sayı alan sınıflar ölçek dışıdır ve serbesttir.

## Yazılamayanlar

Tailwind'in kendi teması yüklenmez. `bg-red-500`, `text-sm`, `rounded-lg`, `shadow-md`, `md:`, `p-7` gibi sınıflar hiçbir şey çizmez. Denetimin hata saydıkları:

- Köşeli parantezli değer (`w-[37px]`, `bg-[#fff]`, `[mask-type:alpha]`) ve değişkenle değer (`bg-(--x)`)
- Serbest saydamlık ya da satır yüksekliği (`bg-zemin/[0.37]`, `text-govde/(--x)`)
- Köşeli parantezli seçici ya da kırılma noktası (`[&>svg]:p-4`, `[@media(min-width:900px)]:p-4`)
- Sayıyla katman sırası (`z-37`)
- Kenar ve çizgide 0 ve 2 dışında sayı (`border-7`, `outline-offset-5`)
- Bileşende koyu tema yaması (`dark:`): koyu değer bu dosyada tanımlanır
- Hazır palet rengi (`text-white`, `bg-gray-100`)
- Ham renk (`#rrggbb`, `rgb()`), bu klasör dışında
- Satır içi stilde ölçü (`style={{ marginTop: 12 }}`, `style={{ padding: "12px" }}`)

Bu klasör yasakların dışındadır, değerler burada tanımlanır. Denetim metni sınıfa benzeyen her yazıda arar: düz bir metinde `[...]:`, `z-1` ya da `dark:` geçerse de hata verir. Ekran metni zaten metin dosyasındadır; kod içindeki böyle bir metin yeniden yazılır.

## Durumlar ve hareket

Radix parçalarının durumları adlı durum olarak yazılır (kart 0103), köşeli parantezli durum (`data-[state=open]:`) denetimde yasaktır:

| Durum | Ne zaman |
|---|---|
| `acik:`, `kapali:` | Pencere, menü, seçim listesi, akordeon açık ya da kapalı |
| `etkin:` | Seçili sekme |
| `isaretli:` | İşaretli onay kutusu |
| `devre-disi:` | Seçilemeyen menü ya da liste öğesi |
| `vurgulu:` | Klavyeyle ya da fareyle üzerine gelinen menü ya da liste öğesi |
| `yer-tutucu:` | Seçim yapılmamış seçim kutusu |

Radix'in açılır parçalara verdiği ölçüler için üç adlı sınıf vardır: `secim-genisligi`, `secim-yuksekligi`, `menu-yuksekligi`.

Renkli zeminli bölgede (vitrinin alt kısmı, duyuru şeridi) odak çerçevesi `odak-yazi-renginde` ile bölgenin yazı rengini alır: `odak` rengi yalnız `zemin` ve `yuzey` üstünde ölçülür (kart 0108).

Temizlenmiş biçimli metin (ürünün uzun açıklaması) `bicimli-metin` ile çizilir: paragraf arası, liste işaretleri, bağlantının alt çizgisi, başlık ve alıntı bu stilde tasarım değerleriyle yazılıdır (kart 0138). İzinli etiketler `cekirdek/moduller/urun/aciklama.ts`'tedir; listeye etiket eklenince stili de eklenir (testi `aciklama.test.ts`).

Animasyonlar `animate-` ile yazılır:
- `belir`, `kaybol`: açılır parça
- `ortu-belir`, `ortu-kaybol`: örtü
- `sagdan-gir`, `saga-cik`, `soldan-gir`, `sola-cik`, `alttan-gir`, `alta-cik`: yan pencere
- `akordeon-ac`, `akordeon-kapa`: akordeon
- `don`: yükleniyor
- `nabiz`: iskelet
- `geciken-gorunum`: kod yüklenmeyince görünen yazı

Süreleri `sabitDegerler.sureler`'dedir, `duration-kisa`, `duration-orta`, `duration-uzun` ile de kullanılır. Hareketin kendisi (`@keyframes`) `tailwind.css`'tedir: Tailwind 4 ayar dosyasındaki `keyframes` alanını CSS'e yazmaz. Yeni animasyon iki yere birden eklenir, eksik tanımı `testler/tailwind.test.ts` yakalar. Hareketi azaltmayı seçen kullanıcıda hiçbir hareket olmaz.

Sınıflar `sinif()` ile birleştirilir (`bilesenler/parcalar/sinif.ts`). Aynı türden iki sınıftan sonra yazılan kalır; bu yüzden tasarım değerlerinin adlarını tanır.

## Koyu tema

Koyu değerler `degerler.ts`'te açık değerlerin yanındadır ve cihazın tercihine göre açılır. Bileşen koyu tema için ayrı sınıf yazmaz. Sayfanın kökündeki `data-renk` özniteliği (`acik` ya da `koyu`, adı `renk-ozniteligi.ts`'te) cihazın tercihini geçersiz kılar; bugün yalnız bileşen kataloğu kullanır (kart 0104).

## Kontrast

`yaziCiftleri` ve `isaretCiftleri` her iki temada ölçülür (`testler/kontrast.test.ts`): yazı en az 4,5:1, alan kenarı, odak ve hatalı alanın kenarı gibi işaretler en az 3:1. Yeni bir yazı-zemin eşleşmesi kullanılacaksa önce listeye eklenir. Tarayıcı testi (`cekirdek/testler/uctan-uca/tasarim-degerleri.test.ts`) form parçalarının gerçekten çizilen renklerini de ölçer.

## Yazı tipleri

Inter, Jost, Manrope ve Archivo `@fontsource-variable` paketlerinden gelir ve sitenin kendi sunucusundan yüklenir (Manrope ve Archivo kart 0114 ile, Yumuşak Mevsim ve Keskin Çizgi temaları için). Türkçe harfler latin-ext parçasındadır. Yeni bir yazı tipi de aynı yoldan eklenir, dış sunucudan (Google Fonts) yüklenmez.
