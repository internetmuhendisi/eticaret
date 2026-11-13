# 0108 · Ürün sayfası: seçim, ilk seçim ayarı ve açıklamanın temizlenmesi

Bu kararın sonraki seçeneklerin satılabilir değere geçtiği maddesinin yerine 0118 numaralı karar geçti.

## Tarih

2026-11-12

## Karar

Kart 0138'in ürün sayfası Canlı Çarşı taslağıyla (karar 0102) yazıldı.

**Kullanıcı kararı:** Sayfa ilk açıldığında stoğu olan ilk birleşim seçili gelir. Bu davranış site ayarıdır (`secenekOnSecimi`): varsayılanı ve Örnek Mağaza'daki değeri "ilk-satilabilir", öteki değeri "secimsiz". Seçimsiz ayarda müşteri seçene kadar ürünün fiyat aralığı ve genel stok durumu görünür.

Karar 0102'deki tükenmiş seçenek ayarı şemaya girdi (`tukenmisSecenek`, "ustu-cizili" ya da "gizle").

Teknik kararlar:

- **Seçimin kuralı (`cekirdek/vitrin/urun-sayfasi/secim.ts`):** Seçenekler ürünün sırasıyla gelir. Bir değerin durumu kendisinden önceki seçeneklerde seçilen değerlerle birlikte bulunur: satılabilir birleşim varsa seçilebilir, birleşim var ama satılamıyorsa tükenmiştir (ayara göre üstü çizili ya da gizli, iki durumda da seçilemez), hiç birleşim yoksa değer gösterilmez. Bir seçenek değişince sonraki seçeneklerde önce müşterinin o seçenekte elle seçtiği son değere, o satılamıyorsa seçili değere, o da satılamıyorsa aynı seçenekteki ilk satılabilir değere geçilir: seçilen beden başka renkte yoksa geçici olarak değişir, o bedenin olduğu renge dönünce geri gelir.
- **Adres:** Seçim ürün listesinin filtresiyle aynı parametreyle ve aynı okunur anahtarla adreste durur (`?secenek-renk=siyah&secenek-beden=m`). Adresteki tam ve var olan birleşim, tükenmiş olsa da, ilk seçimden önce gelir. Adresteki uyumsuz sonraki değer düşer, önceki değerler korunur. Seçim değişince adres sayfa yenilenmeden yazılır; adresin öteki parametreleri (kampanya izi gibi) korunur. Seçimli adres arama motoruna seçimsiz adresle (canonical) bildirilir. Listede görünmeyen ama sayfası açılan ürün (gizli, karar 0062) arama motorlarına kapalıdır (`noindex`).
- **Hesap sunucuda:** Her birleşimin fiyatı, stok yazısı ve stok kodu sunucuda çekirdeğin tek işlevleriyle (`gosterilecekFiyatlar`, fiyat bileşeninin biçimi için `araliginiKur`, `stokDurumu`, `birimGorseli`) çizilir; tarayıcı yalnız seçili birleşiminkini gösterir.
- **Fiyatı olmayan birleşim** satın alınamaz (karar 0071): stoğu olsa da "Tükendi" yazar, seçilemez ve ürünün genel stok durumuna sayılmaz.
- **Uzun açıklama:** Panelin metin düzenleyicisi biçimli metin (HTML) yazacak. Vitrin açıklamayı `aciklamayiTemizle` (`cekirdek/moduller/urun/aciklama.ts`) ile, izinli etiketler listesiyle (`sanitize-html`) temizleyerek çizer; bağlantı yalnız https, http, mailto, tel ya da sitenin kendi yoluna gider ve `rel="nofollow noopener noreferrer"` alır. Etiket taşımayan açıklama düz metindir: boş satırla ayrılmış kısımlar paragraf olur. Etiketlerin stili Tailwind'deki `bicimli-metin` stilindedir.
- **Galeri:** Görseller tek bir kaydırmalı şerittir: telefonda parmakla kaydırılır ve noktalıdır, tablet ve masaüstünde solda küçük görseller vardır; şerit odak alır, ok tuşlarıyla gezilir. Büyütme penceresi yalnız görselleri gezer. İlk açılışta gösterilen öğe (seçili birleşimin görseli) hemen, ötekiler ekrana girince yüklenir. Video oynata basılana kadar video sitesine istek göndermez (karar 0073).
- **Tükenmiş seçili değer:** Adresle verilen tükenmiş birleşimin değeri "gizle" ayarında da görünür (seçili değer gizlenmez). Hiçbir birleşim satılamıyorsa müşteriden seçim istenmez.
- **Seçenek grubu** kütüphaneye `SecenekGrubu` olarak girdi (Radix radyo grubu): seçilemeyen değer odak alır, ekran okuyucu "tükendi" ekini duyar, seçilmez.

