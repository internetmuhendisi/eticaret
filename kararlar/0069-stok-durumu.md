# 0069 · Stok durumu ve stok ayarları

## Tarih

2026-11-08

## Karar

Bir birimin satılabilir olup olmadığı, tükenip tükenmediği, düşük stokta olup olmadığı ve müşteriye ne yazılacağı yalnız `stokDurumu` (`cekirdek/moduller/stok/durum.ts`) ile bulunur (kart 0083). Birimlerin durumu tek sorguyla `stokDurumlari` ile, sitenin ayarlarıyla `siteninStokDurumlari` ile gelir.

- **Kurallar:**
  - Silinmiş birim (ya da silinmiş ürünün birimi) satılamaz ve tükenmiş sayılır (bağımsız kontrolün bulgusu: yoksa `satilabilir` tek başına kullanılınca silinmiş birim satılabilir görünürdü).
  - Takibi kapalı ürünün silinmemiş birimi her zaman satılabilir, tükenmez, düşük stokta olmaz; müşteriye "stokta" yazılır.
  - Takip açıksa stok sıfırsa birim tükenmiştir ve satılamaz.
  - Düşük stok: stok sıfırdan büyük ve eşiğe eşit ya da altında. Tükenmiş ürün düşük stokta sayılmaz, ikisi ayrı durumdur (temel paketteki "düşük ve tükenen stok" bildirimleri gibi).
- **Ayarlar** (mağaza sahibinin, `planlar/site-ayarlari.md` ile aynı varsayılanlarla):
  - `tukenenUrun`: göster ama satma (varsayılan) ya da gizle.
  - `dusukStokEsigi`: 5.
  - `sonAdetEsigi`: 5. Stok bu sayıya eşit ya da altındaysa müşteriye kalan adet yazılır ("Son 3 ürün").
  - İki eşikte de 0 o özelliği kapatır.
- **Ürünün eşiği:** `urunler.dusuk_stok_esigi`. Boşsa genel ayar geçerlidir; doluysa yalnız o geçerlidir. "Son X ürün" eşiği ürün bazında değildir.
- **Gizlenen tükenmiş ürün (kullanıcı kararı):** Listelerden, aramadan ve ilgili ürünlerden çıkar. Kendi sayfası bağlantıyla açılır, "Tükendi" yazar, satılmaz. Stok gelince listelere kendiliğinden döner; durumu değiştiren bir iş gerekmez.
- **Vitrin koşulu:** Gizleme ürünün tek vitrin koşulundadır (`vitrinKosulu`, karar 0062). Koşul ayarı zorunlu değer olarak alır (`VitrinSecenekleri.tukenenUrun`). Ürün, satılabilir tek bir birimi (silinmemiş, takip kapalı ya da stoğu var) kalmayınca listede tükenmiş sayılır (`tukenmisUrunKosulu`); varyantlı üründe bir birleşimin stoğu varsa ürün listede kalır. Birim ve ürün düzeyindeki iki kural aynı tanımı kullanır. Ürünün silinmişliğine liste kuralı bakmaz, onu vitrin koşulu süzer. Koşul takma adsız `urunler` tablosunun içinde kullanılır: takma adlı bir `urunler` içinde sütunlar sessizce dıştaki satıra bağlanırdı.
- **Metinler:** Müşteri metinleri `vitrin.stok.*`, ayar açıklamaları `ayar.aciklama.*`. Durumun metin anahtarı `stokGosterimMetinleri` kaydındadır.

## Neden

