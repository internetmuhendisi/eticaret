# 0085 · Ürün kartı, fiyat bileşeni ve ürün görselinin adresi

## Tarih

2026-11-09

## Karar

Ürünün listede, vitrin bölümlerinde, aramada ve önerilerde görünen kartı tek bileşendir (`UrunKarti`, `cekirdek/vitrin/urun-karti/`). Fiyat her yerde tek fiyat bileşeniyle gösterilir (`FiyatGosterimi`). Kart 0109.

**Veri tek yerden.** Kartın verisini yalnız `urunKartlari` (`veri.ts`) toplar. Kartta ikinci bir hesap yapılmaz:

- görünürlük `vitrinKosulu` ile
- fiyat, fiyat aralığı ve indirim oranı `fiyatAraliklari` ile
- stok durumu `urunStokDurumu` ile
- görsel `anaGorseller` ile

Bütün ürünler birkaç sorguyla gelir. Görünmeyen ürünün kartı yoktur. Zamanlanmış ürün yayın zamanına kadar görünmez, sonra yayındaki ürün gibidir.

**Görünümler.** Üç görünüm vardır: dikey, yatay kompakt ve görseli büyük. Görünümler tema kaydındadır (`urunKartiGorunumleri`, `cekirdek/kayitlar/tema.ts`). Bu, tema kaydının ilk parçasıdır. Tema bir görünüm seçer; Canlı Çarşı dikeyi seçer. Kartı çizen bölüm kendi seçimiyle temanınkini değiştirebilir (`urunKartiGorunumu`). Temanın seçimi vitrin bağlamında durur (`parcaGorunumleri`).

**Fiyat (kullanıcı kararları).**

- Varyantlı ürünün fiyatı aralıktır: "en düşük – en yüksek". Aralıkta eski fiyat yazılmaz.
- İndirim rozeti oranı yazar ("%24 indirim").
  - Oran eski fiyatın gösterildiği fiyattan hesaplanır ve aşağı yuvarlanır. Böylece indirim hiçbir zaman olduğundan büyük görünmez.
  - Eski fiyat gösterilmiyorsa (30 gün kuralı, karar 0067) rozet de çıkmaz.
  - Birleşimlerin oranları farklıysa rozet en büyük orana "varan" indirimdir ("%30'a varan indirim"). İndirimsiz bir birleşim de fark sayılır.
  - Oran `fiyatAraliklari`'nın sonucundadır (`indirim`). Sayılan birleşimler aralığınkilerle aynıdır: satılabilir olanlar, hiçbiri satılamıyorsa hepsi.
- "%30'a" yazısındaki ek sayıya göre değişir. Ek ortak biçimleyicide bulunur (`yonelmeEki`), yüzdenin yazılışı da oradadır (`yuzde`). Eki olmayan dilde ek boştur.

**Stok (kullanıcı kararı).** Tükenmiş üründe yalnız "Tükendi" rozeti görünür, indirim rozeti görünmez. "Son 3 ürün" yazısı kartta görünmez, ürün sayfasında görünür.

**Görsel.** Kart ana görselin küçük, orta ve büyük boyutlarını `srcset` ile verir; tarayıcı yerine göre seçer. Görselin alternatif metni galeriden gelir. Görseli olmayan ürünün kartında yer tutucu ikon durur.

**Ürün görselinin adresi.** Görseller yeni bir uçtan gelir: `GET /kapi/herkese-acik/urun-gorseli?o=<galeri öğesi>&b=<boyut>`. Servisi `vitrinGorseli`dir.

- Adres galeri öğesinin kimliğini taşır, dosyanın kimliğini taşımaz. Adresle logo, özgün görsel ya da başka bir dosya okunamaz.
- Yalnız vitrinde sayfası açılan ürünün silinmemiş görselinin kayıtlı boyutları verilir.
- Yanıt logo ucunun dosya yanıtıyla aynıdır: tür, `nosniff`, 300 saniye önbellek ve `ETag`.
- Yeni istek sınırı `gorsel`: 60 saniyede 600 istek. Sayaç uç başınadır ve bir liste sayfası aynı uca onlarca kez gider.

**Kartın biçimi.**

