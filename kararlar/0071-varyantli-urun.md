# 0071 · Varyantlı ürün: seçenekler, birleşimler, fiyat aralığı ve genel stok durumu

## Tarih

2026-11-08

## Karar

Beden ve renk gibi seçenekleri olan ürünün her birleşimi ayrı bir satılabilir birimdir (kart 0085). Basit ürünün tek birimiyle aynı tabloda (`urun_birimleri`, karar 0062) durur. Fiyat ve stok servisleri değişmez: birleşim de bir birimdir.

- **Tablolar:** `urun_secenekleri` (ürünün seçenekleri: ad, sıra), `urun_secenek_degerleri` (seçeneğin değerleri: ad, sıra) ve `urun_birimi_degerleri` (birimin hangi değerlerden oluştuğu). Birimde `birlesim` anahtarı ve görsel için boş bir bağlantı yeri (`gorsel_kimligi`, kart 0087) vardır.
- **Tek yol:** İşlemler `cekirdek/moduller/urun/varyant.ts` dosyasında yazılır, ürün servisi (`urunServisi`) onları kendi işlem kilidiyle dışarı verir: `secenekEkle`, `secenekDegistir`, `secenekSil`, `degerEkle`, `degerDegistir`, `degerSil`, `birlesimEkle`, `birlesimDegistir`, `birlesimSil`. Okuma `urunuOku` ile yapılır: ürünün türü (`tur`), seçenekleri (silinmişler işaretli) ve her birimin değerleri gelir.
- **Ürün türü:** Kayıt `cekirdek/kayitlar/urun.ts` dosyasındadır (`basit`, `varyantli`). Tür veritabanına yazılmaz: silinmemiş seçeneği olan ürün varyantlıdır.
- **Birleşim:** Her silinmemiş seçenekten tam bir silinmemiş değer seçilir. Anahtar, değer kimliklerinin sıralı ve virgülle birleştirilmiş hâlidir. Silinmemiş birimler arasında ürün başına tekildir. Kuralı servis kilit altında arar; veritabanındaki kısmi tekil indeks ikinci ağdır. Basit ürünün birimi boş anahtar taşır, bu yüzden basit ürün veritabanında da iki birimle olamaz. Birleşimin değerleri sonradan değişmez: başka bir birleşim, kendi fiyat ve stok geçmişi olan yeni bir birimdir.
- **Birim alanları:** Stok kodu, barkod, ağırlık ve ölçüler varyantlı üründe her birleşimdedir (`birlesimEkle`, `birlesimDegistir`). Varyantlı üründe `urunDegistir` bu alanları reddeder (`varyantli-urun-birim-alani`); yoksa bugünkü kod onları sessizce ilk birleşime yazardı. Stok kodu tekilliği basit üründekiyle aynı işlevdir (`stokKoduKullaniliyor`, `dogrulama.ts`).
- **Basit üründen varyantlıya (kullanıcı kararı):** Basit ürüne ilk seçenek eklenince basit birim silinmiş işaretlenir. Fiyatı, stoğu ve geçmişleri satırında kalır, birim artık satılmaz. Panel bunu kaydetmeden önce uyarmalıdır. Son seçenek silinince ürün yeniden basit olur ve boş bir birim açılır.
- **Birleşimleri olan ürüne yeni seçenek eklenmez** (`secenek-eklenemez`): var olan birleşimlerin o seçenekte değeri olmaz. Önce birleşimler silinir.
- **Silme:** İşaretle yapılır. Değeri silinen birleşimler de silinmiş işaretlenir. Seçeneği silinen ürünün bütün birleşimleri silinir, çünkü her birleşimin o seçenekte bir değeri vardır. Birim, değer ve bağlantı satırları kalır, geçmiş siparişler bozulmaz. Silinen birleşimin stok kodu serbest kalır. Aynı adla yeni değer açılabilir; yeni değerin kimliği farklı olduğu için yeni birleşim eskisiyle çakışmaz. Seçeneğin son değeri silinmez (`son-deger`): değeri kalmayan seçenekle hiçbir birleşim açılamaz, ürün satılamaz kalırdı. Seçeneği kaldırmak isteyen seçeneği siler (bağımsız kontrolün bulgusu).
- **Adlar:** Seçenek ve değer adları sitenin verisidir. Tekillik, büyük küçük harf ve noktalı noktasız i ayrımı olmadan ad anahtarıyla aranır (karar 0064): ürünün silinmemiş seçenekleri arasında ve seçeneğin silinmemiş değerleri arasında. Girdinin içindeki tekrar da veritabanında yakalanır.
- **Sınırlar:** Bir üründe en çok 3 seçenek, seçenek başına 50 değer, 100 birleşim olur (`varyantSinirlari`).
- **Değişiklik kaydı:** `urun-secenegi.*`, `urun-secenek-degeri.*`, `urun-birimi.*` (eklendi, değişti, silindi). Değerle, seçenekle ya da ürünle birlikte silinen her birleşim kendi satırıyla yazılır. Seçenekle birlikte açılan ve silinen her değer de kendi satırıyla yazılır; böylece birleşim kaydındaki değer kimlikleri kayıttan bir ada bağlanır (bağımsız kontrolün bulguları). Basit birimin silinmesi ve son seçenekten sonra açılan boş birim de kayda girer.
- **Fiyat aralığı (kullanıcı kararı):** `fiyatAraliklari` (`cekirdek/moduller/fiyat/gosterim.ts`) ürünün en düşük ve en yüksek gösterilecek fiyatını verir. Uçlar `gosterilecekFiyatlar` sonuçlarıdır, yani indirim, vergi çevirmesi ve eski fiyat oradaki gibidir. Aralık yalnız satılabilir birleşimlerden hesaplanır; hiçbiri satılamıyorsa bütün silinmemiş birleşimlerden. Fiyatı olmayan birim satın alınamaz: aralıkta hiç sayılmaz, satılabilir de sayılmaz. Stoklu ama fiyatsız bir birleşim varken aralık tükenmiş birleşimlerin fiyatından gelir. Bütün adaylar aynı tutar, aynı eski fiyat ve aynı indirim durumundaysa tek fiyattır (`tek`); tutar aynı ama eski fiyatı ya da indirim durumu farklıysa değildir (bağımsız kontrolün bulguları).
- **Genel stok durumu (kullanıcı kararı):** `urunStokDurumu` ve tek sorguyla `urunStokDurumlari` (`cekirdek/moduller/stok/durum.ts`) ürünün durumunu silinmemiş birimlerinden çıkarır. Tek birimli üründe birimin kendi durumudur, kalan adet de dahil. Birden çok birimde biri satılabilirse "stokta", hiçbiri satılamıyorsa "tükendi" yazılır. Kalan adet ("Son 3 ürün") ancak birleşim seçilince görünür. Düşük stok birim bazındadır. Silinmemiş birimi olmayan ürün tükenmiştir. Listedeki tükenmişlik kuralıyla (`tukenmisUrunKosulu`, karar 0069) aynı sonucu verdiğini çok birimli ürünlerle test denetler.

