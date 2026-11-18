# 0216 · Örnek Mağaza havaleyle sipariş alıyor

## Amaç

Bölümün sonunda Örnek Mağaza yeni çekirdek sürümüne geçer ve deneme adresinde havaleyle sipariş alabilir. "Canlı" bugünkü deneme adresidir (karar 0101); gerçek alan adına geçilmez.

Bölüm: Sepet ve ödeme. Bölümün son işi. Önce bu bölümün öteki kartları (0211–0215, 0155, 0193, 0091, 0065) ve 0207 bitmiş olmalı (kullanıcı kararı: 0207 yayından önce yapılır).

## Olmazsa olmazlar

- Yayından önce kullanıcıya sorulur:
  - Örnek Mağaza'nın kargo ücreti ve ücretsiz kargo sınırı (`planlar/site-ayarlari.md`: "sonra panelden girilir");
  - banka hesabı: demo olduğu açıkça belli olan bir değer, gerçek IBAN kullanılmaz;
  - kapıda ödeme ve kartla ödeme eklentisinin demoda açık olup olmayacağı (kart eklentisi yalnız test ortamıyla);
  - demoda verilen siparişlerin stoğu düşürmesi: ziyaretçiler stoğu tüketebilir; ödenmeyen havalenin iptal süresi, sıfırlama (karar 0100) ya da başka bir yol.
- Örnek Mağaza demo sitedir: gerçek ödeme almaz, arama motorlarına kapalı kalır (karar 0007).
- Kimlik yeni çekirdek sürümüne çıkar, sürüm notu yazılır, sitenin testleri çalışır. Notun "Güvenlik" bölümünde Next.js'in 16.4.6'ya yükseltilmesi (GHSA-mfr8-8qww-v76h, karar 0137, kart 0219) yazar.
- Veritabanı değişiklikleri yayın komutuyla uygulanır. Yeni başlangıç verisi (ödeme yöntemleri, banka hesabı, kargo) kurulu veritabanına girmiyorsa ne yapılacağı kullanıcıya sorulur.
- Yayından sonra sağlık kontrolü, sunucu denetimi ve deneme adresinde tarayıcıyla gezinti: sepet, ödeme adımı, havaleyle sipariş, sipariş alındı sayfası ve havale bildirimi telefon ve bilgisayarda.
- Sunucuda gerçek e-posta gönderimi yok (kart 0060); sipariş e-postaları on üçüncü bölümdedir.

## Sınırlar

- Gerçek alan adına geçilmez, gerçek mağazalara dokunulmaz.
- Sipariş yönetimi ekranları on üçüncü bölümdedir; demoda verilen siparişler panelde henüz listelenmez.

## Bitti sayılır

- Deneme adresinde müşteri havaleyle sipariş verebiliyor, sipariş alındı sayfasında banka hesabı ve sipariş numarası görünüyor.
- Sağlık ve sunucu denetimi yeşil.
- Geri dönüş komutunun bu sürümde çalıştığı biliniyor (yayın denemesi).

## Yayın (2026-11-18)

