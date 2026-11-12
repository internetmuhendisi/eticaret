# 0110 · Favoriler

## Tarih

2026-11-12

## Karar

Kart 0140'ın favorileri yazıldı. Favori işlevi açıldı (`yazilanIslevler.favori`): ürün kartında, ürün sayfasında ve üst kısımda favori düğmesi ve sayısı görünür.

Kullanıcı kararları:

- **Favoriler sayfasında çıkarma:** Ürün listeden hemen kalkar. Bildirimdeki "Geri al" onu eski yerine koyar.
- **Gizli ürün:** Favorilerde görünür. Müşteri ürünü kendisi eklemiştir, sayfası da açıktır. Taslak, arşiv ve silinmiş ürün görünmez.
- **Çıkış:** Çıkıştan sonra bu cihazda favoriler boş görünür. Hesaptakiler hesapta kalır.

Planla birlikte onaylanan site ayarı:

- **`favoriSiniri`:** Altyapı sahibinin ayarı, varsayılanı 100, Örnek Mağaza'da da 100. Hem hesaptaki hem tarayıcıdaki liste için geçerlidir. En büyük değeri 100'dür (çerez sınırı, aşağıda).

Teknik kararlar:

- **Saklama:**
  - Girişli müşterinin favorileri `favoriler` tablosundadır (müşteri, ürün, eklenme zamanı). Tablonun anahtarı (müşteri, ürün) olduğu için aynı ürün iki kez olamaz.
  - Favori ürün düzeyindedir, birleşim saklanmaz.
  - Değişiklik kaydına girmez: favori müşterinin kendi tercihidir, mağazanın verisini değiştirmez.
- **Üye olmayan müşteri:**
  - Liste tarayıcının deposundadır (`localStorage`), yalnız ürün kimlikleriyle. Sunucuya gitmez.
  - Giriş ya da kayıttan sonra ilk sayfada hesaba birleşir (`POST /kapi/musteri/favori-birlestir`), sonra depodan silinir.
  - Birleşmede hesapta olan ürün eklenmez. Sayfası açılmayan ürün atlanır. Tarayıcıdaki sıra korunur ve hepsi hesaptakilerden yeni sayılır.
  - Sınıra sığmayanlar tarayıcıdaki en eski ürünlerdir; eklenmez ve müşteriye bir kez söylenir.
- **Sayfa başına tek istek:**
  - Favori durumu tarayıcıda tek yerdedir (`cekirdek/vitrin/favori-durumu.ts`). Düğmeler, sayı ve favoriler sayfası onu paylaşır.
  - Girişli müşteride favori isteği hesap durumunun cevabından sonra gider. Değişiklik istekleri de sırayla gider. Böylece aynı sayfada iki müşteri isteği aynı yenileme anahtarını aynı anda kullanmaz (karar 0098).
  - Girişsiz müşteride hesap sorusundan başka istek gitmez.
- **Görünürlük:**
  - Listede yalnız sayfası açılan ürün görünür (`vitrinKosulu`, sayfa yeri).
  - Görünmeyen ürünün satırı silinmez; ürün yeniden açılınca favoride döner.
  - Sınır yalnız listede görünen favorileri sayar. Müşterinin göremediği ve çıkaramadığı satır (taslak, arşiv, silinmiş ürün) yer kaplamaz (bağımsız kontrolün bulgusu).
  - Sınır, müşterinin satırı kilitlenerek denetlenir.
  - Üye olmayan müşterinin listesinden, favoriler sayfasının görünmez bulduğu ürünler atılır.
- **Favoriler sayfası:**
  - Sayfa çizilirken müşterinin oturumu okunmaz (karar 0039). Ürün kartı yalnız sunucuda çizilebilir (metin ve biçimleyici sunucudadır, karar 0085).
  - Bu yüzden tarayıcı geçerli listeyi yalnız `/favoriler` yoluna giden bir çerezle (`favoriler`, tarayıcı kapanınca silinir, yalnız ürün kimlikleri) sunucuya taşır. Sayfa kartları `urunKartlari` ile çizer.
  - Hangi kartın hangi sırayla görüneceğine tarayıcıdaki durum karar verir. Çerezde olmayan ürün varsa sayfa bir kez yenilenir.
  - İlk açılışta çerez durumda olmayan ürünleri taşıyorsa da sayfa bir kez yenilenir. Böylece çıkış yapmadan oturumu biten müşterinin listesi sayfanın verisinde kalmaz. Favoriler okunamazsa çerez silinir (bağımsız kontrolün bulgusu).
  - Çıkarılan kartın yerine odak bir sonraki kartın favori düğmesine geçer. Liste boşalırsa boş hâlin bağlantısına geçer (bağımsız kontrolün bulgusu).
  - Sayfa arama motorlarına kapalıdır.