- Bütün kart ürün sayfasına gider: adın bağlantısı kartın üstüne yayılır. Odak çerçevesi kartın çevresinde görünür.
- Ad iki satırda üç noktayla biter. Büyük tutar kartı taşırmaz.
- Dikey ve görseli büyük kartta favori görselin sağ üstünde, sepete ekle sağ altındadır. İkisinin de zemini zemin rengidir.
- Görsel alanı kodda bilgilerden sonra gelir, ekranda üsttedir. Böylece klavye sırası şöyledir: ürünün adı, sepete ekle, favori.
- Favori, sepete ekle ve puan alanı işlevleri yazılınca görünür (`islevler.ts`). Eylemleri bu kartta yazılmadı, yalnız yerleri var. Sepete ekle tükenmiş ve fiyatsız üründe görünmez.

## Neden

- Tek veri işlevi, kartın her yerde aynı fiyatı, aynı stok durumunu ve aynı görünürlüğü göstermesini sağlar. Listeler, arama ve öneriler kendi sorgusunu yazarsa biri bir kuralı unutur.
- Aşağı yuvarlama ve eski fiyatsız rozet olmaması, yanıltıcı indirim gösterimini önler (karar 0067 ile aynı ilke).
- Görsel adresinin dosya kimliği yerine galeri öğesini taşıması, adresin yalnız vitrinde görünen ürünün görseline açılmasını sağlar. Dosya deposundaki öteki dosyalar bu adresle okunamaz.
- Genel sınır (dakikada 120) tek bir kategori sayfasında görselleri yarıda keserdi.
- Sepet düğmesi fiyatın yanında dururken dar kartta tutarı sayının ortasından kırıyordu. Görselin köşesinde fiyata bütün satır kalır (telefonda ölçüldü).

## Düşünülen diğer yollar

- **"299,90 ₺'den başlayan":** Kullanıcı aralığı seçti; müşteri en yüksek fiyatı da görür.
- **Oranı olağan yuvarlamak:** Seçilmedi. İndirim olduğundan büyük görünebilirdi.
- **Kartta "Son 3 ürün":** Kullanıcı seçmedi. Taslakta da yok; kart kalabalıklaşır.
- **Kartı ortak bileşen kütüphanesine (`bilesenler/`) koymak:** Seçilmedi. Kart vitrine özgüdür, metni ve veriyi çekirdekten okur. Kütüphane parçaları metin taşımaz. Kart kataloğun kendi sayfasında gösterilir (`/gelistirme/bilesenler/urun-karti`).
- **Görseli dosya kimliğiyle veren genel bir dosya ucu:** Seçilmedi. Görünmeyen ürünün ya da başka bir kaydın dosyası da açılırdı.
- **Görsel adresini uzun süre (değişmez) önbelleğe almak:** Seçilmedi. Ürün gizlenince ya da arşivlenince görsel en geç 5 dakikada kapanmalıdır. Logo ucuyla aynı süre kullanıldı. Etiket aynıysa tarayıcı içeriği yeniden indirmez.

## Sonuçları

- Tema kaydına ilk parça girdi. Her tema `gorunumler` içinde `urun-karti` seçmelidir; seçmeyen tema açılmaz. Çekirdekteki tema ve testlerin örnek temaları güncellendi. Siteye özel tema bugün yoktur.
- Vitrin bağlamı geçerli temayı bir kez daha okur (bir sorgu). Kök düzenin tema okumasıyla paylaşılmaz.
- Kartı çizen bölüm henüz yoktur (kart 0111). Kart bugün yalnız katalogda görünür, vitrin sayfalarında görünmez.
- Puan alanının biçimi yorum işleviyle kesinleşir: bugün yalnız ortalama ve sayı verilirse görünür, veri yoktur.
- Görsel adresinin `sizes` değeri görünümün varsayılanıdır. Izgarayı bilen bölüm kendi değerini verebilir.
- Katalogdaki örnek görseller düz biçimlerdir (veri adresi). Koyu temada koyu görünürler; ürün fotoğrafı değildirler.
- `fiyatAraliklari` sonucuna `indirim` eklendi. Sepet ve e-posta bunu kullanmak zorunda değildir.
- Kart ve fiyat bileşeninin taslakla stil karşılaştırması bir kez görüntüyle yapıldı, testte yoktur.
