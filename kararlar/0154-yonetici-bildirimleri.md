# 0154 · Yönetici bildirimleri

## Tarih

2026-11-20

## Karar

Mağaza sahibi e-postayla haberdar olur (kart 0241): yeni sipariş, havale bildirimi, iade talebi, iptal (müşterinin kendi iptali ya da süresi dolan havale), düşük ve tükenen stok, onay bekleyen yorum, kartla ödeme günlük karşılaştırmasının uyuşmazlığı ve kuruluşta takılan iade (raporda bulunamayan ya da bir kısmı reddedilen).

- Bildirimler kayıttadır (`cekirdek/kayitlar/yonetici-bildirimi.ts`): her birinin e-posta şablonu ve bağlı olduğu eklenti. Siparişin olaylarının hangi bildirimi doğurduğu `siparisGecmisiYoneticiBildirimleri`'dedir; geçmiş satırıyla aynı işlemde kuyruğa girer, anahtarı satırın kimliğidir. Yorum yorumla, stok düşürmeyle, kartla ödemenin bildirimleri kendi taramasında aynı yolla (`yoneticiBildirimiYaz`) kuyruğa girer.
- Panelden girilen sipariş ve mağazanın kendi iptali bildirilmez: işi mağaza kendisi yaptı (taslak).
- Bildirim kuyruğa alıcısız girer. İş çalışırken o anki ayara bakar: bildirim kapalıysa e-posta yazılmaz; açıksa alıcılar ayardaki adreslerdir (en çok 5), ayar boşsa tam yetkili rolün (mağaza sahibi) silinmemiş yöneticileri. Her alıcıya olayın anahtarıyla bir e-posta yazılır: iş yeniden çalışsa da ikinci e-posta gitmez.
- İki ayar mağaza sahibinindir: `yoneticiBildirimAlicilari` (değeri değişiklik kaydına yazılmaz) ve `kapaliYoneticiBildirimleri` (varsayılan boş: hepsi açık). Panelde Sipariş ayarlarının "Yönetici bildirimleri" bölümünden kaydedilir. Kartla ödemeye bağlı iki bildirim yalnız eklenti açıkken görünür ve gider; ekranda görünmeyen bildirimin kayıtlı hâli korunur.
- Stok uyarısı: sipariş bir birimin stoğunu düşük stok eşiğine (ürünün eşiği önce, yoksa sitenin) ya da sıfıra yukarıdan indirince bir kez, düşürmeyle aynı işlemde yazılır; satır kilitli olduğu için aynı anda iki düşürmede de bir kez. Mağazanın elle düzeltmesi uyarmaz. Uyarılar toplanır, son gönderimden bir saat geçmediyse iş o ana ertelenir: saatte en çok bir stok e-postası (kullanıcı kararı).
- Yönetici e-postası kısadır ve kişisel veriyi gerekenden fazla taşımaz: müşterinin adı ve soyadının baş harfi, adresinden ülke, il ve ilçe; e-posta, telefon ve açık adres yoktur. Kuyruğa giden veri de aynı ölçüdedir. E-posta koyu üst şeritte "Yönetici bildirimi" etiketiyle ayrılır, ilgili panel sayfasına düğme taşır.

## Neden

- Kayıt, bir olayın bildiriminin unutulmasını ya da iki yerde yazılmasını önler; müşteri e-postalarıyla (karar 0153) aynı düzen.
- Alıcıyı ve açıklığı iş anında okumak alıcı adreslerini kuyruktan uzak tutar ve ayarın tek okunduğu yeri gönderim yapar.
- Günde tek özet, sabah tükenen ürünü akşam söylerdi; her geçişe ayrı e-posta yoğun satışta e-posta yağdırırdı. Saatte en çok bir e-posta ikisinin ortasıdır.
- Mağaza sahibi müşterinin iletişim bilgilerini panelde görür; e-posta kutusu daha az korunan bir yerdir.

## Düşünülen diğer yollar

- **Taslaktaki gibi günlük özet:** Daha az e-posta, ama tükenen ürün geç bildirilirdi. Kullanıcı saatlik toplamayı seçti.
- **Her stok geçişine anında ayrı e-posta:** Gecikme olmazdı, yoğun satışta onlarca e-posta giderdi. Seçilmedi.
- **Alıcıları olay anında kuyruğa yazmak:** İş daha basit olurdu, ama alıcı adresleri kuyruk tablosuna girerdi ve olaydan sonra kapatılan bildirim yine giderdi. Seçilmedi.
- **Elle stok düzeltmesinin de uyarması:** Mağaza sahibi kendi yaptığı düzeltmeyi bilir. Seçilmedi.

## Sonuçları

- `stok_uyarilari` tablosu eklendi (değişiklik 0049). İşlenmiş satır 30 gün sonra silinir.
- Ertelenen stok işi bir dakikalık payla kurulur: işin zamanı uygulamanın, kalan süre veritabanının saatiyle hesaplanır. Bir dakikadan büyük saat farkında iş aynı anahtarla yeniden kurulamaz, uyarılar bir sonraki stok olayına kalır.
- Her alıcının e-postasının anahtarı olayın anahtarı ile adresin özetidir: uzun adres anahtarın sınırını aşmaz.
- Kuruluşun iadeyi hemen kısmen reddettiği durumda (müşterinin kendi iptali gibi yanında yönetici olmayan iade) bildirim iade gönderilirken de yazılır; tarama yalnız belirsiz parçaları görür.
- Eklenti kapalıyken kartla ödemenin karşılaştırması ve iade taraması çalışmaya devam eder (para hareketi), ama iki bildirimi gitmez: eklentiye bağlı bildirim yalnız eklenti açıkken gider.
- Stok gönderim işleri danışma kilidiyle sırayla çalışır: aynı uyarı iki e-postaya girmez. İki işin gerçekten aynı anda çalışması testte ayrıca kurulmadı, yalnız kilitle korunur.
- Panelde stok ve yorum ekranı henüz yok: bu iki e-postada panel düğmesi yoktur, stok durumu renkli rozet yerine yazıyla gösterilir (taslaktan ayrılır).
- Panelin içindeki bildirimler (zil, liste) on dördüncü bölümde; hatalı arka plan işlerinin bildirimi kart 0059'da. Gerçek gönderim kart 0060'tadır: sunucuda bugün yönetici e-postası da gitmez.
