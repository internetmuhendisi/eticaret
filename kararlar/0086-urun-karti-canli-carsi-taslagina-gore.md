# 0086 · Ürün kartı Canlı Çarşı taslağına göre

## Tarih

2026-11-09

## Karar

Katalogdaki ürün kartı (karar 0085), seçilen yönün taslağıyla (`planlar/tasarim-yonu/secenekler.html`, A · Canlı Çarşı) yan yana karşılaştırıldı (kullanıcının isteği):

- Taslakta karşılaştırılan yerler: "Öne çıkanlar" (dikey kart) ve "Kategoriye göre" (kompakt kart).
- Bakılan genişlikler: bilgisayar (1280 px) ve telefon (375 px).
- Bakılan temalar: açık ve koyu.
- Ölçülen stiller: konum, ölçü, yazı boyu, kalınlık, satır yüksekliği, renk, köşe, boşluk ve aralık.

Kart taslağa göre değişti:

- **Fiyat aralığı:** Para simgesi bir kez yazılır: "299,90 – 329,90 ₺". Simgenin yeri sitenin para biçiminden gelir; simge başta olan sitede "₺299,90 – 329,90" olur. Yazılışı gösterilecek fiyat işlevi verir (`yaziliAralik`), biçimleyicideki `paraAraligi` ile. Ayırıcı metin dosyasındadır. Böylece kart, sepet ve e-posta aynı yazılışı kullanır.
- **Görsel:** Kutunun ortasındadır ve kutunun 7/8'i kadardır. Taslakta bu oran dikey kartta yüzde 86, kompakt kartta yüzde 88'dir. Eskiden görsel kutuyu 8 px boşlukla dolduruyordu.
- **Favori:** Taslaktaki gibi zeminsiz. Eskiden zemin renginde bir daireydi.
- **Puan:** Beş yıldızdır. Ortalamanın yuvarlandığı kadarı doludur. Puanı olmayan üründe beşi de boştur, ekran okuyucu "Henüz puan yok" okur. Puan alanı yine yalnız yorum işlevi yazılınca görünür.
- **Yatay kart:** Taslaktaki kompakt kart gibidir.
  - Görsel, ad ve fiyat vardır.
  - Tükenmiş üründe fiyatın altında soluk ve kalın "Tükendi" yazısı çıkar.
  - Marka, rozet ve puan yoktur. İndirimi fiyatın rengi ve üstü çizili eski fiyat söyler.
  - Satırlar arası 4 px'tir.
- **Katalog:** Dikey kartlar arasındaki aralık her genişlikte 16 px'tir; eskiden telefonda 12 px'ti.

**Taslaktan bilerek ayrılan yerler:**

- **Rozetin metni:** "%24 indirim" yazar, taslakta yalnız "%23" yazar. Bu kullanıcının kararıdır (karar 0085).
- **Vergi metni:** Fiyatın altında "Vergiler dahil" gibi bir metin vardır, taslakta yoktur. Metin mağaza ayarından ya da vergi adından gelir (karar 0067).
- **Sepete ekle düğmesi:** Taslakta yoktur. Kart 0109 bu eylemi istiyor.
  - Dikey ve görseli büyük kartta görselin sağ altındadır. Zemin rengindedir, görselin üstüne gelse de okunur.
  - Yatay kartta favoriyle birlikte fiyatın yanındadır.
  - İkisi de yalnız işlevleri yazılınca görünür; bugünkü vitrin taslak gibidir.
- **Ürün adının satır yüksekliği:** Yazı boyunun kendi değeridir (14 px'te 1,5), taslakta 1,35'tir. Satır yüksekliği tasarım değerlerinde yazı boyuyla birlikte tanımlıdır. Tek bir yer için ikinci bir değer eklenmedi. Fark, iki satırlı adda 4 px'tir.
- **Ölçekte olmayan küçük değerler:**
  - Eski fiyat 12 px, taslakta 13 px.
  - Rozetin konumu 8 px, taslakta 10 px.
  - Kompakt kartın görseli 80 px, taslakta 84 px.
  - Kompakt kartta görselle yazı arası 12 px, taslakta 14 px.
  - Rozet taslaktan 1 px kısadır. Rozet ortak parçadır (karar 0079).
  - 1–2 piksel için ölçeğe değer eklenmedi.
- **Katalogdaki yatay kart ızgarası:** Masaüstünde 3 sütundur, taslakta 4. Katalog kartları işlevler açıkken çizer; düğmelerle 4 sütun dar kalıyor. Vitrindeki sütun sayısını ürün bölümleri belirler (kart 0111).
- **Görseli büyük kart:** Taslakta karşılığı yoktur, karşılaştırılmadı.

## Neden

- Örnek Mağaza'nın teması Canlı Çarşı'dır. Kartın biçimi temanın değerleriyle değil kartın sınıflarıyla gelir; taslağa ancak kart değişince uyar.
- Simgenin bir kez yazılması dar kartta aralığı kısaltır ve taslaktaki yazılıştır.
- Erişilebilirlik ve çekirdeğin kuralları (vergi metni, ölçek) taslaktan önce gelir; taslak ölçülmüş bir tasarım sistemi değildir.

## Düşünülen diğer yollar

- **Aralığı her ucu simgeli yazmak (eski hâli):** Seçilmedi. Taslak simgeyi bir kez yazar ve dar kartta yer kazanılır.
- **Ölçeğe 13 px yazı, 10 px ve 14 px boşluk eklemek:** Seçilmedi. Tek bir yer için ölçeği büyütmek ölçeğin amacına aykırı; fark gözle seçilmez.
- **Puanı tek yıldız ve sayıyla göstermek (eski hâli):** Seçilmedi. Taslak beş yıldız gösterir.
- **Yatay kartta indirim rozetini tutmak:** Seçilmedi. Taslağın kompakt kartında rozet yoktur; indirim fiyattan okunur.

## Sonuçları

- `FiyatAraligi` artık `yaziliAralik` taşır. Biçimleyicide `paraAraligi` vardır. Metin anahtarı `vitrin.fiyat.aralik` kalktı, yerine ayırıcı `vitrin.fiyat.aralikAyirici` geldi.
- Çekirdek 0.42.0 oldu. Kart vitrinde henüz çizilmediği için müşterinin göreceği bir fark yoktur.
- Karşılaştırma ve stil ölçümü bir kez yapıldı, kalıcı test değildir.
- Katalogdaki örnek görseller düz biçimlerdir ve koyu temada koyu kalır. Taslaktaki ürün fotoğraflarıyla görsel içeriği karşılaştırılamaz; yalnız görselin yeri ve oranı karşılaştırıldı.
