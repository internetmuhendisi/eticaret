---
paths:
  - "bilesenler/**"
  - "cekirdek/vitrin/**"
  - "cekirdek/yonetim-paneli/**"
  - "cekirdek/katalog/**"
  - "cekirdek/uygulama/app/**"
  - "sahip-paneli/**"
  - "siteler/*/vitrin/**"
  - "**/*.tsx"
---

# Bileşen kütüphanesi

Bileşen, düğme, giriş alanı, pencere gibi tekrar kullanılan arayüz parçasıdır.

- Düğme, giriş alanı, seçim kutusu, pencere, kart, sekme, tablo, rozet, bildirim gibi bütün arayüz parçalarını tek ortak kütüphaneden kullan.
- Yeni bir parça yazmadan önce kütüphanede karşılığını ara. Yoksa ve birden çok yerde kullanılacaksa önce kütüphaneye ekle, sonra kullan.
- Sayfalarda tarayıcının ham düğme, giriş alanı, seçim kutusu ve pencere öğelerini kullanma. Kütüphanenin kendisi bu kuraldan muaftır.
- Sayfa ve bölüm başlıklarını başlık bileşenleriyle yaz.
- Kenarlıklı, köşeli kutuyu elle örme, kart bileşenini kullan.
- Yükleniyor göstergesi, iskelet görünüm ve ilerleme çubuğunu kütüphaneden al.
- "Kaydedildi", "Hata oluştu" gibi anlık bildirimleri tek bildirim bileşeninden göster.
- Sayfa içi bilgi, uyarı ve hata kutularını tek uyarı bileşeninden göster.
- Silme ve iptal gibi geri dönüşsüz eylemleri tek onay bileşeniyle sor. Mümkünse geri alma sun.
- Yalnız ikonu olan düğmeye ekran okuyucu için ad ver. Üzerine gelince ipucu kendiliğinden çıksın.
- Kütüphane bileşeninin içine metin yazma. Gösterilecek metni kullanıldığı sayfadan al.
- Bileşenin içine onu kullananın değiştiremeyeceği sabit genişlik ya da stil gömme.
- Bir kalıp ikinci bir yerde gerektiği anda onu kütüphaneye taşı ve ilk kullanımı da ona çevir.
- Her bileşenin canlı örneğini, seçeneklerini ve kullanıldığı yerleri bileşen kataloğunda göster.
- Bir bileşeni değiştirdiğinde onu kullanan sayfaları listele ve bileşenin her site temasındaki görüntüsünü bir önceki sürümle karşılaştır.
- Yeni bir bileşen kuralını önce uyarı olarak başlat. Eski ihlalleri ihlal listesinde tut, liste sıfırlanınca kuralı hataya çek. İhlal listesi yalnız küçülebilir.

## Yazılanlar

