# Excel ile toplu ürün işlemleri

## Ad

Excel ile toplu ürün işlemleri (excel-ile-toplu-urun-islemleri)

## Ne işe yarar

Mağaza sahibi ürünlerini panelden tek bir Excel dosyasına indirir, dosyada fiyatı, stoğu, kategoriyi ya da başka bilgileri değiştirir ve dosyayı geri yükler. Yükleyince önce neyin değişeceğini, neyin ekleneceğini ve hangi satırların hatalı olduğunu görür. Onaylarsa değişiklikler panelden yapılmış gibi, aynı kurallarla ve kayıtlarla uygulanır. Yüzlerce ürünü tek tek açmadan güncellemek ya da yeni ürünleri toplu eklemek içindir.

## Kimler için

Çok ürünlü ya da fiyat ve stok bilgisini başka bir programda (tedarikçi listesi, muhasebe) tutan mağazalar. Birkaç ürünlü mağazada toplu düzenleme (temel paket, kart 0314) yeterlidir.

## Gerekenler

Temel paketteki ürün, birleşim, fiyat, stok, kategori, marka, etiket ve özellik servisleri; ürün listesinin süzgeçleri (liste motoru); dosya yükleme (yükleme ucu ve sınırı); arka plan kuyruğu ve değişiklik kaydı. Başka eklenti gerekmez. Dosya biçimi Excel'in kendi biçimidir (.xlsx); dosyayı okuyup yazan açık kaynaklı bir kütüphane projeye eklenir.

## Ayarlar

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza |
|---|---|---|---|
| Eklenti açık mı (`eklentiler` listesinde) | Altyapı sahibi | Kapalı | Açık |
| Bir dosyada en çok satır (`excelSatirSiniri`) | Altyapı sahibi | 5.000 | 5.000 |

Dosyanın en çok boyutu (10 MB) ayar değildir, sunucunun sınırıdır. Dışa aktarmada sınır yoktur; büyük dosya arka planda hazırlanır.

## Veri

- Dosyanın düzeni: her birleşim bir satır, basit ürün tek satır, tek sayfa (karar 0185). Sütunlar: Ürün kodu, Ad, Seçenekler, Stok kodu, Barkod, Satış fiyatı, İndirimli fiyat, İndirim başlangıcı, İndirim bitişi, Stok, Durum, Kategoriler, Marka, Etiketler, Özellikler. Ürünün ortak bilgileri (ad, durum, kategoriler, marka, etiketler, özellikler) birleşimlerinin her satırında tekrarlanır.
- Ürün kodu ürünü tanır: dışa aktarmada ürünün adres adıdır, aynı kodlu satırlar aynı ürünün birleşimleridir. Birleşimi ürün kodu ile seçenekler (Renk: Beyaz; Beden: L) tanır. Kodu sitede olmayan satır yeni ürün, var olan üründe yeni seçenek değeri yeni birleşim olur. Var olan ürüne yeni seçenek (ör. "Malzeme") dosyadan eklenmez, hatalı satırdır; seçenek panelden eklenir.
- Boş hücre değeri değiştirmez; değeri silmek için hücreye "-" yazılır (karar 0185).
- Dosyada olmayan ürün ve birleşim değişmez, silinmez (kullanıcı kararı). Ürün ve birleşim yalnız panelden silinir.
- Sitede olmayan kategori, marka ya da etiket adı hatalı satırdır, yenisi açılmaz (kullanıcı kararı).
- Dosya indirildiği andaki değerleri de taşır: yeni kayıt dışa aktarma. Dosyanın kimliği, indiren yönetici, zaman ve her birimin o andaki değerleri (fiyat, indirim, stok, ortak bilgiler). Yüklenen dosyanın hücresi indirildiği andaki değere eşitse o alan değişmez; site arada değişmiş olsa da. Hem dosyada hem sitede değişmiş hücre hatalı satırdır ("Dosyayı indirdikten sonra stok değişti", kullanıcı kararı): arada satılan ürünün eski stoğu geri yazılmaz. Dışa aktarma kaydı 30 gün saklanır; daha eski ya da elle hazırlanmış dosyada her dolu hücre sitedeki değerle karşılaştırılır, farklıysa yazılır.
- Yeni kayıt: içe aktarma işi. Yüklenen dosya, yükleyen yönetici, durum (denetleniyor, önizleme, uygulanıyor, bitti, vazgeçildi), satırların sonucu (eklenecek, değişecek, değişmeyecek, hatalı ve nedeni), ilerleme. Yüklenen dosya iş bitince ya da vazgeçilince silinir; iş kaydı 30 gün saklanır.
- Stok geçmişine yeni sebep: "Excel ile içe aktarma". Fiyat ve stok geçmişine ve değişiklik kaydına yükleyen yönetici yazılır.
- Mevcut kayıtlara alan eklenmez.

## Ekranlar

