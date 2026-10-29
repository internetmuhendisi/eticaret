# 0025 · Ortak hata katmanı, seviyeli günlük ve bölüm hata sınırı

## Tarih

2026-10-29

## Karar

- **Günlük:** Sunucu günlüğünü kendi küçük modülümüz yazar (`cekirdek/izleme/gunluk.ts`). Her satır tek satırlık JSON'dur: `zaman`, `seviye`, `site` (kod adı), `cekirdekSurumu`, `mesaj` ve isteğe bağlı `alanlar`. Seviyeler kayıttadır (`cekirdek/kayitlar/izleme.ts`): bilgi, uyarı, hata, ölümcül. Bilgi ve uyarı standart çıktıya, hata ve ölümcül standart hataya gider. Günlük hiçbir zaman hata fırlatmaz.
- **Maskeleme:** Günlüğe ve hata izleme aracına giden her değer `cekirdek/izleme/maskele.ts` dosyasından geçer.
  - Adı şifre, parola, pass, pwd, anahtar, key, token, jwt, otp, secret, gizli, kart, card, cvv, cvc, authorization, bearer, cookie, çerez, session ya da oturum içeren alanın değeri `[gizli]` olur. Türkçe büyük `İ` ve `I` de `i` sayılır.
  - Metnin içinde `şifre=...`, `token: ...`, JSON'daki `"password":"..."` ya da `Authorization: Bearer ...` biçiminde yazılmış değer de `[gizli]` olur. Tırnak içindeki değer bütünüyle gizlenir. Çerez satırının geri kalanı, ön eki olan `Bearer`/`Basic` anahtarı, adı geçmeyen JWT ve bağlantı adresindeki şifre (`postgres://kullanici:[gizli]@sunucu`) de gizlenir.
  - Luhn denetiminden geçen 13–19 haneli sayı `[kart]` olur. Öteki 10 ve daha çok haneli sayıların (telefon, yan yana yazılmış kart ve son kullanma tarihi, IBAN) yalnız son iki hanesi kalır. Boşluk, tire, alt çizgi, nokta ve parantez ayırıcı sayılır; IP adresi olduğu gibi kalır.
  - E-postanın yalnız ilk harfi ve alan adı kalır (`a***@ornek.com`). Adreste kodlanmış `%40` de yakalanır.
  - Alan adları da maskelenir (adı e-posta olan anahtar). İkili verinin (Buffer) içeriği yazılmaz, yalnız boyutu yazılır.
  - Hata nesneleri ad, mesaj, yığın ve neden alanlarıyla açılıp aynı süzgeçten geçer.
  - Yalnız Next.js'in hata özeti (`digest`) olduğu gibi kalır, o da kısa ve yalnız harf, rakam ve tireden oluşuyorsa.
- **Sunucunun hata katmanı:** Beklenmeyen her sunucu hatası `hatayiKaydet` işlevinden geçer (`cekirdek/izleme/hata-katmani.ts`). Bu işlev hatayı günlüğe yazar ve bağlıysa hata izleme aracına maskelenmiş olarak verir. Aracın bağlandığı tek yer `hataIzlemeAraciniBagla` işlevidir (kart 0022). Bu işlevi kullananlar:
  - uç tanımının ortak yakalayıcısı,
  - Next.js'in `onRequestError` kancası (`cekirdek/uygulama/instrumentation.ts`),
  - sağlık servisi,
  - veritabanı havuzunun hata dinleyicisi.

  Yakalanmamış süreç hatası ölümcül seviyede kaydedilir. Bunu yapan `uncaughtExceptionMonitor` dinleyicisi yalnız izler, sürecin davranışını değiştirmez. Next.js bu hatayı kendi de yazar ve sunucuyu ayakta tutar.
- **Konsol:** Uygulama açılırken sunucunun konsolu günlüğe bağlanır (`cekirdek/izleme/konsol.ts`, `register`). Next.js'in ve kütüphanelerin konsola yazdığı her satır da seviyeli ve maskelenmiş olur. Kodda doğrudan `console` kullanmak denetimde hatadır. Muaf tutulanlar: komutlar, denetim betikleri, tarayıcının hata katmanı ve konsolun kendi testi.
- **Ekran:** Kendi başına bozulabilecek her bölüm `<Bolum>` içine alınır (`cekirdek/izleme/bolum.tsx`).
  - `<Bolum>`, Next.js'in `catchError` hata sınırının içine bir `Suspense` sınırı koyar. Bölüm sunucuda bozulursa sunucu o bölümü boş gönderir, tarayıcı bölümü yeniden çizer, hata o zaman sınıra düşer ve bölümün yerinde kısa bir uyarı görünür. Sayfanın geri kalanı sunucudan gelir.
  - Bölüm sınırının dışında kalan hata sayfayı `error.tsx` ekranına çevirir. Kök düzenin kendisi bozulursa `global-error.tsx` gösterilir.
