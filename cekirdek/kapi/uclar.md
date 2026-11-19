# Uç belgesi

Kapıdaki her uç burada yazar (`.claude/rules/sunucu-arayuzu.md`). Yeni ya da değişen uç aynı değişiklikte buraya yazılır. Uygulamadaki her adresin burada olduğunu ve burada yazan her adresin uygulamada olduğunu `cekirdek/kapi/testler/uc-belgesi.test.ts` denetler. Kapının yapısı: karar 0024.

## Ortak kurallar

**Girişler.** Her adres dört girişten biriyle başlar: `/kapi/herkese-acik/`, `/kapi/musteri/`, `/kapi/yonetici/`, `/kapi/sahip/` (`cekirdek/kayitlar/kapi.ts`).

**Yanıt zarfı.** Her yanıt JSON'dur ve aynı biçimdedir.

```json
{ "basarili": true, "veri": { } }
{ "basarili": false, "hata": { "kod": "dogrulama", "ayrinti": [ ] } }
```

`ayrinti` yalnız gerekince vardır, kişisel veri ve iç hata mesajı taşımaz.

**Önbellek** (kart 0065, karar 0139). Zarfla dönen her yanıt, başarılı ve hatalı, her girişte `Cache-Control: no-store` taşır; değer `zarfOnbellegi` (`cekirdek/kapi/zarf.ts`). Ucun eklediği başlık bunu açamaz. Tek istisna dosya yanıtıdır (logo, ürün görseli, vitrin görseli, panel görseli): kendi süresini taşır (`public` ya da `private`, `dosyaOnbellekSuresi`); hatası zarfladır, önbelleksizdir. Tarayıcı bu uçlara `kapiyaIstek` ile istek gönderir (`cekirdek/kapi/istemci.ts`): okunmayan `no-store` gövdesi isteği bitmemiş bırakır.

**Hata kodları** (`cekirdek/kayitlar/kapi.ts`):

| Kod | HTTP | Ne zaman |
|---|---|---|
| `dogrulama` | 400 | Girdi şemadan geçmedi. Ayrıntı: `[{ "alan", "kod" }]`, `kod` Zod'un hata kodudur. |
| `oturum-yok` | 401 | Geçerli oturum yok: girişsiz, süresi dolmuş ya da kapanmış oturum. Ekran giriş sayfasına yönlendirir. |
| `giris-hatasi` | 401 | E-posta ya da şifre yanlış. Kayıtlı olmayan e-postayla cevabı aynıdır (karar 0042). |
| `yetki` | 403 | Oturum var ama istenen izin yok ya da istek başka bir adresten geldi (sahte istek). |
| `robot-dogrulamasi` | 403 | Robot cevabı yanlış, süresi dolmuş ya da kullanılmış. Ekran yeni soruyla bir kez daha dener (karar 0051). |
| `bulunamadi` | 404 | Kayıt yok. |
| `cakisma` | 409 | Kayıt başka biriyle çakışıyor. |
| `is-kurali` | 422 | Girdi geçerli ama iş kuralı izin vermiyor. |
| `istek-siniri` | 429 | Sınır aşıldı. `Retry-After` başlığı kaç saniye sonra yeniden denenebileceğini söyler. |
| `sunucu-hatasi` | 500 | Beklenmeyen hata. Ayrıntı yoktur; hata maskelenip sunucu günlüğüne hata seviyesinde yazılır (karar 0025). |
| `hizmet-kullanilamiyor` | 503 | Uygulamanın dayandığı bir parça (veritabanı gibi) kapalı. |

**Girdi.** `GET`, `HEAD` ve `DELETE` isteklerinde girdi adres parametreleridir, ötekilerde JSON gövdedir. Şemada olmayan alan doğrulama hatasıdır.

**Dış kuruluşun dönüşü** (kart 0215, karar 0142). Ödeme kuruluşunun sunucudan bildirimi ve müşterinin tarayıcısıyla geri gönderdiği form `disKurulus` beyanıyla yazılır: yalnız herkese açık girişte ve `bildirim` sınırıyla. Başka siteden geldiği için sahte istek denetimi uygulanmaz, gövde JSON ya da form (`application/x-www-form-urlencoded`) olabilir, şemada olmayan alan yok sayılır. Uç çerez okumaz; doğruluğu imzadan ya da kuruluşa yapılan sorgudan kurar. Uç `Yonlendirme` döndürerek `303` ile sitenin kendi bir sayfasına yönlendirebilir (yanıt önbelleksizdir).

**İstek sınırı.** Her uç bir sınır seçer. Sayaç yöntem, adres ve istemci başınadır, süre dolunca sıfırlanır: aynı uca `HEAD` ve `GET` ayrı sayılır. IPv4 istemci tam adresiyle, IPv6 istemci adresinin ilk 64 bitiyle sayılır (karar 0041).

| Sınır | Sınır değeri |
|---|---|
| `genel` | 60 saniyede 120 istek |
| `siki` | 60 saniyede 5 istek (giriş, şifre sıfırlama gibi hassas uçlar) |
| `gorsel` | 60 saniyede 600 istek (ürün görseli: bir sayfa aynı uca onlarca kez gider) |
| `bildirim` | 60 saniyede 600 istek (ödeme kuruluşunun bildirimi ve dönüşü: sıradan sınırdan muaf, bol sınır yalnız taşkını durdurur) |

**İzin.** Herkese açık girişteki uçların izni `herkese-acik`tır. Öteki girişlerdeki uçlar yalnız o girişin iznini ister (`cekirdek/kayitlar/izinler.ts`, liste `cekirdek/moduller/ekip/izinler-ve-roller.md`). Kapı her istekte sırayla sahte isteğe, istek sınırına, oturuma, izne ve girdiye bakar: yetkisiz istek girdi hatası görmez. Uç, hesabın kimliğini ve iznin kapsamını kapıdan alır, girdiden almaz (karar 0040). Sahip girişinin henüz izni yoktur, oraya uç yazılamaz.

**Sahte istek.** Veri değiştiren her istekte (`GET`, `HEAD` ve `OPTIONS` dışında) kapı `Sec-Fetch-Site` ve `Origin` başlıklarını isteğin adresi ve şemasıyla karşılaştırır, tutmayana istek sınırını saymadan `yetki` döner. İki başlık da yoksa istek tarayıcıdan gelmemiştir ve geçer (karar 0039).

**Çerez.** Uç yanıta çerezi yalnız `cerezYaz` ile yazar. Oturum çerezleri `cekirdek/kapi/oturum-cerezi.ts` dosyasındadır, hatalı yanıtta da gider.

**Tema demosu** (kart 0116, karar 0127). Site ayarı `temaDemosu` açıkken ziyaretçi yalnız gezer: kapalı uç, sahte isteğe, sınıra ve girdiye bakmadan `bulunamadi` döner. Müşteri girişindeki her uç kapalıdır. Herkese açık her uç tanımında demodaki durumunu beyan eder (`temaDemosunda`, tür kontrolü ister): hesap, sipariş, yorum, bildirim ya da e-posta doğuran uç `kapali`, vitrinin okuduğu ve panelin kullandığı uç `acik`. Yönetici ve sahip uçları açıktır. Bugün kapalı herkese açık uçlar: `musteri-kayit`, `musteri-giris`, `musteri-cikis`, `musteri-sifre-sifirlama`, `musteri-sifre-yenile`, `stok-bildirimi`, `odeme`, `havale-bildirimi`, `kartla-odeme/donus`, `kartla-odeme/bildirim`, `kartla-odeme/taksitler`; listeyi `cekirdek/kapi/testler/tema-demosu.test.ts` denetler.

## Herkese açık

### GET /kapi/herkese-acik/saglik

Uygulamanın ve veritabanının ayakta olup olmadığını ve çalışan çekirdek sürümünü söyler. Yayın komutu ve zamanlanmış kontroller siteyi bununla yoklar. Kişisel veri döndürmez.

- İzin: `herkese-acik`. Sınır: `genel`.
- Girdi: yok. Adres parametresi verilirse `dogrulama`.
- Servis: `cekirdek/izleme/saglik.ts`.

Başarılı (200):

```json
{ "basarili": true, "veri": { "uygulama": "ayakta", "veritabani": "ayakta", "cekirdekSurumu": "0.1.0" } }
```

Veritabanına ulaşılamazsa (503):

```json
{ "basarili": false, "hata": { "kod": "hizmet-kullanilamiyor", "ayrinti": { "uygulama": "ayakta", "veritabani": "kapali", "cekirdekSurumu": "0.1.0" } } }
```

Veritabanı 5 saniye içinde cevap vermezse yanıt 503 olur.

### GET /kapi/herkese-acik/logo

Mağazanın logosunu verir: mağaza sahibinin yüklediği logo, yoksa sitenin ilk logosu (`marka/` klasörü). Vitrin, panel ve e-posta logoyu bu adresten alır (kart 0073, karar 0059). Yanıt zarf değil, dosyanın kendisidir; hata yine zarfla döner.

- İzin: `herkese-acik`. Sınır: `genel`.
- Girdi: isteğe bağlı `s` (en çok 64 küçük harf onaltılık rakam). Yalnız önbelleği aşmak içindir, yanıtı değiştirmez; e-postadaki adres logonun özetini taşır. Başka parametre `dogrulama`.
- Servis: `cekirdek/moduller/magaza-ayarlari/logo.ts`.
- Başarılı (200): görselin kendisi. Başlıklar: `Content-Type` dosyanın içerikten bulunmuş türü (`image/png`, `image/jpeg`, `image/webp`), `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=300`, `ETag` içeriğin özeti.
- Aynı `ETag` ile gelen istek (`If-None-Match`) gövdesiz 304 alır. `HEAD` isteği aynı başlıkları gövdesiz alır.
- Logo yoksa (404): `{ "basarili": false, "hata": { "kod": "bulunamadi" } }`. Ekran mağaza adını yazı olarak gösterir.

### GET /kapi/herkese-acik/urun-gorseli

Ürün görselinin bir boyutunu verir. Ürün kartı ve vitrin görseli bu adresten alır (kart 0109, karar 0085). Yanıt zarf değil, dosyanın kendisidir; hata yine zarfla döner.

