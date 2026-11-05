# 0037 · Gece yedeği: site başına şifreli, silme kilitli, Nürnberg'de

## Tarih

2026-11-06

## Karar

- **Depo:** Hetzner Object Storage, Nürnberg (`nbg1`), tek kova: `altyapi-yedek-308bf1`. Canlı sunucu Falkenstein'dadır (0030). Aylık taban ücret, kullanıcı onayıyla (fiyat Hetzner'in sayfasından okundu: 6,49 € + KDV, 1 TB depo ve 1 TB çıkış dahil).
- **Yedek:** Her gece 03:00'te (Türkiye saati, 00:00 UTC) sunucudaki zamanlayıcı her sitenin veritabanını ayrı ayrı `pg_dump` ile alır. Veritabanı kısa süre bile kapanmaz. Dosya `<ortam>/<kod adı>/<zaman>.dump.age` adıyla depoya gider.
- **Şifreleme:** `age` ile, her sitenin her ortamda kendi anahtar çiftiyle. Sunucuda yalnız açık anahtar durur. Açma anahtarı altyapı sahibinin bilgisayarındadır (`~/.altyapi/yedek-anahtarlari`), kopyası şifre yöneticisindedir. Geri yüklemede ssh'ın girdisinden gider, kök kabuğunun değişkeninde kalır, diske ve komut satırına yazılmaz.
- **Saklama:** Site başına değer, `sunucu/yedek/ayar.json`, varsayılan ve Örnek Mağaza için 30 gün. Yedek bu süre boyunca depoda değişmez kilitle (COMPLIANCE) durur, bir gün sonra silinir. Temizlik yalnız o gece yedek başarılıysa çalışır, en yeni yedek silinmez.
- **Depo anahtarı:** Bilgisayarda `.env`'dedir, gece işi için sunucuda gizli bilgi klasöründe rclone ayarı olarak durur (0400, kök) ve geçici kutuya salt okunur bağlanır. Dosyanın kendisi değil yalnız bu iki değer gider, `.env` yasağı değişmez.
- **Geri yükleme:** Tek site, yayın kilidinde, önce o anki durumun yedeği. Yedek yan veritabanına açılır, site kutusu durur, veritabanları yer değiştirir, şifre `gizliyiYenileVeEsitle` ile yenilenir (0031), etkin yayının eksik değişiklikleri uygulanır, kutu açılır. Sağlık geçmezse eski veritabanı yerine döner. Sağlık geçince eski veritabanı silinir, kopyası az önce alınan yedektir.
- **Prova:** Yedek geçici, ağsız bir PostgreSQL kutusunda açılır. Düzen özeti, her tablonun satır sayısı ve içerik özeti canlıyla karşılaştırılır.
- **Hata kayıtları (Bugsink) yedeğe girmez:** Kaybolursa yalnız geçmiş hatalar gider, siteler çalışmaya devam eder (0036'nın bu karta bıraktığı konu).
- **Gizli bilgiler yedeğe girmez** (0031).

## Neden

- Depo anahtarı sunucuda durmak zorundadır. Sunucu ele geçirilse bile eski yedekler okunamasın (açma anahtarı orada değil) ve silinemesin (kilit) diye bu yol seçildi. İkisi de gerçek depoda ölçüldü: başka anahtar `no identity matched`, kalıcı silme `forbidden by object lock` ile reddedildi.
- Yedeğin yalnız `nbg1` ucundan göründüğü, `fsn1` ve `hel1` uçlarının kovayı bulamadığı ölçüldü. Veri merkezi bu ölçümle doğrulanır, sunucu denetimi her çalışmada yineler.
- Araçlar açık kaynaktır, S3 uyumlu her depoda çalışır, firma değişince yalnız ayar değişir (0013).
- Dosyanın tek tek kilitlenmesi, `rclone` ile tam yedek düzeninde sorunsuz çalışır. Küçük veritabanlarında tam yedek yeterlidir.

## Düşünülen diğer yollar

- **Storage Box:** Daha ucuz. Seçilmedi: yalnız Falkenstein (canlıyla aynı yer) ve Helsinki (Almanya dışı) sunuluyor; karar 0009 ile uymuyor.
- **restic:** Tekilleştirme ve artımlı yedek sağlar. Seçilmedi: şifre çözme anahtarı sunucuda durmak zorunda kalırdı, budama da nesne kilidiyle çakışır.
- **Paket deposundaki rclone (1.60):** Seçilmedi: kilit seçenekleri güncel sürümde görüldü. Sürümü sabit kutu kullanılır (1.75.2).
- **Sürekli yedek (WAL arşivleme):** Veri kaybını dakikalara indirir. Bu kartta yok; gerçek mağaza açılmadan önce yeniden bakılır.
- **Eski veritabanını geri yüklemeden sonra saklamak:** Seçilmedi: müşteri verisinin fazladan bir kopyası kalırdı, yedeği zaten var.

## Sonuçları

- Geri yüklemede son yedekten sonraki veri, en fazla yaklaşık 24 saatlik, kaybolur.
- Silinen müşteri verisi saklama süresi boyunca yedekte kalır. KVKK açısından hukukçuya sorulacak. Devir ya da silme talebinde (0014) kilit süresi dolmadan yedek silinemez.
- Hetzner'in belgesine göre kilit, sözleşme sona ererse veriyi korumaz. Hetzner hesabını kaybetmek yedekleri de götürür; ikinci firmada kopya yoktur.
- Depo anahtarı projeye bağlıdır, kovaya değil. Görsel deposu aynı projede açılırsa bu anahtar oraya da erişebilir; o kartta ayrı proje düşünülmeli.
- Sunucu ele geçirilirse saldırgan yeni yedekleri bozabilir ya da yedeğin üstüne silme işareti koyabilir. Kilitli eski yedekler durur; gece işi işareti kaldırır, kayda yazar, denetim kırmızıya düşer.
- Yedek başarısız olunca uyarı gelmez, denetim çalışınca görülür (`pnpm yayinla` da her yayında çalıştırır, başarısız yedek yayını durdurur). Uyarı ve düzenli prova zamanlanmış kontrollerle gelir.
- Canlı veride prova, yedekten sonraki yazmaları fark olarak gösterir. `--yeni` farkı en aza indirir ama sıfırlamaz.
- Yeni sitede `pnpm yedek-kur` unutulursa gece işi o veritabanını başarısız yazar ve denetim kırmızıya düşer; sessizce yedeksiz kalmaz.
- Açma anahtarı tek bilgisayarda kalırsa, bilgisayarla birlikte yedekler de gider. Şifre yöneticisindeki kopya kullanıcının işidir, otomatik kontrolü yoktur (yalnız disiplin).
- Sunucunun tümden kaybolup sıfırdan kurulması baştan sona henüz denenmedi. Tek sitenin geri yüklenmesi Örnek Mağaza'da ve geçici sitede denendi.