## Neden

- İlk seçim mağazadan mağazaya değişebilir: tek bedenli ürünler satan mağazada hazır seçim müşteriyi hızlandırır, beden yanlışının pahalı olduğu mağaza seçimsiz başlamak isteyebilir (`CLAUDE.md`, Roller).
- Değerin durumunu önceki seçimlere göre bulmak, müşterinin seçtiği renkte hangi bedenin kaldığını gösterir (taslaktaki "üstü çizili beden bu renkte tükendi"). Sonraki seçimi satılabilir değere geçirmek müşterinin satılamayan bir birleşimde kalmasını önler.
- Filtreyle aynı parametre adı, kategori sayfasındaki seçimin ileride ürün sayfasına taşınabilmesini sağlar.
- Fiyatı tarayıcıda hesaplamak vergi, indirim ve 30 gün kuralını ikinci bir yerde yazmak olurdu (`.claude/rules/e-ticaret-is-kurallari.md`).
- Açıklamayı bugünden temizlemek, panelin düzenleyicisi geldiğinde vitrinin hazır olmasını sağlar; düz metin bugünkü kataloğu bozmadan çizilir.

## Düşünülen diğer yollar

- **Seçimsiz başlamak varsayılan olarak:** Taslak seçili çizilmişti, kullanıcı ayarın varsayılanını "ilk satılabilir" seçti.
- **Her seçeneğin değerini öteki bütün seçimlere göre değerlendirmek:** Seçilen bedenin olmadığı renk seçilemez hâle gelir, müşteri sıkışır. Seçilmedi.
- **Seçim değişince sayfayı sunucudan yeniden istemek:** Her tıklamada bekleme ve sayfanın kayması; seçilmedi. Birleşim sayısı en çok 100'dür (`varyantSinirlari`), hepsinin bilgisi sayfayla gelir.
- **Açıklamayı düz metin olarak çizmek:** Panelin biçimli düzenleyicisi gelince ikinci bir değişiklik gerekirdi; seçilmedi.
- **Temizliği elle yazmak:** Tarayıcıların HTML ayrıştırma farkları elle yazılmış süzgeçlerin bilinen açığıdır; bakımı süren bir kütüphane seçildi. Kütüphanenin 2.17 sürümünde bilinen açıklar vardı, güvenlik taraması 2.18.1'i geçirdi.

## Sonuçları

- Ürün sayfası birleşim sayısı kadar fiyat ve stok bilgisini sayfayla birlikte gönderir. Sınır 100 birleşimdir.
- Adreste yalnız tükenmiş bir birleşim verilirse sayfa onu seçili açar ve "Tükendi" yazar: paylaşılan bağlantı müşterinin baktığı bedeni gösterir.
- Fiyatsız ama stoklu birleşim ürün kartında ve ürünün genel stok durumunda (`urunStokDurumu`) hâlâ "stokta" sayılır; ürün sayfası saymaz. Bu fark kart 0155'te çekirdeğin tek işlevine taşınacak.
- Sepet, adet, favori, puan ve yorum işlevleri yazılınca sayfaya eklenir; yorumların yeri özellik tablosundan sonradır (kart 0139).
- Taslaktaki "14 gün içinde iade" ve "Havale ve kapıda ödeme" satırları iade ve ödeme bölümleriyle gelir; bugün yalnız kargoya verme süresi yazar.
