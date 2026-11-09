# 0084 · Üst ve alt kısım Canlı Çarşı taslağına göre

## Tarih

2026-11-09

## Karar

Bileşen kataloğundaki üst ve alt kısım bölümleri (karar 0083), seçilen yönün taslağıyla (`planlar/tasarim-yonu/secenekler.html`, A · Canlı Çarşı, karar 0075) yan yana karşılaştırıldı (kullanıcının isteği). Karşılaştırma bilgisayar (1280 px) ve telefon (390 px) genişliğinde, açık ve koyu temada yapıldı. Eşleşen öğelerin stilleri iki sayfada ölçüldü. Bölümler taslağa göre değişti:

**Üst kısım**

- **Duyuru şeridi:**
  - Yeni ilk görünüm "iki yana": metin solda, mağazanın telefonu sağda (yalnız masaüstünde), ince yazı.
  - Varsayılan zemin alt kısım rengidir.
  - "İnce" görünüm kalktı; ikinci görünüm "ortalı"dır.
- **Logo ve simgeler satırı:**
  - Dikey boşluk 16 px (masaüstü), yan boşluk 24 px (tablet ve üstü).
  - Mağaza adı başlık yazı tipinde (Jost): masaüstünde 22 px, telefonda 18 px.
  - Masaüstünde hesap ikon ve yazıyla, ince ve alt çizgisiz görünür.
  - Masaüstünde sepet kenarlı, yüzey renkli bir hap içinde ikon, "Sepet" yazısı ve sayıyla görünür.
  - Sayı yuvarlak, 20 px ve ana renktedir.
  - Telefon numarası "logo solda" görünümünde satırdan çıktı, taslaktaki gibi duyuru şeridindedir. "Logo ortada" görünümünde satırda kalır.
- **Menü satırı:**
  - "Kategoriler" düğmesi ana renkte, 4 px köşeli ve menü ikonludur.
  - Menü bağlantıları ve açılır dallar 500 kalınlığındadır.

**Alt kısım**

- **Yerleşim:**
  - Sütun bölümleri tek bir ızgaradadır: telefonda 2, masaüstünde 5 sütun.
  - Bağlantı sütunları masaüstünde sütun sayısı kadar yer alır ve sütunları ızgaraya oturur. Daha dar ekranda sütunlar ızgaraya tek tek yerleşir (`display: contents`).
  - Telif ve ödeme işaretleri çizgiyle ayrılan en alt satırdadır: telif solda, işaretler sağda. Tarife yeni `altKisimdaYeri` bilgisi eklendi.
  - Boşluklar: üstte 44 px, altta 24 px, ızgarada 24 ve 32 px.
- **İletişim sütunu:**
  - Başlık verilmezse mağazanın adıdır (Jost, 18 px).
  - Liste görünümünde bilgiler ikonsuz ve soluk renktedir. Yatay görünüm ikonlu kalır.
- **Sütun başlıkları** Inter ve 700 kalınlığındadır.
- **Bağlantılar** soluk renkte ve alt çizgisizdir; alt çizgi üzerine gelince görünür, menü satırındaki gibi.
- **Ödeme işaretleri:** "Yazılı" görünümde her yöntem kenarlı, küçük bir yazıdır (ikonsuz).
- **Telif satırının** tek görünümü vardır. Yeri ve yazısı alt satırdan gelir.
- Canlı Çarşı'nın başlangıç düzeninde ve katalog örneğinde iletişim sütunu öndedir.

**Katalog:** Bölüm kütüphanesi sayfası içerik genişliğinde (`max-w-icerik`) açılır. Üst ve alt kısım masaüstünde gerçek genişliğinde görülür; önceden metin genişliğindeydi.

**Taslaktan bilerek ayrılan yerler:**

- **Arama kutusu:** Taslakta üst kısımda bir arama kutusu var. Bizde arama, işlevi yazılınca ikonlu bağlantıdır (karar 0083). Gerçek arama sayfası olmadan çalışmayan bir giriş alanı konmadı.
- **Hesap telefonda:** Taslakta hesap telefonda da satırdadır. Bizde yan penceredeki listededir (karar 0083): arama ve sepetle birlikte logo üç harfe iniyordu.
- **Hesabın yazısı** "Giriş yap" değil "Hesabım"dır. Sayfa, müşterinin girişli olup olmadığını sunucuda bilmez.
- **Alt kısım bağlantılarının yüksekliği** taslakta 32 px, bizde 44 px (dokunma alanı kuralı, karar 0077).
- **Duyuru şeridinin yüksekliği** telefon bağlantısı yüzünden 44 px (taslakta 36 px).
- **Ölçekte olmayan değerler** en yakın değere yuvarlandı:
  - taslağın 13 px yazısı 14 px (duyuru) ve 12 px (alt satır) oldu
  - 15 px sütun başlığı 14 px oldu
  - "Kategoriler" düğmesinin 18 px yan boşluğu 16 px oldu
- **Sosyal hesaplar** taslakta yok. Bölüm öteki sütunlarla aynı biçimde çizilir.

## Neden

- Örnek Mağaza'nın teması Canlı Çarşı'dır (karar 0075). Üst ve alt kısmın biçimi tema değerleriyle değil bölümün sınıflarıyla gelir; taslağa ancak bölümler değişince uyar. Karar 0079'un parçalar için yaptığının aynısıdır.
- Alt kısmın yerleşimi tek tek bölümlerin değil kısmın işidir. Telif ve ödeme işaretlerinin yeri tarifte durur: çerçeve tür adı bilmez, yeni bir alt satır bölümü tarifiyle gelir.

## Düşünülen diğer yollar

- **Alt kısmı tek bir büyük bölüm yapmak:** Taslağa daha kolay uyardı. Ama kart 0108 alt kısmı ayrı ayrı gizlenip sıralanabilen bölümlerden ister. Seçilmedi.
- **Telefonda bağlantı sütunlarını tek blok bırakmak:** İletişim sütununun yanında boşluk kalıyordu (ekran görüntüsünde görüldü). Seçilmedi.

## Sonuçları

- Vitrinin üst ve alt kısmı Canlı Çarşı'ya göre görünür. Öteki hazır temalar (Yumuşak Mevsim, Keskin Çizgi) başka bir görünüm isteyecek; bu, temanın görünüm seçenekleriyle gelir (kart 0114).
- Masaüstünde bağlantı sütunları `display: contents` kullanmaz. Daha dar ekranda kullanır: eski tarayıcılarda (Safari 17 öncesi) gezinme alanı ekran okuyucuda görünmeyebilir. Bugünkü tarayıcılarda erişilebilirlik taraması geçer.
- Karşılaştırma ve stil ölçümü bir kez elle yapıldı, kalıcı bir test değildir. Yerleşim, görünümler ve sınıflar birim testindedir.