- `bilesenler/parcalar/` (kart 0103, karar 0077, shadcn/ui'dan uyarlanmış):
  - `Dugme`, `IkonDugmesi`, `Baglanti`
  - `GirisAlani`, `UzunMetinAlani` (kart 0106), `Etiket`, `SecimKutusu`, `OnayKutusu`
  - `BicimliMetinAlani` (kart 0263, karar 0162): biçimli metin (Tiptap); araç çubuğu kalın, eğik, ara başlık, madde ve sıralı liste, bağlantı. Araç çubuğu tek sekme durağıdır, ok tuşları, Home ve End ile gezilir; bağlantı satırı Enter ile uygular, Escape ile kapanıp odağı yazıya verir. Bağlantının kuralını kullanan verir (`baglantiGecerliMi`).
  - `AcilirMenu`, `Pencere`, `YanPencere`, `Sekmeler`
  - `YanPencereAltCubugu` (kart 0169): yan pencerede uzun formun sabit Vazgeç ve Kaydet çubuğu; iç boşluk kadar aşağıya yapışır, altında form görünmez. Odaklanan öğeyi örtmez (kart 0188): kaydırma kabı çubuk kadar pay alır (`tailwind.css`), çubukla çakışan odaklanan öğe görünür yere kaydırılır. Pencere dışında (sayfadaki kartta) `bottom-0 mx-0 px-0` ile kullanılır. Formun alt çubuğu elle `sticky` yazılmaz.
  - `Kart`, `Rozet`, `Uyari`, `BildirimAlani` ile `bildirimGoster`, `Ipucu`
  - `IskeletGorunum`, `YukleniyorGostergesi`, `Serit`, `Akordeon`
  - Sayfa iskeleti (kart 0135, karar 0103): `SayfaYolu`, `SayfaBasligi`, `BosHal`, `Sayfalama` ile `DahaFazla`
  - `SecenekGrubu` (kart 0138, karar 0108): radyo grubu; seçilemeyen değer üstü çizili, odak alır, seçilmez; hata gösterir (kart 0139); seçilebilir tükenmiş değer (`tukenmis`) üstü çizili ve seçilir (kart 0144); `gorunum="kart"` alt alta tam genişlikte satırlar, açıklama ve ikonla (ödeme yöntemi, kart 0214); `gorunum="ornekli"` üstünde küçük örneği (`ornek`) olan kartlar, telefonda alt alta, tablette üç sütun (tema ayarları, kart 0260)
  - `Anahtar` (kart 0214, karar 0141): açma-kapama (Radix Switch); ekran okuyucu adı etiketten, durumun yazısı (açık, kapalı) yanında görünür
  - `SiralanabilirListe` (kart 0141, karar 0111): elle sıralanan küçük liste; tutamakla sürükleme (@dnd-kit), klavyeyle boşluk ve ok tuşları, her genişlikte yukarı ve aşağı al düğmeleri, ekran okuyucu duyuruları. Kullanan yeni sırayı hemen verir, kaydı arkadan yapar. Metinleri `cekirdek/metinler/siralama-metinleri.ts`. Satırın içinde alt liste duran listede `hizalama="ust"` (kart 0143). Izgara düzeni (`duzen="izgara"`, kart 0266): kartlar telefonda iki, tablette ve üstünde dört sütun; kartın altında öne ve arkaya al iki uçta, altlarında tutamak ve `eylemler`, düğmeler 44 px; metinler `siralamaMetinleri(metin, { duzen: "izgara" })`. Satırın kendisine veri özniteliği `satirVerisi` ile (formun alanı).
  - `OnayPenceresi` (kart 0143, karar 0116): silme ve iptal gibi geri dönüşsüz eylemlerin tek onayı; uyarı penceresi, odak "Vazgeç"te, Escape vazgeçer, onay işi bitince kapanır, odak açan öğeye döner.
  - `SayfaBasligi` panelde `gorunum="panel"` ile çizilir (kart 0141).
  - `Tablo` ve parçaları (kart 0258, karar 0158): tablonun iskeleti ve satır çizgisi, sunucuda da çizilir; boşluk ve hizalama kullananın. `TabloSecimi` (`tablo-secimi.tsx`): satır seçiminin kutusu, ekran okuyucu adıyla, basılan alan 44 px, sayfanın kısmen seçili hâli (`kismen`). Panel listeleri bunları liste motoruyla kullanır.
  - `AdetSecici` (kart 0212, karar 0135): azalt, adet ve artır; sınırdaki düğme kapalıdır, adet ekran okuyucuya duyurulur. Ürün sayfasında ve sepette kullanılır.
  - `DosyaYukleme` (kart 0094, karar 0165): dosya seçme düğmesi, yükleme sürerken ilerleme çubuğu ve İptal. İsteği kullanan gönderir; sürerken seçme düğmesi `aria-disabled`'dır, odak kaybolmaz. Alanın hatası düğmeye bağlanır. Seçilen dosyalar dizi olarak verilir; `coklu` birden çok dosya seçtirir, `birakma` düğmeleri kesik çizgili bırakma alanına alır (kart 0266).
  - `IlerlemeCubugu` (kart 0266): sürmekte olan işin oranı; ekran okuyucu adı ve yüzdeyi okur.
  - `RenkAlani` (kart 0260, karar 0168): rengin onaltılık kodu yazılan alan ve solunda tarayıcının renk seçicisi; ikisi aynı değeri gösterir, geçersiz yazılışta seçici son geçerli rengi tutar. Etiket ve hata `FormAlani` ile yazılan alana bağlanır, seçicinin adı kullanandan (`seciciEtiketi`).

  Sınıflar `sinif()` ile birleştirilir. Asıl shadcn hâlleri `bilesenler/shadcn-kaynagi/` altındadır, güncellemesi `pnpm shadcn-farki` ile yapılır.
- `bilesenler/parcalar/hareket-azaltma.ts`: `useHareketAzaltma` (kart 0110), kullanıcının hareketi azaltma tercihi. Kendiliğinden hareket eden parça bununla durur.
- `bilesenler/form/`: `Form`, `GonderDugmesi` (kart 0057), `FormAlani` (kart 0027; `ad` alanın yerini, `etiketEki` etiketin yanındaki işareti verir, kart 0259), `AramaFormu` (kart 0137: GET ile gönderilir, gizli bilgi taşıyan form onunla yazılmaz), `HataOzeti` (kart 0259: formun başındaki hata listesi, satırı alana götürür).
- `bilesenler/ikonlar/`: ikon sözlüğü (`sozluk.ts`) ve `Ikon`. Lucide yalnız sözlükte içe aktarılır.
- `bilesenler/tasarim-degerleri/`: tasarım değerleri ve Tailwind'in ortak girişi (kart 0102, karar 0076).
- Bileşen kataloğu `/gelistirme/bilesenler` adresindedir (kart 0104, karar 0078). Yalnız geliştirmede ve deneme ortamında açılır. Her parçanın kendi sayfası örneği, dosyayı ve kullanıldığı yerleri gösterir; renk ve genişlik adresten seçilir. Koyu tema sitenin ayarından bağımsız açıktır (`katalogTasarimCss`, karar 0166): katalog parçaları sitenin renkleriyle iki temada gösterir.
- Yeni parça kataloğa üç yerde eklenir: `cekirdek/katalog/kayit.ts`, `cekirdek/katalog/ornekler/<dosya adı>.tsx` ve `cekirdek/katalog/ornekler.tsx`. Kütüphanede olup katalogda olmayan dosya ya da örneklerde kullanılmayan parça testte kırmızıdır.
- Bir parçayı kullanan dosya eklenince ya da kalkınca `pnpm katalog-kullanimlari` çalıştırılır; liste kodla aynı değilse test kırmızıdır.
- Parçalar kataloğun ana sayfasında gerçek tarayıcıda klavyeyle ve taramayla denenir (`cekirdek/testler/uctan-uca/bilesenler.test.ts`). Her parça sayfası iki renkte ve üç genişlikte taranır (`katalog.test.ts`). Yeni parçanın klavye davranışı da teste eklenir.
- Metni olan parça metni zorunlu bir alanla alır. Pencerenin kapat düğmesi, yükleniyor göstergesi ve şeridin düğmeleri gibi ekran okuyucu metinleri `ortak.parca` altındadır.
