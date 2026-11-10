---
paths:
  - "cekirdek/moduller/urun/**"
  - "cekirdek/moduller/kategori/**"
  - "cekirdek/moduller/marka/**"
  - "cekirdek/moduller/etiket/**"
  - "cekirdek/moduller/ozellik/**"
  - "cekirdek/moduller/stok/**"
  - "cekirdek/moduller/fiyat/**"
  - "cekirdek/moduller/vergi/**"
  - "cekirdek/moduller/sepet/**"
  - "cekirdek/moduller/odeme/**"
  - "cekirdek/moduller/siparis/**"
  - "cekirdek/moduller/iade/**"
  - "cekirdek/moduller/kargo/**"
  - "cekirdek/moduller/kampanya/**"
  - "cekirdek/moduller/eposta/**"
  - "cekirdek/arka-plan-isleri/**"
  - "cekirdek/eklentiler/**"
---

# E-ticarete özgü iş kuralları

## Fiyat, vergi ve indirim

- Sepet, ödeme, sipariş, fatura ve e-postadaki tutarı aynı hesaplama fonksiyonundan al.
- Ödemeye geçerken fiyatı, indirimi, kargoyu ve vergiyi sunucuda yeniden hesapla. Tarayıcıdan gelen tutarı kullanma.
- Vergi ve indirimin satır satır mı toplamda mı yuvarlanacağını tek yerde tanımla.
- Kargo ücretini, ücretsiz kargo sınırını ve bölge kurallarını tek kargo hesabında tut.
- Para tutarını küsuratlı sayı olarak tutma. Yuvarlama hatası olmayan biçimde, para birimiyle birlikte sakla.
- Kupon, otomatik indirim ve kampanyaları tek kampanya motorunda hesapla. Birleşme kurallarını orada tanımla.
- Vergi oranlarını ve hesabını tek modülde yap. Vergi yalnız `hesapla` (`cekirdek/moduller/vergi/hesap.ts`) ile, sitenin ayarları ve tablosuyla `vergiHesapla` ile hesaplanır. Kuruş yalnız `cekirdek/moduller/vergi/yuvarlama.ts` ile yuvarlanır (karar 0061).
- Vergi ülkeye bağlı yazılmaz: çekirdekte "KDV", bir oran ya da bir ülke sabit yazılmaz. Vergi sınıfları, oranlar, vergi adı, fiyatın vergi dahil ya da hariç girilmesi ve hesaplamanın hangi adrese göre yapılacağı site ayarıdır.
- Oranı ürünün vergi sınıfı ile müşterinin bölgesinden bul. Bölge bulunamazsa mağaza adresini kullan.
- Siparişe her satırın o anki vergi oranını ve tutarını yaz. Oran sonradan değişse de eski sipariş değişmesin.
- Para birimini ve para biçimini site ayarından al. Çekirdekte "TL" ya da "₺" sabit yazılmaz: para biriminin çekirdekte varsayılanı yoktur, simge ayardan ya da dil verisinden gelir (`cekirdek/testler/para-simgesi-yok.test.ts`, karar 0067).
- Fiyat yalnız `cekirdek/moduller/fiyat/servis.ts` ile okunur ve değişir; bir anın fiyatını yalnız `gecerliFiyat` (`cekirdek/moduller/fiyat/gecerli.ts`) verir, birimlerin fiyatları tek sorguyla `gecerliFiyatlar` ile gelir. Tutar kuruş, para birimi satırda saklanır (karar 0066).
- Vitrin, sepet ve e-posta fiyatı yalnız `gosterilecekFiyatlar` (`cekirdek/moduller/fiyat/gosterim.ts`) ile gösterir: vergi dahil ya da hariç tutar, eski fiyat, fiyatın yanındaki metin ve biçimli yazılış oradan gelir. Eski fiyat yalnız `eskiFiyatiBul` (`cekirdek/moduller/fiyat/eski-fiyat.ts`) ile hesaplanır (karar 0067).
- Her fiyat değişikliğini tarihiyle fiyat geçmişine yaz, geçmiş silinmez. İndirimli üründe eski fiyatı fiyat geçmişinden hesapla: son 30 günün en düşük fiyatını göstermek site ayarıdır.

## Ürün