- **Düğme:**
  - Basılı durumunu `aria-pressed` ile söyler. Adı taslaktaki gibi "Favorilere ekle: <ürün>" ya da "Favorilerden çıkar: <ürün>"dür.
  - Basılıyken kalp dolu ve indirim rengindedir (taslak).
  - Sonuç vitrinin bildirim alanıyla verilir. Bildirim alanı vitrin çerçevesine eklendi.
  - Kütüphanenin `bildirimGoster`'ı isteğe bağlı bir eylem düğmesi aldı ("Geri al"). Eylemli bildirim 10 saniye açık kalır. Klavyeyle bildirim alanına Alt+T ile geçilir; bildirim kapanınca odak kullanıcının kaldığı yere döner (tarayıcıda ölçüldü).
- **Sekmeler:** Üye olmayan müşterinin listesi başka sekmede değişince hesap durumu yeniden sorulur. Böylece başka sekmede giriş yapılıp liste hesaba geçtiyse bu sekme de hesabın listesine geçer (bağımsız kontrolün bulgusu).
- **Hata:**
  - Hesap durumu bilinmiyorsa (sunucu ya da ağ hatası) favoriler de bilinmiyor sayılır. Düğme hata söyler, tarayıcı deposuna yazmaz. Böylece girişli müşterinin favorisi yanlışlıkla cihazda kalmaz.
  - Değişiklik olmazsa yalnız o ürün eski hâline döner.

## Neden

- Ürün kartını tek bileşen tutmak (karar 0085) ve oturumu sayfa çizerken okumamak (karar 0039) birlikte, kişiye özel listenin kartlarını sunucuda çizmenin tek yolunu çerezden geçirir. Çerezin yolu kısıtlı olduğu için liste başka hiçbir sayfaya gitmez.
- Hesap isteğinden sonra favori isteği göndermek, yenilenen oturum anahtarının iki istekte birden kullanılmasını önler. Karar 0098 aynı sorunu hesap için çözmüştü.
- Değişiklik kaydı yetki, fiyat, stok gibi mağazanın verisi içindir. Müşterinin her tıklaması kaydı şişirir ve kişisel tercihi kayıtta tutar.

## Düşünülen diğer yollar

- **Hesap ucunun cevabına favorileri eklemek (sayfada tek istek):** Seçilmedi. Hesap modülü favorilere bağlanırdı ve uç tek izin taşır. İki istek sırayla gider, yarış yoktur.
- **Kartları tarayıcıda, JSON uçtan çizmek:** Seçilmedi. Kartın ikinci bir tarayıcı sürümü gerekirdi, fiyat ve metin biçimi iki yerde yazılırdı.
- **Listeyi adreste taşımak (`/favoriler?u=...`):** Seçilmedi. Adres uzar, paylaşılan bağlantı başkasının listesini gösterirdi.
- **Sunucu eylemi:** Seçilmedi. Kapının zarfı, sınırı ve izni dışında ikinci bir yol açardı (karar 0046).
- **Favoriyi birleşim düzeyinde saklamak:** Seçilmedi. Taslakta da ürün düzeyindedir, sınır ve sayı basit kalır.
- **Hata olunca tarayıcıya yazmak:** Seçilmedi. Girişli müşterinin favorisi cihazda kalır, sonraki girişte başkasının hesabına birleşebilirdi.

## Sonuçları

- Girişli müşteride her vitrin sayfası iki istek gönderir: önce hesap, sonra favoriler.
- Üye olmayan müşterinin üst kısımdaki sayısı tarayıcıdaki listedir. Arşive alınan ya da silinen ürün, müşteri favoriler sayfasını açana kadar sayıda kalır; sayfa açılınca listeden atılır. Girişli müşteride sayı yalnız görünen ürünleri sayar.
- Görünmeyen ürün sınıra sayılmadığı için, ürün yeniden açılınca girişli müşterinin listesi sınırı biraz aşabilir. Üye olmayan müşterinin listesinden görünmeyen ürün atıldığı için, ürün yeniden açılınca onun favorisine dönmez.
- "Geri al"a klavyeyle ulaşmak bildirim kitaplığının kısayoluna (Alt+T) bağlıdır. Kısayol ekranda yazmaz.
- Favoriler sayfası çerezsiz açılırsa (ilk açılış, yeni sekme oturumu) önce iskelet görünür, sayfa bir kez yenilenir.
- Geri alınan ürün hesapta yeni eklenmiş sayılır. Sayfa yenilenince listenin başına geçer.
- Sınırın en büyük değeri çerezin boyundan gelir. Daha büyük sınır isteyen site için çerez yerine başka bir taşıma gerekir.
- Çerez ve tarayıcı deposu çerez politikasında ve aydınlatma metninde anılmalıdır. Hukukçuya soru kart 0063'e yazıldı.
- Hesabım sayfasının "Favorilerim" bağlantısı hesap sayfasıyla gelir. Bugün favorilere üst kısımdan ve telefonda yan pencereden gidilir.
- "Favorideki ürün indirime girdi" bildirimi yoktur (kartın sınırı).
- Yerel ve sunucudaki veritabanlarına 0035 değişikliği uygulanmalıdır (`pnpm veritabani-guncelle`).
