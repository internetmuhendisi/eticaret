# 0089 · Ürün bölümleri Canlı Çarşı taslağına göre

## Tarih

2026-11-10

## Karar

Katalogdaki ürün bölümleri (karar 0088), seçilen yönün taslağıyla (`planlar/tasarim-yonu/secenekler.html`, A · Canlı Çarşı) yan yana karşılaştırıldı (kullanıcının isteği):

- Taslakta karşılaştırılan yerler: "Öne çıkanlar", yan afişli "Yeni gelenler", "Kategoriye göre" (sekmeler), "Süreli fırsatlar" ve marka satırı.
- Bakılan genişlikler: bilgisayar (1280 px) ve telefon (375 px).
- Bakılan temalar: açık ve koyu.
- Ölçülen stiller: konum, ölçü, sütun sayısı, yazı boyu, kalınlık, satır yüksekliği, renk, zemin, köşe, boşluk ve aralık.

Bölümler taslağa göre değişti:

- **Sütunlar:** Dikey kart geniş ekranda (80rem ve üstü) beş sütundur, taslaktaki gibi; masaüstünde dört, tablette üç, telefonda iki. Yan afişin yanında geniş ekranda dört sütundur. Kaydırmalı şeritte geniş ekranda beş kart görünür.
- **Yatay kartların aralığı:** 12 px'tir, taslağın kompakt ızgarasındaki gibi (eskiden 16 px).
- **Yan afiş:**
  - Varsayılan zemin üçüncü kutu rengidir (taslakta pembe kutu). Seçeneklerin başında durur.
  - Başlık ve metin bir grup olarak üsttedir, aralarında 8 px. Görsel genişliğin üçte ikisi kadardır ve sağa yaslıdır; telefonda da görünür (eskiden yalnız masaüstündeydi). Düğme koyu düğmedir (`ikincil`), altında çizgi yoktur. Öğeler kutuya dağılır.
  - Bölümün başlığı verilmemişse yan afişin başlığı bölümün başlığıdır (h2, bölüm onunla adlanır). Taslakta "Yeni gelenler" başlığı yan afişin içindedir. Bölümün başlığı da verilmişse yan afişin başlığı düz yazıdır: sayfada iki aynı başlık olmaz.
- **Fırsatlar:**
  - Kalan süre ("Bitmesine 2 gün 5 saat") kartın içinde, markanın üstündedir; eskiden kartın dışında, üstündeydi. Ürün kartına bu yüzden `ustSatir` yeri eklendi: kartı çizen bölüm verir, kartın verisi değildir.
  - Sayacın sayıları iki hanelidir ("05"). Yazılışı biçimleyicidedir (`ikiHaneli`, `cekirdek/metinler/bicimleyici.ts`): bölüm kodu sayı biçimlendirmez.
  - Üst yazı ve sayacın sayıları en kalın yazıyla (700) yazılır, taslaktaki gibi (eskiden 600).
- **Marka logoları:** Markanın adı en kalın yazıyla (700) yazılır, taslaktaki gibi.
- **Katalog:** Bölümlerin sırası ve içeriği taslaktaki gibidir: beş ürünlü öne çıkanlar, başlıksız ve yan afişli dört ürünlü yeni gelenler, yatay kartlı kategoriye göre, iki ürünlü fırsatlar, beş marka. Başlıklı yan afiş öteki görünümlerdedir.

**Taslaktan bilerek ayrılan yerler:**

- **Telefonda gizlenen ürün ve marka:** Taslak telefonda öne çıkanlarda ve markalarda yalnız ilk dördü gösterir. Bizde mağaza sahibinin seçtiği adet her genişlikte görünür: seçtiği ürün ya da marka telefonda kaybolmaz.
- **Yatay kartların sütunu ve düğmeleri:** Taslakta dört sütundur, bizde üç (karar 0086). Kartta sepet ve favori düğmeleri vardır; telefonda fiyat aralığı iki satıra iner.
- **Telefonda sekmeler:** Taslakta alt satıra sarar, bizde kendi şeridinde kayar. Bu ortak `Sekmeler` parçasının davranışıdır (karar 0077); sayfa yana kaymaz.
- **Harf aralığı:** Taslakta üst yazı 0,06em, marka adı 0,04em aralıklıdır. Tasarım değerlerinde harf aralığı yoktur; temanın değeri olarak eklenmesi tema kartının işidir (kart 0114). Taslağın Keskin Çizgi yönü de harf aralığını temaya bağlar.
- **Ölçekte olmayan küçük değerler:**
  - Fırsat paneli 256 px, taslakta yaklaşık 280 px. Yan afiş 256 px, taslakta yaklaşık 240 px. İkisi aynı `panel` genişliğidir.
  - Panelin iç boşluğu masaüstünde 32, telefonda 24 px; taslakta 28 px.
  - Sayaç kutusunun iç boşluğu 12 ve 8 px, taslakta 10 ve 8 px.
  - Marka kutusu 80 px yüksekliğinde, taslakta 76 px.
  - Üst yazı 12 px, taslakta 13 px.
  - Bölüm başlığıyla içerik arası 16 px, taslakta 18 px.
  - 1–4 piksel için ölçeğe değer eklenmedi.
- **Kart içerikleri:** Vergi metni, sepet düğmesi ve rozet metni karar 0086'daki gibidir.

## Neden

- Örnek Mağaza'nın teması Canlı Çarşı'dır. Bölümlerin yerleşimi temanın değerleriyle değil bölümlerin sınıflarıyla gelir; taslağa ancak bölüm değişince uyar.
- Kalan sürenin kartın içinde olması, kartla süreyi tek bir bütün yapar. Dışarıdaki yazı telefonda iki satıra inince kartları farklı yüksekliğe itiyordu.
- Yan afişin başlığının bölümün başlığı olması, taslaktaki tek başlıklı yerleşimi sağlar. İki başlık ekran okuyucuda aynı adı iki kez okutuyordu.
- Erişilebilirlik ve çekirdeğin kuralları (seçilen adedin görünmesi, ölçek, ortak parçalar) taslaktan önce gelir; taslak ölçülmüş bir tasarım sistemi değildir.

## Düşünülen diğer yollar

- **Kalan süreyi kartın dışında bırakmak (eski hâli):** Seçilmedi; taslakta kartın içindedir.
- **Sayıyı bölümde iki haneye çevirmek:** Bölüm kodunda rakamla başlayan yazı denetimde yasaktır (karar 0081). Biçim biçimleyiciye yazıldı.
- **Harf aralığını tasarım değerlerine şimdi eklemek:** Seçilmedi. İki yer için tema değeri açmak tema kartının kararıdır.
- **Telefonda dördüncüden sonrasını gizlemek:** Seçilmedi; yukarıdaki neden.

## Sonuçları

- Çekirdek 0.45.0 oldu. Veritabanı değişikliği yoktur.
- Ürün kartının yeni `ustSatir` yeri yalnız kartı çizen bölümden gelir. Kartın veri işlevi (`urunKartlari`) değişmedi.
- Karşılaştırma bir kez görüntüyle ve hesaplanan stillerle yapıldı, testte yok. Yeni davranışlar (yan afişin başlığı, kalan sürenin kartın içinde olması, iki haneli sayı, katalogda örnek bölüm kimliklerinin tekilliği) testtedir.
- Karşılaştırma sırasında katalogda iki ürün vitrininin aynı kimliği taşıdığı görüldü (React anahtar uyarısı). Örnek bölümün kimliği ek alır; her örnek listede kimliklerin tekil olduğu testtedir. Deneme formundaki onay kutusunun hidrasyon uyarısı bu işten değildir (kart 0123).
