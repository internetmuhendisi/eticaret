# 0102 · Vitrin sayfalarının ve panelin taslağı

## Tarih

2026-11-11

## Karar

Bu bölümün sayfaları için Canlı Çarşı yönünde (karar 0075) çizilen taslak kabul edildi: `planlar/tasarim-yonu/sayfalar.html` (kart 0134). Taslakta kategori ve arama sayfası, ürün sayfası, favoriler, bulunamadı ve hata sayfası, panelin çerçevesi, Vitrin bölümleri ekranı (Slider formu ve bölüm ekleme) ve Menüler ekranı var. Bu bölümün ekran kartları kendi ekran görüntülerini bu taslakla karşılaştırır.

Kullanıcı taslağı gezdi ve şu önerileri kabul etti:

| Seçim | Karar | Örnek Mağaza |
|---|---|---|
| Masaüstünde filtrenin yeri | Temanın görünüm seçeneği, varsayılanı "solda sütun"; öteki seçenek "üstte açılır". Telefonda filtre her zaman yan pencerede açılır. | Solda sütun |
| Sayfa geçişi | Site ayarı, varsayılanı "numaralı"; öteki seçenek "Daha fazla göster" | Numaralı |
| Sayfa başına ürün | Site ayarı, varsayılanı 24 | 24 |
| Tükenmiş beden ya da renk | Site ayarı, varsayılanı "üstü çizili, seçilemez"; öteki seçenek "gösterilmez" | Üstü çizili |
| Filtreler | Fiyat aralığı, marka, ürünün seçenekleri (beden, renk), stok durumu ve mağaza sahibinin "filtrede kullanılsın" diye işaretlediği ürün özellikleri | Kumaş işaretli |
| Panelin ana menüsü | Bütün sitelerde solda yan menü; telefonda yan pencere | — |

Taslağın öteki kararları:

- Sıralama seçenekleri: önerilen (mağaza sahibinin elle sırası), en yeni, fiyat artan ve azalan; aramada ek olarak "en uygun" (kartlar 0136, 0137).
- Ürün sayfasında galeri masaüstünde solda küçük görsellerle, telefonda kaydırmalı ve noktalı; video oynata basınca yüklenir.
- Üye olmayan müşterinin favoriler sayfasında "bu cihazda saklanıyor, giriş yapınca hesabınıza geçer" bilgisi durur.
- Panelde Vitrin bölümleri ve Menüler ekranındaki satırlar tutamakla sürüklenir, klavyeyle de sıralanır; bölüm formu ve öğe formu sağdan açılan yan pencerededir.

## Neden

- Canlı Çarşı yoğun bir pazar havasında; masaüstünde açık duran filtre çok kategorili mağazada müşteriyi hızlandırır.
- Numaralı sayfa adreste durur: müşteri ürüne girip geri dönünce yerini kaybetmez, sayfa paylaşılabilir.
- Tükenmiş bedeni göstermek müşteriye o bedenin var olduğunu, yalnız şu an bittiğini söyler; stoğa gelince haber ver eklentisiyle birlikte anlamlıdır.
- Bu dört davranış mağazadan mağazaya değişebilir, bu yüzden site ayarı ya da tema görünümüdür (`CLAUDE.md`, Roller).
- Panel bütün sitelerde aynıdır. On dördüncü bölümde çok sayıda ekran gelecek; yan menü bu kadar ekrana sığar, üst menü sığmaz.

## Düşünülen diğer yollar

- Üstte açılır filtre: daha geniş ürün ızgarası verir, ama filtreler kapalı durur. Temanın öteki görünümü olarak kalır.
- "Daha fazla göster": telefonda akıcıdır, ama geri dönüşte yer kaybolur ve sayfa adreste durmaz. Ayarın öteki değeri olarak kalır.
- Tükenmiş bedeni hiç göstermemek: ekran sadeleşir, ama müşteri bedenin olup olmadığını bilemez. Ayarın öteki değeri olarak kalır.
- Panelde üst menü: az ekranlı panelde yer kazandırır; seçilmedi.

## Sonuçları

- Kartlar 0136, 0138 ve 0141 bu ayarları ve görünümü kendi işinde ekler: sayfa geçişi, sayfa başına ürün ve tükenmiş seçenek ayar şemasına girer, filtrenin yeri temanın görünüm kaydına girer, ürün özelliğine "filtrede kullanılsın" alanı eklenir.
- Taslak yalnız Canlı Çarşı'yı gösterir. Yumuşak Mevsim ve Keskin Çizgi'de bu sayfalar aynı yerleşimle, kendi değerleriyle çizilir; demolarda görülür (kart 0116).
- Taslaktaki yorumlar yer tutucudur; puan özeti ve yorum listesinin yerleşimi kabul edildi, içerik kart 0139'da gelir.
- Taslak ürün kodu değildir, renkleri yalnız taslağı göstermek için yazılıdır (karar 0075 ile aynı).
