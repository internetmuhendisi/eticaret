# 0311 · Panelin ikinci kısmının taslağı

## Amaç

Onaylanan panel taslağında (karar 0157, `planlar/tasarim-yonu/panel.html`) kupon, toplu düzenleme, Excel ile içe ve dışa aktarma, raporlar, e-posta metinleri ve panelin bildirimleri yok; kart 0257 bunları bilerek bu bölüme bıraktı. Bu bölümün ekran kartları kendi ekran görüntülerini taslakla yan yana koyup farkları düzeltecek; bunun için önce bu ekranların taslağı gerekir. Taslak kod yazılmadan önce kullanıcıya gösterilir ve onaylanır (kart 0134, 0211, 0233, 0257 ile aynı yol).

Bölüm: Yönetim paneli 2. Bu bölümün ilk işi.

## Olmazsa olmazlar

- Canlı Çarşı'nın değerleriyle, var olan taslaklarla aynı dosya düzeninde (`planlar/tasarim-yonu/panel-2.html`) şunlar çizilir:
  - kupon: kupon listesi (durum: etkin, zamanlanmış, süresi dolmuş, kapalı; kullanım sayısı), kupon formu (kod, tür: yüzde, tutar, ücretsiz kargo; değer, başlangıç ve bitiş, toplam ve kişi başı kullanım sınırı, en az sepet tutarı, ürün ve kategori sınırlaması, indirimli ürünlerde geçmeme), kuponun kullanımları;
  - vitrinde kupon: sepette kupon kutusu, kabul ve red hâlleri (nedenleriyle), ödeme özetinde kupon satırı ve kaldırma, sipariş ayrıntısında ve takipte kupon satırı; sipariş e-postasında, sipariş fişinde ve panelin sipariş ayrıntısında kupon satırı; iade penceresinde kuponlu siparişin iade tutarı;
  - toplu düzenleme: ürün listesinde seçilen ürünlere durum, kategori, fiyat ve indirimli fiyat (oranla ya da tutarla, artırma ve azaltma), stok değişikliği; önizleme ve sonuç (işlenemeyenler nedenleriyle);
  - Excel ile ürün içe ve dışa aktarma: dışa aktarma seçenekleri, dosya yükleme, satır satır doğrulama önizlemesi (eklenecek, değişecek, hatalı satırlar), işin ilerlemesi ve sonucu;
  - siparişleri Excel'e aktarma: listenin süzgeçleriyle dışa aktarma;
  - raporlar: satış (dönem karşılaştırması; ciro, sipariş, ortalama sepet, iade, oran oran vergi), ürün (çok satanlar, satış adedi ve tutarı), müşteri (yeni ve dönen müşteri, en çok alışveriş yapanlar), kupon (kullanım, indirim tutarı, kuponlu ciro); tarih aralığı, grafik ve tablo, dışa aktarma, boş dönem hâli;
  - e-posta metinleri (kart 0279): e-posta türleri listesi, düzenleme formu, yer tutucular, telefon ve bilgisayar önizlemesi, varsayılana dön; gönderen adı, yanıt adresi ve alt bilgi;
  - panelin bildirimleri (kart 0280): üst çubukta zil ve okunmamış sayısı, bildirim listesi (okundu, hepsini okundu yap, ilgili ekrana bağlantı), boş hâl;
  - panelin karşılama sayfası (pano, kart 0186): bugünün ve dönemin satış özeti, bekleyen işler, kısa yollar;
  - ürün kopyalama (kart 0320): ürün ekranında ve listenin satır menüsünde "Kopyala", kopyanın açılışı;
  - panelde arama (kart 0321): üst çubukta arama kutusu, türlerine göre gruplu öneriler, sonuçsuz hâl, telefonda açılışı;
  - vergi ayarları (kart 0322): genel vergi ayarları, vergi sınıfları listesi ve formu, oran tablosu.
- Panel ekranları telefon ve bilgisayar genişliğinde, açık ve koyu temada; vitrin sayfaları ve e-postalar da aynı (e-postada koyu tema yalnız istemcinin yaptığı kadar).
- İçerik Örnek Mağaza'nın kataloğundan gelir, uydurma ürün kullanılmaz. Kişi, adres ve e-posta açıkça örnek olduğu belli olan değerlerdir.
- Ürün kararı gerektiren yerler taslakta seçenek olarak gösterilir ve kullanıcıya sorulur; en az şunlar:
  - kupon kutusunun yeri (sepet, ödeme adımı ya da ikisi);
  - kuponun indiriminin sepete dağıtımı (kalemlere tutarlarıyla orantılı) ve sepet satırlarında, özette, e-postada nasıl gösterildiği;
  - kısmi iadede kuponun geri hesabı (iade edilen kalemin payı), iade sonrası en az sepet tutarının altına düşen siparişte ne olacağı, iptal ve tam iadede kullanım hakkının geri verilip verilmediği;
  - ücretsiz kargo kuponunun kargo iadesinde davranışı; ücretsiz kargo sınırının kupon indiriminden önce mi sonra mı hesaplandığı;
  - ürün kopyalamada neyin kopyalandığı (kart 0320);
  - fiyatların vergi dahil ya da hariç girişi değişince kayıtlı fiyatlara ne olacağı (kart 0322);
  - siparişleri Excel'e aktarmanın temel pakette mi (temel paket yalnız satış raporunun CSV indirmesini sayar), Excel eklentisinde mi olduğu;
  - Excel dosyasının sütunları, varyantların satır düzeni, içe aktarmanın eksik sütunu "değiştirme" mi "boşalt" mı saydığı;
  - raporlarda iptal ve iadenin ciroya nasıl girdiği, ödeme beklenen siparişin sayılıp sayılmadığı;
  - panel bildirimlerinin açık-kapalı ayarının e-postayla ortak mı ayrı mı olduğu (kart 0280).
- Siteden siteye değişebilecek davranış kullanıcıya karar olarak sorulmaz; varsayılanıyla site ayarı olarak önerilir ve Örnek Mağaza için hangi değerin önerildiği söylenir (`CLAUDE.md`, Roller). En az: kupon kodunun büyük-küçük harf duyarlılığı, raporun varsayılan dönemi, okunan bildirimin saklama süresi, Excel içe aktarmasında bir dosyadaki satır sınırı.

## Sınırlar

- Ürün kodu yazılmaz. Taslak kaynak değil, karşılaştırma ölçüsüdür (karar 0075).
- Var olan taslaklar değişmez.
- "Kampanya tarihleri" kuponun başlangıç ve bitişidir (kullanıcı kararı, 2026-11-26); otomatik kampanya, sepet tutarına göre indirim, X al Y öde gibi eklentiler çizilmez.
- Hatalı arka plan işlerinin ekranı (kart 0059) bu bölümde değildir (kullanıcı kararı).
- Gerçek yasal metin çizilmez (kart 0063).

## Bitti sayılır

- Listelenen her ekran, hâl ve e-posta taslakta iki genişlikte ve iki temada var.
- Taslak sayfa hatası, yana kayma ve axe taraması (WCAG 2.2 AA) olmadan açılıyor; basılan alanlar gerçek panelle aynı ölçüde.
- Kullanıcı taslağı onayladı, verdiği ürün kararları bir karar kaydına yazıldı, önerilen site ayarları `planlar/site-ayarlari.md` tablosuna girdi.

## Durum

yapılacak