- İzin: `herkese-acik`. Sınır: `gorsel`.
- Girdi: `o` galeri öğesinin kimliği, `b` boyutun adı (`kucuk`, `orta`, `buyuk`, `tam`; `cekirdek/kayitlar/gorsel.ts`). Başka parametre, kimlik biçiminde olmayan `o` ya da kayıtta olmayan boyut `dogrulama`.
- Servis: `cekirdek/moduller/urun/urun-gorseli.ts`.
- Yalnız vitrinde sayfası açılan ürünün (`vitrinKosulu`, sayfa yeri) silinmemiş galeri görselinin boyutu verilir. Özgün görsel ve dosya kimliğiyle başka dosya verilmez.
- Başarılı (200): görselin boyutu (WebP). Başlıklar logo ucuyla aynıdır: `Content-Type`, `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=300`, `ETag` içeriğin özeti; aynı `ETag` ile 304, `HEAD` gövdesiz.
- Görsel yoksa (404): `{ "basarili": false, "hata": { "kod": "bulunamadi" } }`. Olmayan öğe, video, silinmiş öğe ya da dosya, görünmeyen ürün ve eksik boyut aynı cevabı alır. Boyutun dosyası diskte yoksa ya da içeriği kayıttakinden farklıysa da 404 döner; hata her dosya için süreç başına bir kez kaydedilir.

### GET /kapi/herkese-acik/vitrin-gorseli

Vitrin bölümlerindeki, kategorilerdeki görselin ve markanın logosunun bir boyutunu verir (kart 0110, karar 0087; kart 0111, karar 0088). Kayan afiş, kampanya afişleri, geniş afiş, kategori kutuları, ürün vitrininin yan afişi ve marka logoları görseli bu adresten alır. Yanıt zarf değil, dosyanın kendisidir; hata yine zarfla döner.

- İzin: `herkese-acik`. Sınır: `gorsel`.
- Girdi: `d` görselin dosya kimliği, `b` boyutun adı (`kucuk`, `orta`, `buyuk`, `tam`). Başka parametre, kimlik biçiminde olmayan `d` ya da kayıtta olmayan boyut `dogrulama`.
- Servis: `cekirdek/moduller/duzen/gorsel.ts`.
- Yalnız vitrinde kullanılan görsel verilir: geçerli düzende çizilen bir bölümün başvurduğu görsel, silinmemiş bir kategorinin görseli ya da silinmemiş bir markanın logosu. Gizli ya da geçersiz bölümün görseli, mağaza logosu, ürün görseli ve dosya deposundaki öteki dosyalar bu adresle açılmaz; özgün görsel verilmez.
- Başarılı (200) ve 304: ürün görseli ucuyla aynı başlıklar.
- Görsel yoksa (404): `{ "basarili": false, "hata": { "kod": "bulunamadi" } }`. Kullanılmayan, silinmiş ya da okunamayan dosya ve eksik boyut aynı cevabı alır; okunamayan dosyanın hatası dosya başına bir kez kaydedilir.

### POST /kapi/herkese-acik/yonetici-giris

Girişin ilk aşaması: şifreyi doğrular, oturum değil ara adım açar (karar 0044). Girişi yapılmamış kişi izin taşıyamayacağı için herkese açık giriştedir (karar 0042).

- İzin: `herkese-acik`. Sınır: `siki`. Ayrıca yanlış denemeler hesap ve bağlantı başına sayılır (`girisDenemeSiniri`, `cekirdek/kayitlar/oturum.ts`).
- Girdi: `{ "eposta", "sifre" }` (`girisSemasi`, `cekirdek/moduller/oturum/semalar.ts`).
- Servis: `cekirdek/moduller/oturum/iki-asamali-giris.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "sonraki": "kod" | "kurulum" } }` ve ara adım çerezi. Oturum çerezi yazılmaz.
- Hatalar: `giris-hatasi` (yanlış e-posta ya da şifre), `istek-siniri` (`Retry-After` ile), `dogrulama` (e-posta biçimi, boş ya da çok uzun şifre, fazla alan, bozuk gövde), `yetki` (sahte istek).

### POST /kapi/herkese-acik/yonetici-kod

Girişin ikinci aşaması: zamanlı kod ya da yedek kod doğruysa oturum açar, ara adımı kapatır. Yetki ara adım çerezinden gelir (karar 0044).

- İzin: `herkese-acik`. Sınır: `siki`. Ayrıca yanlış kodlar hesap ve bağlantı başına sayılır (`ikiAsamaDenemeSiniri`).
- Girdi: `{ "kod" }` (`kodSemasi`).
- Servis: `cekirdek/moduller/oturum/iki-asamali-giris.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`, iki oturum çerezi ve ara adım çerezini silen başlık.
- Hatalar: `giris-hatasi` (yanlış ya da kullanılmış kod), `oturum-yok` (ara adım yok ya da süresi dolmuş), `is-kurali` (kurulum bitmemiş), `istek-siniri` (`Retry-After` ile), `dogrulama`, `yetki` (sahte istek).

### POST /kapi/herkese-acik/yonetici-kurulum-onay

İki aşamalı girişin kurulumunu ilk kodla bitirir, yedek kodları bir kez döner, oturum açar. Yetki ara adım çerezinden gelir (karar 0044).

- İzin: `herkese-acik`. Sınır: `siki`. Ayrıca yanlış kodlar hesap ve bağlantı başına sayılır (`ikiAsamaDenemeSiniri`).
- Girdi: `{ "kod" }` (`kodSemasi`).
- Servis: `cekirdek/moduller/oturum/iki-asamali-giris.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "yedekKodlari": ["..."] } }`, iki oturum çerezi ve ara adım çerezini silen başlık.
- Hatalar: `giris-hatasi` (yanlış kod), `oturum-yok` (ara adım yok ya da süresi dolmuş), `is-kurali` (kurulum zaten bitmiş ya da kurulum ekranı açılmamış), `istek-siniri` (`Retry-After` ile), `dogrulama`, `yetki` (sahte istek).

### POST /kapi/herkese-acik/yonetici-cikis

Oturumu ve ara adımı kapatır, çerezleri siler. Rolü olmayan yönetici de çıkabilsin, süresi dolmuş oturumun çerezleri de silinsin diye izin istemez.

- İzin: `herkese-acik`. Sınır: `genel`.
- Girdi: yok. Oturum yoksa da 200 döner.
- Servis: `cekirdek/moduller/oturum/giris.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }` ve çerezleri silen başlıklar.

### GET /kapi/herkese-acik/robot-sorusu

Kayıt formunun robot sorusunu verir. Tarayıcı arkada çözer, cevabı formla gönderir (karar 0051).

- İzin: `herkese-acik`. Sınır: `genel`.
- Girdi: yok.
- Servis: `cekirdek/moduller/robot-korumasi/servis.ts`.
- Başarılı (200): imzalı soru. Kişisel veri taşımaz, biçimi robot koruması kütüphanesinindir.

### POST /kapi/herkese-acik/musteri-kayit

Müşteri hesabı açar, onayları kaydeder, hoş geldin e-postasını kuyruğa koyar, oturumu başlatır. Hepsi aynı veritabanı işlemindedir (karar 0051).

- İzin: `herkese-acik`. Sınır: `siki`.
- Girdi: `{ "eposta", "sifre", "uyelikOnayi": true, "kvkkOnayi": true, "pazarlamaIzni", "robotCevabi" }` (`kayitSemasi`, `cekirdek/moduller/musteri/semalar.ts`).
- Servis: `cekirdek/moduller/musteri/servis.ts`. Robot cevabı veritabanına bakılmadan önce denetlenir.
- Başarılı (200): `{ "basarili": true, "veri": {} }` ve iki oturum çerezi.
- Hatalar: `cakisma` (e-posta kayıtlı; müşteriye söylenir, karar 0051), `robot-dogrulamasi`, `istek-siniri` (`Retry-After` ile), `dogrulama` (bozuk e-posta, kısa şifre, işaretlenmemiş zorunlu onay, fazla alan), `yetki` (sahte istek).

### POST /kapi/herkese-acik/sepet

Tarayıcıdaki sepetin vitrin verisini hesaplar (kart 0212, karar 0135). Sepet yalnız müşterinin tarayıcısındadır; uç birimleri ve adetleri alır, fiyatı, stoğu, kargoyu ve vergiyi sunucuda yeniden hesaplar. Hiçbir şey yazmaz, oturum istemez. Tema demosunda açıktır.

- İzin: `herkese-acik`. Sınır: `genel`.
- Girdi: `{ "kalemler": [{ "birim", "adet", "gorulenTutar"? }], "vergiBolgeleri"?: { "teslimat"?, "fatura"? } }` (`sepetSemasi`, `cekirdek/moduller/sepet/semalar.ts`); en çok 50 kalem, adet 1–999. Aynı birim iki kez gelirse adetleri toplanır; kimlik olmayan birim atılır. Ödeme adımı teslimat ve fatura adresinin bölgesini (`ulke`, `il`?, `postaKodu`?) verir, vergi ona göre hesaplanır (kart 0213, `vergiAdresi`).
- Servis: hesap `cekirdek/moduller/sepet/hesap.ts` (`sepetiHesapla`), gösterim `cekirdek/vitrin/sepet/veri.ts` (`sepetGorunumu`).
- Başarılı (200): `{ "basarili": true, "veri": { "satirlar", "adet", "gosterim", "kargo", "vergiDokumu", "yazili", "odemeyeGecilebilir" } }`. Satırın uyarıları `cekirdek/kayitlar/sepet.ts` kaydındadır (`fiyat-degisti`, `stok-azaldi`, `en-az`, `en-cok`, `tukendi`, `kaldirildi`).
- Hatalar: `dogrulama` (bozuk girdi, sınır dışı adet, fazla kalem), `istek-siniri` (`Retry-After` ile), `yetki` (sahte istek).

### POST /kapi/herkese-acik/stok-bildirimi

Üye olmayan müşteri tükenmiş birim (basit ürünün birimi ya da birleşim) için "stoğa gelince haber ver" talebi bırakır (eklenti, kart 0144, karar 0117). Birim stoğa girince e-postasına bir kez haber gider. Aynı e-posta aynı birime bekleyen talep olarak bir kez yazılır; ikinci istek de başarı alır (adresin kayıtlı olup olmadığı belli olmaz).

- İzin: `herkese-acik`. Sınır: `siki`.
- Girdi: `{ "birim", "eposta", "robotCevabi" }` (`stokBildirimiTalebiSemasi`, `cekirdek/eklentiler/stoga-gelince-haber-ver/semalar.ts`).
- Servis: `cekirdek/eklentiler/stoga-gelince-haber-ver/servis.ts`. Robot cevabı veritabanına bakılmadan önce denetlenir.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `bulunamadi` (eklenti kapalı; birim yok, silinmiş ya da ürünün sayfası açılmıyor), `oturum-yok` (mağaza sahibi üye olmayanın talebini kapattı: `stokBildirimiUyeOlmayan`), `is-kurali` (`talep-alinamaz`: birim satılabilir ya da ürünün stok takibi kapalı), `robot-dogrulamasi`, `istek-siniri` (`Retry-After` ile), `dogrulama`, `yetki` (sahte istek).

