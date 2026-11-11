# 0104 · Vitrinin "bulunamadı" ve hata sayfası çerçevenin içinde

## Tarih

2026-11-11

## Karar

Vitrinin "bulunamadı" ve hata sayfası vitrin çerçevesinin (`app/(vitrin)/layout.tsx`) içinde çizilir, üst ve alt kısım görünür (kart 0120).

- Vitrinde karşılığı olmayan her adresi `app/(vitrin)/[...adres]/page.tsx` yakalar ve `notFound()` verir; olmayan kayıt da (`kayitAdresiniCoz`) aynı yoldan gider. İkisi `app/(vitrin)/not-found.tsx` ile `BulunamadiSayfasi`'nı açar (`cekirdek/vitrin/bulunamadi-sayfasi.tsx`). Durum kodu 404'tür, sayfa `noindex` taşır.
- Kapı (`/kapi`) ve geliştirme (`/gelistirme`) adresleri, adresin kendisi de, kendi `[[...adres]]` yakalayıcısıyla; panel (`/yonetim`) `(panel)` grubundaki `[...adres]` ile vitrinin yakalayıcısından ayrılır ve Next.js'in kendi 404'ünü verir. Girişsiz panel isteği giriş sayfasına yönlenir.
- Tarayıcının her sayfada kendiliğinden istediği `/favicon.ico` ara katmanda gövdesiz 404 alır: vitrinin yakalayıcısına düşse her sayfa görüntülemesine veritabanını okuyan ikinci bir çizim eklenirdi (bağımsız kontrol). Site ikonunun kendisi kart 0150'dedir.
- Vitrin sayfasının hatası `app/(vitrin)/error.tsx` ile `HataSayfasi`'na düşer (`cekirdek/vitrin/hata-sayfasi.tsx`). Çerçevenin kendi hatası kök hata ekranına (`app/error.tsx`) düşer.
- "Bulunamadı" sayfasının altındaki kategoriler, sitenin üst düzey kategorileriyle kurulan bir kategori kutuları bölümüdür (ızgara görünümü). Kutunun görünüşü bölümün tek kodundan, verisi vitrin bağlamından gelir.
- Hata sayfası mağaza adını ve telefonu çerçevenin okuduğu bağlamdan, tarayıcıdaki `VitrinBilgisiSaglayici` ile alır.
- Sekme başlığı bulunamadı sayfasında "Sayfa bulunamadı | <mağaza>", hata sayfasında "Bir şeyler ters gitti | <mağaza>"dır: ekran okuyucu sayfa geçişini sekme başlığıyla duyurur. Bulunamadı sayfasınınki yakalayıcının ve kayıt sayfasının sayfa bilgisinden (`bulunamadiSayfaBilgisi`), hata sayfasınınki React'ın `<title>` öğesinden gelir; kalıp tek işlevdedir (`sekmeBasligi`).
- Taslakta ana renkte olan büyük "404" yazısı temanın yazı rengindedir: Canlı Çarşı'nın ana rengi beyaz zeminde 2,1:1'dir ve büyük yazının 3:1 sınırının altında kalır (tarama yakaladı).

## Neden

Next.js eşleşmeyen adresi kök düzende açar, vitrin çerçevesini atlar. Çerçevenin içinde kalmanın tek yolu adresi çerçevenin altındaki bir yakalayıcıyla almaktır. Kategori kutularını yeniden yazmak aynı görünüşü ikinci kez kurmak olurdu; bölümün kodu zaten görsel, renk ve bağlantı kurallarını taşıyor.

## Düşünülen diğer yollar

- **Kökte `not-found.tsx` ve çerçeveyi orada yeniden çizmek:** Eşleşmeyen adres sunucuda tam çizilirdi, ama kökteki sayfa kapı, panel ve geliştirme adreslerinin de bulunamadı sayfası olurdu. Hangi adresten gelindiği orada bilinmez; çerçevenin okunması da iki yerde olurdu.
- **`global-not-found.js`:** Düzenleri hiç çizmez, çerçeve olmaz.
- **Ara katmanda adrese bakıp yönlendirmek:** Ara katman bugün yalnız panel ve geliştirme adreslerinde çalışır; her vitrin isteğine açmak ve rotaları orada ikinci kez tanımlamak gerekirdi.
- **Kategorileri sayfanın kendi ızgarasıyla çizmek:** Kategori kutularının görünüşü iki yerde tanımlanırdı.

## Sonuçları

- Next.js 16'da `notFound()` ile açılan sayfa sunucuda HTML olarak çizilmez: sunucu boş bir kabuk ve sayfanın verisini gönderir, sayfayı tarayıcı çizer (ölçüldü, canlı derlemede de aynı). Durum kodu 404 ve `noindex` korunur. Kart 0135'teki olmayan kayıt da bugün böyleydi. JavaScript'siz istemci boş sayfa görür.
- Kapı ve geliştirme adreslerinin 404'ü de artık aynı yoldan, tarayıcıda çizilir; içeriği ve durum kodu aynıdır. Girişsiz `/yonetim/giris/<olmayan>` artık 404 yerine giriş sayfasına yönlenir.
- Bulunamadı sayfası çerçeveyle birlikte veritabanını iki kez okur (çerçevenin ve kategorilerin bağlamı). Bot taramaları (`/wp-login.php` gibi) bu maliyeti taşır; vitrin sayfalarında istek sınırı yoktur.
- İç içe `not-found.tsx` sayfa bilgisi veremez; başlığı `notFound()`'u veren sayfanın sayfa bilgisi verir. Yeni bir vitrin sayfası `notFound()` verecekse sayfa bilgisinde de `bulunamadiSayfaBilgisi`'ni döner. Hata sayfasının başlık öğesi sayfa bilgisinin başlığından önce gelir (ölçüldü); başta iki `<title>` durur.
- Kapı, panel ya da geliştirme altına yeni bir üst klasör açılırsa (örneğin `/hesabim`) o da vitrin çerçevesindeki yakalayıcıya düşer; vitrin dışı bir adres ailesi açan iş kendi yakalayıcısını ekler.
- Hata sayfasının tarayıcı testi için yalnız geliştirmede açılan bir deneme sayfası vardır (`/gelistirme/hata-denemesi`, katalog kapısıyla). Deneme ortamında katalog açıktır ama bu sayfa kapalıdır: deneme adresi internete açıktır, her istek hata izleme aracına kayıt yazardı (bağımsız kontrol).
