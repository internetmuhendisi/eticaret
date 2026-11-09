# 0079 · Ortak parçaların görünüşü Canlı Çarşı taslağına göre

## Tarih

2026-11-09

## Karar

Bileşen kataloğu (karar 0078), seçilen yönün taslağıyla (`planlar/tasarim-yonu/secenekler.html`, A · Canlı Çarşı, karar 0075) bilgisayar ve telefon genişliğinde, açık ve koyu temada yan yana karşılaştırıldı (kullanıcının isteği). Eşleşen parçaların stilleri iki sayfada ölçüldü. Ortak parçalar taslağa göre değişti:

- **Düğme:**
  - Yazı 700 kalınlığında. Yeni kalınlık değeri: `en-kalin`.
  - Yan boşluk 20 px (`px-5`).
  - `ikincil` artık koyu düğmedir: zemini yazının rengi, yazısı zeminin rengi. Taslaktaki "Ürünü incele", "Tümünü gör" ve "Kaydol" düğmeleridir; koyu temada açık renge döner.
  - `cerceveli`: kenarı yazının renginde, zemini saydam.
  - Şeridin önceki ve sonraki düğmeleri bu türdür. Taslaktaki yuvarlak afiş düğmeleriyle aynı görünür.
- **Giriş alanı ve seçim kutusu:** Hap biçimindedir (`rounded-dugme`), yan boşluk 16 px.
- **Rozet:**
  - Yazı 700 kalınlığında.
  - Yeni `koyu` türü: "Tükendi" ve öne çıkan etiketler, taslaktaki gibi.
  - `cerceveli` rozetin kenarı yazının rengindedir.
- **Sekmeler:** Gri kutu içinde bölmeli düğme değil, ayrı hap biçimli düğmelerdir. Seçili sekmenin zemini yazının rengidir.
- **Bağlantı (`Baglanti`):** Yazısı kalındır (600), taslaktaki "Tümünü gör", "İncele" gibi.

**Taslaktan bilerek ayrılan yerler:**
- **Giriş alanının kenarı** `alan-kenari` rengindedir. Taslağın açık kenarı (`#E3E6EB`) zeminle 3:1 kontrastı sağlamaz; erişilebilirlik kuralı bunu ister (kart 0102'nin testi ölçer).
- **Seçili olmayan sekme** 500, seçili sekme 600 kalınlığındadır. Taslakta ikisi de 600'dür. Seçili sekme yalnız renkle değil, kalın yazıyla da ayrılır (erişilebilirlik kuralı, kart 0103'ün testi).
- **Odak çerçevesi** taslaktaki gibi yazının rengi değil, `odak` rengidir (kart 0102'de ölçülen 3:1).
- **Alt çizgi aralığı** taslakta 3 px, bizde 2 px. Ölçekte 3 yoktur, 1 piksel fark için değer eklenmedi.
- **Giriş alanının yüksekliği:** Taslakta bülten alanı 48 px, arama alanı 44 px. Parça 44 px kaldı.

**Taslakta olup kütüphanede parçası olmayanlar:** Bu karşılaştırmada yazılmadı, kendi kartlarındadır.
- Ürün kartı ve fiyat: kart 0109.
- Kayan afişin nokta göstergesi ve afişler: kart 0110.
- Üst ve alt kısım, arama, sepet düğmesi, kategori düğmesi: kart 0108.
- Geri sayım ve ürün bölümleri: kart 0111.

## Neden

- Örnek Mağaza'nın teması Canlı Çarşı'dır. Parçaların biçimi (hap düğme, koyu ikincil düğme, hap sekme) temanın değerleriyle değil parçanın sınıflarıyla gelir; taslağa ancak parçalar değişince uyar.
- Erişilebilirlik kuralları taslaktan önce gelir. Taslak bir görünüş önerisidir, ölçülmüş kontrastı yoktur.

## Düşünülen diğer yollar

- **Farkları tema kartına (0105, 0114) bırakmak:** Tema yapısı parçaların görünüm seçeneklerini de taşıyacak, ama o kart bugünkü parçaları temel alacak. Parçaların varsayılan görünüşü seçilen yöne bugün uymazsa her yeni bölüm yanlış görünüşle yazılırdı.
- **Taslağın giriş kenarını almak:** Görünüş daha yumuşak olurdu, ama form alanının kenarı 3:1'i sağlamaz.

## Sonuçları

- Giriş, kayıt ve şifre sayfalarında alanlar hap biçimli, düğme yazıları ve bağlantılar daha kalın. Müşterinin gördüğü bir farktır, çekirdek 0.35.0 oldu.
- Hazır temalar gelince (kart 0105) Yumuşak Mevsim ve Keskin Çizgi parçaların başka görünüşünü isteyecek: köşesiz düğme, kare sekme. Bu kayıt Canlı Çarşı'yı varsayılan görünüş yapar; öteki görünüşler tema kartında seçenek olarak gelir.
- Karşılaştırma ve stil ölçümü bir kez elle yapıldı, kalıcı bir test değildir. Görüntü farkı karşılaştırması ekran ölçümü kontrolüyle gelir.
