# 0109 · Ürün yorumları ve puan

## Tarih

2026-11-12

## Karar

Kart 0139'un ürün yorumları yazıldı. Yorum işlevi açıldı (`yazilanIslevler.yorum`): ana sayfanın müşteri yorumları bölümü kendiliğinden çizilir (karar 0090).

Kullanıcı kararları:

- **Görünen ad:** Müşteri adını ve soyadını formda yazar; kayda ve vitrine soyadı kısaltılmış girer ("Ayşe Yılmaz" → "Ayşe Y."). Müşteri hesabında ad yoktur, yalnız e-posta vardır.
- **Bir ürüne bir yorum:** Bir müşteri bir ürüne bir yorum yazar. İkinci denemede "yorumunuzu yazdınız" yazar.
- **Örnek yorumlarda etiket yok:** Örnek Mağaza'nın örnek yorumları doğrulanmış alıcı değildir: etiket demoda da yanıltıcı olur.
- **Görevli:** Yorumları görür, yayınlar ya da reddeder ve ana sayfa için işaretler (`yorum.gor`, `yorum.onayla`).
- **Yalnız satın alanlar (karar 0101):** Varsayılanı açık, Örnek Mağaza'da kapalı.

Teknik kararlar:

- **Modül (`cekirdek/moduller/yorum/`):** Yorumun durumu onay bekliyor, yayında ya da reddedildi (`cekirdek/kayitlar/yorum.ts`). Yalnız yayındaki yorum görünür ve ortalamaya girer. Ürün sayfası, ürün kartının puanı ve ana sayfa bölümü aynı okumaları kullanır (`puanOzetleri`, `urunYorumlari`, `anaSayfaYorumlari`). Ana sayfanın yorumları yalnız listede görünen ürünlerin yorumlarıdır.
- **Satın alma denetimi:** Tek işlevdir (`satinAldiMi`, `satin-alma.ts`), bugün hiçbir müşteriyi satın almış saymaz. Sipariş modülü onu siparişlere bağlar. Doğrulanmış alıcı işareti yorum yazıldığı anda bu işlevden gelir; vitrinde görünmesi ayardır (`dogrulanmisAliciEtiketi`).
- **Tekillik:** (ürün, müşteri) veritabanında tekildir. Aynı anda gelen iki yazmada ikincisi indekste bekler ve çakışma alır.
- **Ad yalnız kısaltılmış saklanır:** Soyadı hiç kaydedilmez (`kisaAd`, ortak biçimleyici). Kısaltma sitenin diliyle büyük harfe çevrilir.
- **Düz metin:** Metin ve başlık düz metin olarak saklanır ve React'ın kaçırdığı yazı olarak çizilir. Satır sonu korunur; HTML ve bağlantı çalışmaz. Denetim karakterleri reddedilir.
- **Değişiklik kaydı:** Puan, durum ve ana sayfa işareti kayda girer; metin, başlık ve ad girmez. Serbest metin kişisel bilgi taşıyabilir; değişiklik kaydı e-posta taşıyan değeri reddeder ve yorum yazmayı durdururdu.
- **Yorum yazma akışı:** Sayfa çizilirken müşterinin oturumu okunmaz (karar 0039). "Yorum yaz" düğmesi basılınca müşteri ucu sorulur (`GET /kapi/musteri/yorum-izni`):
  - Girişsiz müşteri giriş sayfasına gider ve girişten sonra ürünün yorumlarına döner. Müşteri girişine güvenli dönüş eklendi (`vitrinDonusu`): yalnız vitrinin kendi sayfasına dönülür.
  - Yazabilen müşteride form pencerede açılır.
  - Yazamayan müşteriye nedeni yazar.

  Form robot korumalıdır, uç sıkı istek sınırındadır.
- **Sayfalama:** Ürün sayfasında beş yorum görünür, "Daha fazla yorum" bağlantısı adresle gelir (`?yorum-sayfasi=2`). Kod yüklenmeden de çalışır.
- **Puan seçimi:** Kütüphanenin seçenek grubuyla yapılır; parça hata gösterimi aldı (`hata`).
- **Yönetici uçları:** Panel ekranı on dördüncü bölümde gelir; uçlar bugünden yazıldı. Liste (`GET /kapi/yonetici/yorumlar`), karar (`POST /kapi/yonetici/yorum-karari`) ve ana sayfa işareti (`POST /kapi/yonetici/yorum-ana-sayfa`). Aynı değer yazılmaz ve kayda girmez.

## Neden

- Soyadını saklamamak gerekmeyen kişisel veriyi hiç toplamamaktır; yorumun güvenilirliği için ad ve baş harf yeter.
- Bir ürüne bir yorum, puan ortalamasının tek müşterinin çok yorumuyla şişmesini önler.
- Satın alma denetimini tek işleve koymak, sipariş modülü geldiğinde yalnız o işlevin değişmesini sağlar. Ayar ve etiket aynı soruyu sorar.
- Yorum izni sorusunu uca taşımak, sayfayı önbelleğe uygun ve oturumsuz tutar (karar 0039).
- Metni değişiklik kaydına yazmamak, müşterinin yorumuna yazdığı telefon ya da e-posta yüzünden yorumun reddedilmesini ve kayıtta kişisel bilgi kalmasını önler.

## Düşünülen diğer yollar

- **Adın yazıldığı gibi görünmesi:** Kullanıcı seçmedi.
- **Sınırsız yorum:** Kullanıcı seçmedi.
- **Örnek yorumlarda etiket:** Demoda etiket görünürdü, ama gerçek bir alıcıyı taklit ederdi; kullanıcı seçmedi.
- **Görevlinin yalnız görmesi ya da hiç görmemesi:** Yorum onayı gündelik iştir; kullanıcı görevliye onayı da verdi.
- **Yorum metnini HTML olarak temizleyip çizmek:** Müşteri biçimli metin yazmaz; düz metin daha basit ve güvenlidir.
- **Daha fazla yorumu tarayıcıda uçtan yüklemek:** Ek bir herkese açık uç ve kod gerekirdi; adresle sayfalama kod yüklenmeden de çalışır.

## Sonuçları

- Sipariş modülü `satinAldiMi`'yı siparişlere bağlayınca "yalnız satın alanlar" ve "Doğrulanmış alıcı" kendiliğinden çalışır. O güne kadar bu ayar açık olan sitede kimse yorum yazamaz.
- Yorum yönetim ekranı ve "onay bekleyen yorum" bildirimi panelle gelir. O güne kadar onay yönetici ucuyla verilir.
- Yorumun silinmesi ve mağaza cevabı yok.
- Yorum sayfası adreste durur: arama motoru farklı sayfalarını görebilir, kanonik adres seçimsiz ürün adresidir (karar 0108).
- Yerel ve sunucudaki veritabanlarına 0034 değişikliği uygulanmalıdır (`pnpm veritabani-guncelle`).