## Neden

- Birleşimi ayrı bir birim yapmak, kartın istediği gibi fiyat ve stok için ikinci bir yol açmaz. Fiyat geçmişi, stok geçmişi, satılabilirlik ve sipariş kodu birimi tanır, seçeneği tanımaz.
- Anahtar ile bağlantı tablosunun ikisi birden tutulur. Bağlantı tablosu değerlere yabancı anahtarla bağlıdır, yani olmayan değer yazılamaz. Anahtar ise aynı birleşimin veritabanında da reddedilmesini sağlar, çünkü bir satır kümesi üzerinde tekil indeks kurulamaz. İkisini yalnız `varyant.ts` aynı işlemde yazar.
- Birleşimin değerleri değişmez. "S Beyaz" birimini "M Beyaz" yapmak, o birimin geçmiş satışlarını ve stok geçmişini başka bir ürüne taşımak olurdu.
- Birleşimleri olan ürüne seçenek eklemeyi reddetmek, var olan birleşimleri sessizce silip stoğu kaybettirmekten güvenlidir.
- Aralığı satılabilir birleşimlerden hesaplamak, müşterinin satın alamayacağı bir fiyatı "en düşük" diye görmesini önler (kullanıcı kararı).
- Genel durumda kalan adedin yazılmaması: birden çok birleşimde "Son 2 ürün" hangi birleşim için olduğu belli olmayan, yanıltıcı bir yazı olurdu (kullanıcı kararı).

