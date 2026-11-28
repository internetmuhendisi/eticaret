# 0207 · Dosyaların yedeği: dosya başına bir kez, kilidi bitmeden yenilenen kopya; geri yükleme eksik dosyayı ekler

## Tarih

2026-11-28

## Karar

Sitenin dosyaları (görseller, logo, fatura belgeleri; karar 0058) veritabanı yedeğiyle aynı depoya, aynı site anahtarıyla (`age`) ve aynı silme kilidiyle (COMPLIANCE) gider (kart 0093).

- **Yöntem:** Dosya sonradan değişmez, adı kaydın kimliğidir. Her dosya depoya `<ortam>/<kod>/dosyalar/<ad>.<YYYYMMDDTHHMMSSZ>.age` adıyla bir kez gider, sitenin saklama süresi kadar kilitlenir. Kilidi bitmeye yaklaşan dosyanın yeni bir kopyası gönderilir. Yenileme payı saklama süresinin yarısı, en çok 7 gündür; 30 günlük sitede kopya 23 günde bir yenilenir. Böylece diskte duran her dosyanın kilitli bir kopyası hep vardır. Her gece yalnız yeni ve kilidi bitmeye yaklaşan dosyalar gider.
- **Gece işi:** Önce veritabanı yedeği ve onun temizliği yapılır. Ardından aynı site için dosya yedeği alınır, kayda `dosya` türüyle yazılır (gönderilen sayı ve bayt), sonra süresi dolan kopyalar temizlenir. Şifreli kopyalar 512 MB'lık partilerle gönderilir, geçici klasör hepsini birden tutmaz. Gönderilen her kopyanın depoda aynı boyutla durduğu ölçülür. Veritabanı yedeğinin temizliği artık yalnız üst düzeydeki yedekleri siler (`--max-depth 1`). Dosya kopyalarının temizliği yalnız o gece dosya yedeği başarılıysa çalışır.
- **Elle:** `gece.sh --dosya <ortam> <kod>` (`dosyaYedegiBetigi`). `pnpm yedek-al`, `pnpm yedek-kur` (her sitede) ve `pnpm yedek-prova --yeni` bunu da çalıştırır.
- **Saklama:** Kopyalar sitenin veritabanı saklama süresiyle aynı süre kilitli kalır; saklama süresi ve bir gün geçince silinir. Site silinmiş işaretli dosyayı 35 gün sonra diskten siler (`dosyaTemizligiAyari.kaliciSilmeGun`). Yedek ayarı bundan uzun saklama süresini reddeder.
- **Geri yükleme:** Seçilen veritabanı yedeği yan veritabanına açıldıktan sonra, onun gösterdiği her silinmemiş dosya için:
  - dosya diskte varsa özeti kayıtla karşılaştırılır;
  - yoksa depodaki en yeni kopyası indirilir, açılır, özeti karşılaştırılır ve sitenin kutu kullanıcısına ait olarak (0600) yerine konur.
  Diskteki hiçbir dosya silinmez ve üzerine yazılmaz. Bir dosyanın kopyası yoksa ya da özeti tutmuyorsa hiçbir şeye dokunulmadan durulur; site çalışmaya devam eder, yan veritabanı silinir. Dosyalar veritabanları yer değiştirmeden önce yerine konur.
- **Prova:** Veritabanı karşılaştırmasının yanında iki şey ölçülür. Yedeğin gösterdiği her silinmemiş dosyanın depoda kopyası olmalı ve en yeni kopya açılınca özeti tutmalı. Canlıda kaydı olan her silinmemiş dosya diskte olmalı ve özeti tutmalı.
- **Sunucu denetimi:** Her sitenin son dosya yedeği başarılı ve 26 saatten yeni olmalı (`kayitHatalari`).
- **Sitenin dosya temizliği:** Arka plan sürecinde günde bir kez çalışır (`dosyaTemizligi`, `cekirdek/moduller/dosya/temizlik.ts`).
  - Hiçbir kaydın kullanmadığı fatura belgesi bir gün sonra silinmiş işaretlenir.
  - Silinmiş işaretli dosya 35 gün sonra diskten silinir, kaydı iz olarak kalır.
  - Kaydı olmayan dosya ile kaydı olup diskte olmayan silinmemiş dosya hata izleme aracına bildirilir, kendiliğinden silinmez.
  - Hiçbir kaydın kullanmadığı silinmemiş dosya yalnız sayılır, günlüğe yazılır.
  - "Kullanılan" şunlardır: dosyalar tablosuna giden her yabancı anahtar (yeni tablo kendiliğinden girer), mağaza ayarlarının ve düzenin bütün sürümlerinin JSON değerleri. Görselin boyutları ayrı sayılmaz.

## Neden

