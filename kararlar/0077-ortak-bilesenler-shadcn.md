# 0077 · Ortak bileşenler: shadcn/ui'ın alınışı ve güncellenmesi

## Tarih

2026-11-09

## Karar

Vitrinin ve panelin ortak parçaları shadcn/ui'dan uyarlanır ve `bilesenler/parcalar/` altında Türkçe adlarla durur (kart 0103). İlk parçalar:
- düğme ve yalnız ikonlu düğme
- giriş alanı, etiket, seçim kutusu, onay kutusu
- açılır menü, pencere, yan pencere, sekmeler
- kart, rozet, uyarı, bildirim, ipucu
- iskelet görünüm, yükleniyor göstergesi, kaydırmalı şerit, akordeon

**Alınış:**
- **Paket değil, kopya:** shadcn/ui bir paket değil, kopyalanan koddur. Parçalar shadcn'in kayıt adresinden (`new-york-v4` biçimi) indirilir ve elle uyarlanır. Komut aracı (`shadcn add`) kullanılmaz: dosya adları, sınıf adları ve klasör düzeni bizimkinden farklıdır, çıktısı zaten baştan yazılırdı.
- **Asıl hâller saklanır:** İndirilen asıl hâller `bilesenler/shadcn-kaynagi/` altında dokunulmadan durur. İçe aktarılmazlar, denetime girmezler.
- **Altyapı:** Radix UI (`radix-ui`), bildirim için Sonner, kaydırmalı şerit için Embla, ikonlar için Lucide. Hepsi shadcn'in kendi seçimidir.
- **Görünüş:**
  - Sınıflar tasarım değerlerinin adlarıyla yazılır (karar 0076). shadcn'in kendi adları (`bg-primary`, `text-sm`), `dark:` ve köşeli parantezli değerler kaldırılır.
  - Radix'in durumları için Tailwind'e adlı durumlar tanıtılır (`acik:`, `kapali:`, `etkin:`, `isaretli:`, `devre-disi:`, `vurgulu:`, `yer-tutucu:`). Radix'in açılır parçalara verdiği ölçüler için üç adlı sınıf eklenir (`secim-genisligi`, `secim-yuksekligi`, `menu-yuksekligi`).
  - Animasyonların hareketi `tailwind.css`'te tanımlıdır. Tailwind 4, ayar dosyasındaki `keyframes` alanını CSS'e yazmaz (ölçüldü). Her animasyonun tanımı olduğunu bir test denetler.
- **Metin:**
  - Parçaların içinde metin yoktur. shadcn'in gömülü İngilizce metinleri kaldırılır, kullanan sayfadan zorunlu bir alanla gelir: pencerenin kapat düğmesi "Close", şeridin rol tanımları "carousel" ve "slide", yükleniyor göstergesi "Loading", bildirim alanı "Notifications".
  - Parçaların ortak ekran okuyucu metinleri `ortak.parca` altındadır.
- **İkon:**
  - Lucide yalnız ikon sözlüğünde (`bilesenler/ikonlar/sozluk.ts`) içe aktarılır, başka yerde içe aktarmak denetimde hatadır. Sayfa ve parça `<Ikon ad="kapat" />` kullanır.
  - Yalnız ikonu olan düğme `IkonDugmesi`'dir. Adı zorunludur (tür kontrolü), ipucunda da görünür.
