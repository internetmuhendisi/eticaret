# 0045 · Değişiklik kaydı: tek tablo, aynı işlemde yazım, veritabanında değiştirilemez

## Tarih

2026-11-06

## Karar

- **Tek yer:** `degisiklik_kayitlari` tablosu ve tek yazma yolu `degisikligiKaydet` (`cekirdek/moduller/degisiklik-kaydi/`). Her satır: kim, ne zaman, hangi işlem, hangi kayıt, eski ve yeni değer. İşlem adları `cekirdek/kayitlar/degisiklik-islemleri.ts` dosyasındadır.
- **Aynı işlemde:** `degisikligiKaydet` yalnız veritabanı işlemi içinde çağrılabilir (tür kontrolü). Değişiklik geri alınırsa kayıt da geri alınır, kayıt yazılamazsa değişiklik de olmaz.
- **Değiştirilemez:** Tetikleyici güncelleme, silme ve toplu silmeyi veritabanında reddeder (`0005_degisiklik-kaydi`). Hiçbir satıra denk gelmeyen istek de reddedilir.
- **Kim:** Hesapsa türü ve kimliği, komutsa `sistem` ve komutun adı. Veritabanı kuralı "kim"i boş bırakan ya da türü bilinmeyen satırı reddeder. `rolVer`, `rolAl`, `yoneticiHesabiKapat` ve `tamYetkiliYoneticiAc` bunu zorunlu alır.
- **Bağ yok:** Kayıt hesaba ve başka tabloya veritabanı bağıyla bağlı değildir.
- **İçerik:** Değerler maskeden geçmez, olduğu gibi yazılır. Adında şifre, anahtar, yedek, e-posta ya da telefon sözcüğü geçen alan ve e-posta ya da oturum anahtarı biçimindeki değer `degisikligiKaydet`'te işi durdurur. Kişi kimliğiyle yazılır.
- **Saklama:** Süresizdir, silme işi yoktur (kullanıcı kararı).
- **Hesap kapatma:** `yoneticiHesabiKapat` hesabı kapatır, açık oturumları ve ara adımları geçersiz kılar. `rolAl` ve `rolVer` ile aynı kilidi alır, tam yetkili son yöneticiyi kapatmaz (0040). Kapalı hesabın rolü izin vermez. Rol, iki aşamalı giriş ve yedek kod satırları durur; hesabı geri açmanın yolu yoktur.
- **İlk kullanıcılar:** Rol verme, rol alma, hesap kapatma. Zaten var olan rolü vermek kayıt üretmez. Fiyat, stok ve sipariş kendi modülleriyle eklenir. Görüntüleme ekranı yoktur.

## Neden

- **Aynı işlem:** Kayıt ayrı yazılsaydı değişiklik olup kayıt olmayabilir ya da tersi olurdu; kayıt güvenilir olmazdı.
- **Veritabanında kural:** Kodda yazılan bir kural yeni yazılan koda ya da sorguya uygulanmaz. Tetikleyici sıradan güncelleme, silme ve toplu silme yollarının hepsini kapsar (bağımsız kontrol `ON CONFLICT`, `MERGE`, görünüm ve CTE ile denedi, reddedildi).
- **Maske yerine red:** Günlük maskesi "kararsızsa gizle" der. Bağımsız kontrol ölçtü: rastgele kimliklerin yaklaşık %9'unu, `12345678.90` gibi sayıları ve `gizli_urun` gibi alanları bozuyor, `yedek_kodlari` gibi alanları geçiriyordu. Kayıt düzeltilemediği için bozulan değer kalıcı olurdu. Red, yanlış yazılan kodu testte yakalar.
- **Satır yerine ifade başına tetikleyici:** Toplu silme zaten ifade başınadır; aynı biçim, boş sonuçlu istekte de reddi sağlar.
- **Bağ olmaması:** Hesap silinince bağ satırı değiştirmeye (boşaltma) ya da silmeye çalışırdı, bu da değiştirilemezlik kuralıyla çatışırdı.
- **E-posta yerine kimlik:** Kayıt süresiz durduğu için kişisel veri taşımamalı. Kimlik, hesap kalkınca kimseyi doğrudan göstermez.

## Düşünülen diğer yollar

