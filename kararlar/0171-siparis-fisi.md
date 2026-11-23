# 0171 · Sipariş fişi: panelin içinde yazdırma sayfası, A4, toplu fiş

## Tarih

2026-11-23

## Karar

Mağaza sahibi siparişi paketlerken yazdırılabilir bir fiş kullanır (kart 0270; taslak ve ürün kararları karar 0157). Gerçek fatura ya da kargo etiketi değildir.

Kullanıcı kararları (karar 0157 ve `planlar/site-ayarlari.md`):

- Listeden seçilen siparişlerin fişleri tek seferde yazdırılır ("Fiş yazdır" toplu çubuğun ilk işlemidir).
- Fişte fiyatlar mağaza sahibinin ayarıdır (`fisteFiyatlar`, varsayılan açık). Kapalıyken fişte yalnız ürün, stok kodu ve adet, altında ürün ve kalem sayısı yazar.

Teknik kararlar:

- Fiş panelin bir alt sayfasıdır (`/yonetim/siparisler/fis?numara=A,B`, `siparis-fisi`, izin `siparis.gor`). Panelin dışında ayrı bir düzen açılmadı: panel sayfalarının yeri ve kapısı tek kuraldır (karar 0042). Ekranda çerçeve görünür; yazdırırken (`print:`) yan menü, üst çubuk ve komut çubuğu gizlenir, yalnız fiş basılır.
- Ayrıntıdaki "Fiş yazdır" ve listenin toplu çubuğundaki "Fiş yazdır" fişi yeni sekmede açar (`?yazdir=1`); sayfa açılınca yazdırma penceresi bir kez gelir. Sayfadaki "Yazdır" yeniden yazdırır. Toplu fiş liste motorunun yeni toplu işlem türüdür (`tur: "baglanti"`): sunucuya istek göndermez, onay sormaz, seçim kalır.
- Fiş A4'tür: `@page fis { size: A4; margin: 12mm 14mm }`. Sayfanın adı fiş varken gövdeye verilir (`body:has(.fis-sayfasi)`). Ad yalnız fişe verilince çevresindeki adsız öğelerle fişin arasında sayfa kırılıyor, ilk sayfa boş çıkıyordu; tarayıcı testi PDF'in sayfa sayısıyla yakaladı. Her fiş yeni sayfadan başlar (`break-before-page`), ürün satırı ve toplamlar sayfalar arasında bölünmez (`break-inside-avoid`).
- Fiş kâğıttır, her zaman açık renktedir. Tasarım değerlerinin zorlanan renk özniteliği (`data-renk`) artık kökün dışında tek bir öğeye de verilebilir; panelin koyu temasında da fiş açık temanın değerleriyle çizilir.
- Veri tek sorguyla gelir (`siparisFisleriVerisi`): siparişler ve kalemleri, verilen sırayla. Kalemler, tutarlar ve fatura bilgisi ayrıntıdakiyle aynı işlevlerden yazılır (`siparisKalemleriVerisi`, `siparisTutarlariVerisi`, `siparisFaturaBilgisiVerisi`). Fiyat ayarı kapalıyken tutar sunucudan hiç gönderilmez.
- Mağazanın üst bilgisi ayarlardan gelir: ad, logo, satıcının unvanı, mağaza adresi, telefon, e-posta. Alt satırda vergi dairesi, vergi numarası, MERSİS ve "Bu belge fatura yerine geçmez." yazar. Mağaza bilgileri ekranı (kart 0278) gelince fiş aynı ayarları okur.
- Fişe müşterinin notu girer, mağazanın iç notları girmez: fiş pakete konabilir.
- Kişisel bilgisi silinmiş siparişin fişi yoktur. Ayrıntıda düğme görünmez; tek siparişte fiş adresi bulunamadı verir; toplu fişte sipariş atlanır ve ekranda söylenir (yazdırılmaz).
- Tek yazdırmada en çok 100 sipariş (`siparisSinirlari.fisEnCok`): panel listesinin en büyük sayfası.
- Telefonda stok kodu ürün adının altına iner. Dar sütunda harf harf kırılıyordu; yazdırmada ve geniş ekranda kendi sütunundadır.

## Neden

- Fişi panelin içinde tutmak izin, oturum ve sayfa ağacının tek kuralını korur; yazdırma stili çerçeveyi zaten gizler.
- Fiş kâğıda basılır; koyu tema kâğıtta okunmaz ve mürekkep harcar.
- Toplu fişin bağlantı olması, yazdırma isteğinin sunucuda bir şey değiştirmediğini ekranda da belli eder.

## Düşünülen diğer yollar

- Panelin dışında, çerçevesiz ayrı bir düzen: sayfaların yeri kuralına (yalnız giriş sayfası dışarıda) ikinci bir istisna açardı.
- Fişi PDF olarak sunucuda üretmek: ek kütüphane ve yazı tipi gömme gerekirdi; tarayıcının yazdırması A4'ü ve PDF'e kaydetmeyi zaten sunar.
- Toplu fişi onaylı istek olarak yazmak: hiçbir şey değişmediği için onay gereksiz bir adım olurdu.

## Sonuçları

- Fiş yazdırıldı diye bir işaret tutulmaz; paketleme durumu siparişin durumudur.
- Yazdırma penceresi tarayıcınındır; kâğıt boyu ve kenar boşluğu kullanıcı tarafından değiştirilebilir, `@page` yalnız varsayılandır.
- Toplu fişte yazdırılabilecek sipariş sayısı listenin sayfasıyla sınırlıdır.