- **Sınıf birleştirme:** `sinif()` (shadcn'in `cn` işlevi, tailwind-merge). Tailwind-merge tasarım değerlerinin adlarını `degerler.ts`'ten öğrenir. Öğrenmezse `text-govde` (boy) ile `text-yazi`yı (renk) çakışıyor sanıp birini siler (ölçüldü, 7 test kırmızı).
- **Ham öğe:** Kütüphane dışında `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>` yazmak denetimde hatadır.
- **Denetim muafiyeti köke bağlı:** Kütüphane, ikon sözlüğü, tasarım değerleri, form ve biçimleyici muafiyetleri yalnız projenin kökündeki klasör içindir. Başka bir klasörün içindeki aynı adlı klasör (`cekirdek/.../bilesenler/`) muaf değildir; önceki kalıp onu da muaf sayıyordu.

**shadcn'den ayrıldığımız davranışlar** (hepsi ölçülerek):
- **Pencere, yan pencere ve seçim listesi açıkken sayfanın geri kalanı `inert` olur** (`disariyi-kapat.ts`). Radix dışarıyı yalnız `aria-hidden` ile gizler, öğeler odaklanabilir kalır; axe bunu `aria-hidden-focus` hatası sayar. Kullanan sayfa `ref` verirse ikisi birlikte bağlanır.
- **Bildirim alanı dışarıda kalır.** Alan gövdenin ayrı bir çocuğudur ve `data-disarida-kalir` işaretini taşır. Pencere açıkken etkisiz kılınmaz, Radix'in tıklama kilidine takılmaz. Ona yapılan tıklama pencereyi "dışarı tıklandı" diye kapatmaz. Pencereden verilen bildirim ekran okuyucuya okunur ve fareyle kapatılır. Klavye odağı pencerede kalır (WAI-ARIA'nın pencere kalıbı): bildirim odak almadan okunur.
- **Katman sırası:** Açılır parçalar (menü, seçim listesi, ipucu) pencerelerin üstündedir: yan pencere 20, pencere 30, açılır 40, bildirim 50. Radix açılır içeriği gövdenin ayrı bir çocuğu olarak çizdiği için pencerenin içindeki seçim listesi ve ipucu önceki sırada pencerenin arkasında kalıyordu.
- **Açılır menü sayfayı kilitlemez** (`modal={false}`). WAI-ARIA'nın menü düğmesi kalıbı kilit istemez, kilitli menü aynı tarama hatasını verir.
- **İpucunun kapanış animasyonu yoktur, açılış animasyonu kapanınca kesilir.** Radix animasyonu süren ipucunu kaldırmıyor; kapanmakta olan ipucu Escape'i boşa yutuyor, altındaki pencere kapanmıyordu.
- **Telefona uyum:**
  - Pencere telefonda tam ekran açılır, alttaki düğmeler ekranın altında durur.
  - Yan pencere telefonda ekranın tamamını kaplar.
  - Şeridin düğmeleri şeridin altındadır, dışına taşmaz.
  - Dokunulan her öğe (düğme, menü ve seçim öğesi, sekme, akordeon başlığı, onay kutusunun yazısı) en az 44 px yüksekliktedir.
- **Pencere genişliği:** Panel düzeni kuralının üç standart genişliğinden biridir (`kucuk`, `orta`, `genis`).
- **Şerit ve ok tuşları:** Şerit ok tuşlarını yakalama aşamasında değil, öğe tuşu kullanmadıysa ve odak bir yazı alanında değilse işler. Şeridin içindeki yazı alanında imleç, sekmelerde seçim ok tuşuyla çalışır.
- **Yükleniyor göstergesi:** Ekran okuyucunun okuduğu yazı durum alanının içeriğidir (görünmez yazı), ad (`aria-label`) değil: ekran okuyucular durum alanının içeriğini okur.
- **Hareket azaltma:** Hareketi azaltmayı seçen kullanıcıda açılış, kapanış ve dönme hareketi olmaz. Kural bilerek katman dışındadır: katmansız stil Tailwind'in sınıflarının önüne geçer, `!important` gerekmez.

**Güncelleme:**
1. `pnpm shadcn-farki` her parçanın shadcn'deki bugünkü hâlini indirir, saklanan asıl hâlle karşılaştırır ve farkı yazar.
2. Fark, Türkçe parçaya elle uyarlanır.
3. `pnpm shadcn-farki --kaydet` yeni asıl hâli saklar.
4. Radix, Sonner, Embla ve Lucide sürümleri paket güncellemesiyle ayrıca yükseltilir. Her güncellemeden sonra tarayıcı testi (`cekirdek/testler/uctan-uca/bilesenler.test.ts`) çalışır.

