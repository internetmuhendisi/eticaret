# 0160 · Kategori, marka, etiket ve özellik ekranları

## Tarih

2026-11-21

## Karar

Panelde üç ekran açılır (kart 0261), menüde "Ürünler" altında: Kategoriler, Markalar ve etiketler, Özellikler.

- **Kategoriyi başka bir kategorinin altına almak** (kullanıcı kararı) ağacın içinde sürükleyerek değil, menüler ekranının yoluyla yapılır: aynı düzeydeki kategoriler sıralanabilir listede sürüklenerek ya da klavyeyle sıralanır; başka bir kategorinin altına almak ve en üst düzeye çıkarmak satırın "Diğer işlemler" menüsünden ("Şunun altına taşı", "En üst düzeye çıkar") ya da formdaki "Üst kategori" seçimiyle yapılır. Kendisi ve alt ağacı sunulmaz; servis döngüyü yine denetler. Taslak (kart 0257) ağaç içinde sağ okla alta almayı gösteriyordu; bu yol taslaktan ayrılıktır.
- **Sıralama** her listede tek uçla, kardeşlerin tamamıyla yapılır (`kategori-sirala`, `ozellik-sirala`). Eksik, fazla ya da tekrarlı liste ekranın eski gördüğü sıradır: `cakisma` (`siralama-gecersiz`) ve hiçbir şey değişmez. Sırası değişen her kayıt kendi satırıyla değişiklik kaydına girer (`kategori.degisti`, `ozellik.degisti`, `ozellik-secenegi.degisti`), yeni işlem adı yoktur.
- **Özelliğin formu tek kayıtla yazılır** (`ozellik-kaydet`, `ozellikServisi.kaydet`): alanlar ve seçeneklerin son hâli tek işlemde; listeden çıkan seçenek silinir, adı değişen değişir, yeni eklenir, sıra yazılır. Biri yazılamazsa hiçbiri yazılmaz. Değeri olan özelliğin türü burada da değişmez: denetim seçenekler silinmeden önce yapılır. Değeri olan seçenek çıkarılınca ekran kayıttan önce kaç üründen kalkacağını sorar.
- **Silme onayı** kaç ürünün etkileneceğini söyler; kategoride ayrıca kaç alt kategorinin üste çıkacağını. Sayılar sunucuda tek sorguyla bulunur (`kategorilerinUrunSayilari`, grup servisinin `urunSayilari`, `ozellikServisi.kullanimlar`): doğrudan bağlı, silinmemiş ürünler.
- **Görsel ve logo** vitrin bölümleri ekranındaki "Görsel seç" penceresiyle sitedeki görsellerden seçilir; bilgisayardan yükleme kart 0094 ve 0160'tadır.
- **Görsel önizlemesinin izni** `duzen.gor` değil yeni `dosya.gor`'dur (sitedeki görselleri görmek). Görevli kategori görselini ve marka logosunu değiştirebildiği halde `duzen.gor` iznine sahip değildi, önizleme ona kapalı kalırdı. Görevliye değişiklik dosyasıyla (`0050_dosya-gor-izni`) verilir.
- Marka ve etiket kısa listelerdir, ortak liste ekranına geçmez (taslağın notu): 50 kaydı aşınca listenin üstünde ada göre süzen arama kutusu çıkar (aramanın harf kuralıyla).

## Neden

- Ağaç içinde sürükleyerek alta almak için kütüphanede bir parça yoktur; yazmak büyük bir iştir ve klavyeyle kullanımı riskli olur. Menüler ekranının yolu denenmiş, klavyeyle tam kullanılır ve mağaza sahibi iki ekranda aynı davranışı görür.
- Seçenekleri tek tek ayrı uçlarla yazmak yarıda kalan bir kayıt bırakabilirdi (ad değişti, seçenek silinmedi). Tek kayıt formun "Kaydet"inin anlamıyla aynıdır.
- `dosya.gor`: görselin kendisi gizli bilgi değildir; izni düzenin izninden ayırmak, ürün galerisi ekranında (kart 0266) da aynı önizlemenin görevliye açılmasını sağlar.

## Düşünülen diğer yollar

- Ağaç içinde sürükleyip sağ okla alta alma (taslak): yukarıdaki nedenlerle seçilmedi (kullanıcı kararı).
- Seçeneklerin her işlemde hemen kaydedilmesi (sıralama gibi): formdaki öteki alanlarla karışır, Vazgeç anlamını yitirirdi.
- Önizleme ucunun iznini `urun.gor` yapmak: görselin ürünle ilgisi yoktur (kategori, marka, vitrin bölümü); ileride rolleri düzenlerken (kart 0274) anlamı karışırdı.
- Kategori ve özellik için ayrı okuma uçları: ekranlar verisini sunucuda servisle okur (öteki panel ekranları gibi), okuma ucu kullanan yoktur.

## Sonuçları

- Kategoriyi alta almak iki adımdır (menü, hedef); çok kategorili sitede "Şunun altına taşı" listesi uzar.
- Özellik formunda boş bırakılan seçenek satırı kaydedilmez.
- Görsel yükleme gelene kadar yeni kategori görseli ve marka logosu yalnız sitedeki görsellerden seçilir.