- Kuralı tek işlevde tutmak sepetin, vitrinin, panelin ve e-postanın aynı ürüne farklı durum yazmasını önler.
- Ayarı vitrin koşulunda zorunlu yapmak, bugün ve ileride koşulu kuran her yerin (listeler, ilgili ürünler, arama, site haritası) ayarı vermesini tür kontrolüne bırakır. İsteğe bağlı olsaydı yeni bir liste ayarı unutup tükenmiş ürünü gösterebilirdi.
- Listedeki tükenmişlik veritabanında sınanır: liste sayfalı ve sayılıdır, ürünleri uygulamada süzmek sayfayı ve toplamı bozardı. Aynı kuralın iki yazılışı (TypeScript ve SQL) yan yana, aynı dosyadadır; aynı sonucu verdiklerini test denetler.
- Sayfanın açık kalması, paylaşılmış bağlantıların ve arama motorlarındaki kaydın boşa düşmemesi içindir (kullanıcı kararı).

## Düşünülen diğer yollar

- **Ayarı vitrin koşulunun içinde veritabanından okumak:** Seçilmedi. Ayar ilk okunuşta başlangıç değeriyle yazılır (karar 0055); sorgunun içinde okumak varsayılanı ikinci bir yerde tekrar ederdi.
- **Ayarı isteğe bağlı yapıp varsayılanı "göster" saymak:** Seçilmedi, yukarıdaki neden.
- **Tükenmiş ürünü sayfasıyla birlikte gizlemek:** Kullanıcı seçmedi.
- **Ürün bazında "son X ürün" eşiği:** Seçilmedi. Kart yalnız düşük stok eşiğini ürün bazında ister; gerekirse sonra eklenir.
- **Tükenmiş ürünü düşük stokta da saymak:** Seçilmedi. Bildirimler ikisini ayrı gönderecek; tek durum ikisini karıştırırdı.

## Sonuçları

- Vitrin koşulunun imzası değişti: listeler, ilgili ürünler ve `vitrindeGorunurMu` ayarı ister. Çağıran mağaza ayarını `siteninMagazaAyarlari` ile okur. Bugün vitrin sayfası yoktur, çağıranlar yalnız testlerdir.
- Var olan ürünlerde takip açık ve stok sıfırdır (karar 0068). "Gizle" seçilen ürünlü bir sitede stok girilene kadar listeler boş görünür. Bugün hiçbir sitenin ürünü yoktur.
- Tükenmişlik sorgusu her liste satırında birimlere ve stoklara bakar; birim kimliği ve stok birincil anahtarı indekslidir. 30 mağazalık ölçekte sorun değildir; büyük kataloglarda ölçülmelidir.
- Sepet "bu adet satılabilir mi" sorusunu stok durumu ve `miktar` ile kendisi sınar; stok ayırma sepet kartıyla gelir.
- Düşük stok bildirimi e-postalar bölümüyle, vitrindeki görünüm vitrin bölümüyle, varyantlı ürünün genel durumu kart 0085 ile gelir.
- **Yalnız disiplin:** Vitrin sayfası ayarı mağaza ayarlarından okumak yerine elle `"goster"` yazarsa tür kontrolü bunu yakalamaz. Vitrin sayfaları gelince ayarı okuyan tek bir işlev yazılmalıdır. `siteninMagazaAyarlari` bütün ayarları okur; başka bir ayar bozuksa stok durumu da hata verir (`magazaninAdi`'ndaki gibi bir yedek yoktur). Vitrin bölümü bunu ölçmelidir.
- **Site haritası:** Hangi yeri (liste ya da sayfa) kullanacağı site haritası kartında kararlaştırılmalıdır. Liste yeri "gizle"de tükenmiş ürünü haritadan çıkarır; sayfa yeri durumu `gizli` olan ürünü haritaya sokar.
- **Varyantlı ürün:** İki kuralın aynı sonucu verdiği bugün tek birimli ürünlerle ölçülür. Ürün düzeyindeki durum ve birden çok birimle karşılaştırma kart 0085 ile gelmelidir.
- Bu kartta modül testlerinin tür kontrolünden geçmediği görüldü (kart 0056). Stok modülündeki eski hatalar burada düzeltildi; vergi testlerinde ve bileşenlerde kalanlar kart 0056'dadır.