**Deneme sahnesi:**
- Parçalar gerçek tarayıcıda, yalnız geliştirmede var olan bir sayfada denenir (`app/gelistirme/bilesenler/page.deneme.tsx`).
- `page.deneme.tsx` uzantısını Next.js yalnız geliştirme sunucusu evresinde (`PHASE_DEVELOPMENT_SERVER`) sayfa sayar (`pageExtensions`). Koşul ortam değişkeni değil, evredir: `next build` hangi `NODE_ENV` ile çalışırsa çalışsın sayfa derlenmez.
- Bu dosyalar görüntüye de girmez (`Dockerfile.dockerignore`), uygulamanın tür kontrolü onları atlar, kökteki tür kontrolü denetler. Yerel ortam denemesi gerçek görüntüde adresin 404 aldığını ölçer.
- Bileşen kataloğu (kart 0104) bu yolun üstüne kurulur.

## Neden

- Kopya kod kütüphanenin dışa bağımlılığını azaltır: davranışı ve görünüşü bizim kurallarımıza göre değiştirebiliyoruz. Örneğin metinsiz parçalar, 44 px dokunma alanı, tam ekran pencere ve tasarım değerleri.
- Radix, erişilebilirliği en çok denenmiş başsız parçalardan biridir. Klavye, odak ve ekran okuyucu davranışını o verir.
- Asıl hâllerin saklanması, shadcn'deki düzeltmeleri kaçırmadan izlemenin tek yoludur. Kayıt adresi sürümlü değildir, eski hâli sonradan indirmek mümkün değildir.

## Düşünülen diğer yollar

- **`shadcn add` komut aracı:** Dosyaları İngilizce adlarla ve kendi düzeninde yazar, sınıfları bizim adlarımıza çevirmez. Çıktıyı yine elle uyarlamak gerekirdi; komutun tek kazancı indirmekti.
- **Base UI altyapısı:** shadcn artık Base UI'yi de destekliyor. Daha yeni, daha az denenmiş olduğu için seçilmedi.
- **Yerli öğeler (yerli onay kutusu, yerli seçim kutusu):** Formda daha sağlam olurdu. Ama görünüşü temaya uymaz, seçim listesi telefon dışında biçimlenemez. Radix'in onay kutusu formda gizli bir yerli alan tutar; FormData'da aynı değerle geldiği testte ölçülür.
- **Erişilebilirlik bulgularını taramada kapatmak:** `aria-hidden-focus` kuralı kapatılabilirdi. Bulgu gerçekti (dışarıdaki öğeler programla odak alabiliyordu), bu yüzden davranış düzeltildi.

## Sonuçları

- Bağımlılık eklendi: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `embla-carousel-react`. Testler için `@axe-core/playwright` ve `@testing-library/user-event`.
- shadcn'deki bir düzeltme kendiliğinden gelmez, elle uyarlanır. Bedeli düzenli `pnpm shadcn-farki` çalıştırmaktır. Bu bir kontrole bağlı değildir, yalnız disiplindir.
- Radix'in kendi davranışları kalır:
  - Sayfa kayınca ipucu kapanır.
  - Onay öğesi seçilince menü kapanır.
  - Açık ipucu varken ilk Escape ipucunu, ikincisi pencereyi kapatır.
- Kart 0102'de Tailwind ayarına yazılan animasyon tanımı hiç CSS'e çıkmıyordu: "yükleniyor" yazısı (kart 0057) 0.32.0'da hiç görünmüyordu. 0.32.0 hiçbir siteye yayınlanmadı. Tanım bu kartta CSS'e taşındı. Kart 0057'nin tarayıcı testi stili de beklettiği için bunu yakalamıyordu; artık yalnız kodu bekletir ve gecikmeyi ölçer.
- Panel ve vitrin sayfalarında henüz bu parçaların çoğu kullanılmıyor. Sayfalar geldikçe kullanılacak; yeni bir parça önce kütüphaneye eklenir.