- Dosyalar değişmediği için her gece hepsini göndermek gereksizdir. Kilit ise nesne başına ve yüklemede konur; uzatma aracı yoktur (rclone 1.75.2'de nesne kilidini sonradan değiştiren komut yok, ölçüldü). Kilidi bitmeden yeni kopya göndermek, sunucu ele geçirilse bile her dosyanın silinemeyen bir kopyasını tutmanın tek araçlı yoludur.
- **Silinmiş dosyanın kopyası neden yeter:** Site bir dosyayı ancak işaretledikten 35 gün sonra diskten siler; saklama süresi bunu geçemez. Bir veritabanı yedeği dosyayı silinmemiş gösteriyorsa, dosya o yedekten en az 35 gün sonra diskten gitmiştir. Disk silinmesinden önceki son kopya, saklama süresi boyunca depoda kalır. Bu yüzden saklama süresi içindeki her veritabanı yedeğinin gösterdiği dosyanın kopyası depodadır.
- **Geri yükleme neden yalnız ekler:** Dosya adları kayıt kimliğidir, içerik değişmez. Yarıda kalan bir geri yükleme yalnız fazladan dosya bırakır; o dosya kayıtsız kalır ve temizlik onu bildirir. Klasörü yer değiştirmek, veritabanıyla birlikte geri alınması gereken ikinci bir adım olurdu.
- **Şifreleme ve anahtarlar:** Veritabanı yedeğininkiyle aynıdır. Açma anahtarı yalnız altyapı sahibinin bilgisayarındadır (karar 0037).
- **Depo ücreti:** Kopya 23 günde bir yenilenir, 31 gün kalır. Bir dosyanın depoda ortalama 1,35, en çok 2 kopyası olur; silinen dosya 31 gün daha durur. Depodaki dosya alanı yaklaşık diskteki dosyaların 1,4–2 katıdır. 1 TB'lık taban ücretin içinde (karar 0037) 500 GB dosyaya kadar ek ücret yoktur. Bugün Örnek Mağaza'nın dosyaları bunun çok altındadır, ölçülmedi. Yenilenen kopyalar ayda bir kez bütün dosyaları yeniden göndermek demektir. Depoya giriş ücretsizdir, sunucunun trafik payının içindedir.
- **Kullanılmayan dosyalar neden işaretlenmez:** Yanlış bir "kullanılmıyor" kararı görseli hemen kapatırdı: işaretli dosya okunmaz. Bugün galeriden, kategoriden, markadan ve blogdan kaldırılan görsel işaretsiz kalır; sayısı günlükte görünür.

## Düşünülen diğer yollar

- **Her gece bütün dosyaların şifreli arşivi:** Seçilmedi. Kart dosyaların her gece yeniden gönderilmesini istemiyor; büyüyen mağazada gece işini uzatır, depoda saklama süresi kadar tam kopya birikir.
- **Aynı adla yeni sürüm (sürümleme):** Seçilmedi. Önceki sürüm kilitliyken temizlik onu silemez, hata verir. Tarihli ad, veritabanı yedekleriyle aynı "süresi dolanı sil" kuralını kullanır.
- **Depo içinde sunucu tarafı kopya:** Seçilmedi. Her dosya için ayrı bir rclone kutusu açmak gerekir; binlerce dosyada saatler sürer. Yeniden şifreleyip partiyle göndermek tek kutudur.
- **restic ve benzeri:** Seçilmedi (karar 0037'nin gerekçesiyle): açma anahtarı sunucuda durmak zorunda kalırdı, budama kilitle çakışır.
- **Geri yüklemede klasörü yedekteki hâline döndürmek:** Seçilmedi. Silme gerekir ve yarıda kalırsa siteyi bozar.
- **Kullanılmayan dosyaları işaretlemek:** Seçilmedi, nedeni yukarıda.

## Sonuçları

- **Sunucuya geçiş:** Yeni gece betiği sunucuya `pnpm yedek-kur` ile gider. Bu komut her sitenin dosya yedeğini de hemen alır. O zamana kadar sunucu denetimi kırmızıdır, yayın durur: kurulum betiği projedekiyle aynı değil, dosya yedeği kaydı yok.
- **Geri yükleme bağlantı kuralına bağlı:** Geri yükleme dosya listesini sitenin kullanıcısıyla okur (karar 0206). Yeni bağlantı kuralı sunucuda olmadan durur.
- **Geri yükleme öncesi yedekte dosyalar gitmez:** Geri yükleme öncesi alınan yedek (`-oncesi`) dosyaları göndermez. Onların kopyası bir sonraki gece işinde gider; geri yükleme diskten hiçbir şey silmediği için arada dosya kaybolmaz.
- **Kopyası olmayan dosya:** Bir dosya iki gece yedeği arasında eklenip silinirse ve disk de kaybolursa o dosyanın kopyası olmayabilir. Silinmiş işaretli dosya diskte 35 gün durduğu için bu yalnız kayıtsız dosyalar için mümkündür.
- **Gece işinin süresi:** İlk çalışma bütün dosyaları gönderir. Büyük mağazada uzun sürebilir; yedek kilidi süresince geri yükleme bekler.
- **Prova her dosyayı indirir:** Büyük mağazada uzun sürer, elle çalışır.
- **Gerçek araçlarla ölçüm:** Gerçek şifreleme ve depo yalnız `pnpm yedek-denemesi` ile sunucuda ölçülür. Bilgisayardaki testler sahte depo ve sahte şifrelemeyle çalışır.
- **Kayıtsız dosyalar:** Ne kendiliğinden silinir ne yedekte bir kurala bağlıdır; diskte durdukça yedeklenir. Örnek: geri yüklemeden sonra kalan, yeni veritabanında olmayan fatura belgesi. Bildirimden sonra elle silinir. Silme komutu yoktur.
- **Kullanılmayan görseller:** Diskte ve yedekte yer kaplar. Kaldırılan görseli işaretlemek ayrı bir iştir.