### POST /kapi/herkese-acik/odeme

Üye olmayan müşteri ödeme adımında "Siparişi onayla"ya basar (kart 0213, karar 0140): ödeme oturumu açılır, sepetin takibi açık birimleri stok ayırma süresi kadar ayrılır (`stokAyirmaSuresi`), isterse hesap açılır. Havale ve kapıda ödemede sipariş aynı işlemde oturumdan kurulur, stok düşer, ayırma siparişe geçer (kart 0214, karar 0141). Tutar sunucuda hesaplanır, tarayıcıdan gelmez; vergi teslimat ve fatura adresinin bölgesiyle (`vergiAdresi`). Tema demosunda kapalıdır.

- İzin: `herkese-acik`. Sınır: `siki`.
- Girdi: `{ "eposta", "hesap": { "ac": false } | { "ac": true, "sifre", "uyelikOnayi", "kvkkOnayi" }, "bilgiler": { "odemeYontemi", "teslimat", "fatura", "not"?, "onBilgilendirmeOnayi", "mesafeliSatisOnayi", "pazarlamaIzni" }, "kalemler", "robotCevabi", "onceki"?, "gorulenToplam"? }` (`misafirOdemeGirdisi`, `cekirdek/moduller/odeme/semalar.ts`). `onceki` müşterinin bir önceki onayının oturumudur: yalnız üye olmayanın oturumuysa silinir, ayırması serbest kalır. `gorulenToplam` müşterinin özette gördüğü toplamdır (kuruş): sunucunun toplamından farklıysa `sepet-degisti`; tutar olarak kullanılmaz. `odemeYontemi`: `{ "yontem": "havale" }`, `{ "yontem": "kapida-odeme", "secenek": "nakit" | "kart" }` ya da `{ "yontem": "kart" }` (kartla ödeme eklentisi, kart 0215).
- Servis: `cekirdek/moduller/odeme/servis.ts` (`onayla`). Robot cevabı veritabanına bakılmadan önce denetlenir.
- Başarılı (200): `{ "basarili": true, "veri": { "oturum", "siparis" } }` (`siparis` siparişin numarası). Kartla ödemede sipariş henüz yoktur: `{ "basarili": true, "veri": { "oturum", "yonlendir" } }`, `yonlendir` müşterinin gideceği ödeme kuruluşu sayfası; erişim çerezi yazılmaz; sipariş alındı sayfasının erişim çerezi (`siparis-erisim`, yalnız `/siparis-alindi` yoluna, `cekirdek/kapi/siparis-cerezi.ts`); hesap açıldıysa iki oturum çerezi.
- Hatalar: `oturum-yok` (üye olmadan alışveriş kapalı: `uyeOlmadanAlisveris`), `dogrulama` (şemaya uymayan girdi; `telefon-gerekli`, `telefon-bicimi`, `fatura-adresi-gerekli`, `vergi-numarasi-bicimi`, `vergi-numarasi-kontrol`, `ulke-teslimat-disi`, bölge ve adres kodları), `is-kurali` (`sepet-bos`, `sepet-degisti`: sepet ödemeye geçilemez ya da müşterinin görmediği bir değişiklik var; `yontem-kapali`: seçilen ödeme yöntemi ya da seçeneği sitede kapalı ya da havalenin banka hesabı yok; `yontem-ulasilamadi`: kartla ödeme başlatılamadı, ayırma bırakıldı), `cakisma` (`stok-ayrildi`: birimin stoğu başka bir ödemede ayrılmış ya da yetmiyor, birimle; ya da hesap açılırken e-posta kayıtlı), `robot-dogrulamasi`, `istek-siniri` (`Retry-After` ile), `yetki` (sahte istek), tema demosunda `bulunamadi`.

### POST /kapi/herkese-acik/kartla-odeme/donus

Ödeme kuruluşu müşterinin tarayıcısını ödeme sayfasından geri gönderir (kartla ödeme eklentisi, kart 0215, karar 0142): form, başka siteden, yalnız belirteçle. Ödemenin sonucu kuruluşa imzalı sorguyla sorulur; tarayıcıdan gelen başka hiçbir bilgi kullanılmaz. Ödendiyse sipariş "hazırlanıyor" ve tahsilatla kurulur (ikinci dönüş aynı siparişi bulur). Ödeme alındı ama sipariş kurulamadıysa (stok yok, fiyat değişti) ödeme aynı gün iptal edilir. Eklenti kapalıyken de başlatılmış ödemeyi tamamlar. Tema demosunda kapalıdır.

- İzin: `herkese-acik`. Sınır: `bildirim`. Dış kuruluşun dönüşü (`disKurulus`).
- Girdi: `{ "token" }` (form; `donusSemasi`, `cekirdek/eklentiler/kartla-odeme/semalar.ts`).
- Servis: `cekirdek/eklentiler/kartla-odeme/servis.ts` (`tamamla`).
- Başarılı (303): sipariş kurulduysa `Location: /siparis-alindi` ve erişim çerezi (`siparis-erisim`); yoksa `Location: /odeme?kart=<sonuç>`, sonuç `reddedildi`, `yarida-kaldi`, `stok-yok`, `sepet-degisti` ya da `bilinmiyor` (`odemeDonusSonuclari`, `cekirdek/kayitlar/odeme.ts`).
- Hatalar: `dogrulama` (belirteç yok ya da biçimsiz), `istek-siniri`, tema demosunda `bulunamadi`.

### POST /kapi/herkese-acik/kartla-odeme/bildirim

Ödeme kuruluşunun sunucudan bildirimi (iyzico'nun webhook'u, ödeme formu biçimi). İmzası `X-IYZ-SIGNATURE-V3` başlığıyla gizli anahtardan doğrulanır; tutarsa dönüşle aynı tamamlama çalışır: müşteri dönmese de sipariş kurulur. Aynı bildirim iki kez gelse de sipariş bir kez kurulur. Tema demosunda kapalıdır.

- İzin: `herkese-acik`. Sınır: `bildirim`. Dış kuruluşun dönüşü (`disKurulus`).
- Girdi: `{ "token", "paymentConversationId", "iyziEventType"?, "iyziPaymentId"?, "status"? }` (JSON; `bildirimSemasi`).
- Servis: `cekirdek/eklentiler/kartla-odeme/servis.ts` (`tamamla`), imza `iyzico.ts` (`bildirimiDogrula`).
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `yetki` (imza yok ya da tutmuyor, anahtar yok), `dogrulama`, `istek-siniri`, tema demosunda `bulunamadi`.

### GET /kapi/herkese-acik/kartla-odeme/taksitler

Ürün sayfasının taksit penceresi: birimin bir adedinin vergi dahil tutarıyla bankalara göre taksitler, mağaza sahibinin en çok taksit sayısına kadar. Tablo ödeme kuruluşundan gelir (kart numarasız), tutarlar sitenin biçimiyle yazılıdır. Tema demosunda kapalıdır.

- İzin: `herkese-acik`. Sınır: `genel`.
- Girdi: `?birim=<kimlik>` (`taksitlerSemasi`).
- Servis: `cekirdek/eklentiler/kartla-odeme/servis.ts` (`taksitTablosu`).
- Başarılı (200): `{ "basarili": true, "veri": { "enCok", "bankalar": [{ "banka", "aile", "taksitler": [{ "sayi", "aylik", "toplam" }] }] } }`.
- Hatalar: `bulunamadi` (eklenti kapalı, anahtar yok, mağaza sahibi satırı göstermiyor, birim satılamıyor), `hizmet-kullanilamiyor` (kuruluşa ulaşılamadı), `dogrulama`, `istek-siniri`, tema demosunda `bulunamadi`.

### POST /kapi/herkese-acik/havale-bildirimi

Üye olmayan müşteri havaleyle ödediğini bildirir (kart 0214, karar 0141): sipariş numarası ve siparişteki e-postayla. Bildirim siparişe yazılır; bildirimli sipariş süre dolunca kendiliğinden iptal olmaz (kullanıcı kararı). Tema demosunda kapalıdır.

- İzin: `herkese-acik`. Sınır: `siki`.
- Girdi: `{ "numara", "eposta", "gonderen", "hesap", "tutar", "odemeTarihi", "not"?, "robotCevabi" }` (`misafirHavaleBildirimiGirdisi`, `cekirdek/moduller/siparis/semalar.ts`). `hesap` mağazanın banka hesaplarından birinin kimliği; `tutar` sitenin para biçimiyle yazılı ("1.399,60"); `odemeTarihi` `YYYY-AA-GG`.
- Servis: `cekirdek/moduller/siparis/servis.ts`. Robot cevabı veritabanına bakılmadan önce denetlenir.
- Başarılı (200): `{ "basarili": true, "veri": { "numara" } }`.
- Hatalar: `bulunamadi` (numara ile e-posta eşleşmedi; siparişin var olup olmadığı belli olmaz), `is-kurali` (`havale-beklemiyor`: sipariş havale değil ya da ödeme beklemiyor; `bildirim-siniri`: siparişe en çok 5 bildirim), `dogrulama` (`numara-bicimi`, `tutar-okunamadi`, `tarih-bicimi`, `tarih-gecersiz`: siparişten önceki ya da ileri tarih, `hesap-yok`), `robot-dogrulamasi`, `istek-siniri`, `yetki` (sahte istek), tema demosunda `bulunamadi`.

### POST /kapi/herkese-acik/musteri-giris

Şifre doğruysa müşteri oturumu açar. Müşterinin iki aşamalı girişi yoktur.

- İzin: `herkese-acik`. Sınır: `siki`. Ayrıca yanlış denemeler hesap ve bağlantı başına sayılır (`girisDenemeSiniri`, `cekirdek/kayitlar/oturum.ts`).
- Girdi: `{ "eposta", "sifre" }` (`girisSemasi`, `cekirdek/moduller/oturum/semalar.ts`).
- Servis: `cekirdek/moduller/musteri/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }` ve iki oturum çerezi.
- Hatalar: `giris-hatasi` (yanlış e-posta ya da şifre), `istek-siniri` (`Retry-After` ile), `dogrulama`, `yetki` (sahte istek).

