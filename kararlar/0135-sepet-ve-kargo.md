# 0135 · Sepet tarayıcıda, tutarlar sunucuda; kargo mağaza ayarı

## Tarih

2026-11-16

## Karar

- **Sepetin yeri (kullanıcı kararı):** Sepet müşterinin tarayıcısında durur (`localStorage`, `cekirdek/vitrin/sepet/depo.ts`). Sunucuya kaydedilmez, hesaba bağlanmaz. Giriş yapınca birleşme olmaz. Cihazlar arası sepet "kalıcı sepet" eklentisinin işidir. Depoda yalnız satılabilir birimin kimliği, adet ve müşterinin son gördüğü birim fiyatı durur.
- **Tutarlar yalnız sunucuda:** Sepetin satırları, uyarıları, kargosu, vergisi ve toplamı her bakışta `sepetiHesapla` (`cekirdek/moduller/sepet/hesap.ts`) ile yeniden hesaplanır. Fiyat `gosterilecekFiyatlar`, stok `stokDurumlari`, vergi `vergiHesapla`, kargo `kargoHesapla`, görünürlük `vitrinKosulu` ile gelir. Vitrin bunu herkese açık sepet ucuyla (`POST /kapi/herkese-acik/sepet`) ister. Tarayıcıdan gelen tutar kullanılmaz; görülen fiyat yalnız "fiyatı değişti" demek için karşılaştırılır.
- **İstek ne zaman gider:** Yalnız sepeti gösteren parça (sepet sayfası ya da açık pencere) varken, sepet her değişince bir kez gider. Eski cevap yenisini ezmez. Boş sepette istek gitmez. Üst kısımdaki sayı depodan okunur: sayfa açılınca istek gitmez.
- **Uyarılar:** Sunucunun gösterdiği birim fiyatı depoya yazılır, fiyat değişikliği bir kez söylenir. Düzeltilen adet (stok ya da alım sınırı) depoya kendiliğinden yazılmaz: uyarı, müşteri adedi değiştirene kadar görünür. Satılamayan satır ve en az alım adedinin altındaki satır ödemeye geçmeyi durdurur.
- **Adet gösterimi:** Müşteri adedi değiştirince cevap gelene kadar satır tarayıcıdaki adedi gösterir, cevap gelince sunucunun adedini.
- **Kargo:** Kargo, mağaza sahibinin ayarıdır (`magazaAyarSemasi`): `kargoUcreti` (varsayılan 0, yani her zaman ücretsiz; kullanıcı kararı), isteğe bağlı `ucretsizKargoSiniri`, `ucretsizKargoTutari` (indirimden sonra ya da önce) ve var olan `kargoyaVermeSuresi`. Başlangıçta tek teslimat bölgesi vardır. Hesap yalnız `kargoHesapla`'dadır (`cekirdek/moduller/kargo/hesap.ts`). Ücret ve sınır fiyat girişi biçimiyle (vergi dahil ya da hariç) karşılaştırılır. Kargonun vergisi kargo vergi sınıfından gelir (karar 0061).
- **Panelin Kargo ekranı:** Yeni "Satış" grubunun altındadır. Ekran `magaza-ayarlari.gor`, kayıt `magaza-ayarlari.degistir` ister. Tutarlar sitenin para biçimiyle yazılır, sunucuda biçimleyicinin `paraOku`'suyla kuruşa çevrilir. Okunamayan ya da sınır dışı tutar alanın koduyla döner, hiçbir ayar değişmez. Değişen her ayar mağaza ayarları servisiyle değişiklik kaydına girer.
- **Sepete ekleme:** Ürün sayfasında seçili birim ve adet eklenir. Ürün kartında basit ürün bir adet eklenir; seçenekli üründe düğme yerine ürün sayfasına giden "Seçenekleri gör" bağlantısı durur. Kartın düğmesinin adında ürünün adı vardır (listede aynı adlı düğmeler ayırt edilsin). Eklemeden sonra ne olacağı karar 0132'deki "Sepete ekleyince" ayarıdır. Durumla açılan sepet penceresi kapanınca odak, açılırken odakta olan öğeye döner.

## Neden

- Sepetin tarayıcıda durması sunucuda tablo, temizlik işi, birleşme kuralı ve kimliksiz ziyaretçi için çerez gerektirmez. Kullanıcı cihazlar arası sepetin eklenti olmasını seçti.
- Tutarın her bakışta sunucuda hesaplanması fiyat, stok ve vergi değişince sepetin eski tutarla kalmasını önler. Ödeme adımı (kart 0213) da aynı işlevi kullanır (iş kuralları: sepet, ödeme, sipariş ve e-posta aynı hesaptan).
- Kargonun mağaza ayarı olması kargo için ayrı tablo kurmadan ayar şemasını, değişiklik kaydını ve paneli kullanır. Bugün tek bölge vardır.
- Tutarın sunucuda okunması para biçimini tek yerde tutar (filtredeki tutarla aynı kural, karar 0105).

## Düşünülen diğer yollar

- **Sunucuda sepet tablosu, çerezle ziyaretçi kimliği ve girişte birleşme:** Cihazlar arası sepet verir ama tablo, temizlik ve birleşme kuralı ister. Kullanıcı bunu eklentiye bıraktı.
- **Tutarı tarayıcıda hesaplamak:** Hızlıdır ama iş kurallarına aykırıdır, tutar sunucuda yeniden hesaplanır.
- **Sepetin sayfa açılınca hep sorulması:** Her sayfada fazladan istek demektir. Üst kısmın sayısı depodan okunduğu için gerekmez.
- **Kargoyu bölge tablosuyla kurmak:** Birden çok bölge gelince gerekir. Bugün tek bölge vardır, ayar yeterlidir.

## Sonuçları

- Müşteri başka cihazda ya da tarayıcının verisini silince sepetini görmez.
- Sepet sayfası ve pencere her değişiklikte uca istek gönderir. İstek sınırı `genel`dir.
- Birden çok teslimat bölgesi ya da ağırlığa göre kargo gelince ayarlar bir tabloya taşınır. Hesap yine `kargoHesapla`'da kalır.
- Pencere satırları sadedir: adet ve çıkarma yalnız sepet sayfasındadır.
- Üst üste binen bildirimlerin kapat düğmesi basılamıyor. Sepette arka arkaya çıkarılan ürünlerde görülür, düzeltmesi kart 0217'dedir.
