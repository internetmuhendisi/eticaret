# 0211 · Sepet ve ödeme sayfalarının taslağı

## Amaç

Seçilen yönün taslağında (Canlı Çarşı, karar 0075, 0102) sepet, ödeme ve sipariş sayfası yok. Bu bölümün ekran kartları kendi ekran görüntülerini taslakla yan yana koyup farkları düzeltecek. Bunun için önce bu sayfaların taslağı gerekir. Taslak kod yazılmadan önce kullanıcıya gösterilir ve onaylanır (kart 0134 ile aynı yol).

Bölüm: Sepet ve ödeme. Bu bölümün ilk işi.

## Olmazsa olmazlar

- Canlı Çarşı'nın değerleriyle, var olan taslaklarla aynı dosya düzeninde (`planlar/tasarim-yonu/`) şunlar çizilir:
  - sepete ekleme: ürün sayfasında ve ürün kartında düğme, eklenince müşteriye ne olduğu, üst kısımdaki sepet sayısı;
  - sepet sayfası: satırlar (görsel, ad, seçim, birim fiyat, adet, satır tutarı, kaldır), ara toplam, kargo ücreti ya da "ücretsiz", vergi dökümü, genel toplam, "Ödemeye geç"; boş sepet; fiyatı değişen, stoğu azalan ve tükenen satırın uyarısı; en az ve en çok alım adedi uyarısı;
  - ödeme adımı: giriş yap ya da üye olmadan devam et, isteğe bağlı hesap açma; teslimat bilgisi (il ve ilçe listeden, telefon); fatura bilgisi (bireysel ya da kurumsal, "fatura adresi aynı" işaretli); sipariş notu; ödeme yöntemi seçimi (havale, kapıda nakit ya da kart, kartla ödeme eklentisinin yeri ve taksit seçimi); vergi dökümüyle sipariş özeti; ön bilgilendirme ve mesafeli satış onay kutuları; işaretsiz pazarlama izni kutusu; alan hataları;
  - sipariş alındı sayfası: sipariş numarası, özet, havalede banka hesapları ve açıklamaya yazılacak sipariş numarası, kapıda ödemede not;
  - havale bildirim formu ve teşekkür hâli;
  - kartla ödemenin başarısız dönüş hâli;
  - panelde ödeme yöntemleri (açma, kapama, sıra), banka hesapları ve kargo ücreti ekranları.
- Her sayfa telefon ve bilgisayar genişliğinde, açık ve koyu temada çizilir.
- İçerik Örnek Mağaza'nın kataloğundan gelir, uydurma ürün kullanılmaz. Banka hesabı açıkça örnek olduğu belli olan bir değerdir.
- Ürün kararı gerektiren yerler taslakta seçenek olarak gösterilir ve kullanıcıya sorulur; en az şunlar:
  - sepete ekleyince ne olur (yan pencerede sepet, kısa bildirim ya da sepet sayfasına gitmek);
  - ödeme adımı tek sayfa mı, adım adım mı;
  - üye olmadan alışverişte e-postanın nerede istendiği;
  - kartla ödemede taksit seçeneklerinin ürün sayfasında da gösterilip gösterilmeyeceği.
- Siteden siteye değişebilecek davranış kullanıcıya karar olarak sorulmaz. Varsayılanıyla site ayarı olarak önerilir, Örnek Mağaza için hangi değerin önerildiği söylenir (`CLAUDE.md`, Roller).

## Sınırlar

- Ürün kodu yazılmaz. Taslak kaynak değil, karşılaştırma ölçüsüdür (karar 0075).
- Var olan taslaklar değişmez.
- Eklentilerin ekranı çizilmez: ücretsiz kargo hedefi çubuğu (`ucretsiz-kargo-hedefi`), kalıcı sepet, sepeti paylaşma.
- Kupon alanı çizilmez: kampanya bu bölümde değil. Sepet ve özetin yerleşimi kupon satırına yer bırakır.
- Siparişlerim, sipariş takibi ve sipariş e-postaları on üçüncü bölümdedir.

## Bitti sayılır

- Listelenen her sayfa ve hâl taslakta iki genişlikte ve iki temada var.
- Kullanıcı taslağı onayladı, verdiği ürün kararları bir karar kaydına yazıldı.

## Durum

bitti