### POST /kapi/herkese-acik/musteri-cikis

Müşteri oturumunu kapatır, çerezleri siler. Süresi dolmuş oturumun çerezleri de silinsin diye izin istemez.

- İzin: `herkese-acik`. Sınır: `genel`.
- Girdi: yok. Oturum yoksa da 200 döner.
- Servis: `cekirdek/moduller/oturum/giris.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }` ve çerezleri silen başlıklar.

### POST /kapi/herkese-acik/musteri-sifre-sifirlama

Şifre yenileme bağlantısı ister. Kayıtlı olsa da olmasa da cevap aynıdır, her cevap en az aynı süreyi bekler; süre farkının sınırı karar 0052'de yazılı.

- İzin: `herkese-acik`. Sınır: `siki`. Ayrıca hesap başına 15 dakikalık ve günlük e-posta sınırı vardır (`sifreSifirlamaAyari`), dolunca cevap yine aynıdır.
- Girdi: `{ "eposta", "robotCevabi" }` (`sifirlamaIstekSemasi`, `cekirdek/moduller/oturum/semalar.ts`).
- Servis: `cekirdek/moduller/oturum/sifre-sifirlama.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `robot-dogrulamasi`, `istek-siniri` (`Retry-After` ile), `dogrulama`, `yetki` (sahte istek).

### POST /kapi/herkese-acik/musteri-sifre-yenile

Bağlantıdaki anahtarla yeni şifre belirler, bağlantıyı harcar, bütün oturumları kapatır, "şifreniz değişti" e-postasını kuyruğa koyar. Oturum açmaz (karar 0052).

- İzin: `herkese-acik`. Sınır: `siki`.
- Girdi: `{ "anahtar", "sifre" }` (`sifreYenileSemasi`).
- Servis: `cekirdek/moduller/oturum/sifre-sifirlama.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `is-kurali` (geçersiz, kullanılmış ya da süresi dolmuş bağlantı), `istek-siniri` (`Retry-After` ile), `dogrulama` (kısa şifre gibi; bağlantı harcanmaz), `yetki` (sahte istek).

### POST /kapi/herkese-acik/yonetici-sifre-sifirlama

Müşterinin ucuyla aynı, yönetici hesaplarında çalışır.

- İzin: `herkese-acik`. Sınır: `siki`. Hesap başına e-posta sınırı aynıdır.
- Girdi: `{ "eposta", "robotCevabi" }` (`sifirlamaIstekSemasi`).
- Servis: `cekirdek/moduller/oturum/sifre-sifirlama.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `robot-dogrulamasi`, `istek-siniri` (`Retry-After` ile), `dogrulama`, `yetki` (sahte istek).

### POST /kapi/herkese-acik/yonetici-sifre-yenile

Müşterinin ucuyla aynı. Ayrıca yarım kalmış giriş adımlarını siler, değişiklik kaydına yazar. İki aşamalı girişe dokunmaz: yönetici yine kod girer (karar 0052).

- İzin: `herkese-acik`. Sınır: `siki`.
- Girdi: `{ "anahtar", "sifre" }` (`sifreYenileSemasi`).
- Servis: `cekirdek/moduller/oturum/sifre-sifirlama.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `is-kurali` (geçersiz, kullanılmış ya da süresi dolmuş bağlantı), `istek-siniri` (`Retry-After` ile), `dogrulama`, `yetki` (sahte istek).

## Müşteri

### GET /kapi/musteri/hesabim

Müşterinin kendi hesabını döner. Vitrin oturumu buradan sorar: sayfa çizerken oturum okunamaz (karar 0039). Girişsiz ziyaretçi için 401 olağandır, tarayıcı konsolunda görünür (karar 0051).

- İzin: `musteri.kendi-hesabi.gor`. Sınır: `genel`.
- Girdi: yok. Kimlik yalnız kapıdan gelir.
- Servis: `cekirdek/moduller/musteri/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "eposta": "..." } }`, gerekirse yenilenen oturum çerezleri.
- Hatalar: `oturum-yok`.

### GET /kapi/musteri/yorum-izni

Müşteri bu ürüne yorum yazabilir mi (kart 0139, karar 0109). Ürün sayfasındaki "Yorum yaz" düğmesi formu açmadan önce sorar: sayfa çizilirken müşterinin oturumu okunamaz.

- İzin: `yorum.kendi.yaz`. Sınır: `genel`.
- Girdi: adres parametresi `urun` (ürünün kimliği; `yorumIzniSemasi`, `cekirdek/moduller/yorum/semalar.ts`). Müşterinin kimliği yalnız kapıdan gelir.
- Servis: `cekirdek/moduller/yorum/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "izin": "yazabilir" | "satin-alma-gerekli" | "yorum-yazildi" } }`.
- Hatalar: `dogrulama`, `oturum-yok`, `bulunamadi` (`urun-yok`: ürün yok ya da sayfası açılmıyor).

### POST /kapi/musteri/yorum

Müşterinin ürüne yorumu (kart 0139, karar 0109). Yorum onay bekler; mağaza onaylayınca yayınlanır. Görünen ad kayda kısaltılmış girer ("Ayşe Y."). Bir müşteri bir ürüne bir yorum yazar.

- İzin: `yorum.kendi.yaz`. Sınır: `siki`.
- Girdi: `{ "urun", "puan", "baslik"?, "metin", "ad", "robotCevabi" }` (`yorumGirdisi`). Müşterinin kimliği yalnız kapıdan gelir.
- Servis: `cekirdek/moduller/yorum/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `dogrulama` (şemaya uymayan girdi; `metin-gecersiz`), `robot-dogrulamasi`, `oturum-yok`, `bulunamadi` (`urun-yok`), `is-kurali` (`satin-alma-gerekli`: "Yalnız satın alanlar yorum yapabilir" açık ve müşteri ürünü satın almamış), `cakisma` (`yorum-yazildi`: müşterinin bu ürüne yorumu var), `istek-siniri`.

### GET /kapi/musteri/favoriler

Müşterinin favorileri (kart 0140, karar 0110). Vitrin girişli müşterinin favori durumunu sayfa yüklemesi başına bir kez, hesap durumundan sonra sorar; bütün favori düğmeleri cevabı paylaşır.

- İzin: `favori.kendi.gor`. Sınır: `genel`.
- Girdi: yok (`favorilerSemasi`, `cekirdek/moduller/favori/semalar.ts`). Müşterinin kimliği yalnız kapıdan gelir.
- Servis: `cekirdek/moduller/favori/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "favoriler": ["<ürün kimliği>", ...] } }`: yalnız vitrinde sayfası açılan ürünler, en yeni önce.
- Hatalar: `oturum-yok`.

### POST /kapi/musteri/favori

Ürünü favorilere ekler ya da çıkarır (kart 0140, karar 0110). Zaten favorideki ürünü eklemek ve favoride olmayanı çıkarmak bir şey değiştirmez.

- İzin: `favori.kendi.degistir`. Sınır: `genel`.
- Girdi: `{ "urun", "favoride" }` (`favoriSemasi`). Müşterinin kimliği yalnız kapıdan gelir.
- Servis: `cekirdek/moduller/favori/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "favoriler": [...] } }`: güncel liste.
- Hatalar: `dogrulama`, `oturum-yok`, `bulunamadi` (`urun-yok`: eklenen ürün yok ya da sayfası açılmıyor), `is-kurali` (`favori-siniri`: favori sayısı sitenin sınırında).

### POST /kapi/musteri/favori-birlestir

Üye olmayan müşterinin tarayıcısındaki listeyi giriş ya da kayıttan sonra hesabına birleştirir (kart 0140, karar 0110). Hesapta olan ürün ikinci kez eklenmez; sayfası açılmayan ürün atlanır; sınıra sığmayanlar (tarayıcıdaki en eskiler) eklenmez.

- İzin: `favori.kendi.degistir`. Sınır: `genel`.
- Girdi: `{ "urunler": ["<ürün kimliği>", ...] }`, en yeni önce, en çok 100 (`favoriBirlestirSemasi`). Müşterinin kimliği yalnız kapıdan gelir.
- Servis: `cekirdek/moduller/favori/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "favoriler": [...], "sigmayan": 0 } }`.
- Hatalar: `dogrulama`, `oturum-yok`.

### POST /kapi/musteri/odeme

Giriş yapmış müşterinin ödeme adımı (kart 0213, karar 0140): herkese açık ödeme ucuyla aynı, oturum ve sipariş müşterinin hesabına açılır (kart 0214). E-posta hesabındandır; pazarlama izni işaretlenirse hesabın onaylarına da yeni satır olarak yazılır (işaretsiz bırakmak var olan izni geri almaz).

- İzin: `odeme.kendi.baslat`. Sınır: `siki`.
- Girdi: `{ "bilgiler", "kalemler", "robotCevabi", "onceki"?, "gorulenToplam"? }` (`uyeOdemeGirdisi`). Müşterinin kimliği yalnız kapıdan gelir; `onceki` müşterinin kendi oturumuysa ya da üye olmadan açılmış oturumsa (aynı sekmede giriş yapıp yeniden onaylayan müşteri) silinir, başka üyeninki silinmez.
- Servis: `cekirdek/moduller/odeme/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "oturum", "siparis" } }` ve sipariş alındı sayfasının erişim çerezi; kartla ödemede `{ "oturum", "yonlendir" }` (kart 0215), çerezsiz.
- Hatalar: herkese açık ödeme ucunun hataları (hesap açma ve `uyeOlmadanAlisveris` dışında), `oturum-yok`.

### POST /kapi/musteri/havale-bildirimi

Giriş yapmış müşteri kendi havale siparişi için ödediğini bildirir (kart 0214, karar 0141). Kurallar herkese açık uçla aynıdır; e-posta istenmez, sipariş yalnız müşterinin kendi hesabınınsa bulunur. Robot sorusu sorulmaz.

- İzin: `siparis.kendi.havale-bildir`. Sınır: `siki`.
- Girdi: `{ "numara", "gonderen", "hesap", "tutar", "odemeTarihi", "not"? }` (`uyeHavaleBildirimiGirdisi`). Müşterinin kimliği yalnız kapıdan gelir.
- Servis: `cekirdek/moduller/siparis/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "numara" } }`.
- Hatalar: `bulunamadi` (sipariş yok ya da başka hesabın), `is-kurali` (`havale-beklemiyor`, `bildirim-siniri`), `dogrulama`, `oturum-yok`, `istek-siniri`.

### GET /kapi/musteri/son-teslimat

Giriş yapmış müşterinin en son siparişinin teslimat bilgisi (kart 0214, karar 0141): ödeme adımı onu "Son siparişimdeki adresi kullan" ile önerir.

- İzin: `odeme.kendi.baslat`. Sınır: `genel`.
- Girdi: yok. Müşterinin kimliği yalnız kapıdan gelir.
- Servis: `cekirdek/moduller/siparis/servis.ts` (`sonTeslimat`).
- Başarılı (200): `{ "basarili": true, "veri": { "teslimat": { "ad", "soyad", "telefon"?, "adres" } | null } }`. Siparişi yoksa `null`.
- Hatalar: `oturum-yok`, `istek-siniri`.

### POST /kapi/musteri/stok-bildirimi

Giriş yapmış müşteri tükenmiş birim için "stoğa gelince haber ver" talebi bırakır (eklenti, kart 0144, karar 0117). E-posta müşterinin hesabındandır, girdiden alınmaz. Kurallar herkese açık uçla aynıdır; robot sorusu sorulmaz.

- İzin: `stok-bildirimi.kendi.iste`. Sınır: `genel`.
- Girdi: `{ "birim" }` (`uyeStokBildirimiTalebiSemasi`). Müşterinin kimliği yalnız kapıdan gelir.
- Servis: `cekirdek/eklentiler/stoga-gelince-haber-ver/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `bulunamadi` (eklenti kapalı; birim yok, silinmiş ya da ürünün sayfası açılmıyor), `is-kurali` (`talep-alinamaz`), `oturum-yok`, `dogrulama`, `istek-siniri`.