Kullanıcı kararları:
- **Kargo:** 49,90 TL, 750 TL ve üstü ücretsiz. Değer başlangıç dosyasına yazılmadı. Tarayıcı testleri bu sitenin klasörüyle çalışır ve sipariş toplamlarını kargosuz bekler (`odeme.test.ts`, `kartla-odeme.test.ts`, `sepet.test.ts`). Kullanıcı yayından sonra sunucudaki sitede panelden girdi (Satış > Kargo); geçici yönetici `magaza-sahibi@ornek.test`.
- **Yöntemler:** Havale ve kapıda ödeme (nakit ve kart). Kartla ödeme eklentisi `ayarlar.json`'da kalır. Sunucuya ödeme kuruluşunun anahtarları kurulmadığı için "Kartla öde" görünmez; kurulması ayrı bir iştir.
- **Banka hesapları:** Başlangıçtaki iki deneme hesabı ("Deneme Bankası", "Örnek Katılım Bankası", gerçek olmayan IBAN'lar), değişmedi.
- **Stok:** Ödenmeyen havale 1 günde iptal olur (`havaleIptalSuresi: 1`, başlangıç dosyasında). Gerekirse elle sıfırlama yine yapılabilir (karar 0100).

Yapılanlar:
- **Sürüm.** Çekirdek ve kimlik 0.78.0 oldu. Notun "Güvenlik" bölümünde Next.js 16.4.6 var (GHSA-mfr8-8qww-v76h, karar 0137). Yeni veritabanı değişikliği yok; 0.77.0'ın beş değişikliği bu yayınla geldi.
- **Hazırlık.** Örnek Mağaza'nın testleri, sürüm notu testi, site doğrulaması, tür kontrolü, denetim ve bütün birim takımı (3443/3443) geçti. Hat 44295648904 bütünüyle yeşil (kayıt f2418b7).
- **Yayın.** 0.76.0'dan 0.78.0'a, yayın 14. Yayından önceki hızlı sunucu denetimi yeşil, sağlık ucu 0.78.0 ve ayakta veritabanını söylüyor.
- **Sunucu denetimi.** Tam denetim yeşil, 78 madde.
- **Yeni ayarların kurulu veritabanına girmesi.** Sıfırlama gerekmedi (kart 0069'un kuralı). Ödeme adımında havalenin altında "1 gün içinde ödenmeyen sipariş iptal olur" yazıyor. Yöntemler Havale, Kapıda ödeme · nakit ve Kapıda ödeme · kartla; sipariş alındı sayfasında iki deneme hesabı var. Kargo, kullanıcı panelden girdikten sonra sepette 49,90 TL ve ödeme özetinde görünüyor. Değişiklik kaydı veritabanında ayrıca okunmadı.
- **Gezinti** (deneme adresinde, gerçek ekranlardan geçerek; betik kayda girmedi):

  | | Bilgisayar (1280 px) | Telefon (390 px) |
  |---|---|---|
  | Sepet | Porselen Kupa (en az 2 adet): 379,80 + 49,90 kargo = 429,70 TL | Spor çorap seti: 149,90 + 49,90 = 199,80 TL |
  | Ödeme | sade çerçeve, `noindex, nofollow` | aynı |
  | Sipariş | havaleyle ORN-1001 | havaleyle ORN-1002 |
  | Sipariş alındı | numara, iki hesap ve IBAN'ları, gönderilecek tutar; son ödeme ertesi gün (19.11.2026 16:04) | aynı (16:05) |
  | Havale bildirimi | numarayla açıldı, gönderildi; "Bildiriminiz alındı" odakta | aynı |

  - Ücretsiz kargo sınırı ayrıca ölçüldü (sipariş verilmeden): telefonda 6 ürünlük 899,40 TL'lik sepette kargo "Ücretsiz".
  - Her sayfada yana kayma, konsol hatası ve 400+ istek yok. Girişsiz ziyaretçinin hesap sorusunun 401'i sayılmadı (kart 0187).
  - Betiğin ilk hâlinde adres, posta kodu ve tutar alanları, açılır listeden seçimin hemen ardından yazıldığı için boş kaldı. Değer yazıldıktan sonra okunarak düzeldi. Klavyeyle seçim testte zaten ölçülüyor.
- **Yayın denemesi.** 17 ölçümün 17'si yeşil. Bozuk sürümde site eski yayınıyla açık kalıyor. Geri dönüş siteyi ve arka plan sürecini önceki yayına döndürüyor. Yayın kaydı sırasıyla. Denemeden sonra Örnek Mağaza'nın sağlık ucu yine 0.78.0 ve ayakta.

Notlar:
- Gezintinin iki siparişi bildirimli olduğu için kendiliğinden iptal olmaz (kullanıcı kararı, kart 0214): stokta Porselen Kupa'dan 2, spor çorap setinden 1 adet düşük kalır. Sipariş yönetimi ekranları gelince ya da sıfırlamayla düzelir.
- Geçici yönetici `magaza-sahibi@ornek.test` açık kalır. Şifresi `!` ile çalıştırılan komutun çıktısında konuşmaya da düştü; kullanıcı isterse kendi terminalinde yeni hesap açıp bunu kapatabilir.

## Durum

bitti
