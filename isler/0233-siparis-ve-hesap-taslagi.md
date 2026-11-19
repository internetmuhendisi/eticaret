# 0233 · Sipariş, müşteri hesabı ve e-posta taslağı

## Amaç

Seçilen yönün taslağında (Canlı Çarşı, karar 0075, 0102; sepet ve ödeme taslağı karar 0140) müşteri hesabı, sipariş takibi, iade talebi, sipariş e-postaları ve panelin sipariş ekranları yok. Bu bölümün ekran kartları kendi ekran görüntülerini taslakla yan yana koyup farkları düzeltecek; bunun için önce bu sayfaların taslağı gerekir. Taslak kod yazılmadan önce kullanıcıya gösterilir ve onaylanır (kart 0134, 0211 ile aynı yol).

Bölüm: Sipariş ve müşteri hesabı. Bu bölümün ilk işi.

## Olmazsa olmazlar

- Canlı Çarşı'nın değerleriyle, var olan taslaklarla aynı dosya düzeninde (`planlar/tasarim-yonu/`) şunlar çizilir:
  - müşteri hesabı: giriş ve kayıt sayfaları (bugünkü sayfalar taslağa göre yeniden çizilir), hesabım çerçevesi ve menüsü, siparişlerim listesi ve boş hâli, sipariş ayrıntısı (durum, geçmiş, kargo firması ve takip numarası, ürünler, vergi dökümüyle tutar, adresler, müşteriye not), adreslerim (liste, ekleme, düzenleme, silme, varsayılan adres), favorilerim (hesabın içinde);
  - üye olmayanın sipariş takibi: sipariş numarası ve e-postayla sorgu formu, hatalı ve bulunamadı hâli, sipariş ayrıntısı;
  - sipariş alındı sayfasında e-posta cümlesi ve takip bağlantısı (bugün taslakta "on üçüncü bölümde" notuyla bekliyor);
  - iade talebi: ürün ve adet seçimi, neden, açıklama, gönderildi hâli; talebin hesapta ve takipte görünüşü (bekliyor, onaylandı, reddedildi); iade kargosunu kimin ödediğinin müşteriye söylenişi;
  - müşterinin kendi iptali (ayar açıksa) ve onay penceresi;
  - e-postalar: sipariş alındı (havale bilgisiyle ve kapıda ödemeyle), kargoya verildi, iptal, tam iade, kısmi iade, müşteriye not, iade talebi alındı ve sonucu; yönetici bildirimleri (yeni sipariş, havale bildirimi, iade talebi, iptal, düşük ve tükenen stok, onay bekleyen yorum). Oran oran vergi dökümüyle, telefon ve bilgisayar genişliğinde; koyu tema e-postada yalnız e-posta istemcisinin yaptığı kadardır;
  - panelin en az sipariş ekranı: sipariş listesi (durum süzgeci), sipariş ayrıntısı, durum değiştirme, havale bildirimini görme ve onaylama, kargo firması ve takip numarası girme, iptal ve iade penceresi (ürün ve adet, kargo dahil ya da hariç, elle tutar, stoğa geri koy), iade talebini onaylama ve reddetme, elle sipariş formu, iç not ve müşteriye not.
- Vitrin sayfaları telefon ve bilgisayar genişliğinde, açık ve koyu temada çizilir; panel ekranları da iki genişlikte ve iki temada.
- İçerik Örnek Mağaza'nın kataloğundan gelir, uydurma ürün kullanılmaz. Kişi, adres ve e-posta açıkça örnek olduğu belli olan değerlerdir.
- Ürün kararı gerektiren yerler taslakta seçenek olarak gösterilir ve kullanıcıya sorulur; en az şunlar:
  - hangi sipariş durumunun "satın aldı" sayılacağı ("yalnız satın alanlar yorum yapabilir", kart 0139, karar 0141);
  - sipariş geçişleri: teslim edildi elle mi işaretlenir, kargoda olan sipariş iptal edilebilir mi, iade edilen siparişten yeni iade açılabilir mi;
  - hesabım sayfasının yerleşimi (yan menü ya da sekmeler) ve hesaba girince ilk açılan sayfa;
  - üye olmayanın takip sonucu ne kadar bilgi gösterir (adresin tamamı mı, kısaltılmışı mı);
  - sipariş ve ödeme oturumunun kişisel verisinin saklama süresi (karar 0141'in açık bıraktığı soru).
- Siteden siteye değişebilecek davranış kullanıcıya karar olarak sorulmaz; varsayılanıyla site ayarı olarak önerilir ve Örnek Mağaza için hangi değerin önerildiği söylenir (`CLAUDE.md`, Roller). En az: müşterinin kendi iptali (hangi durumda), iade talebi süresi (gün), yönetici bildirimlerinin alıcı adresleri ve hangilerinin açık olduğu, kargo firmalarının listesi ve takip adresi kalıbı.

## Sınırlar

- Ürün kodu yazılmaz. Taslak kaynak değil, karşılaştırma ölçüsüdür (karar 0075).
- Var olan taslaklar değişmez.
- Panelin tam sipariş ekranları (gelişmiş süzgeç, toplu işlem, sipariş fişi yazdırma, faturayı siparişe ekleme, ödeme öncesi adres ve ürün düzeltme, e-posta metinlerinin düzenlendiği ekran) on dördüncü bölümdedir; bu taslak yalnız bu bölümde yazılacak en az ekranları çizer.
- Gerçek yasal metin (iade koşulları dahil) çizilmez (kart 0063).

## Bitti sayılır

- Listelenen her sayfa, hâl ve e-posta taslakta iki genişlikte (vitrin ve panel iki temada) var.
- Kullanıcı taslağı onayladı, verdiği ürün kararları bir karar kaydına yazıldı, önerilen site ayarları `planlar/site-ayarlari.md` tablosuna girdi.

## Durum

bitti
