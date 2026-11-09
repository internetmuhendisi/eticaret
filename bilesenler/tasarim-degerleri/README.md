# Tasarım sistemi

Vitrinin ve panelin bütün renkleri, yazı tipleri ve ölçüleri `degerler.ts` dosyasındadır. Tasarımı değiştirmek o dosyayı değiştirmektir. Kurallar `.claude/rules/tasarim-sistemi.md`, bağlanışın gerekçesi karar 0076'dadır. Tasarım değerleri değişince bu belge aynı değişiklikte güncellenir.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `degerler.ts` | Bütün adlar ve değerler, açık ve koyu tema; kontrastı ölçülen çiftler |
| `tailwind.ayar.ts` | Tailwind'e yalnız bu adları tanıtır, değer yazmaz |
| `tailwind.css` | Ortak stil girişi: sıfırlama, sınıflar, yazı tipleri, temel stil |
| `degisken-adlari.ts` | Tema değerlerinin CSS değişkeni adları (`--renk-birincil`...) |
| `css.ts` | Tema değerlerini şemadan geçirip sayfaya yazılacak CSS'e çevirir; şemaya uymayan değerde hata atar |
| `kontrast.ts` | İki rengin kontrast oranı (WCAG 2.2) |

Uygulamaların stil girişleri `cekirdek/uygulama/stil.css` ve `sahip-paneli/stil.css` yalnız `tailwind.css`'i içe aktarır ve taranacak klasörleri yazar. Sitenin değerlerini `cekirdek/temalar/birlesim.ts` verir, kök düzen sayfaya yazar. Değerler şemaya uymazsa sayfa düşmez: hata kaydedilir, sayfa başlangıç değerleriyle açılır.

## Tema değerleri

Temadan temaya değişir, sayfa açılırken yazılır. Başlangıç değerleri karar 0075'teki Canlı Çarşı yönündendir. Bu belge adları ve ne için olduklarını anlatır; değerlerin kendisi yalnız `degerler.ts`'tedir.

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
| `tehlike`, `basari`, `uyari` | Doygun ton: yalnız işaret ve kenar |
| `tehlike-yazi`, `basari-yazi`, `uyari-yazi` | Okunur ton: yazı |
| `tehlike-zemin`, `basari-zemin`, `uyari-zemin` | Kutu zemini |
| `karekod`, `karekod-zemin` | Karekod: koyu temada da açık zeminde koyu |

`birincil` işaret değildir: açık zeminde 3:1'in altında kalabilir. Düğmeyi üstündeki yazı tanıtır. Birincil renk tek başına bir durumu göstermek için (onay kutusu, ilerleme) kullanılmaz.

### Öteki tema değerleri

| Tür | Sınıf | Adlar |
|---|---|---|
| Yazı tipi | `font-` | `govde` (Inter), `baslik` (Jost), `kod` |
| Kalınlık | `font-` | `normal`, `orta`, `kalin`, `baslik-kalinligi` |
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
| Genişlik sınırı | `max-w-` | `karekod`, `form`, `metin`, `icerik` |
| Kırılma noktası | önek | `tablet:`, `masaustu:`, `genis:`; önek yoksa telefon |
| Katman sırası | `z-` | `taban`, `ust-kisim`, `acilir`, `yan-pencere`, `pencere`, `bildirim` |
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

## Koyu tema

Koyu değerler `degerler.ts`'te açık değerlerin yanındadır ve cihazın tercihine göre açılır. Bileşen koyu tema için ayrı sınıf yazmaz.

## Kontrast

`yaziCiftleri` ve `isaretCiftleri` her iki temada ölçülür (`testler/kontrast.test.ts`): yazı en az 4,5:1, alan kenarı, odak ve hatalı alanın kenarı gibi işaretler en az 3:1. Yeni bir yazı-zemin eşleşmesi kullanılacaksa önce listeye eklenir. Tarayıcı testi (`cekirdek/testler/uctan-uca/tasarim-degerleri.test.ts`) form parçalarının gerçekten çizilen renklerini de ölçer.

## Yazı tipleri

Inter ve Jost `@fontsource-variable` paketlerinden gelir ve sitenin kendi sunucusundan yüklenir. Türkçe harfler latin-ext parçasındadır. Yeni bir yazı tipi de aynı yoldan eklenir, dış sunucudan (Google Fonts) yüklenmez.