## Yönetici

Yönetici uçları iki aşamalı girişten geçmiş oturum ister. Girişsiz istek `oturum-yok`, izni olmayan rol `yetki` alır.

### GET /kapi/yonetici/odeme-yontemleri

Panelin ödeme yöntemleri ve banka hesapları ekranlarının verisi (kart 0214, karar 0141): kayıttaki bütün yöntemler ayarın sırasıyla ve açık olup olmadıklarıyla (listede olmayan kapalı ve sonda), kapıda ödemenin seçenekleri, havalenin iptal süresi (gün) ve banka hesapları.

- İzin: `odeme-yontemi.gor`. Sınır: `genel`.
- Girdi: yok.
- Servis: `cekirdek/moduller/odeme/yontemler.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "yontemler": [{ "kod", "acik" }], "kapidaOdemeSecenekleri", "havaleIptalSuresi", "bankaHesaplari": [{ "kimlik", "banka", "sahip", "iban" }] } }`.

### POST /kapi/yonetici/odeme-yontemleri

Yöntemleri, sıralarını, kapıda ödemenin seçeneklerini ve havalenin iptal süresini birlikte kaydeder. Her değişen ayar değişiklik kaydına girer (`magaza-ayari.degisti`); aynı kalan girmez.

- İzin: `odeme-yontemi.degistir` (yalnız mağaza sahibi, kullanıcı kararı). Sınır: `genel`.
- Girdi: `{ "yontemler": [{ "kod", "acik" }], "kapidaOdemeSecenekleri", "havaleIptalSuresi" }` (`odemeYontemleriSemasi`, `cekirdek/moduller/odeme/yontem-semalari.ts`). Liste kayıttaki her yöntemi bir kez taşır; süre gün olarak yazılıdır.
- Başarılı (200): GET ile aynı veri.
- Hatalar: `dogrulama` (`yontem-listesi`, `secenek-gerekli`, `secenek-tekrari`; alanın koduyla `en-az-bir-yontem`: müşterinin kullanabileceği yöntem kalmıyor, banka hesabı olmayan havale sayılmaz; `gun-gecersiz`; hiçbir ayar değişmez), `yetki`.

Ekran sıralamayı bu uçla değil, aşağıdaki sıralama ucuyla hemen kaydeder (kart 0224, karar 0144); bu uç sırayı yine kabul eder.

### POST /kapi/yonetici/odeme-yontemleri-sirala

Yalnız yöntemlerin sırasını kaydeder (kart 0224, karar 0144). Açık-kapalı bilgisi, kapıda ödemenin seçenekleri ve iptal süresi kayıtlı hâliyle kalır. Sitede görünmeyen yöntemin kayıtlı satırı sona korunur. Değişiklik kaydına girer (`magaza-ayari.degisti`); aynı sıra girmez.

- İzin: `odeme-yontemi.degistir`. Sınır: `genel`.
- Girdi: `{ "sira": [kod] }` (`odemeYontemleriSiralamaSemasi`): ekranın gördüğü bütün yöntemlerin kodu yeni sırasıyla.
- Başarılı (200): GET ile aynı veri.
- Hatalar: `cakisma` (`liste-degisti`: eksik, fazla ya da tekrarlı liste; sitedeki yöntemler değişti), `yetki`.

### POST /kapi/yonetici/banka-hesabi-ekle

Havalenin banka hesaplarına hesap ekler; numara IBAN olarak doğrulanır (`cekirdek/bolgeler/iban.ts`) ve boşluksuz saklanır.

- İzin: `odeme-yontemi.degistir`. Sınır: `genel`.
- Girdi: `{ "banka", "sahip", "iban" }` (`bankaHesabiSemasi`).
- Başarılı (200): GET ile aynı veri.
- Hatalar: `dogrulama` (alan `iban`: `iban-bicimi`, `iban-ulke`, `iban-uzunluk`, `iban-kontrol`, `iban-ayni`), `is-kurali` (`hesap-siniri`), `yetki`.

### POST /kapi/yonetici/banka-hesabi-degistir

- İzin: `odeme-yontemi.degistir`. Sınır: `genel`.
- Girdi: `{ "kimlik", "banka", "sahip", "iban" }` (`bankaHesabiDegisikligiSemasi`).
- Başarılı (200): GET ile aynı veri.
- Hatalar: `bulunamadi`, ekleme ucunun `dogrulama` kodları, `yetki`.

### POST /kapi/yonetici/banka-hesabi-sil

- İzin: `odeme-yontemi.degistir`. Sınır: `genel`.
- Girdi: `{ "kimlik" }`.
- Başarılı (200): GET ile aynı veri. Son hesap silinince havale ödeme adımında görünmez.
- Hatalar: `bulunamadi`, `is-kurali` (`son-yontem`: son hesap ve müşterinin kullanabileceği başka yöntem yok), `yetki`.

### POST /kapi/yonetici/banka-hesaplari-sirala

- İzin: `odeme-yontemi.degistir`. Sınır: `genel`.
- Girdi: `{ "sira": [kimlik] }`: ekranın gördüğü bütün hesaplar yeni sırasıyla.
- Başarılı (200): GET ile aynı veri.
- Hatalar: `cakisma` (`liste-degisti`: eksik, fazla ya da tekrarlı liste; arada hesap eklendi ya da silindi), `yetki`.

### GET /kapi/yonetici/siparisler

Panelin sipariş listesi (kart 0234, karar 0145): en yeni önce, sayfa başına `siparisSinirlari.sayfaBoyu`. Durum süzgeci, aranan metin (numara, e-posta ya da ad soyad; harf ayrımsız, `%` ve `_` joker değildir) ve sayfa. Durum sayıları aranan metinden bağımsızdır. `havaleBildirildi` yalnız ödeme bekleyen ve bildirimi olan siparişte doğrudur.

- İzin: `siparis.gor`. Sınır: `genel`.
- Girdi (sorgu): `durum` (`siparisDurumlari`), `ara`, `sayfa` (`siparisListesiSemasi`, `cekirdek/moduller/siparis/semalar.ts`). Sınır dışı sayfa son sayfaya çekilir.
- Servis: `cekirdek/moduller/siparis/yonetim.ts`.
- Başarılı (200): `{ "satirlar": [{ "kimlik", "numara", "zaman", "ad", "soyad", "uye", "durum", "odemeYontemi", "kapidaSecenegi", "toplam", "paraBirimi", "havaleBildirildi" }], "toplam", "sayfa", "sayfaSayisi", "sayilar": { "<durum>": sayı } }`.

### GET /kapi/yonetici/siparis

Bir siparişin ayrıntısı: sipariş satırı (erişim anahtarının özeti olmadan), kalemleri, geçmişi ve notları (en yeni önce, yazanın e-postası ya da sistem işleminin adıyla) ve havale bildirimleri.

- İzin: `siparis.gor`. Sınır: `genel`.
- Girdi (sorgu): `numara` (büyük küçük harf ve boşluk düzelir).
- Başarılı (200): `{ "siparis", "kalemler", "gecmis": [{ "zaman", "onceki", "sonraki", "neden", "yazan" }], "notlar": [{ "zaman", "tur", "metin", "yazan" }], "bildirimler", "iadeler": [{ "kimlik", "tur", "durum", "yontem", "tutar", "vergi_dokumu", "kalemler", "kargo_tutari", "stoga_konacak", "neden", "aciklama", "olusturma_zamani", "sonuc_zamani", "yazan" }] }` (iadeler kart 0235).
- Hatalar: `bulunamadi`, `dogrulama`.

### POST /kapi/yonetici/siparis-islemi

Siparişin durum işlemi (`siparisIslemleri`, `cekirdek/kayitlar/siparis.ts`): `hazirlamaya-al` (kapıda ödeme, ödeme bekleniyor → hazırlanıyor), `kargoya-ver` (hazırlanıyor → kargoda), `kargo-duzelt` (kargoda kalır, firma ve takip numarası değişir), `teslim-edildi` (kargoda → teslim edildi; kapıda ödemede ödemenin alındığı an yazılır). Siparişin satırı kilitlenir; geçmişe kim, ne zaman, neden ile yazılır.

- İzin: `siparis.yonet`. Sınır: `genel`.
- Girdi: `{ "numara", "islem", "gorulenDurum", "kargo"?: { "firma", "takipNumarasi"? } }` (`siparisIslemiSemasi`). `kargo` yalnız kargo işlemlerinde verilir; firma sipariş ayarlarındaki listedeki kimliktir.
- Başarılı (200): `{ "numara", "durum" }`.
- Hatalar: `cakisma` (`durum-degisti`: ekranın gördüğü durum artık geçerli değil; hiçbir şey yazılmaz), `is-kurali` (`gecis-yok`, `yontem-uymuyor`), `dogrulama` (`kargo-gerekli`, `kargo-fazla`, alan `kargo.firma`: `firma-yok`; `takip-numarasi-bicimi`), `bulunamadi`, `yetki`.