- Ürün yalnız `cekirdek/moduller/urun/servis.ts` ile okunur ve değişir. Fiyat, stok ve stok kodu ürüne değil satılabilir birime bağlanır (karar 0062).
- Kategori yalnız `cekirdek/moduller/kategori/servis.ts` ile okunur ve değişir. Kategorinin ürünleri tek sorguyla `kategorininUrunleri` ile gelir; döngüyü servis ve veritabanındaki tetikleyici aynı kilitle denetler (karar 0063).
- Marka ve etiket aynı grup servisini kullanır (`cekirdek/moduller/urun/grup-servisi.ts`); ürünün kategori, marka ve etiket bağlantıları `cekirdek/moduller/urun/baglantilar.ts`, grupların ürünleri `cekirdek/moduller/urun/liste.ts` ile tek sorgudan gelir. Ad tekilliği yalnız ad anahtarıyla karşılaştırılır (`cekirdek/metinler/ad-anahtari.ts`, karar 0064).
- Varyantlı ürünün seçenekleri, değerleri ve birleşimleri yalnız ürün servisinin varyant işlemleriyle (`cekirdek/moduller/urun/varyant.ts`) yazılır. Her birleşim bir satılabilir birimdir; fiyat ve stok onu basit ürünün birimi gibi kullanır. Ürünün türü kayıttan (`urunTurleri`), sınırları `varyantSinirlari` ile, fiyat aralığı yalnız `fiyatAraliklari`, genel stok durumu yalnız `urunStokDurumu` ile bulunur (karar 0071).
- Ürün özellikleri (sitenin kendi ek alanları) yalnız `ozellikServisi` (`cekirdek/moduller/ozellik/servis.ts`) ile tanımlanır; ürünün değerleri ürün girdisinin `ozellikler` alanıyla ürün servisinden yazılır ve türün şemasıyla doğrulanır (`cekirdek/moduller/ozellik/degerler.ts`). Değer türleri `cekirdek/kayitlar/ozellik.ts` kaydındadır. Bir değere sahip ürünler tek sorguyla `ozellikServisi.urunleri` ile gelir (karar 0072).
- Ürünün galerisi (görseller ve video bağlantıları) yalnız ürün servisinin galeri işlemleriyle (`cekirdek/moduller/urun/galeri.ts`) yazılır. Görsel önce `gorselKaydet` (`cekirdek/moduller/dosya/servis.ts`) ile boyutlarıyla kaydedilir, sonra kimliğiyle galeriye bağlanır. Boyutlar `cekirdek/kayitlar/gorsel.ts`, video siteleri `cekirdek/kayitlar/video-siteleri.ts` kaydındadır. Video bağlantısı yalnız `videoAdresiniCoz` ile çözülür, oynatıcı adresi kimlikten kurulur. Ana görseli `anaGorseller`, bir birimin gösterilecek görselini `birimGorseli` verir. Silinen öğenin dosyası silinmez (karar 0073).
- İlgili ürünler yalnız `ilgiliUrunleriGetir` (`cekirdek/moduller/urun/ilgili.ts`) ile bulunur; kural ve sayı oradadır (karar 0065).
- Sitenin ilk kategorileri, markaları, etiketleri, özellikleri ve ürünleri (seçenekleri ve birleşimleriyle, karar 0074) sitenin klasöründe `baslangic/katalog.json` dosyasındadır; katalog hiç kurulmamışsa arka plan süreci açılırken `katalogBaslangiciniKur` (`cekirdek/moduller/urun/baslangic.ts`) onları servislerle, tek işlemde, bir kez yazar (karar 0070). Kategori görseli `gorsel` alanıyla dosya adıyla yazılır (karar 0094). Örnek ürün çekirdeğe yazılmaz.
- Ürünün vitrinde görünüp görünmediği yalnız `vitrinKosulu` (`cekirdek/moduller/urun/vitrin.ts`) ile bulunur. Koşul mağaza sahibinin `tukenenUrun` ayarını ister: "gizle"de tükenmiş ürün listelere girmez, sayfası açılır. Yayın durumlarının nerede göründüğü `cekirdek/kayitlar/urun.ts` kaydındadır, durum adını kodda elle yazma.

## Stok

