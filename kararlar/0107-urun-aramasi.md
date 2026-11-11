# 0107 · Ürün araması: harf kuralı, alanlar, en uygun sırası ve istek sınırı

## Tarih

2026-11-12

## Karar

Vitrinin araması (kart 0137) veritabanında, dış servis olmadan çalışır:

- **Harf kuralı:** Türkçe harfler (ı, İ, I, ş, ğ, ü, ö, ç ve büyükleri) ile şapkalı â, î, û tek tablodan düz karşılığına çevrilir, sonra küçük harfe inilir (`cekirdek/metinler/arama-anahtari.ts`). Aynı tablo uygulamada (`aramaAnahtari`) ve veritabanında (`translate`) kullanılır.
- **Alanlar:** Aranan metin sözcüklere bölünür (en çok 8 sözcük, 100 harf); her sözcük ürünün adında, markasında, kategorilerinden birinde ya da bir biriminin stok kodunda geçmelidir. Silinmiş marka, kategori ve birim sayılmaz. Görünürlük filtreli listenin koşuludur.
- **En uygun sırası:** stok kodunun tamamı > adın tamamı > ad sözcükle başlar > adda geçer > markada > kategoride > stok kodunda geçer; eşitte en yeni. Sıra yalnız arama sayfasında vardır ve orada varsayılandır.
- **Sayfa:** `/arama?ara=<metin>`, kategori sayfasının liste, filtre ve sıralamasıyla; her zaman arama motorlarına kapalı. Sonuç yoksa boş hâl ve üst düzey kategoriler öneri olarak.
- **İstek sınırı:** Aranan metinli istek ara katmanda istemci başına dakikada 30 (`istekSinirlari.arama`); aşan istek 429 ve `Retry-After` alır, sayfa arama yapmadan bekleme süresini söyler.
- **Arama kutusu:** GET formu (`AramaFormu`), JavaScript olmadan da çalışır. Logo solda görünümünde masaüstünde logonun yanında, daha dar ekranda satırın altında; logo ortada görünümünde her genişlikte satırın altında (kullanıcı kararı).

## Neden

Mağaza başına ürün sayısı ilk yıl yüzlerle sınırlı; ayrı bir arama servisi her site için bir kutu, eşitleme ve bakım demektir. Harf kuralı tek tabloda olunca uygulama ile veritabanı ayrışmaz, her harf gerçek veritabanıyla test edilir. Arama sayfası her istekte birkaç alt sorgu çalıştırır; sınır toplu taramanın veritabanını yormasını önler.

## Düşünülen diğer yollar

- **PostgreSQL'in tam metin araması (`tsvector`) ya da `unaccent`/`pg_trgm` eklentisi:** Eklenti her sitenin veritabanına kurulmalıydı; tam metin aramanın kök bulması ürün adlarında beklenmedik eşleşmeler verebilir (ölçülmedi); yazım hatası toleransı bu kartın sınırında değil. İhtiyaç olursa indeksli bir sonraki adım olarak ayrı kart.
- **Dış arama servisi (Meilisearch vb.):** Kartın sınırı dışında; site başına ayrı servis ve eşitleme gerektirir.
- **LIKE ile arama:** `%` ve `_` müşterinin yazısında joker olurdu; `strpos` seçildi.
- **Arama kutusu yalnız simge, tıklayınca açılan pencere:** Taslakta kutu satırda görünüyor; kullanıcı kutunun satırda (dar ekranda satırın altında) durmasını seçti.

## Sonuçları

- Arama indeks kullanmaz, her istekte ürünleri tarar. Binlerce ürünlü mağazada yavaşlar; o zaman `pg_trgm` indeksi ya da arama sütunu gerekir (ölçülmeden yapılmaz).
- Yazım hatası düzeltme ve yazarken öneri yoktur.
- İstek sınırı süreç belleğindedir: aynı sitenin birden çok uygulama süreci olursa sınır süreç başınadır (öteki istek sınırlarıyla aynı).
- Sayfa başlığında aranan metin müşterinin yazdığı gibi, harf sınırında kesilerek görünür (React kaçışıyla).
- Ara katman aranan metni sayfayla aynı işlevle okur (`adresinAramasi`): sayfanın aradığı her yazılış sayılır.
- Liste sayfalarının sayfa ve filtre bağlantıları ön yüklenmez: ön yükleme her sayfayı hesaplatır ve aramada sınırı tüketir. Gezinme bu bağlantılarda tıklanınca yüklenir.