### POST /kapi/yonetici/siparis-havale-onayi

Havale siparişinin ödemesi alındı: ödeme bekleniyor → hazırlanıyor, ödemenin alındığı an yazılır. Onaylanan siparişi iptal taraması iptal etmez.

- İzin: `siparis.havale-onayla` (görevlide yok, kullanıcı kararı). Sınır: `genel`.
- Girdi: `{ "numara", "gorulenDurum" }` (`havaleOnayiSemasi`).
- Başarılı (200): `{ "numara", "durum" }`.
- Hatalar: işlem ucunun `cakisma`, `is-kurali` ve `bulunamadi` kodları, `yetki`.

### POST /kapi/yonetici/siparis-iadesi

Siparişin iptali ya da iadesi (kart 0235, karar 0147). İptal ödeme bekleniyor ve hazırlanıyor durumunda, iade teslim edildi ve kısmi iade durumunda yapılır; bütün ürünler ve kargo iptale girer. Tutar ve vergi siparişin saklanan değerlerinden hesaplanır (`iadeyiHesapla`, `cekirdek/moduller/siparis/iade-hesabi.ts`); siparişin kalanının tamamı seçildiyse ödenen kalan (taksit farkı dahil) iade edilir. Elle tutar hesaplananın yerine geçer, ödenen kalanı aşamaz. Kartla ödenen siparişte para ödeme kuruluşundan döner: kuruluş onaylayınca iade tamamlanır, reddederse iade başarısızdır ve sipariş değişmez, yanıt gelmezse iade bekler (tarama sonucu sorar). Öteki yöntemlerde para mağaza sahibince elle gönderilir, iade kaydedilince yapılmış sayılır (kullanıcı kararı). Tamamlanan iade siparişin durumunu (iptal, kısmi iade, iade edildi), seçildiyse stoğu (yalnız siparişin düşürdüğü adet), geçmişi ve değişiklik kaydını aynı işlemde yazar.

- İzin: `siparis.iade` (yalnız mağaza sahibi, kullanıcı kararı). Sınır: `genel`.
- Girdi: `{ "numara", "tur": "iptal" | "iade", "gorulenDurum", "kalemler": [{ "sira", "adet" }], "kargo", "tutar"?, "stogaKoy", "neden", "aciklama"? }` (`siparisIadesiSemasi`). `tutar` sitenin para biçimiyle yazıdır; iptalde ürün ve tutar yok sayılır.
- Başarılı (200): `{ "numara", "durum", "iade": "tamamlandi" | "bekliyor" | "basarisiz" }`.
- Hatalar: `cakisma` (`durum-degisti`; `iade-bekliyor`: kuruluşun yanıtını bekleyen iade var), `is-kurali` (`gecis-yok`; alan `tutar`: `tutar-fazla`, `odenmemis`), `dogrulama` (alan `kalemler.<sıra>`: `kalem-yok`, `adet-fazla`; alan `kargo`: `kargo-iade-edildi`; alan `kalemler`: `bos-iade`; alan `tutar`: `tutar-okunamadi`, `tutar-gecersiz`), `bulunamadi`, `yetki`.

### POST /kapi/yonetici/siparis-iadesi-yeniden

Kuruluşun yanıtını bekleyen iadeyi yeniden dener: reddedilen parçalar yeniden gönderilir, yanıtı gelmeyen parçalar gönderilmez (tarama sorar).

- İzin: `siparis.iade`. Sınır: `genel`.
- Girdi: `{ "numara" }` (`iadeYenidenDenemeSemasi`).
- Başarılı (200): siparis-iadesi ile aynı.
- Hatalar: `cakisma` (`iade-yok`: bekleyen iade yok), `yetki`.

### GET /kapi/yonetici/elle-siparis-urunleri

Elle siparişe eklenebilecek ürün birimleri (kart 0236, karar 0148): vitrin aramasının kuralıyla yalnız sayfası vitrinde açılan ürünler (en çok 10, en uygun önce), her birinin silinmemiş birimleri, sepetin hesabıyla fiyat ve satılabilirlik.

- İzin: `siparis.yonet`. Sınır: `genel`.
- Girdi (sorgu): `ara` (`elleSiparisAramaSemasi`).
- Servis: `cekirdek/moduller/siparis/elle.ts`.
- Başarılı (200): `{ "birimler": [{ "birim", "ad", "secim", "yaziliFiyat", "satilabilir" }] }`.
- Hatalar: `dogrulama` (boş arama), `yetki`.

### GET /kapi/yonetici/elle-siparis-musterileri

E-postasında aranan üye müşteriler (silinmiş hesap yok, en çok 10), her birinin son siparişindeki teslimat (kişisel bilgisi silinmemiş) adres önerisi olarak.

- İzin: `siparis.yonet`. Sınır: `genel`.
- Girdi (sorgu): `ara` (en az 3 harf, `elleSiparisMusteriAramasiSemasi`: e-postalar harf harf denenerek toplanmaz).
- Başarılı (200): `{ "musteriler": [{ "kimlik", "eposta", "sonTeslimat" }] }` (`sonTeslimat` yoksa `null`).
- Hatalar: `dogrulama` (3 harften kısa arama), `yetki`.

### POST /kapi/yonetici/elle-siparis-hesabi

Elle sipariş ekranının özeti: vitrinin sepet ucuyla aynı hesap ve görünüm (`sepetGorunumu`); teslimat ve fatura bölgesi verilirse vergi onlarla hesaplanır.

- İzin: `siparis.yonet`. Sınır: `genel`.
- Girdi: `{ "kalemler": [{ "birim", "adet" }], "vergiBolgeleri"? }` (`sepetSemasi`).
- Başarılı (200): sepet ucuyla aynı.

### POST /kapi/yonetici/elle-siparis

Panelden sipariş kurar: vitrin siparişiyle aynı yoldan, oturum, stok ayırması ve sipariş tek işlemde (`odemeServisi.elleSiparisVer`). Tutar sunucunun hesabıdır; stok "yeterliyse düş" ile düşer, başka oturumların ayırmaları sayılır. Üye olmadan alışveriş ayarı bağlamaz. Havale ve kapıda ödemede sipariş "ödeme bekleniyor", "elden" ödemede "hazırlanıyor" açılır. Ön bilgilendirme formu ve mesafeli satış sözleşmesinin iletildiği yöneticinin beyanıdır, siparişin onaylarına beyan eden yöneticiyle yazılır; pazarlama izni verilmez. Geçmişe "panelden-olusturuldu" nedeniyle ve değişiklik kaydına (`siparis.panelden-olusturuldu`) siparişi giren yönetici yazılır.

- İzin: `siparis.yonet`; "elden" yöntemi ayrıca `siparis.elden-tahsil` ister (görevlide yok), yoksa `yetki`. Sınır: `genel`.
- Girdi: `{ "musteri": { "tur": "uye", "kimlik" } | { "tur": "misafir", "eposta" }, "kalemler", "bilgiler": { "odemeYontemi": { "yontem": "havale" } | { "yontem": "kapida-odeme", "secenek" } | { "yontem": "elden" }, "teslimat", "fatura", "not"?, "metinlerIletildi": true }, "gorulenToplam"? }` (`elleSiparisSemasi`).
- Başarılı (200): `{ "numara" }`.
- Hatalar: `is-kurali` (`sepet-degisti`, `sepet-bos`, `yontem-kapali`), `cakisma` (`stok-ayrildi`), `dogrulama` (alan `musteri.kimlik`: `musteri-yok`, seçilen üyenin hesabı silinmiş; şemanın alan hataları), `yetki`.

### POST /kapi/yonetici/siparis-notu

Siparişe not ekler. İç not (`ic`) yalnız panelde, müşteriye not (`musteri`) müşterinin sipariş ayrıntısında görünür (e-postası kart 0240). Not değiştirilemez.

- İzin: `siparis.yonet`. Sınır: `genel`.
- Girdi: `{ "numara", "tur", "metin" }` (`siparisNotuSemasi`; en çok `siparisSinirlari.notEnCok` harf, düz metin).
- Başarılı (200): `{ "numara" }`.
- Hatalar: `bulunamadi`, `dogrulama`, `yetki`.

### GET /kapi/yonetici/siparis-ayarlari

Sipariş ayarları ekranının verisi: kargo firmaları (`kargoFirmalari`, mağaza ayarı).

- İzin: `magaza-ayarlari.gor`. Sınır: `genel`.
- Girdi: yok.
- Servis: `cekirdek/moduller/siparis/ayarlar.ts`.
- Başarılı (200): `{ "kargoFirmalari": [{ "kimlik", "ad", "takipAdresi"? }] }`.

### POST /kapi/yonetici/siparis-ayarlari

Kargo firmaları listesini ekranın gördüğü hâlinden yeni hâline değiştirir. Liste kilidin içinde okunur; yeni firmaya kimlik servis verir. Değişiklik kaydına girer (`magaza-ayari.degisti`); aynı liste girmez.

- İzin: `magaza-ayarlari.degistir`. Sınır: `genel`.
- Girdi: `{ "onceki": [kimlik], "firmalar": [{ "kimlik"?, "ad", "takipAdresi"? }] }` (`kargoFirmalariSemasi`). Takip adresi `https://` ile başlar ve `{takip}` işaretini tam bir kez taşır.
- Başarılı (200): GET ile aynı veri.
- Hatalar: `cakisma` (`liste-degisti`: arada firma eklendi ya da silindi), `dogrulama` (alan `firmalar.<sıra>.takipAdresi`: `takip-adresi-gecersiz`), `yetki`.

### GET /kapi/yonetici/kargo-ayarlari

Panelin kargo ekranının verisi (kart 0212): kargo ücreti, ücretsiz kargo sınırı, kargoya verme süresi (iş günü) ve sınırın indirimden önceki mi sonraki mi tutara baktığı. Tutarlar kuruştur.

- İzin: `magaza-ayarlari.gor`. Sınır: `genel`.
- Girdi: yok. Adres parametresi verilirse `dogrulama`.
- Servis: `cekirdek/moduller/kargo/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "kargoUcreti", "ucretsizKargoSiniri"?, "ucretsizKargoTutari", "kargoyaVermeSuresi" } }`. Sınır yoksa `ucretsizKargoSiniri` yoktur.

### POST /kapi/yonetici/kargo-ayarlari

Kargo ayarlarını birlikte değiştirir (kart 0212, karar 0135). Tutarlar sitenin para biçimiyle yazılı gelir, sunucuda kuruşa çevrilir. Değişen her ayar değişiklik kaydına girer (`magaza-ayari.degisti`); aynı kalan girmez.

