# 0087 · Afiş ve tanıtım bölümleri, vitrin görseli ve yer tutucular

## Tarih

2026-11-09

## Karar

Bölüm kütüphanesine ana sayfanın görsel ağırlıklı beş bölümü girdi (kart 0110). Her biri yalnız ana sayfaya konur, iki görünümü vardır.

- **Kayan büyük afiş.** Panelde adı "Slider"dır (kullanıcı kararı).
  - Bir ile altı arasında slayt olur. Her slaytta masaüstü görseli, isteğe bağlı telefon görseli, görselin açıklaması, üst yazı, başlık, metin, düğme yazısı ve bağlantı vardır.
  - Kendiliğinden geçme bölümün ayarıdır: 6 saniye (varsayılan), 4 saniye, 8 saniye ya da kapalı.
  - Görünümler: yazı solda görsel sağda (taslaktaki), ya da görsel arkada yazı onun üstünde. Telefonda yazı görselin altına iner.
- **Güven şeridi.** Bir ile altı arasında madde olur; her maddede ikon sözlüğünden seçilen bir ikon ve kısa bir metin vardır. Görünümler: ikonlu satır (taslaktaki) ve kutulu.
- **Kampanya afişleri.** İki ya da üç afiş olur; her birinde görsel, rozet, başlık, metin, düğme yazısı, bağlantı ve zemin rengi vardır. Bağlantılı afişin tamamı tıklanır. Rengi seçilmeyen afiş sırasıyla temanın kutu renklerini alır. Görünümler: yatay (taslaktaki) ve dikey.
- **Geniş afiş.** Tek görsel, üst yazı, başlık, metin, düğme yazısı, bağlantı ve zemin rengi vardır; varsayılan zemin alt kısım rengidir. Görünümler: yan yana (taslaktaki) ve tam genişlik.
- **Kategori kutuları.** Bir ile on iki arasında kategori seçilir; her kutuda görsel ve ad görünür. Görünümler: ızgara (masaüstünde 5, telefonda 3 sütun) ve kaydırmalı şerit. Silinen kategori ve görseli olmayan kategorinin görseli görünmez.

**Kayan afişin erişilebilirliği.** WAI-ARIA'nın "carousel" kalıbı uygulandı:

- Ekran okuyucu bölümü "kayan afiş", slaytı "slayt" ve "2 / 3" diye okur.
- Yalnız etkin slayt görünür. Geçişte hareket yoktur, slayt yer değiştirir.
- Kendiliğinden geçerken yeni slayt duyurulmaz; durunca duyurulur.
- Durdurma düğmesi ilk denetimdir. Fare afişin üstündeyken ya da klavye odağı içindeyken geçiş bekler. Kullanıcı durdurduysa afiş bir daha kendiliğinden geçmez.
- Hareket azaltma tercihinde afiş kendiliğinden geçmez. Kullanıcı başlat düğmesiyle isterse geçer.
- Önceki, sonraki ve nokta düğmeleri klavyeyle kullanılır.

**Vitrin görseli.** Bölümlerin ve kategorilerin görselleri yeni bir adresten gelir: `GET /kapi/herkese-acik/vitrin-gorseli?d=<dosya>&b=<boyut>`.

- Yalnız vitrinde kullanılan görsel verilir: geçerli düzende çizilen bir bölümün görseli ya da silinmemiş bir kategorinin görseli.
- Görsel boyutunun okunması ürün görseli ucuyla ortaktır (`cekirdek/moduller/dosya/gorsel-boyutu.ts`). Ürün görseli servisi karışmasın diye `urunGorseli` adını aldı.

**Kategori görseli.** Kategoriye görsel alanı eklendi (veritabanı değişikliği 0028).

- Görsel hazır olmalıdır: dosya var ve silinmemiş, kendisi bir boyut değil, bütün boyutları tam.
- Görsel değişikliği kayda girer.
- Görseli sonradan silinen kategori, görsel alanı değişmedikçe değişebilir.

**Tarif.**

- Yeni alan türü "seçim": sabit seçeneklerden biri, varsayılanıyla. Geçiş süresi ve güven şeridinin ikonu bu türdendir.
- Alanlar isteğe bağlı bir açıklama taşıyabilir; açıklama panelde alanın altında görünür.
- Kütüphanenin denetimi, varsayılanın seçeneklerden biri olduğunu ve seçeneklerin tekil olduğunu ölçer.

**Yer tutucular (kullanıcı kararı).**

- Bölüm metnine ayardan dolan bir değer yazılabilir, örneğin `{kargoyaVermeSuresi} iş gününde kargoda`. Kayıt `cekirdek/kayitlar/yer-tutucular.ts` dosyasındadır.
- Değeri olmayan yer tutucuyu taşıyan madde çizilmez: yanlış ya da boş bir değer gösterilmez.
- Bugün yalnız kargoya verme süresi vardır. Yeni mağaza ayarı `kargoyaVermeSuresi`, varsayılanı 1 iş günüdür (site ayarları taslağındaki değer).
- Ücretsiz kargo sınırı ve iade süresi kendi modülleriyle eklenir; o güne kadar mağaza sahibi bu değerleri metne elle yazar.