- **Ayrı veritabanı kullanıcısı (yalnız ekleme izniyle):** Şimdilik seçilmedi. Tek gerçek çözümdür ama bağlantı, gizli bilgi, yedek ve devir düzenini ağırlaştırır; 0023 ve 0031'i etkiler.
- **Her tabloya tetikleyiciyle otomatik kayıt:** Seçilmedi. "Kim" bilgisini veritabanı bilemez, oturum değişkeniyle taşımak kırılgandır.
- **Satır zincirleme (her satır öncekinin özetini taşır):** Seçilmedi. Değişikliği engellemez, yalnız sonradan gösterir; bu ölçekte fazladır.
- **Kayıtları ayrı dosyaya ya da araca yazmak:** Seçilmedi. Aynı işlemde olmaz, sitenin verisi ayrı yere taşınır (0003).
- **Saklama süresi:** Önerilmedi, kullanıcı süresiz seçti.

## Sonuçları

- **Korumanın sınırı:** Uygulamanın kullanıcısı tablonun sahibidir: tetikleyiciyi kapatabilir, silebilir, tabloyu silebilir, sütun türünü değiştirerek satırları yeniden yazabilir (ölçüldü). Sunucuya ve veritabanına erişen biri ya da istediği sorguyu çalıştırabilen bir saldırgan kaydı değiştirebilir. Panel ve hatalı kod değiştiremez. Kural kötü niyetli altyapı yöneticisine karşı değildir.
- **Sahte satır:** Uygulama kullanıcısı geçmiş tarihli ve uydurma kişili yeni satır ekleyebilir: `zaman` elle verilebilir, kimlik doğrulanmaz, işlem adını veritabanı denetlemez. Tetikleyici yalnız var olan satırı korur. Doğru kod `zaman` vermez, `degisikligiKaydet` tek yazma yoludur; ötesi yalnız disiplindir.
- **Tablo büyür:** Süresiz saklama nedeniyle büyür. Bugün yalnız yetki işlemleri yazdığı için önemsizdir; sipariş ve stok gelince yeniden bakılır.
- **Kişisel veri:** Kimlikler hesap durduğu sürece kişiyi gösterir; hesap kalıcı silinince (KVKK talebi gibi) kayıt kalır ama e-posta bulunmaz. Eski ve yeni değere kişisel veri yazmak yasaktır; denetim yalnız alan adına ve belirgin biçimlere bakar, serbest metindeki ad ya da adresi görmez, yalnız disiplindir.
- **Adlandırma:** `anahtar_kelime` gibi masum adlar da reddedilir, başka ad seçilir (`arama_kelimesi`). Yanlışlıkla gizli bilgi yazmaktansa bu bedel seçildi.
- **Yedek:** Kayıtlar yedekle gider. Geri yükleme kayıtları da geri getirir, geri yüklenen andan sonrakiler kaybolur. Sitenin kendi kullanıcısıyla yedek alınıp açılması yerelde bir kez ölçüldü: kayıtlar döndü, tetikleyici çalıştı. Sunucuda yedek denemesi bu sürümle çalıştırılmadı.
- **Veritabanı temizliği:** Site silinirken veritabanı bütünüyle silindiği için tetikleyici engel olmaz. Testte kayıt silinemez; geçici siteler veritabanıyla birlikte silinir.
- **Eski sürüm:** Eski kod tabloyu kullanmaz, sürüm geri dönerse o dönemin işlemleri kayda geçmez.
- **Rol ve hesap ucu yok:** Panelde bu işlemler henüz yok. Servisleri kart 0053 ve ileride ekip ekranı kullanır; "kim" bilgisini uçtan vermek onların işidir.
- **Yetki işlemleri tek sıradadır:** Rol verme de ortak kilidi alır, aynı anda tek yetki işlemi yürür. Seyrek yapıldıkları için önemsizdir.
- **Yerel deneme kayıtları:** Tarayıcı testi yerel Örnek Mağaza veritabanında her çalışmada `yonetici-ac` kaydı bırakır, silinemez. Yalnız bilgisayardadır; temizlemek için veritabanı yeniden açılır.
- **Kalan yol:** Tablolara doğrudan yazan kod kaydı atlar; bugün yetki tablolarına yazan tek yer `ekip/servis.ts`'dir, yalnız disiplindir.
