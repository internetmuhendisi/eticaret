# 0173 · Panelin müşteri listesi ve ayrıntısı

## Tarih

2026-11-24

## Karar

Panelde Satış altında "Müşteriler" listesi ve "Müşteri ayrıntısı" açıldı (kart 0271; taslak ve ürün kararları karar 0157).

Kullanıcı kararları (kart 0271'in planında):

- **Müşterinin adı:** Hesapta ad tutulmaz. Ekranda son siparişin teslimat adı görünür; sipariş yoksa varsayılan teslimat adresinin adı, ikisi de yoksa yalnız e-posta. Kişisel bilgisi silinmiş sipariş adın kaynağı olmaz.
- **Son giriş zamanı** tutulmaz, gösterilmez. Ayrıntının başında "Üye · <tarih> tarihinden beri" yazar.
- **Görevli müşterileri görmez.** Yeni izinler:
  - `musteri.gor`: liste ve ayrıntı;
  - `musteri.not`: not eklemek ve silmek;
  - `musteri.sifre-sifirlama`: bağlantı göndermek.

  Yalnız tam yetkili rol (mağaza sahibi) bu izinlere sahiptir. İleride gelecek "Sipariş görevlisi" rolü müşterileri görür (kart 0274).
- **Notlar:** Not eklenir ve onay penceresiyle kalıcı silinir, düzenlenmez. Notu yalnız panel görür, müşteriye hiçbir uçta ve sayfada gitmez.
- Hesabı kapatmak panelde yoktur (karar 0157).

Teknik kararlar:

- **Listede yalnız üyeler var** (karar 0157); silinmiş hesap listede ve ayrıntıda yoktur. Üye olmadan verilen sipariş hiçbir müşteriye sayılmaz (karar 0150).
- **Sipariş sayısı ve toplam:**
  - İptal edilmemiş siparişler sayılır, yalnız sitenin para birimindekiler toplanır.
  - Toplamdan tamamlanan iadeler düşülür; başarısız ve bekleyen iade düşülmez.
  - Ortalama, toplamın sipariş sayısına bölümüdür.
- **Kampanya izni:** müşterinin en yeni pazarlama onayı satırıdır (karar 0051).
- **Listenin sorgusu:** Sayılar, ad ve kampanya izni müşteri başına alt sorgularla tek sorguda gelir (`musteriYonetimi`, `cekirdek/moduller/musteri/yonetim.ts`). Listede satır başına sorgu yoktur. Sayım aynı sorguyu alt sorgu olarak sayar: süzgeçler tek yerde kalır.
- **Arama:** e-postada ve adda, aramanın harf kuralıyla (`aramaAnahtari`, `strpos`). Aranan metin adrese yazılmaz (karar 0145).
- **Süzgeçler:**
  - kayıt tarihi: liste motorunun tarih süzgeci, sitenin saat dilimiyle;
  - kampanya izni: var/yok;
  - sipariş: vermiş/vermemiş.

  İki seçenek birlikte seçilince süzmez.
- **Notlar:** `musteri_notlari` tablosunda durur (değişiklik 0054). Müşterinin satırı silinince veritabanı bağıyla silinir. Yazanı siparişin notlarıyla aynı biçimde saklanır, ekranda panelin ortak yazılışıyla görünür (`yazanYazisi`). Değişiklik kaydına yalnız notun ve müşterinin kimliği girer (`musteri-notu.eklendi`, `musteri-notu.silindi`); metin girmez.
- **Şifre sıfırlama bağlantısı:**
  - Şifremi unuttum akışının işleviyle (`sifreSifirlamaIste`) ve onun sınırıyla gider. Bağlantı müşterinin kendi e-postasına gider, mağaza şifreyi görmez.
  - İşlev artık sonucunu döndürür: gönderildi, sınır doldu, hesap yok ya da sitenin adresi yok. Panel sonucu söyler, herkese açık uç yine aynı cevabı verir.
  - Değişiklik kaydı bağlantıyla aynı işlemde, e-postasız yazılır (`musteri.sifre-sifirlama-gonderildi`).
  - Müşteriye e-posta gittiği için panel önce sorar.
- **Şemaların yeri:** Panelin müşteri şemaları ayrı dosyadadır (`panel-semalari.ts`). Vitrinin kayıt formunun şemaları (`semalar.ts`) tarayıcıya gider; panelinkiler vitrine gitmesin (karar 0172).
- **Sipariş ayrıntısında bağlantı:** Üye müşterinin adı müşteri ayrıntısına bağlantıdır, yalnız `musteri.gor` izni olana.
- **İkonlar:**
  - Menünün ve boş hâlin ikonu ortak sözlükteki "hesap"tır; vitrin de müşteri hesabı için onu kullanır.
  - Şifre sıfırlama düğmesinin anahtar ikonu ("sifre") panel sözlüğündedir (karar 0172).
- **Ortak parçalar:**
  - Ayrıntı ekranlarının bölüm, satır ve bilgi parçaları sipariş ayrıntısından ortak dosyaya taşındı (`cekirdek/yonetim-paneli/ayrinti-parcalari.tsx`).
  - Tarih süzgecinin adreste yazılı günleri tek işlevle bulunur (`tarihSuzgecininAyrikGunleri`).

## Neden

- Hesapta ad olmadığı için en güncel ve doğrulanmış ad müşterinin son siparişindeki addır. Kayıt formuna ad eklemek vitrinin akışını değiştirirdi.
- Müşteri listesi kişisel veridir: görevlinin işi siparişler ve ürünlerdir. Sipariş ayrıntısında görevli zaten siparişin müşterisini görür.
- Not düzenlenmez: yazılanın sonradan değişmesi kimin ne yazdığını belirsizleştirir. Yanlış not silinip yeniden yazılır.
- Panelden giden bağlantının vitrinle aynı sınırı olması, mağaza tarafından müşteriye çok e-posta gönderilmesini de önler.

## Düşünülen diğer yollar

- **Kayıt formuna ad ve soyad eklemek:** Vitrinin kayıt akışını değiştirir, ayrı iştir.
- **Notu düzenlenebilir yapmak:** Geçmişin değişmezliğini bozar.
- **Görevliye listeyi açmak:** Kişisel veriyi gereğinden geniş açar.
- **Şifre sıfırlamayı sessiz bırakmak:** Sınır dolduğunda mağaza sahibi bağlantının gittiğini sanırdı.
- **Listeyi her müşteri için ayrı sorgularla kurmak:** Sayfa başına 25 ile 100 ek sorgu olurdu.

## Sonuçları

- Toplam kişisel bilgisi silinmiş siparişleri de sayar: tutar siparişte kalır, yalnız ad ve adres silinir.
- Ayrıntı en yeni 20 siparişi gösterir; daha eskileri Siparişler'de e-postayla aranır.
- Silinen hesabın notları bugün silinmez, çünkü hesap yalnız işaretlenir. Kalıcı silme gelince notlar veritabanı bağıyla birlikte gider (karar 0051'deki onaylar konusu ayrıca çözülür).
- Panelden gönderilen bağlantı, müşterinin kendi isteğiyle aynı sınırı paylaşır: biri sınırı doldurursa öteki bekler.
