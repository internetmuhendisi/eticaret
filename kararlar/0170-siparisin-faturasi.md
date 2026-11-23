# 0170 · Siparişin faturası: numara ve tarih, isteğe bağlı PDF, indirilecek belge

## Tarih

2026-11-23

## Karar

Mağaza sahibi faturayı kendi e-fatura ya da e-arşiv sisteminde keser, panelde siparişin ayrıntısına yazar (kart 0268; taslak: karar 0157). Gerçek e-fatura bağlantısı yoktur.

Kullanıcı kararları (2026-11-23):

- Fatura numarası ve tarihi zorunludur, PDF isteğe bağlıdır. Karar 0157 "numara, tarih ve PDF birlikte" diyordu; taslak PDF'i isteğe bağlı çizmişti. Faturasını başka yoldan gönderen mağaza numarayı yine yazabilir. Müşteri dosya varsa indirir, yoksa numarayı ve tarihi görür.
- Fatura yazılırken müşteriye "Faturanız hazır" e-postası gider; panelde kutu varsayılan işaretlidir.

Teknik kararlar:

- Fatura siparişin satırındadır: `fatura_numarasi`, `fatura_tarihi` (takvim günü), `fatura_dosyasi`, `fatura_zamani` (değişiklik 0052). Numara, tarih ve an birlikte yazılır, dosya numarasız olamaz; veritabanı denetimi de ister. Yazma ve kaldırma yalnız `siparisFaturaServisi`'dir (`cekirdek/moduller/siparis/fatura.ts`). Ekran gördüğü faturayı gönderir; arada değiştiyse `cakisma`. Her yazma ve kaldırma değişiklik kaydına girer (`siparis.fatura-yazildi`, `siparis.fatura-kaldirildi`); aynı fatura yeniden yazılmaz.
- PDF ayrı bir "belge" türüdür (`belgeTurleri`, `cekirdek/kayitlar/dosya.ts`). Yeniden kodlanmaz, olduğu gibi saklanır, en çok 5 MB'tır; tür içerikten (`%PDF-`) anlaşılır. Yalnız `belgeKaydet` ve `belgeOku` ile yazılır ve okunur. Görselin bütün okuma yolları (`dosyaOku`, `dosyaKaydi`, `gorselHazirMi`) belge kaydını görmez: PDF'in kimliği logo, galeri, vitrin ya da panel görseli olarak açılmaz.
- Belge tarayıcıya yalnız indirilecek dosya olarak verilir (`DosyaYaniti`'nin `indirme`'si): `Content-Disposition: attachment`, `Content-Security-Policy: sandbox; default-src 'none'`, `Cache-Control: private, no-store`, `nosniff`. PDF içinde kod taşıyabilir; dosya sitenin adresinde açılıp çalışmaz. Kişisel belgedir, ortak bilgisayarda önbellekte kalmaz.
- Dosya önce `fatura-yukle` ucuyla kaydedilir, kimliğiyle `siparis-fatura` ucuna gelir. Değiştirilen ya da kaldırılan dosya silinmiş işaretlenir. Başka bir siparişin faturası olan dosya bağlanmaz.
- Dosyayı üç yol verir: panel (`siparis.gor`), üye (yeni izin `siparis.kendi.fatura`, yalnız kendi hesabıyla verilmiş sipariş) ve takip (takip anahtarının siparişi; uç takip çerezinin yolunun altındadır). Takip sayfası teslimatı kısaltır, ama fatura belgesi tam ad ve adres taşır. Karar 0157 müşterinin faturayı takip sayfasında indireceğini söyler. Takip yalnız numara ve e-postayı bilene açılır.
- Saklama süresi dolunca kişisel veri temizliği dosyayı siparişten ayırır ve silinmiş işaretler; numara ve tarih kalır. Kişisel bilgisi silinmiş siparişe yeni dosya bağlanmaz, numara yazılabilir.
- "Faturanız hazır" e-postası faturanın yazımıyla aynı işlemde, değişiklik kaydının kimliğiyle yazılır. Bu yüzden `degisikligiKaydet` artık kaydın kimliğini döner.
- Tarih alanı tarayıcının gün alanıdır, yeni faturada sitenin saat dilimindeki bugünle başlar. Panelde ve vitrinde sitenin uzun tarih biçimiyle yazılır.

## Neden

- Numara siparişte aranabilir, PDF müşteriye belge verir. İkisini zorunlu tutmak, faturasını e-posta ile gönderen mağazayı numarayı da yazmaktan alıkoyardı.
- Belgeyi görselden ayrı tutmak iki riski kapatır: görselin yeniden kodlama güvencesi PDF'te yoktur, PDF'in kimliği de görsel yollarından açılamaz.
- Siparişin kendi satırında tutmak, bir siparişin tek faturası olduğu bugünkü kurala uyar ve ek sorgu istemez.

## Düşünülen diğer yollar

- Ayrı bir fatura tablosu (siparişe birden çok fatura): kısmi faturalama ve iade faturası gerektiğinde açılır; bugün bir siparişin bir faturası var.
- PDF'i görsel türlerine eklemek: dosya kaydetme onu sharp'a verip reddederdi, görsel okuma yolları da PDF'i görürdü.
- PDF'i tarayıcıda göstermek (`inline`): içindeki kod sitenin adresinde çalışabilirdi.
- Takip sayfasında faturayı göstermemek: karar 0157'ye aykırıydı. Üye olmayan müşterinin faturaya başka yoldan ulaşması gerekirdi.

## Sonuçları

- Bir siparişin tek faturası vardır; iade faturası ya da bölünmüş fatura bu yapıya sığmaz.
- PDF'in içeriği denetlenmez (yalnız imza). Zararlı içerik indirme ve sandbox başlığıyla sitenin adresinde çalışmaz, ama müşterinin bilgisayarında açılır. Dosyayı mağaza sahibi yükler.
- Silinmiş işaretli eski dosyalar diskte kalır; kalıcı silme kart 0093'ün işidir.
- Ortak veritabanına değişiklik 0052 uygulanmadan yeni kod sipariş yazamaz (sütunlar ekte yazılır); yayında önce veritabanı değişikliği uygulanır.
