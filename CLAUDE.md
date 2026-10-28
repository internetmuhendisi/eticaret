# Proje kural dosyası

Bu dosya projenin ana kural dosyasıdır. Her oturumun başında okunur, 200 satırı geçmez.
Konu konu ayrıntılı kurallar `.claude/rules/` klasöründedir. Konuya özgü olanlar yalnız o konunun koduna dokunulunca okunur.

## Proje

**eticaret** (geçici ad; ad tek yerde tanımlanır), tek yerden yönetilen, birbirinden bağımsız e-ticaret sitelerinin altyapısıdır. Temel paket (`temel-paket.md`) olduğu gibi kurulur.

- Bütün siteleri altyapı sahibi barındırır ve günceller. Mağaza sahibi yalnız kendi sitesinin yönetim paneline girer, koda ve sunucuya erişmez. Sahip paneli yalnız altyapı sahibine açıktır. Ayrılmak isteyen mağazanın sitesi bütünüyle devredilebilir (karar 0014).
- Teknoloji: TypeScript, Next.js, PostgreSQL, Docker, Hetzner (karar 0013). Klasör düzeni: `.claude/rules/klasor-duzeni.md`.
- Mağazalar şimdilik yalnız Türkiye'de kurulur, yasal şablonlar Türk mevzuatına göre hazırlanır. Kod yine de ülkeye bağlı yazılmaz.
- İlk yıl için 5–30 mağazaya göre tasarlanır, büyümeye açık kalır.
- Her sitenin ayrı veritabanı vardır. Her site çekirdeğin belirli bir sürümünde çalışır.
- Mağaza sahibi panelden tema seçer ve temanın sınırlı ayarlarını (renk, yazı tipi, köşe ve düğme biçimi, logo, ana sayfa düzeni) değiştirir. Değişiklik önizlemeden sonra yayınlanır ve geri alınabilir.
- Yönetim panelinde altyapı adı yalnız giriş sayfasında ve alt köşede küçük görünür. Vitrinde görünmesi site ayarıdır.
- Site ayarlarının taslağı: `planlar/site-ayarlari.md`.
- Sunucu, müşteri verisi ve yedekler Almanya'da durur (karar 0009). İlk demo site Örnek Mağaza'dır, her özellik önce onda denenir (karar 0007).

## Roller

- Kullanıcı kod bilmez. Teknik kararları sen ver, ona yalnız ürün kararlarını sor.
- Kararları kullanıcı verir, kodu sen yazarsın.
- Ürün kararı, müşterinin göreceği ve yaşayacağı şeylerle ilgili karardır.
- Bir teknik karar verdiğinde nedenini tek cümleyle söyle.
- Bir siteden ötekine değişebilecek bir davranışı kullanıcıya karar olarak sorma. Onu varsayılan değeriyle bir site ayarı olarak öner ve bu site için hangi değeri önerdiğini söyle.

## Değişmez kurallar

Çekirdek, bütün sitelerin ortak kullandığı motordur: ürün, sepet, ödeme, sipariş, panel. Site, o motoru kullanan mağazadır: markası, tasarımı, ayarları.
Bu üç kural hiçbir zaman çiğnenmez:

1. Siteye özel kod çekirdeğe girmez. Siteye özel bir davranış gerekiyorsa çekirdeğe ayar olarak eklenir.
2. Siteler birbirinin verisini görmez.
3. Çekirdekte yapılan değişiklik hiçbir siteye kendiliğinden gitmez.

## Çalışma düzeni

- Benimle her zaman Türkçe konuş.
- İşe başlamadan önce ne yapacağını kısaca söyle.
- Yalnız istenen iş kuralı: `.claude/rules/calisma-duzeni.md`.
- İş bitince önce sonucu ve benim yapmam gereken bir şey olup olmadığını söyle. Ayrıntıyı ben sorarsam anlat.
- Bilmediğin bir şeyi uydurma, emin değilsen söyle.
- Bir işe bitti demeden önce gerçekten çalıştığını kontrol et.
- Bir kartla gelen işte, işe başlamadan kartı oku ve planını söyle.
- İş bitince kartın bitti sayılır listesini tek tek kontrol et. Eksik varsa söyle.
- Kullanıcı "push" dediğinde önce yaptıklarımızı kaydet (commit), sonra GitHub'a gönder.

