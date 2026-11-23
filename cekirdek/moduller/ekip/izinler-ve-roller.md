# İzinler ve roller

Kuralları `.claude/rules/yetki.md`, gerekçeleri karar 0040'tadır. Yeni izin ya da rol aynı değişiklikte buraya yazılır. Listelerin kayıtla aynı olduğunu `cekirdek/moduller/ekip/testler/belge.test.ts` denetler.

**Kapsam.** `kendi`: hesabın kendi kayıtları. `ekip`: hesabın ekibinin kayıtları; mağazada henüz alt ekip yapısı olmadığı için bu kapsamı kullanan izin yoktur. `tumu`: sitenin bütün kayıtları.

## İzinler

| İzin | Giriş | Kapsam | Ne verir |
|---|---|---|---|
| `dosya.gor` | yonetici | tumu | Sitedeki görselleri görür: panelin görsel önizlemesi ve görsel seçimi (kategori görseli, marka logosu, vitrin bölümleri). |
| `duzen.gor` | yonetici | tumu | Vitrinin düzenini (üst kısım, ana sayfa, alt kısım bölümleri) görür. |
| `duzen.degistir` | yonetici | tumu | Bölüm ekler, değiştirir, gizler, sıralar ve siler. |
| `ekip.kendi-hesabi.gor` | yonetici | kendi | Yönetici kendi hesabını görür. |
| `ekip.gor` | yonetici | tumu | Ekipteki bütün yöneticileri görür. |
| `ekip.rol-ata` | yonetici | tumu | Yöneticilere rol verir ve alır. |
| `etiket.gor` | yonetici | tumu | Etiketleri ve ürünlerini görür. |
| `etiket.degistir` | yonetici | tumu | Etiket ekler ve değiştirir. |
| `etiket.sil` | yonetici | tumu | Etiket siler: ürünlerden kalkar. |
| `favori.kendi.gor` | musteri | kendi | Müşteri kendi favorilerini görür. |
| `favori.kendi.degistir` | musteri | kendi | Müşteri ürünü kendi favorilerine ekler, çıkarır ve tarayıcısındaki listeyi hesabına birleştirir. |
| `fiyat.gor` | yonetici | tumu | Satılabilir birimlerin fiyatlarını ve fiyat geçmişini görür. |
| `fiyat.degistir` | yonetici | tumu | Satış fiyatını ve indirimi değiştirir. |
| `kategori.gor` | yonetici | tumu | Kategorileri ve ürünlerini görür. |
| `kategori.degistir` | yonetici | tumu | Kategori ekler, değiştirir ve taşır. |
| `kategori.sil` | yonetici | tumu | Kategori siler: altındakiler bir üste çıkar, ürün bağlantıları kalkar. |
| `magaza-ayarlari.gor` | yonetici | tumu | Mağaza sahibinin ayarlarını görür. |
| `magaza-ayarlari.degistir` | yonetici | tumu | Mağaza sahibinin ayarlarını değiştirir. |
| `marka.gor` | yonetici | tumu | Markaları ve ürünlerini görür. |
| `marka.degistir` | yonetici | tumu | Marka ekler ve değiştirir. |
| `marka.sil` | yonetici | tumu | Marka siler: ürünlerden kalkar. |
| `menu.gor` | yonetici | tumu | Menüleri ve öğelerini, hedefi silinmiş öğelerin işaretiyle görür. |
| `menu.degistir` | yonetici | tumu | Menü ve öğe ekler, değiştirir, sıralar ve siler. |
| `musteri.kendi-hesabi.gor` | musteri | kendi | Müşteri kendi hesabını görür. |
| `musteri.kendi-hesabi.degistir` | musteri | kendi | Müşteri kendi şifresini değiştirir ve kampanya iznini verir ya da geri alır (kart 0237). |
| `musteri.kendi-adresleri.gor` | musteri | kendi | Müşteri kendi adres defterini görür (kart 0237). |
| `musteri.kendi-adresleri.degistir` | musteri | kendi | Müşteri kendi adres defterine adres ekler, değiştirir, siler ve varsayılan adresini seçer (kart 0237). |
| `odeme.kendi.baslat` | musteri | kendi | Giriş yapmış müşteri kendi adına ödeme adımını tamamlar: ödeme oturumu açılır, sepetin stoğu ayrılır, havale ya da kapıda ödemede sipariş oluşur (kartlar 0213, 0214). |
| `odeme-yontemi.gor` | yonetici | tumu | Ödeme yöntemlerini, sıralarını, kapıda ödemenin seçeneklerini, havalenin iptal süresini ve banka hesaplarını görür (kart 0214). |
| `odeme-yontemi.degistir` | yonetici | tumu | Ödeme yöntemlerini açar, kapatır ve sıralar; banka hesabı ekler, değiştirir, siler ve sıralar (kart 0214). |
| `ozellik.gor` | yonetici | tumu | Ürün özelliklerini ve seçeneklerini görür. |
| `ozellik.degistir` | yonetici | tumu | Özellik ve seçenek ekler ve değiştirir. |
| `ozellik.sil` | yonetici | tumu | Özellik ya da seçenek siler: değerleri ürünlerden kalkar. |
| `siparis.kendi.havale-bildir` | musteri | kendi | Giriş yapmış müşteri kendi havale siparişi için ödediğini bildirir (kart 0214). |
| `siparis.kendi.iade-talebi` | musteri | kendi | Giriş yapmış müşteri kendi siparişi için iade talebi açar (kart 0239). |
| `siparis.kendi.iptal` | musteri | kendi | Giriş yapmış müşteri kendi siparişini, ayarın izin verdiği durumda iptal eder (kart 0239). |
| `siparis.kendi.fatura` | musteri | kendi | Giriş yapmış müşteri kendi siparişinin faturasını indirir (kart 0268). |
| `siparis.gor` | yonetici | tumu | Siparişleri, ayrıntısını, geçmişini, notlarını ve havale bildirimlerini görür (kart 0234). |
| `siparis.yonet` | yonetici | tumu | Kapıda ödeme siparişini hazırlamaya alır, siparişi kargoya verir, kargo bilgisini düzeltir, teslim edildi işaretler ve not ekler (kart 0234). Panelden elle sipariş girer (kart 0236). Siparişin faturasını ekler, değiştirir ve kaldırır (kart 0268). |
| `siparis.havale-onayla` | yonetici | tumu | Havale siparişinin ödemesini onaylar, sipariş hazırlanıyor olur (kart 0234; görevlide yok, kullanıcı kararı). |
| `siparis.iade` | yonetici | tumu | Siparişi iptal eder, tam ya da kısmi iade yapar (kart 0235; görevlide yok, kullanıcı kararı: para işidir). Müşterinin iade talebini onaylar ya da reddeder (kart 0239). |
| `siparis.elden-tahsil` | yonetici | tumu | Elle siparişi "ödeme alındı" (elden) ile açar (kart 0236; görevlide yok, kullanıcı kararı: para işidir). |
| `stok.gor` | yonetici | tumu | Satılabilir birimlerin stoğunu ve stok geçmişini görür. |
| `stok.duzelt` | yonetici | tumu | Stoğu sebebiyle elle düzeltir. |
| `stok-bildirimi.kendi.iste` | musteri | kendi | Giriş yapmış müşteri tükenmiş birim için kendi hesabının e-postasıyla "stoğa gelince haber ver" talebi bırakır (eklenti, kart 0144). |
| `tema.gor` | yonetici | tumu | Sitenin temasını, tema ayarlarını ve tema sürümlerini görür. |
| `tema.degistir` | yonetici | tumu | Temayı ve tema ayarlarını yayınlar, önceki bir tema sürümüne döner. |
| `urun.gor` | yonetici | tumu | Ürünleri, silinmişler dahil, görür. |
| `urun.degistir` | yonetici | tumu | Ürün ekler ve değiştirir. |
| `urun.sil` | yonetici | tumu | Ürün siler (silinmiş olarak işaretler). |
| `vergi.gor` | yonetici | tumu | Vergi sınıflarını ve oran tablosunu görür. |
| `vergi.degistir` | yonetici | tumu | Vergi sınıflarını ve oranlarını ekler, değiştirir ve siler. |
| `yorum.kendi.yaz` | musteri | kendi | Müşteri kendi adına ürüne yorum yazar, yazıp yazamayacağını sorar. |
| `yorum.gor` | yonetici | tumu | Ürün yorumlarını, onay bekleyen ve reddedilenler dahil, görür. |
| `yorum.onayla` | yonetici | tumu | Yorumu yayınlar ya da reddeder, ana sayfada gösterilmesini işaretler. |

Müşterinin rolü yoktur: geçerli oturumu olan her müşteri müşteri girişinin izinlerine sahiptir, kapsamı yalnız kendi kayıtlarıdır. Sahip girişinin izni sahip paneliyle gelir.

## Roller

Her sitede hazır gelir. Ekranda görünen adları metin dosyasındadır (`yonetim.rol`).

| Kod | Görünen ad | İzinler |
|---|---|---|
| `magaza-sahibi` | Mağaza sahibi | bütün yönetici izinleri |
| `gorevli` | Görevli | ekip.kendi-hesabi.gor, urun.gor, urun.degistir, kategori.gor, kategori.degistir, marka.gor, marka.degistir, etiket.gor, etiket.degistir, fiyat.gor, stok.gor, stok.duzelt, ozellik.gor, ozellik.degistir, yorum.gor, yorum.onayla, odeme-yontemi.gor, siparis.gor, siparis.yonet, dosya.gor |

Tam yetkili son yöneticinin rolü alınamaz. Görevlinin izinleri ürün ve sipariş gibi modüller geldikçe artar.