**Ana sayfa.**

- Ana sayfa düzenin ana sayfa alanını çizer. Sayfanın başlığı (h1) mağaza adıdır ve yalnız ekran okuyucuda görünür; bölüm başlıkları h2'dir.
- Bölümler arası boşluk taslaktaki gibidir: masaüstünde 48, telefonda 40 piksel.
- Bölüm yoksa ya da düzen okunamazsa bugünkü sade sayfa görünür.

## Neden

- Görselin adresi dosya kimliğini taşır, ama yalnız vitrinde kullanılan görsel açılır. Bölümün görseli dosya deposunda ayrı bir kayıttır, ürün görseli gibi bir galeri öğesi yoktur. Kullanım denetimi, logonun, taslak ürünün görselinin ya da yüklenip kullanılmayan bir dosyanın bu adresle okunmasını önler (karar 0085 ile aynı ilke).
- Ücretsiz kargo sınırı kargo hesabının tek yerinde tanımlanmalıdır (e-ticaret iş kuralları). Ayar olarak şimdi eklenseydi kargo modülü gelince taşınması gerekirdi. Kullanıcı yer tutucu yolunu seçti.
- Geçişte hareket olmaması, hareket azaltma tercihinde ve kendiliğinden geçişte göz yormaz. Taslak da slaytı yer değiştirerek gösterir.
- Slayt değişince kabın yeniden kurulması klavye odağını düşürüyordu (tarayıcı testi yakaladı). Kap yerinde kalır, yalnız içeriği değişir.

## Düşünülen diğer yollar

- **Bölüm görsellerini dosya kimliğiyle denetimsiz vermek:** Seçilmedi; yukarıdaki neden.
- **Ücretsiz kargo sınırını ve iade süresini şimdi ayar yapmak:** Kullanıcı seçmedi.
- **Kayan afişte kayma hareketi (Embla gibi):** Seçilmedi. Taslak slaytı yer değiştirerek gösterir; hareket azaltma için ayrıca yol gerekirdi.
- **Geçiş süresini sayı alanı yapmak:** Seçilmedi. Çok kısa süre okunamaz (WCAG 2.2.2); sabit seçenekler yeter.
- **Telefon görselinin alan kodunu `telefonGorseli` yapmak:** Kayıt "telefon" sözcüğünü kişisel bilgi sayar, alan kodunda yasaktır. Alan kodu `darEkranGorseli`, paneldeki adı "Telefon görseli"dir.

## Taslakla karşılaştırma

Beş bölüm Canlı Çarşı taslağıyla (`planlar/tasarim-yonu/secenekler.html`) bilgisayar (1280 px) ve telefon (375 px) genişliğinde, açık ve koyu temada yan yana karşılaştırıldı. Taslağın yerleşimi uygulandı: afişin yazı ve görsel düzeni, güven şeridinin dairedeki ikonu, kampanyaların renkli kutuları ve altı çizili düğme yazısı, kategori kutularının sütun sayıları, geniş afişin koyu zemini.

Bilerek ayrılan yerler:

- **Afişteki durdurma düğmesi:** Taslakta yoktur. Kendiliğinden hareket eden içerikte erişilebilirlik bunu ister (WCAG 2.2.2).
- **Afişteki fiyat:** Taslakta fiyat vardır; afiş bölümü ürüne bağlı değildir. Fiyatlı afiş ürün bölümleriyle gelebilir (kart 0111).
- **Geniş afişin düğmesi:** Taslakta düğme yerine fiyat vardır. Geniş afişte düğme yazısı alanı vardır.
- **Küçük ölçü farkları:** Afişin düğmesi 44 px, taslakta 48 px; rozet 12 px, taslakta 13 px; metin 18 px, taslakta 17 px. Ortak parçaların ölçüleridir (karar 0079).

## Sonuçları

- Çekirdek 0.43.0 oldu. Veritabanı değişikliği 0028 (`kategoriler.gorsel_kimligi`) uygulanmalıdır. Kategori görselini panelden seçmek panel ekranlarıyla gelir; bugün servisle yazılır.
- Her vitrin görseli isteği geçerli düzeni bir kez okur ve kategorilerde görseli arar (indeks yok, en çok birkaç yüz kategori). Ziyaretçi sayısı büyüyünce ölçülmelidir.
- Ana sayfa bağlamı çerçevenin bağlamından ayrı okunur: aynı istekte mağaza ayarları ve tema iki kez okunur.
- Örnek Mağaza'nın ana sayfa düzeni boştur; afiş içerikleri ve başlangıç kataloğunda kategori görselleri kart 0114 ve 0115 ile gelir.
- Katalogdaki örnek görseller yalın biçimlerdir (veri adresi); koyu temada koyu kalır. Görsel içeriği taslağın fotoğraflarıyla karşılaştırılmadı, yalnız yeri ve oranı.
- Kayan afişin testinde saat geçiş süresinden biraz uzun adımlarla ilerletilir; tek büyük sıçrama, fare üstündeyken beklemeyi bozan kodu yakalamıyordu (ölçüldü).
