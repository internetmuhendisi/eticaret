# 0172 · Panelin kodu vitrine gitmez: panelin ikon sözlüğü, sunucuda kalan tema tabloları

## Tarih

2026-11-23

## Karar

Kart 0295 vitrinin kodunun 21 Kasım'dan bu yana neden büyüdüğünü ölçtü. Derleyici (Turbopack) bir modülü, uygulamanın bütün tarayıcı dosyalarının o modülden kullandığı her şeyle birlikte paketliyor. Panel ya da katalog bir ortak modülden bir şey kullanınca, o modülü yükleyen her vitrin sayfası da onu indiriyor. Bu yüzden:

- İkon sözlüğü ikiye ayrıldı:
  - `bilesenler/ikonlar/sozluk.ts`: vitrinin ve kütüphane parçalarının ikonları. Vitrinin koduna bütünüyle gider.
  - `bilesenler/ikonlar/panel-sozlugu.ts`: yalnız panelin, bileşen kataloğunun ve yalnız panelde kullanılan kütüphane parçalarının (biçimli metin alanı, dosya yükleme) ikonları.
- Ad ve tür kuralı:
  - `IkonAdi` yalnız ortak adlardır; vitrin panelin ikon adını kullanınca tür kontrolü hata verir.
  - Panel ikonu `PanelIkon` ile çizilir (`cekirdek/yonetim-paneli/panel-ikon.tsx`, tür `PanelIkonAdi`).
  - Kütüphane parçasına (boş hâl, ikon düğmesi, dosya yükleme) panel ikonu `panelIkonu(ad)` ile, sözlükten alınmış ikon olarak verilir. `Ikon` ad ya da ikon alır.
- Hazır temaların değer tabloları (`varsayilanTemaDegerleri`, `yumusakMevsimDegerleri`, `keskinCizgiDegerleri`) yalnız sunucuda okunur. Hiçbir tarayıcı dosyası (panel ve katalog dahil) onları içe aktarmaz. Katalogdaki renk alanı örneği başlangıç rengini sayfadaki CSS değişkeninden okur.
- Dosya yükleme istemcisi (`kapiyaYukle`) vitrinin bütün formlarının kullandığı `cekirdek/kapi/istemci.ts`'ten ayrıldı (`cekirdek/kapi/yukleme-istemcisi.ts`).
- Korumalar:
  - `cekirdek/testler/vitrin-kodu.test.ts`: panel ve katalog dışındaki hiçbir çekirdek dosyasından panel sözlüğüne içe aktarma zinciri varmaz; hiçbir tarayıcı dosyası tema tablolarını içe aktarmaz.
  - Lucide yalnız iki sözlükte içe aktarılır (denetim kuralı `ikon-sozlugu.grit`).
  - Zincir izleme kart 0253'ün testiyle ortaktır (`cekirdek/testler/ice-aktarma-zinciri.ts`).

## Neden

- Ölçüm (havale bildirimi sayfası, sıkıştırılmış): 21 Kasım'da 295,0 KB, bugün 301,6 KB. Büyümenin dökümü:
  - ikonlar +1,5 KB (vitrin 55 yerine 70 ikon indiriyordu);
  - tema tabloları yaklaşık +1,1 KB (katalogdaki renk alanı örneği yüzünden);
  - floating-ui yaklaşık +1 KB;
  - `istemci.ts`, biçimleyici, sipariş kaydı, yan pencere ve form alanı birlikte yaklaşık +1 KB;
  - vitrinin kendi metinleri yaklaşık +0,1 KB;
  - geri kalan yaklaşık 2 KB hiçbir dosyaya bağlanamadı (parçaların bölünmesi ve sıkıştırmanın dağılımı; ana dalda parça sayısı 20'den 21'e çıktı).
- Panel ekranları yeni ikon ekledikçe vitrin her seferinde büyüyordu. On dördüncü bölüm yeni panel ekranlarıyla sürüyor.
- Ayrı modül tek güvenilir yoldur. Aynı dosyada iki ayrı dışa aktarma da yetmez: derleyici modülde uygulamanın herhangi bir yerinde kullanılan her şeyi tutar.
- Tür kuralı panelin ikonunun vitrinde sessizce kaybolmasını önler. Ad tür kontrolünde reddedilir, çalışırken boş ikon çıkmaz.

## Düşünülen diğer yollar

- **Kod sınırını gevşetmek:** Kart bunu yasaklıyor; sınır kart 0253'te büyümeyi durdurmak için 305 KB'a indirilmişti.
- **Panelin ikonlarını bağlamla (React context) vermek:** Panelin sunucu bileşenleri (komut çubuğu, boş hâl) bağlam okuyamaz.
- **Sözlüğü metin taramasıyla korumak** ("panel ikonunun adı vitrin dosyasında tırnak içinde geçmez"):
  - Koşullu yazılan ikonu (`durdu ? "baslat" : "durdur"`) kaçırıyordu.
  - "tema", "iptal", "goster" gibi sıradan sözcüklerde yanlış alarm veriyordu.
- **Kütüphane parçalarına panel ikonu için ayrı alan açmak** (ör. `panelIkonu` adında bir prop): Aynı işi iki alanla yapmak olurdu. `Ikon`'un ad ya da ikon alması tek kuraldır.

## Sonuçları

- Hattın koşulunda (temiz veritabanı, iki işlemci) hız ölçümü yeşil. En büyük sayfalar ürün ve havale bildirimi (304 KB), sipariş takibi 303 KB. Aynı sayfalar hat 45112363642'de 306, 307 ve 305, 21 Kasım'da 301, 301 ve 300 KB'tı.
- Tür kuralı `as` ile atlatılabilir (`"takvim" as IkonAdi`): vitrinde ikon boş gelir. Bugün böyle yazım yok, yalnız disiplindir. Panel ikonu sözlükten alınmış bileşen olduğu için sunucu bileşeninden tarayıcı bileşenine geçirilemez; bugün `panelIkonu` yalnız tarayıcı dosyalarında çağrılır.
- Pay yaklaşık 1 KB'tır. Kalan büyüme şu kaynaklarda; kodda bunların düzeltme noktası yok, genel küçültme kart 0194'tedir:
  - floating-ui: 0259'dan beri derleyici `autoPlacement` ve `inline`'ı da paketliyor; uygulamada onları içe aktaran dosya yok.
  - biçimleyicinin ve sipariş kaydının panele eklenen parçaları;
  - vitrinin kendi metinleri.
- Panelin her ortak modüle eklediği yeni dışa aktarma hâlâ vitrine gidebilir. Bu yalnız ikon ve tema tablolarında testle korunur, öteki ortak modüllerde yalnız disiplindir. Örnek: `kapiyaYukle`'yi `istemci.ts`'e geri koymayı hiçbir test yakalamaz.
- Ortak sözlüğe yalnız panelde kullanılan bir ikon eklemek test edilmez, yalnız disiplindir. Sözlüğün başındaki not bunu söyler.
- Yeni panel ikonu panel sözlüğüne, yeni vitrin ikonu ortak sözlüğe yazılır. Bir ikon iki yerde kullanılacaksa ortaktır.
- Yalnız panelde kullanılan bir kütüphane parçası vitrine de alınırsa zincir testi kırmızıya düşer. O zaman ikonu ortak sözlüğe taşınır.