- İzin: `magaza-ayarlari.degistir`. Sınır: `genel`.
- Girdi: `{ "kargoUcreti", "ucretsizKargoSiniri", "ucretsizKargoTutari", "kargoyaVermeSuresi" }` (`kargoAyarlariSemasi`, `cekirdek/moduller/kargo/semalar.ts`). `ucretsizKargoSiniri` boşsa sınır kalkar. `ucretsizKargoTutari`: `indirimden-sonra` ya da `indirimden-once`.
- Servis: `cekirdek/moduller/kargo/servis.ts`.
- Başarılı (200): GET ile aynı veri, değişiklikten sonraki hâl.
- Hatalar: `dogrulama` (şemaya uymayan girdi; alanın koduyla `tutar-okunamadi`, `tutar-sinir-disi` ya da `gun-gecersiz`; hiçbir ayar değişmez), `yetki` (sahte istek ya da izin yok).

### GET /kapi/yonetici/tema

Panelin tema ekranının verisi (kart 0113): geçerli tema sürümü, sitenin kullanabileceği temalar ve mağaza sahibinin temayı değiştirip değiştiremeyeceği. Sürüm yoksa başlangıç sürümü bir kez yazılır.

- İzin: `tema.gor`. Sınır: `genel`.
- Girdi: yok. Adres parametresi verilirse `dogrulama`.
- Servis: `cekirdek/moduller/tema/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "surum": { "sira", "tema", "ayarlar", "geriDonulenSira" }, "temalar": [{ "kod", "kaynak", "ad" }], "degistirilebilir": true } }`.

### POST /kapi/yonetici/tema

Temayı ve ayarlarını yeni sürüm olarak yayınlar (karar 0080). Tema kodu değişiyorsa düzenin yolu seçilir: yeni temanın düzenini uygulamak ya da düzeni korumak (kart 0113, karar 0091). Tema ve düzen aynı işlemde yazılır, ikisi de değişiklik kaydına girer. Son sürümle aynıysa hiçbir şey yazılmaz.

- İzin: `tema.degistir`. Sınır: `genel`.
- Girdi: `{ "tema", "ayarlar", "duzen"? }` (`temaYayiniSemasi`, `cekirdek/moduller/tema/semalar.ts`). `duzen`: `uygula` ya da `koru`; tema aynıysa yok sayılır.
- Servis: `cekirdek/moduller/tema/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "sira", "tema", "ayarlar", "geriDonulenSira": null } }`.
- Hatalar: `dogrulama` (şemaya uymayan girdi; `tema-kullanilamaz`; temanın açmadığı renk ya da tanımsız seçenek; `kontrast-yetersiz` öneriyle (`oneri`); tema değişiyor ama `duzen` yok: `duzen-yolu-gerekli`), `is-kurali` (`tema-degistirilemez`: "Mağaza sahibi temayı değiştirebilir" kapalı), `yetki` (sahte istek ya da izin yok), `hizmet-kullanilamiyor` (`katalog-bekleniyor`: sitenin başlangıç düzeni kataloğa başvuruyor ve katalog henüz kurulmadı; kart 0114).

### POST /kapi/yonetici/tema-geri-don

Önceki bir tema sürümüne döner: o sürüm yeni sürüm olarak yazılır (karar 0080). Tema kodu değişiyorsa düzen de, dönülen sürüm geçerliyken son hâliyle getirilir; sonradan yapılan düzen değişiklikleri düzen geçmişinde kalır (kart 0113, karar 0091).

- İzin: `tema.degistir`. Sınır: `genel`.
- Girdi: `{ "sira"?, "son"? }` (`temaGeriDonusSemasi`). Sıra verilmezse bir önceki sürüm. `son`: ekranın gördüğü son sürümün sırası (kart 0148); verilirse ve son sürüm o değilse hiçbir şey yazılmaz.
- Servis: `cekirdek/moduller/tema/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "sira", "tema", "ayarlar", "geriDonulenSira" } }`.
- Hatalar: `dogrulama` (`surum-gecersiz`: olmayan, son ya da bozuk sıra), `cakisma` (`tema-degisti`: `son` verildi ve son sürüm o değil), `is-kurali` (`tema-degistirilemez`; `surum-kullanilamaz`: teması bugün kullanılamayan ya da bugünkü kurallardan geçmeyen sürüm), `yetki`, `hizmet-kullanilamiyor` (`katalog-bekleniyor`: sitenin başlangıç düzeni kataloğa başvuruyor ve katalog henüz kurulmadı; kart 0114).

### GET /kapi/yonetici/duzen

Panelin vitrin bölümleri ekranının verisi (kart 0142): üst kısım, ana sayfa ve alt kısmın bölümleri sırasıyla, vitrinde çizilmeyen bölümün nedeniyle; geçerli düzen sürümünün sırası ve bölüm formunun seçenekleri (silinmemiş kategori, marka, etiket, ürün, menü ve sitede kayıtlı görseller; her liste üst sınırlı, `panelSecenekSinirlari`). Sürüm yoksa başlangıç düzeni bir kez yazılır.

- İzin: `duzen.gor`. Sınır: `genel`.
- Girdi: yok (`duzenDurumuSemasi`, `cekirdek/moduller/duzen/semalar.ts`). Adres parametresi verilirse `dogrulama`.
- Servis: `cekirdek/moduller/duzen/servis.ts`, seçenekler `cekirdek/moduller/duzen/secenekler.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "sira", "alanlar": { "ust-kisim": [{ "bolum": { "kimlik", "tur", "gorunum", "gizli", "degerler" }, "cizilir", "neden"? }], "ana-sayfa": [...], "alt-kisim": [...] }, "secenekler": { "kategoriler", "markalar", "etiketler", "urunler", "menuler", "gorseller" } } }`.
- Hatalar: `dogrulama`, `oturum-yok`, `yetki`, `hizmet-kullanilamiyor` (`katalog-bekleniyor`; kart 0114).
- `cizilir` düzenin kuralıdır (gizli, işlevsiz, geçersiz). Vitrinde içeriği boş kaldığı için bugün çizilmeyen bölümü uç ayırmaz; panelin ekranı sunucuda vitrinin bağlamını okuyarak ayrıca işaretler (kart 0172, `bolumBosluklari`).

### POST /kapi/yonetici/duzen-bolum-ekle

Alana yeni bölüm ekler (kart 0142). Düzenin yeni sürümü olarak hemen yayınlanır (karar 0080). Sıra verilmezse alanın sonuna, `0` en üste.

- İzin: `duzen.degistir`. Sınır: `genel`.
- Girdi: `{ "alan", "tur", "gorunum"?, "gizli"?, "degerler", "sira"? }` (`bolumEklemeSemasi`). Değerler bölümün tarifinden denetlenir.
- Servis: `cekirdek/moduller/duzen/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "kimlik" } }`.
- Hatalar: `dogrulama` (şemaya ya da tarife uymayan değer, alanın yolu ve koduyla; `bolum-tanimsiz`, `bolum-alani-uygun-degil`, `gorunum-tanimsiz`; `kayit-yok`, `gorsel-gecersiz`: başvurulan kayıt yok ya da silinmiş; `alan-dolu`), `oturum-yok`, `yetki`, `hizmet-kullanilamiyor` (`katalog-bekleniyor`).

### POST /kapi/yonetici/duzen-bolum-degistir

Bölümün değerlerini (bütün olarak) ve görünümünü değiştirir (kart 0142). Aynı değer yazılırsa sürüm yazılmaz.

- İzin: `duzen.degistir`. Sınır: `genel`.
- Girdi: `{ "kimlik", "gorunum"?, "degerler"? }` (`bolumDegisikligiSemasi`).
- Servis: `cekirdek/moduller/duzen/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `dogrulama` (ekleme ile aynı kodlar), `bulunamadi` (bölüm yok), `oturum-yok`, `yetki`, `hizmet-kullanilamiyor` (`katalog-bekleniyor`).

### POST /kapi/yonetici/duzen-bolum-gorunurlugu

Bölümü gizler ya da gösterir (kart 0142). Değerlerine bakılmaz.

- İzin: `duzen.degistir`. Sınır: `genel`.
- Girdi: `{ "kimlik", "gizli" }` (`bolumGorunurluguSemasi`).
- Servis: `cekirdek/moduller/duzen/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `dogrulama`, `bulunamadi`, `oturum-yok`, `yetki`, `hizmet-kullanilamiyor` (`katalog-bekleniyor`).

### POST /kapi/yonetici/duzen-bolum-sil

Bölümü düzenden kaldırır (kart 0142). Bölüm önceki sürümlerde kalır: "önceki hâline dön" onu geri getirir.

- İzin: `duzen.degistir`. Sınır: `genel`.
- Girdi: `{ "kimlik" }` (`bolumSilmeSemasi`).
- Servis: `cekirdek/moduller/duzen/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "sira" } }`: silmenin yazdığı sürümün sırası. Panelin "Geri al"ı bu sırayla döner.
- Hatalar: `dogrulama`, `bulunamadi`, `oturum-yok`, `yetki`, `hizmet-kullanilamiyor` (`katalog-bekleniyor`).

### POST /kapi/yonetici/duzen-sirala

Bir alandaki bölümlerin yeni sırası (kart 0142): alandaki bütün bölümlerin kimlikleri, her biri bir kez.