- **Tarayıcı:** Ekranda yakalanan hatalar `istemciHatasiniKaydet` işlevinden geçer (`cekirdek/izleme/istemci-hata-katmani.ts`). Hata izleme aracı bağlanana kadar bu hatalar yalnız tarayıcının konsoluna yazılır. Araç kart 0022'de tarayıcıda da bu tek yere bağlanır. Tarayıcı hatalarını sunucuya taşıyan bir uç açılmadı.
- **Tarayıcıdaki metin:** Tarayıcıda çalışan ekranlar metni `useMetin` ile okur (`cekirdek/metinler/istemci-metni.tsx`). Sitenin dilini kök düzen sunucuda okuyup `MetinSaglayici` ile verir.
- **Bağımlılıklar:** Next.js, React ve React DOM kökteki `package.json` dosyasına da uygulamadakiyle aynı sürümle eklendi. Nedeni şu: çekirdeğin `app/` dışındaki ekran dosyaları (`cekirdek/izleme/bolum.tsx`, ileride `cekirdek/vitrin/`) bu paketleri kökten bulur. Bileşen testleri için jsdom ve Testing Library eklendi. Vitest JSX'i kendisi çevirir (`vitest.config.ts`).

## Neden

- Kural, e-posta ve telefonun serbest metnin içinde de kısaltılmasını istiyor. Hazır günlük kütüphaneleri (pino gibi) yalnız alan adına göre gizler, metnin içine bakmaz. Bizim süzgecimiz zaten kendi kodumuz olacaktı. Satırı yazmak ise birkaç satırlık iş.
- Ölçümde Next.js'in sayfa hatalarını kendisinin de konsola yazdığı görüldü: e-posta, şifre ve kart açıktı. Yalnız kendi kodumuzu maskelemek yetmiyor, konsolun da günlükten geçmesi gerekiyor.
- Ölçümde yalnız hata sınırıyla sunucuda bozulan bir bölümün bütün sayfayı 500'e düşürdüğü görüldü. Sunucuda çizim sırasında hata sınırı çalışmaz, hatayı yalnız `Suspense` sınırı tutar.
- `catchError` yönlendirme ve "bulunamadı" sinyallerini yutmaz, sayfa değişince sınırı kendiliğinden sıfırlar. Kendi yazacağımız bir hata sınırı sınıfında bunları elle kurmak gerekirdi.
- Herkese açık bir "tarayıcı hatası gönder" ucu, istek sınırına rağmen günlüğü doldurmak için kötüye kullanılabilir. Hata izleme araçları tarayıcı hatalarını kendileri toplar.

## Düşünülen diğer yollar

- pino ile günlük: Seçilmedi. Metin içi maskelemeyi yine kendimiz yazacaktık, üstüne bir bağımlılık ve ayar gelirdi.
- Hata sınırını bileşen kütüphanesine kendi sınıfımız olarak yazmak: Önce plana yazıldı, ama seçilmedi. `catchError` Next.js'in yönlendirme hatalarını ve sayfa değişimini kendisi biliyor, bu yüzden onu kullandık. Görünümü olan bir parça olmadığı için kütüphaneye girmedi; uyarı metni, uyarı bileşeni gelince onunla gösterilecek.
- Yalnız `onRequestError` ile yetinmek: Seçilmedi. Next.js'in kendi konsol satırı yine maskesiz kalıyordu.
- Tarayıcı hatalarını bir uçla sunucu günlüğüne almak: Şimdilik seçilmedi (yukarıdaki neden). Kart 0022'de aracın tarayıcı desteği yetmezse yeniden düşünülür.

## Sonuçları

- Sunucuda bozulan bir sayfa hatası günlükte iki satır olur: Next.js'in konsol satırı (`mesaj: "⨯"`) ve hata katmanının bağlamlı satırı (`beklenmeyen hata`). İkisi de maskelidir. Hata izleme aracına yalnız ikincisi gider.
- Maskeleme desene dayanır, her biçimi yakalayamaz. Bilinen boşluklar:
  - Ayırıcısız yazılmış şifre (`şifre hunter2`),
  - tırnaksız ve boşluklu değerin ilk sözcükten sonrası (`sifre=cok gizli` → `sifre=[gizli] gizli`),
  - alan adında nokta olmayan e-posta (`ayse@localhost`).
  
  Bu yüzden kodda gizli bilgi günlüğe hiç verilmez; maskeleme ikinci ağdır. Bağımsız kontrolün bulduğu sızıntılar `cekirdek/izleme/testler/maskele.test.ts` içinde kalıcı testtir.
- Maskeleme bilerek fazla gizler. 10 ve daha çok haneli her sayı (uzun sipariş numarası, boşluklu tarih ve saat gibi) kısaltılır. Adı gizli bilgi sözcüğü içeren her alan (`metinAnahtari` gibi) gizlenir. Kayıtta bir değer gerekiyorsa adı ve biçimi buna göre seçilir.
- Bozulan bölüm sunucudan boş gelir, tarayıcıda uyarıya döner. Bu yüzden o bölüm arama motorlarına ve JavaScript'i kapalı ziyaretçiye görünmez. Tarayıcı konsoluna React'in "sunucu çizimi bozuldu" hatası düşer (canlıda mesajsız, yalnız kod).
- `<Bolum>`'ün `Suspense` sınırının yedeği boştur. Yavaş bölümler için iskelet görünüm bileşen kütüphanesi gelince eklenir.
- Tarayıcıda metin okuyucu bütün metin dosyasını tarayıcıya indirir. Metin dosyası büyüyünce modüllere bölünür (hız ve boyut ölçümü).
- Kökteki Next.js ve React sürümleri uygulamanınkiyle aynı tutulmalıdır. Sürümler ayrışırsa iki kopya yüklenir.
