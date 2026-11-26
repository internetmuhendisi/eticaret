# 0185 · Panelin ikinci kısmının taslağı ve ürün kararları

## Tarih

2026-11-26

## Karar

On beşinci bölümün (yönetim paneli 2) taslağı `planlar/tasarim-yonu/panel-2.html` dosyasıdır (kart 0311). Canlı Çarşı yönünde (karar 0075), panel taslağının (karar 0157) stilleri ve yardımcılarıyla şunları çizer: kuponlar (liste, form, kullanımlar), kuponun sepette, ödeme özetinde, sipariş e-postasında, panelin sipariş ayrıntısında ve kısmi iadede görünüşü, ürünlerde toplu fiyat, stok ve kategori düzenleme, ürün kopyalama, Excel ile içe ve dışa aktarma (eklenti), siparişleri dışa aktarma, raporlar (satış, ürün, müşteri, kupon), satış özetli pano, panel bildirimleri ve ayarı, panelde arama, e-posta metinleri ve gönderen bilgileri, vergi ayarları. Kullanıcı taslağı onayladı. Bölümün ekran kartları (0312–0322, 0186, 0279, 0280, 0301) kendi görüntülerini bu taslakla karşılaştırır.

"Kampanya tarihleri" kuponun başlangıç ve bitişidir; kuponsuz otomatik kampanya bu bölümde yoktur (kullanıcı kararı, kart 0311).

Kullanıcının kararları (hepsi önerilen seçenek):

| Soru | Karar |
|---|---|
| Kupon kutusunun yeri | Yalnız sepette. Ödeme adımının özetinde kupon satırı durur, kaldırmak için sepete dönülür. |
| Kuponun sepette gösterimi | Özette tek satır ("Kupon (KOD) −tutar"). Kalem kalem pay siparişte saklanır, panelde ve iadede görünür. |
| Kısmi iadede kupon | İade edilen kalemin ödenen tutarı (kupon payı düşülmüş) döner. Kalan sipariş kuponun en az tutarının altına düşse de indirim geri alınmaz. Tutar kuponunun payı kalemlere tutarlarıyla orantılı dağılır. |
| İptal ve tam iadede kullanım hakkı | Geri verilir (kullanım sayacı düşer, kişi başı sınır yeniden açılır). Kısmi iadede verilmez. |
| Kullanılmış kupon | Kodu, türü ve indirimi değişmez; süresi, sınırları ve açık-kapalı durumu değişir. |
| Toplu fiyat değişikliğinde yuvarlama | Kuruşa. |
| Ürün kopyalama | Pencere yalnız kopyanın adını sorar, neyin kopyalanmadığını söyler. Kopya taslaktır; stok kodu, barkod, stok, yorumlar, favoriler, fiyat ve stok geçmişi kopyalanmaz, görseller paylaşılır. |
| Excel dosyasının düzeni | Her birleşim bir satır, tek sayfa; ürünün ortak bilgileri her satırda tekrarlanır. |
| Excel'de boş hücre | Değeri değiştirmez; silmek için hücreye "-" yazılır. |
| Hatalı satırı olan Excel dosyası | Hiç uygulanmaz; dosya düzeltilip yeniden yüklenir. |
| Siparişleri dışa aktarma | Temel pakette, CSV olarak (satış raporunun CSV indirmesiyle aynı yol). Listenin süzgeçleriyle ya da seçilen siparişlerle. |
| Ciroya giren siparişler | Ödemesi alınmış siparişler (kapıda ödemede teslimde). İptal sayılmaz, iade ayrı satırda düşülür. |
| Bildirim ayarı | Panel bildirimi her zaman açıktır ve izne göre süzülür; ayar yalnız e-postayı açıp kapatır. |
| Arama ve bildirim zili | Her panel sayfasının üstünde bir şeritte; telefonda üst çubukta simge olarak. |
| E-posta metnindeki bilgiler | Türkçe adıyla köşeli parantezde ([Müşteri adı]); "Bilgi ekle" düğmeleriyle ya da elle yazılır. Konu, giriş ve kapanış düzenlenir; tablo, tutar, kargo kutusu ve yasal alt bilgi düzenlenmez. Yönetici bildirimlerinin metni düzenlenmez. |
| Fiyat girişi "vergi dahil"den "vergi hariç"e geçerse | Kayıtlı fiyatlar çevrilir, müşterinin gördüğü fiyat değişmez (349,90 dahil → 291,58 hariç, vitrinde 349,90). |