## Eklentiler

- Temel paketin listesi `temel-paket.md` dosyasındadır. Temel paket dışındaki her özellik bir eklentidir.
- Her eklentinin tarifi `eklentiler/` klasöründedir. Bir eklentiyi eklerken önce tarifini, ilgili kural dosyalarını ve karar kayıtlarını oku.
- Katalogdaki bir eklentiyi kullanıcı istemeden kurma.
- Eklenti ekleme komutu henüz yok. İlk eklenti birlikte elle kurulduktan sonra derste yazılacak.

## Yasaklar

- Gizli bilgi dosyası `.env` asla kayda girmez, GitHub'a gönderilmez ve sunucuya kopyalanmaz. Bu dosyayı okuyabilir ve yazabilirsin. İçinde gizli bilgi olmayan örnek dosya `.env.example` bu yasağın dışındadır.
- `.git` klasörüne elle dokunma.
- `kararlar/` klasöründeki bir kaydı sonradan değiştirme. Tek istisna aşağıdaki "yerine geçti" notudur.
- Fiyatı, fiyat kuralını ya da şifre, anahtar gibi gizli bilgileri koda yazma.
- Toplu e-posta, gerçek ödeme, alan adı değişikliği gibi geri alınamaz işleri kullanıcının onayı olmadan yapma.
- Hız kazanmak için kontrol, test ya da doğrulama adımını atlama.
- Bir işlem yasak listesi ya da bir kontrol tarafından engellendiyse etrafından dolanma. Durumu kullanıcıya söyle.

## Hafıza

Konuşmalar oturumdan oturuma hatırlanmaz. Projenin hafızası aşağıdaki klasörlerdedir.

- **Karar kayıtlarına bak:** İşe başlamadan önce o işle ilgili karar kayıtlarını oku.
- **Karar kaydı yaz:** Önemli bir karar verilince `kararlar/` klasörüne şablonla (`kararlar/sablon.md`) bir karar kaydı yaz. Şu iki sorudan birinin cevabı evetse karar önemlidir: Bu karar unutulursa ileride yeniden tartışılır mı? Birden çok yol arasından birini mi seçtik?
- **Karar kaydı değişmez:** Yazılan kayıt sonradan değiştirilmez. Fikir değişirse yeni bir kayıt yazılır. Eski kayda yalnız "bu kararın yerine şu numaralı karar geçti" notu eklenir, başka satırına dokunulmaz.
- **Tarihçeye yaz:** Her iş bitince `tarihce/` klasöründe o ayın dosyasına bir giriş ekle. En yeni giriş en üstte durur. Her giriş tarih, iş başlığı ve en fazla iki satır özetten oluşur.
- **Planlar:** Her büyük işten önce yazılan planlar ve site ayarları taslağı `planlar/` klasöründedir.
- **İşler:** Yapılacak işlerin kartları `isler/` klasöründedir.
- "En son ne yaptık?" diye sorulursa önce tarihçeye, sonra karar kayıtlarına bak.

| Bilgi | Yeri |
|---|---|
| Temel paketin listesi | `temel-paket.md` |
| İzinler ve yasaklar | `.claude/settings.json` |
| Konu konu kurallar | `.claude/rules/` |
| Kendi komutlarımız | `.claude/commands/` |
| Eklenti tarifleri | `eklentiler/` |
| Kararlar ve gerekçeleri | `kararlar/` |
| Yapılan işler | `tarihce/` |
| Planlar ve site ayarları | `planlar/` |
| İş kartları | `isler/` |
