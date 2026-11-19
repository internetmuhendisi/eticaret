# 0146 · Sipariş durumları, panelin işlemleri ve kişisel verinin saklanması

## Tarih

2026-11-19

## Karar

Sipariş baştan sona panelden yönetilir (kart 0234; karar 0145'in kararlarıyla). Durumlar ve geçişleri tek kayıttadır (`cekirdek/kayitlar/siparis.ts`, `siparisDurumTanimlari`):

| Durum | Geçebileceği durumlar |
|---|---|
| Ödeme bekleniyor | Hazırlanıyor, İptal |
| Hazırlanıyor | Kargoda, İptal |
| Kargoda | Teslim edildi |
| Teslim edildi | Kısmi iade, İade edildi |
| Kısmi iade | İade edildi (yeni kısmi iade durumu değiştirmez) |
| İade edildi, İptal | — |

Panelin işlemleri kayıttaki `siparisIslemleri`'dir: havale onayı (yalnız havalede), hazırlamaya alma (yalnız kapıda ödemede), kargoya verme, kargo bilgisini düzeltme ve teslim edildi. İptal ve iade kart 0235'te gelir.

Kullanıcının kararları (kart 0234):

| Soru | Karar |
|---|---|
| Görevli siparişlerde ne yapar | Siparişleri görür, hazırlamaya alır, kargoya verir, teslim işaretler ve not ekler. Havaleyi onaylayamaz: para işidir, yalnız mağaza sahibinde (`siparis.havale-onayla`). |
| Kapıda ödeme hazırlanmaya nasıl geçer | Sipariş "ödeme bekleniyor" durumunda açılır, mağaza sahibi panelden "Hazırlamaya al"a basar. |

Teknik kurallar:

- Durum yalnız sipariş yönetimi servisinin `islemYap` işleviyle değişir (`cekirdek/moduller/siparis/yonetim.ts`). İşlem siparişin satırını kilitler. Ekranın gördüğü durum artık geçerli değilse "cakisma" döner, hiçbir şey yazılmaz. Kayıtta olmayan geçişi veritabanındaki tetikleyici de reddeder (`siparis_durum_gecisi`); tetikleyicinin geçişleri kayıtla aynıdır, bunu test denetler.
- Her işlem geçmişe kim, ne zaman, neden ile aynı işlemde yazılır (`gecmiseYaz`). Sipariş değişiklik kaydına ayrıca yazılmaz: geçmişi kendi kaydıdır.
- Ödemenin alındığı an (`odeme_zamani`) havalede onayda, kapıda ödemede teslimde, kartla ödemede sipariş kurulurken yazılır.
- Kargo firmaları mağaza ayarıdır (`kargoFirmalari`): ad ve `https://` ile başlayan, takip numarasının yerini (`{takip}`) bir kez taşıyan isteğe bağlı takip adresi. Liste yalnız sipariş ayarları işleviyle, ekranın gördüğü kimliklerle kilidin içinde değişir. Siparişe kargoya verildiği andaki firma adı, takip numarası ve kurulmuş adres yazılır; liste sonradan değişse de sipariş değişmez.
- Notlar ayrı tablodadır (`siparis_notlari`), değiştirilemez. İç not yalnız panelde, müşteriye not müşterinin sipariş ayrıntısında görünür (e-postası kart 0240).
- "Yalnız satın alanlar yorum yapabilir" `satinAldiMi` ile siparişe bağlandı: müşterinin o ürünü içeren teslim edilmiş ya da kısmen iade edilmiş siparişi varsa (`satinAlmaDurumlari`).
- Kişisel verinin saklama süresi altyapı sahibinin ayarıdır (`kisiselVeriSaklamaYili`, varsayılan 10 yıl, hukukçu teyidine kadar öneri). Günlük iş süresi dolan siparişte ad, soyad, telefon, e-posta, sokak adresi, posta kodu, not ve kurumsal faturanın firma ve vergi bilgisini siler; ülke, il, ilçe, tutarlar, ürünler ve vergi dökümü kalır. Siparişin ödeme oturumunda ve havale bildirimlerinde aynı bilgiler silinir.
- Panelde üç ekran: Siparişler (durum sekmeleri ve sayfa adreste; aranan metin sayfanın adresine yazılmaz, liste ucuna sorguyla gider; arama numara, e-posta ve ad soyadda aramanın harf kuralıyla yapılır, `aramaAnahtari`), Sipariş ayrıntısı (`/yonetim/siparisler/ayrinti?numara=`), Sipariş ayarları (kargo firmaları). Liste motoru henüz olmadığı için tablo ekranda yazılıdır.

## Neden

- Para alındığını onaylamak sahibin sorumluluğudur; ürünü paketleyip kargoya vermek günlük iştir ve görevliye açık olmalıdır.
- Kapıda ödemede mağaza sahibinin siparişe bakması (gerekirse müşteriyi araması) sahte siparişin hazırlanmasını önler; müşterinin kendi iptali bu ana kadar açık kalabilir.
- Geçişin tek kayıtta ve veritabanında da denetlenmesi panelin, e-postanın ve raporun aynı kuralı görmesini sağlar; doğrudan yazan bir kod da yanlış geçiş yapamaz.
- Firma adını ve takip adresini siparişe yazmak, sipariş verildiği andaki her şeyi saklama kuralıyla aynıdır.
- Aramanın sayfanın adresine yazılmaması müşterinin adını ve e-postasını tarayıcı geçmişinden uzak tutar (formlar kuralı). Ucun sorgusunda yine durur: istek kaydı tutan bir katman eklenirse arama gövdeli isteğe çevrilmelidir.

## Düşünülen diğer yollar

- **Görevliye havale onayı da vermek** ve **görevliye yalnız görmek:** kullanıcı seçmedi.
- **Kapıda ödeme siparişini doğrudan "hazırlanıyor" açmak:** bir tıklama azalırdı; mağaza sahibinin bakmadığı sipariş hazırlanıyor görünürdü. Kullanıcı seçmedi.
- **Kargo firmalarını kayıt dosyasında sabit yazmak:** firma ve takip adresi siteden siteye değişir, kodda kalamaz.
- **Notu geçmiş tablosuna yazmak:** geçmişin durum denetimleri nota uymaz; ayrı tablo ikisini sade tutar.
- **Aramayı adreste tutmak (GET formu):** sayfalama ve geri dönüş kendiliğinden çalışırdı; kişisel bilgi adrese düşerdi.

## Sonuçları

- Mağaza sahibi teslimi işaretlemezse müşteri yorum yazamaz, iade talebi açamaz (karar 0145'in bedeli).
- Arama sonucu liste ucundan ilk sayfa kadar gelir ve kısa gösterilir (numara, ad, durum); fazlası için aramayı daraltmak gerekir.
- Kargo düzeltme formu firmayı siparişteki adla seçer: firma sonradan yeniden adlandırıldıysa seçim boş açılır, yeniden seçilir.
- "Firma ekle" sipariş ayarlarının kargo firmaları bölümünün başlığındadır, komut çubuğunda değildir: ekranda başka bölümler de olacak (kart 0239, 0241), eylem kendi bölümünün yanında durur (taslak da böyle).
- Siparişin notları saklama süresinde silinmez: not değiştirilemez tablodadır. Nota kişisel bilgi yazılmaması yalnız disiplindir.
- Liste motoru gelince sipariş tablosu ona taşınır.
- Sipariş e-postaları (kart 0240), iptal ve iade (kart 0235), müşterinin sipariş ekranları (kart 0238) bu durumları ve işlemleri kullanır.
