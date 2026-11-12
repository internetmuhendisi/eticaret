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

**İstek sınırı.** Her uç bir sınır seçer. Sayaç yöntem, adres ve istemci başınadır, süre dolunca sıfırlanır: aynı uca `HEAD` ve `GET` ayrı sayılır. IPv4 istemci tam adresiyle, IPv6 istemci adresinin ilk 64 bitiyle sayılır (karar 0041).

| Sınır | Sınır değeri |
|---|---|
| `genel` | 60 saniyede 120 istek |
| `siki` | 60 saniyede 5 istek (giriş, şifre sıfırlama gibi hassas uçlar) |
| `gorsel` | 60 saniyede 600 istek (ürün görseli: bir sayfa aynı uca onlarca kez gider) |

**İzin.** Herkese açık girişteki uçların izni `herkese-acik`tır. Öteki girişlerdeki uçlar yalnız o girişin iznini ister (`cekirdek/kayitlar/izinler.ts`, liste `cekirdek/moduller/ekip/izinler-ve-roller.md`). Kapı her istekte sırayla sahte isteğe, istek sınırına, oturuma, izne ve girdiye bakar: yetkisiz istek girdi hatası görmez. Uç, hesabın kimliğini ve iznin kapsamını kapıdan alır, girdiden almaz (karar 0040). Sahip girişinin henüz izni yoktur, oraya uç yazılamaz.

**Sahte istek.** Veri değiştiren her istekte (`GET`, `HEAD` ve `OPTIONS` dışında) kapı `Sec-Fetch-Site` ve `Origin` başlıklarını isteğin adresi ve şemasıyla karşılaştırır, tutmayana istek sınırını saymadan `yetki` döner. İki başlık da yoksa istek tarayıcıdan gelmemiştir ve geçer (karar 0039).

**Çerez.** Uç yanıta çerezi yalnız `cerezYaz` ile yazar. Oturum çerezleri `cekirdek/kapi/oturum-cerezi.ts` dosyasındadır, hatalı yanıtta da gider.

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

## Yönetici

Yönetici uçları iki aşamalı girişten geçmiş oturum ister. Girişsiz istek `oturum-yok`, izni olmayan rol `yetki` alır.

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
- Girdi: `{ "sira"? }` (`temaGeriDonusSemasi`). Sıra verilmezse bir önceki sürüm.
- Servis: `cekirdek/moduller/tema/servis.ts`.
- Başarılı (200): `{ "basarili": true, "veri": { "sira", "tema", "ayarlar", "geriDonulenSira" } }`.
- Hatalar: `dogrulama` (`surum-gecersiz`: olmayan, son ya da bozuk sıra), `is-kurali` (`tema-degistirilemez`; `surum-kullanilamaz`: teması bugün kullanılamayan ya da bugünkü kurallardan geçmeyen sürüm), `yetki`, `hizmet-kullanilamiyor` (`katalog-bekleniyor`: sitenin başlangıç düzeni kataloğa başvuruyor ve katalog henüz kurulmadı; kart 0114).

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