- Panel, Ürünler listesi: komut çubuğunda "Excel" düğmesi (eklenti açıkken) "Excel ile içe ve dışa aktar" sayfasına gider (taslak).
- Panel, "Excel ile içe ve dışa aktar" sayfası (Ürünler'in alt sayfası):
  - Dışa aktar: "Bütün ürünler" ya da "Listedeki süzgeçlerle"; "Excel dosyasını indir". Büyük dosya arka planda hazırlanır, hazır olunca indirme bağlantısı aynı yerde görünür.
  - İçe aktar: "Dosya seç" (.xlsx, sınırlar yazılı). Yüklenince dosya arka planda satır satır denetlenir; sayfa ilerlemeyi gösterir.
  - Önizleme: değişecek, eklenecek, değişmeyecek ve hatalı satır sayıları; hatalı satırlar satır numarası, ürün ve nedeniyle; değişecekler alan, şimdiki ve yeni değerle. Hatalı satır varken "Uygula" kapalıdır ve nedeni yazar: dosya düzeltilip yeniden yüklenir (karar 0185). "Başka dosya seç" ve "Vazgeç".
  - Uygulanıyor: ilerleme çubuğu; sayfadan ayrılınabilir, iş arka planda sürer. Sonuç: değişti, eklendi ve uygulanamadı sayıları. Önizlemeden sonra sitede değişen satır uygulanmaz ve nedeniyle söylenir; ötekiler uygulanır.
- Vitrinde ekran yoktur.
- Dışa aktarma ürünleri görebilen (`urun.gor`) yöneticiye açıktır; fiyat sütunları fiyatı görebilene (`fiyat.gor`), stok sütunu stoğu görebilene (`stok.gor`). İçe aktarma ürünü değiştirebilene (`urun.degistir`); fiyatı değiştiren satır `fiyat.degistir`, stoğu değiştiren satır `stok.duzelt` ister, izni yoksa hatalı satırdır.

## Bildirimler

E-posta ve SMS yoktur. İşin sonucu sayfada görünür. Panel içi bildirimler gelince (kart 0280) işin bitişi orada da söylenir.

## Dış servis

Yoktur. Dosya sitenin sunucusunda okunur ve yazılır.

## Yasal notlar

- Dosya ürün bilgisi taşır, kişisel veri taşımaz.
- Dışa aktarılan dosyada "=", "+", "-", "@" ile başlayan hücreler formül olarak çalışmayacak biçimde yazılır (formül enjeksiyonu): dosyayı açan bilgisayarda komut çalışmaz.
- Yüklenen dosya yalnız .xlsx olarak kabul edilir, içeriği türüne göre denetlenir; makro ve formül çalıştırılmaz, yalnız hücrelerin değerleri okunur.

## Bitti sayılır

- Eklenti kapalıyken Ürünler'de "Excel" düğmesi yok, sayfa menüde yok ve açılmaz, uçlar bulunamadı verir, süren iş beklemede kalır.
- Dışa aktarılan dosya hiç değiştirilmeden yüklenince hiçbir şey değişmez, arada siparişle stok düşmüş olsa da.
- Fiyat, indirim, stok ve ortak bilgilerdeki değişiklik önizlemede doğru görünür ve uygulanınca panelden yapılmış gibi yazılır: aynı kurallar, fiyat ve stok geçmişi, değişiklik kaydı.
- Yeni ürün ve var olan ürüne yeni birleşim dosyadan eklenir; var olan ürüne yeni seçenek eklenmez.
- Boş hücre değiştirmez, "-" siler. Dosyada olmayan ürün değişmez.
- Hatalı satır nedeniyle gösterilir, hatalı satır varken hiçbir şey uygulanmaz. Sitede olmayan kategori, marka, etiket hatalıdır.
- Hem dosyada hem sitede değişen hücre hatalı satırdır; yalnız sitede değişen hücre dokunulmaz.
- İzni olmayan yöneticinin fiyat ya da stok değiştiren satırı hatalıdır.
- Satır ve boyut sınırı; .xlsx olmayan dosya reddedilir; formül hücresi dışa aktarmada etkisiz yazılır.
- Yarıda kalan iş (sunucu yeniden başlarsa) kaldığı satırdan sürer, aynı satır iki kez yazılmaz.
- Varyantlı ürün, iki site.
- Tarayıcıda klavyeyle dışa aktarma, dosya yükleme, önizleme ve sonuç; iki renkte ve üç genişlikte tarama; taslakla karşılaştırma.

## Kapatılınca

"Excel" düğmesi ve sayfa kalkar, uçlar bulunamadı verir. Süren içe aktarma işi durur ve beklemede kalır; eklenti yeniden açılınca kaldığı satırdan sürer. Önizlemede bekleyen iş uygulanmaz. Dışa aktarma ve iş kayıtları saklama süreleriyle silinir (kapalıyken de); yüklenmiş dosyalar iş kaydıyla birlikte silinir. Ürünlerde yapılmış değişiklikler kalır.
