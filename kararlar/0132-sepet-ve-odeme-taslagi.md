# 0132 · Sepet ve ödeme sayfalarının taslağı

## Tarih

2026-11-16

## Karar

On ikinci bölümün (Sepet ve ödeme) sayfaları için Canlı Çarşı yönünde (karar 0075) çizilen taslak kabul edildi: `planlar/tasarim-yonu/sepet-ve-odeme.html` (kart 0211). Taslakta sepete ekleme, sepet, ödeme adımı, sipariş alındı sayfası, havale bildirimi, kartla ödemenin başarısız dönüşü ve panelin ödeme yöntemleri, banka hesapları ve kargo ekranları var. Bu bölümün ekran kartları (0212–0215) kendi ekran görüntülerini bu taslakla karşılaştırır.

Kullanıcı bütün önerileri kabul etti:

| Seçim | Karar | Örnek Mağaza |
|---|---|---|
| Ödeme adımı | Tek sayfa: iletişim, teslimat, fatura, ödeme yöntemi ve not alt alta; özet, onaylar ve düğme sağda. Telefonda özet en üstte kapalı (toplamı görünür), onaylar ve düğme formun sonunda. Bütün sitelerde aynıdır, ayar değildir. | — |
| Üye olmayan müşterinin e-postası | İletişim bölümünde; üye olan müşteri bölümdeki "Giriş yapın" bağlantısıyla girer. Ayrı giriş ekranı yoktur. | — |
| Ödemede üst ve alt kısım | Sade: logo ve "Güvenli ödeme"; altta yasal metin bağlantıları ve telefon. Menü ve arama yoktur. | — |
| Sepete ekleyince | Site ayarı, varsayılanı "yan pencerede sepet"; öteki değerler "kısa bildirim" ve "sepet sayfasına git" | Yan pencerede sepet |
| Ürün sayfasında taksit satırı | Kartla ödeme eklentisinin ayarı, varsayılanı "göster" | Göster |

Taslağın öteki kararları:

- Seçenekli üründe ürün kartının sepet düğmesi ürün sayfasını açar, adı "Seçenekleri gör"dür; seçim yapılmadan sepete eklenmez.
- Kapıda nakit ve kapıda kart ödeme adımında ayrı iki seçenektir. Ödeme yöntemlerinin açıklığı ve sırası panelde sürüklenerek ve klavyeyle değişir.
- Telefonda sepetin toplamı ve "Ödemeye geç" altta sabit durur.
- Sepette fiyatı değişen, stoğu azalan, tükenen ve adet sınırına uymayan satır yazıyla işaretlenir; satılamayan satır varken "Ödemeye geç" kapalıdır ve nedeni altında yazar.
- Özette oran oran "toplama dahil" vergi satırı durur; kupon satırı bu bölümde yoktur, yerleşim ona yer bırakır.
- Sipariş alındı sayfasında havalede son ödeme anı, tutar, banka hesapları (IBAN kopyalama düğmesiyle), açıklamaya yazılacak sipariş numarası ve "Ödemeyi yaptım, bildir" durur.
- Sepet boşken üst kısımda rozet yoktur (kart 0108'in kuralı).

## Neden

- Tek sayfada müşteri bütün bilgiyi ve toplamı bir arada görür, daha az adım atar; geri dönüşte yer kaybolmaz.
- E-postayı formun içinde istemek müşteriyi ilk ekranda "giriş mi, misafir mi" kararına zorlamaz.
- Sade üst kısım ödemede dikkati dağıtmaz; yasal metinlere ve telefona ulaşmak yine mümkündür.
- Sepete ekleme davranışı ve taksit satırı mağazadan mağazaya değişebilir, bu yüzden ayardır (`CLAUDE.md`, Roller). Yan pencere müşteriye eklenen ürünü ve toplamı gösterir, alışverişe devam etmeyi de bırakmaz.
- Seçenekli ürün seçimsiz sepete girerse yanlış beden ya da renk sipariş edilir.

## Düşünülen diğer yollar

- Adım adım ödeme: her ekran kısa olur, ama adım sayısı ve geri dönüş artar; seçilmedi.
- Önce ayrı giriş ekranı: üye olan müşteri için net, ama misafir müşteriye fazladan bir ekran; seçilmedi.
- Ödemede vitrinin üst kısmı: tanıdık görünür, ama menü ve arama müşteriyi ödemeden çıkarır; seçilmedi.
- Kısa bildirim ya da sepet sayfasına gitmek: ayarın öteki değerleri olarak kalır.
- Kartta seçenekli ürünü varsayılan seçimle sepete eklemek: hızlı, ama müşterinin seçmediği beden sepete girer; seçilmedi.

## Sonuçları

- Kart 0212 "Sepete ekleyince" ayarını ayar şemasına ekler; kart 0215 taksit satırının ayarını eklentinin ayarı olarak ekler (`planlar/site-ayarlari.md`).
- Kartlar 0212–0215 ekran görüntülerini bu taslakla karşılaştırır. Taslak yalnız Canlı Çarşı'yı gösterir; öteki temalarda aynı yerleşim kendi değerleriyle çizilir.
- Kütüphanede açma-kapama anahtarı yoktur; panelin ödeme yöntemleri ekranında onay kutusu mu yeni parça mı kullanılacağı kart 0214'te kararlaştırılır.
- Düğmenin altındaki "Siparişi onaylayınca ödeme yükümlülüğü doğar" cümlesi, düğme metni ve onay metinleri hukukçuya teyit ettirilir (kart 0063).
- Taslaktaki kargo ücreti (59,90) ve ücretsiz kargo sınırı (750,00) örnektir; Örnek Mağaza'nın değerleri kart 0216'da sorulur. Banka hesapları açıkça örnektir.
- Taslak ürün kodu değildir, renkleri yalnız taslağı göstermek için yazılıdır (karar 0075 ile aynı).