Site ayarı olarak önerilenler (`planlar/site-ayarlari.md`): ücretsiz kargo sınırının hesaplandığı tutar kupona da uygulanır (var olan ayar, varsayılan indirimden sonra), kupon kodunda büyük-küçük harf fark etmez, Excel dosyasında en çok 5.000 satır, raporun varsayılan dönemi son 30 gün, okunan bildirim 30 gün sonra silinir.

## Neden

- Kupon sepette girilince müşteri toplamı ödeme formuna geçmeden görür; ödemede ikinci kutu aynı işi ikinci yerde yapar.
- Kalem kalem pay sepette kalabalık yapar; müşteri için önemli olan toplamdır, pay ise iade ve fatura için saklanır.
- "Ödediğini geri alır" kuralı müşteriye ve mağaza sahibine tek cümleyle anlatılır; en az tutar kuralı kötüye kullanımı yakalar ama iadeyi karmaşıklaştırır.
- Kullanılmış kuponun indirimi değişirse raporda aynı kod iki farklı indirimle görünür ve verilen siparişlerle tutarsız olur.
- Kuruş yuvarlaması oranı tam tutar ve geri alınması kolaydır.
- Excel'de tek sayfa filtrelenip sıralanabilir; boş hücrenin değeri silmemesi yanlışlıkla silinen bir sütunun veri kaybettirmesini önler; hatalı dosyanın hiç uygulanmaması yarım uygulanmış dosyanın takibini gereksiz kılar.
- Siparişlerin dışa aktarması muhasebe için her mağazada beklenir ve satış raporunun CSV indirmesiyle aynı yoldan gelir.
- Panel bildirimi kimseyi rahatsız etmez; kapatılırsa iş gözden kaçar.
- Köşeli parantezli Türkçe adlar kod bilmeyen mağaza sahibinin okuyup yazabileceği biçimdir.
- Vergi girişini değiştiren mağaza sahibi çoğunlukla vitrin fiyatının değişmesini istemez.

## Düşünülen diğer yollar

- Kupon kutusu sepette ve ödemede: iki yerde aynı iş, ödeme formu uzar.
- Kupon payı her satırda: sepet kalabalıklaşır.
- Kısmi iadede en az tutar bozulursa indirimin tamamını geri almak: kötüye kullanımı yakalar, müşteriye anlatması zor.
- Kullanılan kupon hakkının iptalde de yanması: ödenmeyen havale yüzünden müşteri kuponunu kaybeder.
- Kullanılmış kuponun her alanının değişmesi, ",90" yuvarlaması, kopyalamada kutularla sorma, Excel'de iki sayfa, boş hücrenin silmesi, hatalı satırların atlanması.
- Siparişlerin dışa aktarmasını Excel eklentisine koymak: eklentisiz mağaza siparişlerini dosyaya alamaz.
- Ciroya iptal edilmemiş her siparişi saymak: ödenmeyip süresi dolan havale sonradan ciroyu düşürür.
- Bildirimlerde tek anahtar ya da iki ayrı anahtar; zil ve aramanın menünün başında durması; `{musteri_adi}` gibi kodlu yazım; vergi girişi değişince kayıtlı fiyatları olduğu gibi bırakmak (vitrin fiyatları oran kadar değişir).

## Sonuçları

- Kupon payı siparişte kalem kalem saklanır; sepet, sipariş, e-posta, fiş ve iade aynı kayıttan okur. Kupon sonradan değişse de siparişler değişmez.
- İptal ve tam iadede kullanım hakkının geri verilmesi iptalin tek akışına bağlıdır (kart 0246, kupon kartından önce).
- Excel içe aktarması arka plan işidir; hatalı tek satır bütün dosyayı durdurur, mağaza sahibi dosyayı düzeltip yeniden yükler.
- Siparişlerin dışa aktarması temel paketin bir parçası olur; Excel eklentisi yalnız ürünleri kapsar.
- Panel bildirimleri kapatılamaz; çok bildirim alan mağaza listeyi "okundu" yaparak yönetir.
- Vergi girişi değişince bütün fiyatlar çevrilir; çevirme fiyat geçmişine ve "son 30 günün en düşük fiyatı"na nasıl yansıyacağı kart 0322'de çözülür.
