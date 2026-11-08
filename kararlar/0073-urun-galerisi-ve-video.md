# 0073 · Ürün galerisi: boyutları üretilmiş görseller ve video sitesi bağlantısı

## Tarih

2026-11-08

## Karar

- **Galeri:** Ürünün galerisi `urun_galerisi` tablosunda sıralı öğelerdir. Bir öğe ya görseldir (dosya deposundaki bir dosya, karar 0058) ya da videodur (video sitesinin adı ve videonun kimliği). Her öğenin alternatif metni zorunludur. Görselde bu metni ekran okuyucu okur, videoda oynatıcının başlığıdır. Ana görsel, silinmemiş ilk görsel öğesidir. Video ana görsel olmaz. Ürün başına en çok 30 öğe vardır. Türler ve sınırlar `cekirdek/kayitlar/gorsel.ts` dosyasındadır.
- **Boyutlar:** Yüklenen her görselin dört boyutu üretilir: `kucuk` 160, `orta` 480, `buyuk` 960 ve `tam` 1600 piksel. Sayı en uzun kenarın sınırıdır. Boyutlar WebP biçiminde, kalite 80 ile üretilir. Küçük görsel büyütülmez. Boyutlar tek yerde, `cekirdek/kayitlar/gorsel.ts` dosyasında tanımlıdır. Görsel, boyutları ve `dosya_boyutlari` satırları tek işlemde yazılır (`gorselKaydet`, `cekirdek/moduller/dosya/servis.ts`). Boyutlar, yeniden kodlanmış ve gömülü bilgisi temizlenmiş görselden üretilir. Özgün görsel de kendi biçiminde saklanır.
- **Galeriye bağlama:** Galeriye yalnız silinmemiş, kendisi bir boyut olmayan ve kayıttaki bütün boyutları bulunan görsel bağlanır (`gorselHazirMi`). Dosya kaydetme bir veritabanı işleminin içinde çağrılamaz (karar 0058). Bu yüzden görsel önce kaydedilir, galeriye kimliğiyle bağlanır. Yükleme ekranı bu iki adımı arka arkaya yapacak. Aynı görsel bir ürünün galerisinde bir kez olabilir, başka ürünlerde de kullanılabilir.
- **Video (kullanıcı kararı):** Video dosyası yüklenmez, video sitesinin bağlantısı yapıştırılır. Bağlantıdan yalnız site ve videonun kimliği çıkarılıp saklanır (`cekirdek/moduller/urun/video.ts`), bağlantının kendisi saklanmaz. Kimlik sitenin kalıbına uymalıdır. Sayfaya konan oynatıcı adresi kayıttaki kalıpla bu kimlikten kurulur (`cekirdek/kayitlar/video-siteleri.ts`). YouTube çerez bırakmayan adresinden (`youtube-nocookie.com`), Vimeo izlemesiz (`dnt=1`) açılır.
- **Hangi video siteleri:** Altyapı sahibinin site ayarıdır (`videoSiteleri`, varsayılanı YouTube ve Vimeo, Örnek Mağaza'da da öyle). Video müşteriyi o siteye bağladığı için çerez ve gizlilik metinlerini etkiler. Boş liste galeriye video eklenmesini kapatır.
- **Birleşimin görseli:** Birleşim kendi görselini kendi ürününün galerisinden seçer (`urun_birimleri.gorsel_kimligi` artık galeri öğesine bağlıdır, dosyaya değil). Seçilmemişse ana görsel gösterilir (`birimGorseli`). Servis, seçilen öğenin ürünün galerisinde silinmemiş bir görsel olduğunu ürün kilidi altında denetler. Veritabanında üç koruma vardır: ürün ve öğe ikilisine bağlı bağ başka ürünün öğesini reddeder; tetikleyici videoyu ve silinmiş öğeyi reddeder; ikinci tetikleyici, silinmemiş bir birimin seçtiği öğenin silinmesini ve videoya dönmesini reddeder. Birinci tetikleyici öğeyi paylaşımlı kilitler, böylece aynı anda silen işlem bitene kadar beklenir.
- **Dosyası silinmiş görsel:** Dosya deposunda silinmiş işaretlenen görsel galeride görünmez, sıralamaya ve sınıra sayılmaz, seçilemez; öğenin satırı kalır, yönetici silebilir. İkinci tetikleyici seçilmiş öğenin silinmesine yalnız READ COMMITTED işlemde bakabilir, daha yüksek yalıtımda silmeyi reddeder.
- **Silme:** Galeri öğesi silinmiş işaretlenir, dosyası ve boyutları silinmez. Siparişler ürünün o andaki görseline bağlı kalabilir. Öğeyi seçmiş birleşimin görseli aynı işlemde boşaltılır, ana görsele düşer, değişiklik kaydına girer.
- **Okuma:** `urunuOku` ürünün galerisini sırasıyla verir. Birden çok ürünün galerisi (`urunGalerileri`) ve ana görseli (`anaGorseller`) iki sorguyla gelir: ürün sayısıyla artmaz.
- **Değişiklik kaydı:** Yeni işlemler `urun-galerisi.eklendi`, `degisti`, `silindi` (kayıt türü `urun-galeri-ogesi`) ve `urun-galerisi.siralandi` (ürünün kaydında).
- **İzin:** Galeriyi değiştirmek ürünü değiştirmektir: uçlar gelince galerinin bütün işlemleri `urun.degistir` ister, öğe silmek de buna dahildir (ürün silmek değildir).
- **Başlangıç kataloğu:** Katalogdaki ürünün `galeri` alanı, sitenin `baslangic/gorseller/` klasöründeki görselleri adıyla, videoları bağlantısıyla sıralar. Site doğrulaması her görselin düz bir dosya olduğunu, içeriğinin uzantısıyla aynı olduğunu ve sınırı aşmadığını, video sitesinin bu sitede kabul edildiğini denetler. Kurulumda görseller katalog işleminden önce, her biri kendi işleminde kaydedilir. Katalog yazılmazsa o çağrının kaydettiği görseller silinmiş işaretlenir.
- **Örnek Mağaza (kullanıcı kararı):** Görseller projede üretilmiş, yazısız yer tutuculardır. Kablosuz Kulaklık'ın galerisinde bir YouTube videosu vardır. Kaynakları sitenin `KURALLAR.md` dosyasındadır.

## Neden

- Görselin boyutlarını yüklerken bir kez üretmek, her istekte küçültmekten ucuzdur. Boyutun dosyası da öteki dosyalar gibi aynı denetimden geçer: içerik özeti tutulur, gömülü bilgi temizlenir.
- WebP bugünkü yaygın tarayıcıların hepsinde açılır ve aynı görünüşte JPEG'den belirgin biçimde hafiftir. AVIF daha da hafiftir, ama kodlaması daha yavaştır ve süreç başına tek tek yapılan kodlamayı uzatır.
- Galeriyi dosyadan ayrı bir tablo yapmak sırayı, alternatif metni ve videoyu tek listede tutar. Ürün silinse de dosyaya dokunulmaz.
- Videonun yalnız kimliğini saklamak, mağaza sahibinin yazdığı bağlantının sayfaya olduğu gibi girmesini önler. Oynatıcı adresini kodun kendisi kurar.
- Birleşimin görselini galeri öğesine bağlamak, "galeriden seçer" kuralını veritabanının da bilmesini sağlar. Dosyaya bağlansaydı galeride olmayan bir dosya seçilebilirdi.

## Düşünülen diğer yollar

- **Video dosyası yüklemek:** Kullanıcı seçmedi. Video büyük dosyadır: disk ve yedek ağırlaşır, videonun güvenli işlenmesi ayrı iş ister.
- **Boyutları istek anında üretmek (görsel sunucusu):** Seçilmedi. Her ilk istekte sunucuya yük bindirir, sonucu önbellekte tutmak ayrı bir düzen ister.
- **Boyutları arka plan işinde üretmek:** Seçilmedi. Görsel bir süre boyutsuz kalırdı, galeri boyutu eksik görseli göstermek zorunda kalırdı. Bugün yükleme ekranı yok; testlerde 3000 piksellik bir görselin kaydı ve dört boyutu bir saniyenin altında bitti.
- **Birleşimin görselini doğrudan dosyaya bağlamak:** Varyantlı ürün kartı (0085) yerini öyle açmıştı. Seçilmedi, yukarıdaki neden.
- **Ana görseli ayrı bir alanla seçmek:** Seçilmedi. Sıra ile ana görsel iki ayrı bilgi olurdu, birbirini tutmayabilirdi. Ana görsel ilk görseldir, değiştirmek sıralamaktır.

## Sonuçları

- Bir görsel diskte beş dosyadır: özgün ve dört boyut. Disk kullanımı sunucu denetiminde ölçülür (karar 0058).
- Kayda yeni bir boyut eklenirse eski görsellerde o boyut yoktur. Boyutları tamamlayan bir iş aynı değişiklikte yazılmazsa eski görseller galeriye yeniden eklenemez. Okuma eksik boyutu boş bırakır.
- Görselin kaydedilmesi ile galeriye bağlanması ayrı adımdır. Arada kalan, hiçbir galeride olmayan görseller olabilir. Kayıtsız ve kullanılmayan dosyaların temizliği kart 0093'tedir.
- Video müşteriyi YouTube ya da Vimeo'ya bağlar. Çerez ve gizlilik metninde bu siteler anılmalıdır (kart 0063'e not düşüldü). Videonun oynatıcısı tıklanana kadar yüklenmemeli; bu vitrin ekranının işidir.
- Liste dışı (gizli) Vimeo videosu ek bir anahtar ister, kabul edilmez.
- Örnek Mağaza'nın kataloğu artık görsel kaydettiği için arka plan süreci açılışta `sharp`'ı kullanır. `sharp` arka plan paketine gömülmez (yerli ikili dosya taşır; gömülünce paketin başındaki `createRequire` satırıyla çakışıp süreci açılmaz yapıyordu, yerel ortam denemesi yakaladı), görüntüdeki `node_modules` kopyasından yüklenir. Çekirdeğin görüntüsünde arka plan klasöründen yüklenip bir görseli küçültüp WebP'ye çevirdiği bir kez elle ölçüldü (sharp 0.35.5, libvips 8.18.7). Görselli bir kataloğun gerçek kutuda kurulması ölçülmedi: yerel ortam denemesinin deneme sitesinin kataloğu yok, Örnek Mağaza eski sürümle açılır. Yükleme ucunun bellek sınırı kart 0094'te kalır.
- Dosyaların yedeği gelmeden (kart 0093) gerçek bir mağazaya görsel yüklenmez (karar 0058). Örnek Mağaza gerçek mağaza değildir.