## Düşünülen diğer yollar

- **Birleşimi bir değer listesi (dizi) alanında tutmak:** Seçilmedi. Dizinin elemanları değerlere bağlanamaz, silinmiş değer yazılabilirdi.
- **Yalnız bağlantı tablosu, tekilliği tetikleyiciyle denetlemek:** Seçilmedi. Anahtar ve kısmi tekil indeks daha basittir. Kilit zaten bütün ürün yazmalarını sıraya sokar.
- **Seçenekleri ürünler arası ortak tutmak (sitenin "Beden" seçeneği):** Seçilmedi. Kart seçeneği ürüne tanımlar. Ortak seçenek, bir üründeki değişikliğin ötekini etkilemesi demekti. Filtre gerekirse ürün özellikleri (kart 0086) ya da vitrin bölümü ele alır.
- **Varyantları tek bir "bütün listeyi yaz" çağrısıyla kaydetmek:** Seçilmedi. Hangi birimin silinip hangisinin kaldığını farktan çıkarmak gerekirdi. Ayrı işlemler, her değişikliğin kaydını ve hatasını kendi yerinde verir.
- **Basit ürüne seçenek eklenince basit birimi ilk birleşime çevirmek:** Seçilmedi. Basit birimin stoğu hangi bedene ait olduğu belli olmadan bir birleşime geçerdi.
- **Stoğu olan basit ürüne seçenek eklemeyi reddetmek:** Kullanıcı seçmedi.
- **Tükenmiş birleşimleri de aralığa katmak:** Kullanıcı seçmedi.
- **Genel durumda kalan adedi göstermek (en az kalan birleşimin adedi):** Kullanıcı seçmedi.

## Sonuçları

- Örnek Mağaza'nın varyantlı ürünleri (tişört, sweatshirt) bu kartta eklenmedi. Kullanıcı onları ayrı bir kartta verecek (kullanıcı kararı). Başlangıç kataloğunun dosya biçimi (`baslangic-semasi.ts`) bugün seçenek ve birleşim taşımaz; o kart genişletmelidir. Kartın Örnek Mağaza ve `KURALLAR.md` maddesi bu yüzden açık kaldı.
- Ürün uçları yoktur. Seçenek, değer ve birleşim silmenin hangi izinle yapılacağı (`urun.degistir` ya da `urun.sil`) uçlar yazılınca kararlaştırılmalıdır. Servis izne bakmaz.
- Varyantlı üründe silinmemiş birim sayısı sıfır olabilir: seçenekler tanımlanmış, birleşim henüz açılmamıştır. Karar 0062'deki "her ürünün en az bir birimi olur" kuralı yalnız basit ürün için geçerlidir. Böyle bir ürünün fiyat aralığı yoktur, genel durumu tükendidir.
- Bütün varyant yazmaları ürün kilidinden geçer (karar 0062). 100 birleşimlik bir ürünün kurulması 100 ayrı çağrıdır. Toplu kurma (bütün birleşimleri oluştur) panel bölümüyle gelebilir.
- Ürün silinince birleşimleri de silinir, her biri kayda girer. Seçenekleri ve değerleri silinmiş işaretlenmez, ürünle birlikte görünmez olurlar.
- Stoklu ama fiyatsız birleşim stok durumunda satılabilir görünür (stok durumu fiyata bakmaz), fiyat aralığında görünmez. Ürünün genel durumu "stokta" derken aralık tükenmiş birleşimin fiyatını gösterebilir. Sepet fiyatsız birimi zaten satamaz; vitrin bölümü bu ürünü nasıl göstereceğine karar vermelidir.
- Fiyat aralığı ve genel durum, mağaza ayarlarını ayrı ayrı okur (iki okuma). Vitrin bölümü ikisini birlikte isterse tek okumaya indirebilir.
- Geri dönülürse eski kod varyantlı ürünün ilk birleşimini basit ürünün birimi sayar (değişiklik dosyasının notu). Bugün hiçbir yayında ürün yoktur.
- Birleşimin görsel alanı boştur, yazan işlev yoktur. Kart 0087 doldurur.