- İzin: `duzen.degistir`. Sınır: `genel`.
- Girdi: `{ "alan", "kimlikler" }` (`bolumSiralamaSemasi`).
- Servis: `cekirdek/moduller/duzen/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `dogrulama` (`siralama-gecersiz`: eksik, fazla, tekrarlı ya da başka alanın kimliği), `oturum-yok`, `yetki`, `hizmet-kullanilamiyor` (`katalog-bekleniyor`).

### POST /kapi/yonetici/duzen-geri-don

Düzenin önceki hâline döner (kart 0142, karar 0080 ve 0115): bir önceki sürümün düzeni yeni sürüm olarak yazılır. Art arda çağrılırsa son iki hâl arasında gidip gelir. Çağıran gördüğü son sürümün sırasını verir: arada başka bir sürüm yazıldıysa (başka bir değişiklik, aynı düğmeye ikinci basış) hiçbir şey yazılmaz.

- İzin: `duzen.degistir`. Sınır: `genel`.
- Girdi: `{ "son" }` (`duzenGeriDonusSemasi`): ekranın gördüğü son sürümün sırası.
- Servis: `cekirdek/moduller/duzen/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "sira" } }`: geçerli sürümün sırası.
- Hatalar: `cakisma` (`duzen-degisti`: son sürüm `son` değil), `is-kurali` (`onceki-surum-yok`: düzenin tek sürümü var; `surum-kullanilamaz`: önceki hâlin başvurduğu bir kayıt sonradan silinmiş; `tema-degisikligi`: son sürümü tema değişikliği yazdı, tema geri dönüşüyle alınır), `dogrulama`, `oturum-yok`, `yetki`, `hizmet-kullanilamiyor` (`katalog-bekleniyor`).

### GET /kapi/yonetici/panel-gorseli

Paneldeki görsel önizlemesi (kart 0142): sitede kayıtlı bir görselin kayıttaki boyutu. Vitrin görseli ucu yalnız vitrinde kullanılan görseli verir; panel henüz seçilmemiş görseli de gösterir. Yanıt zarf değil, dosyanın kendisidir (`nosniff`, etiket, 304); yetkili uç olduğu için `Cache-Control: private` (ortak önbelleğe girmez). Hata zarfla döner.

- İzin: `duzen.gor`. Sınır: `gorsel`.
- Girdi: adres parametreleri `d` (görselin dosya kimliği) ve `b` (boyutun adı: `kucuk`, `orta`, `buyuk`, `tam`; `panelGorseliSemasi`).
- Servis: `cekirdek/moduller/dosya/gorsel-boyutu.ts`.
- Başarılı (200): görselin o boyuttaki dosyası. Özgün görsel ve boyut dosyasının kendi kimliği verilmez.
- Hatalar: `dogrulama`, `bulunamadi` (görsel yok, silinmiş ya da o boyutu yok), `oturum-yok`, `yetki`.

### GET /kapi/yonetici/menuler

Panelin menüler ekranının menü listesi (kart 0143): silinmemiş menüler, koduna göre.

- İzin: `menu.gor`. Sınır: `genel`.
- Girdi: yok (`menulerSemasi`, `cekirdek/moduller/menu/semalar.ts`).
- Servis: `cekirdek/moduller/menu/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "menuler": [{ "kimlik", "kod", "ad", "tur" }] } }`.
- Hatalar: `dogrulama`, `oturum-yok`, `yetki`.

### GET /kapi/yonetici/menu

Bir menü öğeleriyle (kart 0143, karar 0082): her öğenin metni, görünen metni, hedefi, bağlı kaydın adı ve adres adı (`kayit`), durumu (`gecerli`, `hedef-silindi`, `hedef-gorunmuyor`, `bos-baslik`) ve altları. Kategori menüsünde öğe yerine kategori ağacı gelir (`kategoriAgaci`).

- İzin: `menu.gor`. Sınır: `genel`.
- Girdi: adres parametresi `kimlik` (`menuOkumaSemasi`).
- Servis: `cekirdek/moduller/menu/servis.ts` (`panelMenusu`).
- Başarılı (200): `{ "basarili": true, "veri": { "menu": { "kimlik", "kod", "ad", "tur" }, "ogeler": [...] } }` ya da `{ ..., "kategoriAgaci": [...] }`.
- Hatalar: `dogrulama`, `bulunamadi`, `oturum-yok`, `yetki`.

### POST /kapi/yonetici/menu-ekle

Yeni menü (kart 0143). Kod ve tür açılırken verilir, sonra değişmez.

- İzin: `menu.degistir`. Sınır: `genel`.
- Girdi: `{ "kod", "ad", "tur" }` (`menuEklemeSemasi`; kurallar `menuGirdisi`).
- Servis: `cekirdek/moduller/menu/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "kimlik" } }`.
- Hatalar: `dogrulama` (`kod-bicimi`, `kayda-uygun-degil`, `denetim-karakteri`), `cakisma` (`kod-tekrar`), `is-kurali` (`menu-sayisi`), `oturum-yok`, `yetki`.

### POST /kapi/yonetici/menu-degistir

Menünün adı (kart 0143).

- İzin: `menu.degistir`. Sınır: `genel`.
- Girdi: `{ "kimlik", "ad" }` (`menuDegisikligiSemasi`).
- Servis: `cekirdek/moduller/menu/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `dogrulama`, `bulunamadi`, `oturum-yok`, `yetki`.

### POST /kapi/yonetici/menu-sil

Menüyü ve öğelerini siler (kart 0143). Menüye başvuran vitrin bölümü değişmez; menü olmadan çizilmez.

- İzin: `menu.degistir`. Sınır: `genel`.
- Girdi: `{ "kimlik" }` (`menuSilmeSemasi`).
- Servis: `cekirdek/moduller/menu/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `dogrulama`, `bulunamadi`, `oturum-yok`, `yetki`.

### POST /kapi/yonetici/menu-ogesi-ekle

Menüye öğe ekler (kart 0143). Verilmeyen üst en üst düzeydir, verilmeyen sıra kardeşlerin sonudur.

- İzin: `menu.degistir`. Sınır: `genel`.
- Girdi: `{ "menu", "oge": { "metin"?, "hedef", "ust"?, "sira"? } }` (`ogeEklemeSemasi`; öğe ortak `ogeGirdisi` ile serviste doğrulanır).
- Servis: `cekirdek/moduller/menu/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "kimlik" } }`.
- Hatalar: `dogrulama` (`metin-gerekli`, `baglanti-gecersiz`, `hedef-kullanilamaz`, `hedef-yok`, `ust-gecersiz`, ...), `is-kurali` (`derinlik`, `kategori-menusu`, `menu-dolu`), `bulunamadi`, `oturum-yok`, `yetki`.

### POST /kapi/yonetici/menu-ogesi-degistir

Öğeyi değiştirir ya da taşır (kart 0143): yalnız verilen alan değişir, üstün değişmesi taşımadır ve öğe yeni kardeşlerin sonuna gelir.

- İzin: `menu.degistir`. Sınır: `genel`.
- Girdi: `{ "kimlik", "oge": { "metin"?, "hedef"?, "ust"?, "sira"? } }` (`ogeDegisikligiSemasi`; öğe ortak `ogeDegisikligi` ile serviste doğrulanır).
- Servis: `cekirdek/moduller/menu/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: ekleme ile aynı kodlar, `bulunamadi`.

### POST /kapi/yonetici/menu-ogesi-sil

Öğeyi ve altlarını siler (kart 0143).

- İzin: `menu.degistir`. Sınır: `genel`.
- Girdi: `{ "kimlik" }` (`ogeSilmeSemasi`).
- Servis: `cekirdek/moduller/menu/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `dogrulama`, `bulunamadi`, `oturum-yok`, `yetki`.

### POST /kapi/yonetici/menu-sirala

Aynı üstün altındaki öğelerin yeni sırası (kart 0143): kardeşlerin hepsi, her biri bir kez.

- İzin: `menu.degistir`. Sınır: `genel`.
- Girdi: `{ "menu", "ust", "kimlikler" }` (`ogeSiralamaSemasi`); en üst düzey için `ust` `null`.
- Servis: `cekirdek/moduller/menu/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `dogrulama` (`siralama-gecersiz`, `ust-gecersiz`), `bulunamadi`, `oturum-yok`, `yetki`.

### GET /kapi/yonetici/kayit-ara

Panelde kategori, marka ya da ürünü yazdıkça arayarak seçmek (kart 0143, karar 0116). Yalnız silinmemiş kayıtlar gelir; harf kuralı aramanınkidir (Türkçe harfsiz, büyük küçük harf ayrımsız), aranan metin adın herhangi bir yerinde geçebilir. Kategoriler üstlerinin adıyla ("Kadın › Tişört") ve ağaç sırasında gelir, bu yolda aranır (yol ayracı aranmaz). Marka ve ürün ada göre sıralı ve adres adlarıyla gelir: aynı adlı ürünler ayrılır. Sayfa başına 20 kayıt.

- İzin: `urun.gor`. Sınır: `genel`.
- Girdi: adres parametreleri `tur` (`kategori`, `marka`, `urun`), `ara`? (en çok 100 karakter) ve `sayfa`? (`kayitAramaSemasi`, `cekirdek/kapi/yonetici/kayit-ara.ts`).
- Servis: `cekirdek/moduller/urun/kayit-arama.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "kayitlar": [{ "kimlik", "ad", "adresAdi"? }], "dahaVar": false } }`.
- Hatalar: `dogrulama`, `oturum-yok`, `yetki`.

### GET /kapi/yonetici/yorumlar

Ürün yorumları, onay bekleyen ve reddedilenler dahil, en yeni önce (kart 0139). Panelin yorum ekranı on dördüncü bölümde gelir.

- İzin: `yorum.gor`. Sınır: `genel`.
- Girdi: adres parametreleri `durum`? (`onay-bekliyor`, `yayinda`, `reddedildi`) ve `sayfa`? (`yorumListesiSemasi`). Bir sayfa en çok 50 yorumdur.
- Servis: `cekirdek/moduller/yorum/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "toplam", "yorumlar": [{ "kimlik", "puan", "baslik"?, "metin", "ad", "dogrulanmisAlici", "zaman", "durum", "anaSayfada", "urun", "urunAdi" }] } }`.
- Hatalar: `dogrulama`, `oturum-yok`, `yetki`.

### POST /kapi/yonetici/yorum-karari

Yorumu yayınlar ya da reddeder (kart 0139). Yayındaki yorum reddedilebilir, reddedilen yayınlanabilir; onay bekliyor durumuna dönülmez. Aynı durum yazılmaz, değişiklik kaydına girmez.

- İzin: `yorum.onayla`. Sınır: `genel`.
- Girdi: `{ "yorum", "durum": "yayinda" | "reddedildi" }` (`yorumKarariSemasi`).
- Servis: `cekirdek/moduller/yorum/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `dogrulama`, `oturum-yok`, `yetki`, `bulunamadi` (`yorum-yok`).

### POST /kapi/yonetici/yorum-ana-sayfa

Yorumun ana sayfanın müşteri yorumları bölümünde ("işaretlenenler" kaynağı, karar 0090) gösterilmesini işaretler ya da kaldırır. Yalnız yayındaki yorum ana sayfada görünür.

- İzin: `yorum.onayla`. Sınır: `genel`.
- Girdi: `{ "yorum", "anaSayfada" }` (`yorumAnaSayfaSemasi`).
- Servis: `cekirdek/moduller/yorum/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": {} }`.
- Hatalar: `dogrulama`, `oturum-yok`, `yetki`, `bulunamadi` (`yorum-yok`).