- Stok yalnız `cekirdek/moduller/stok/servis.ts` ile okunur ve değişir. Sipariş `stokDus`, iptal ve iade `stokArtir` kullanır, ikisi de çağıranın işleminde çalışır. Panel `stokDuzelt` ile ekranın gördüğü miktarı da gönderir. Sebepler `cekirdek/kayitlar/stok.ts` kaydındadır, geçmiş değiştirilemez (karar 0068). Aynı işlemde düşürmeden sonra ürünün işlem kilidi alınmaz (ürün ya da fiyat yazılmaz), iptal ve iade yalnız o siparişin stok geçmişinde düşürdüğü adedi geri koyar.
- Bir birimin satılabilir olup olmadığı, tükenip tükenmediği, düşük stokta olup olmadığı ve müşteriye yazılan durum yalnız `stokDurumu` (`cekirdek/moduller/stok/durum.ts`) ile, birimlerin durumu tek sorguyla `stokDurumlari` ile bulunur. Tükenen ürünün listelerde gizlenmesi vitrin koşulundadır; koşul tükenen ürün ayarını zorunlu değer olarak alır (karar 0069).
- Sipariş oluşurken stoğu "yeterliyse düş" koşuluyla ve siparişin kaydıyla aynı veritabanı işleminde düş. Aynı anda gelen iki sipariş son ürünü iki kez satmasın.
- Ödemeye geçen sepetin ürünlerini belli bir süre ayır. Ödeme başarısız olur ya da süre dolarsa geri bırak.
- Beden ve renk gibi seçeneklerin her birleşiminin kendi stok kodu, stoğu ve fiyatı olsun.

## Ödeme

- Havale ve kapıda ödemede sipariş, ödeme alınana kadar "ödeme bekleniyor" durumunda kalır. Havaleyi yönetici panelden onaylar.
- Süresi içinde ödenmeyen havale siparişini kendiliğinden iptal et ve stoğu geri koy. Süre site ayarıdır.
- Kartla ödeme eklentisi ya da başka bir ödeme kuruluşu bağlıysa:
  - Ödeme kuruluşundan gelen bildirim iki kez gelse de siparişi bir kez işle.
  - Ödemenin başarılı olup olmadığını tarayıcıdan gelen bilgiyle değil, ödeme kuruluşunun doğrulamasıyla kabul et.
  - Sitedeki siparişleri her gün ödeme kuruluşunun kayıtlarıyla karşılaştır. Uyuşmayanları yöneticiye bildir.

## Sipariş ve iade

- İptal, tam iade ve kısmi iadeyi tek akıştan yürüt. İade tutarını ve vergisini fiyat hesabıyla aynı fonksiyondan al. Stoğa geri koymak seçimlidir (kusurlu ürün geri konmaz).
- Siparişin ve stoğun her değişikliğini kimin, ne zaman, neden yaptığıyla geçmişe yaz.
- Siparişin içinde verildiği andaki ürün adını, fiyatı, vergiyi ve adresi sakla. Ürün fiyatı sonradan değişince eski sipariş değişmesin.
- Her siparişin müşteriye gösterilen kısa ve tekil bir numarası olsun. Öneki ve başlangıç numarası site ayarıdır.

## E-posta, dış servis ve arka plan işleri

- Bütün müşteri ve yönetici e-postalarını tek şablon sistemiyle, site tasarım değerleriyle üret. E-posta yalnız `epostaGonder` ile gönderilir, kuyruktan gider. Gönderim hizmeti tek dosyada bağlanır: `cekirdek/moduller/eposta/gonderici.ts` (karar 0050).
- Kargo, fatura, pazaryeri ve ödeme bağlantılarını aynı kalıpla yaz: zaman aşımı, yeniden deneme, kayıt ve hata bildirimi her birinde olsun.
- Dış servisten beklenmeyen yanıt gelince işlemi yarım bırakma. Geri al ve yöneticiye bildir.
- E-posta, fatura, pazaryeri eşitleme gibi uzun işleri kuyrukta yürüt. Başarısız işi sınırlı sayıda yeniden dene, yine olmazsa ayrı listeye düşür ve yöneticiye bildir.
- Yeni arka plan işi `isTanimla` ile tanımlanır, `cekirdek/arka-plan-isleri/isler.ts` listesine eklenir (karar 0049). Dış servise giden iş, yeniden çalışabileceği için `isKimligi` ile tekrarı önler.
