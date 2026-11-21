# 0164 · Ürün ekranının fiyat ve stok bölümleri

## Tarih

2026-11-22

## Karar

Panelin ürün ekranına fiyat, fiyat geçmişi, stok ve stok geçmişi bölümleri eklendi (kart 0265).

- **Tek form, tek işlem:** Fiyat ve stok alanları ürünün formunun parçasıdır, "Kaydet" ürünle birlikte kaydeder (karar 0162). Uç (`urun-ekle`, `urun-degistir`) önce seçenekleri, sonra ürünü, en son fiyatı ve stoğu aynı veritabanı işleminde yazar (`panelFiyatStokYaz`, `cekirdek/moduller/urun/panel-fiyat-stok.ts`): biri düşerse hiçbiri kalmaz. Stok en sondadır: stok satırının kilidinden sonra ürünün kilidi alınmaz (karar 0068).
- **Yalnız değişen gider:** Ekran (`fiyatStokGirdisi`) sunucudaki hâliyle karşılaştırır; fiyatı ya da stoğu değişen birim bir satır olur (basit ürün `fiyat` ve `stok` yeri, birleşim `birlesimler.<sıra>` ve değerlerinin sırası). Stok ekranın gördüğü miktarla gider, arada değiştiyse çakışma.
- **İzin ayrıdır:** Fiyat `fiyat.degistir`, stok `stok.duzelt` ister (görevli fiyatı görür, değiştiremez; stoğu düzeltir). İzni olmayan alanlar kapalıdır, uç yine denetler. Görme izni olmayana bölüm ve geçmiş gösterilmez.
- **Seçenekli üründe** birleşimlerin satış fiyatı, indirimli fiyatı ve stoğu seçenekler bölümünün tablosundadır. İndirimin başlangıcı ve bitişi fiyat bölümünde bütün indirimli birleşimler için ortaktır, yalnız indirimli birleşime yazılır.
- **Stok değişikliğinin sebebi (kullanıcı kararı):** Tablodaki stok değişiklikleri için tablonun altında tek bir sebep seçilir, varsayılanı "Sayım düzeltmesi"; "Diğer"de not zorunludur. Kaydet'le gider, değişen bütün birleşimlere yazılır.
- **Basit ürünün stoğu** "Stoğu düzelt" penceresiyle (yeni miktar, sebep, not) hemen kaydedilir (`urun-stok-duzelt`), ürünün formundan bağımsızdır. Yeni basit üründe "Başlangıç stoğu" ürünle birlikte "Yeni mal geldi" sebebiyle yazılır. Durum satırı sepette ayrılmış miktarı da söyler (süresi dolmamış ayırmalar).
- **Fiyat geçmişi yazanı tutar:** `fiyat_gecmisi` tablosuna kim yazdı alanları eklendi (değişiklik 0051); eski satırlarda boştur, ekranda "Bilinmiyor". Geçmişler ürünün bütün birimlerini tek listede, en yeni önce, onar onar gösterir ("Daha fazla" uçla gelir: `urun-fiyat-gecmisi`, `urun-stok-gecmisi`).
- **"Vitrinde şu an"** kutusu vitrinin gösterim işleviyle (`gosterilecekFiyatlar`) çizilir: tutar, üstü çizili eski fiyat (son 30 günün en düşüğü, karar 0067) ve fiyatın yanındaki metin vitrindekiyle aynıdır.

## Neden

- Fiyat ve stok aynı ekrandaki ürün bilgisidir; ayrı kaydetme düğmeleri mağaza sahibine hangi değişikliğin kaydedildiğini sordururdu. Tek işlem yarım kalan kaydı önler.
- Birleşim tablosunda her satır için ayrı sebep sormak uzun ürünlerde yorucudur; sayım dışındaki sebep nadirdir.
- Basit ürünün stoğu sayfada yazılabilir bir alan olsaydı, siparişle düşen stok kaydedilmemiş bir sayıyla ezilebilirdi; pencere gördüğü miktarı söyler ve hemen kaydeder.
- Fiyat geçmişinde kimin değiştirdiği yazmıyordu (yalnız değişiklik kaydında vardı); ekranın tek sorguyla göstermesi için geçmişe yazıldı.

## Düşünülen diğer yollar

- Fiyat ve stok için ayrı uçlar ve ayrı kaydet: kaydedilmemiş değişiklik iki yerde tutulurdu, çıkış koruması karışırdı.
- Birleşim tablosunda her satıra sebep: taslakta yer yok, telefonda tablo daha da genişlerdi.
- Basit ürünün stoğunu sayfadaki alanla yazmak: yukarıdaki ezme sorunu.
- Kim yazdı bilgisini değişiklik kaydından birleştirmek: iki tabloyu zamanla eşlemek gerekirdi, aynı milisaniyede belirsizdi.

## Sonuçları

- Uç girdisi büyüdü (`fiyatStok`); hata yolları üç modülün kodlarıyla döner (ürün, fiyat, stok), ekran üçünün metnini birleştirir.
- Eski fiyat geçmişi satırlarında yazan yoktur.
- Sayfanın formunun içinden açılan pencerenin formu gönderim olayını dışarı taşırdı (React olayı portaldan geçer): ortak form artık olayı durdurur (`PanelFormu`).
- Taslaktan farklar: stok kodu ve barkod "Satış" bölümünde kalır (karar 0162); tutar alanında para simgesi kargo ekranındaki gibi alanın içindedir; "Bütün geçmiş" bağlantısı yerine "Daha fazla" düğmesi vardır; geçmiş başlığında "Değiştirilemez" notu yoktur.
