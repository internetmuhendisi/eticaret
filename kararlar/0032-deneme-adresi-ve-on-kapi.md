# 0032 · Deneme adresi `<kod-adi>.deneme.eticaretmagazasi.com`, sunucuda kısıtlı Caddy ön kapısı

## Tarih

2026-11-05

## Karar

- **Alan adı:** Altyapının alan adı `eticaretmagazasi.com`'dur. Kullanıcı bu adı Cloudflare'den aldı. Ad kodda yalnız `komutlar/on-kapi.mts` dosyasında tanımlıdır.
- **Deneme adresinin biçimi:** `<kod-adi>.deneme.eticaretmagazasi.com`, örneğin `ornek-magaza.deneme.eticaretmagazasi.com`. Biçimi kullanıcı seçti. Adres kod adından `denemeAdresi()` ile üretilir.
- **Alan adı kaydı:** Cloudflare'de iki joker kayıt vardır: `*.deneme` için A (IPv4) ve AAAA (IPv6). İkisi de sunucuyu gösterir ve ikisinde de Cloudflare vekili kapalıdır ("yalnız DNS"). Yeni bir site için alan adına bir daha dokunulmaz. Kayıtları `pnpm alan-adi` kurar: komut önce ne değişeceğini söyler, `--onayli` ile değiştirir. Yalnız bu iki kayda dokunur, aynı adda başka türde bir kayıt bulursa durur. Cloudflare anahtarı yalnız bu alan adının DNS kayıtlarını düzenleyebilir ve `.env` dosyasında `CLOUDFLARE_ANAHTARI` adıyla durur.
- **Ön kapı:** Sunucuda önde Caddy çalışır (`sunucu/on-kapi/Caddyfile`). Caddy her adresin sertifikasını Let's Encrypt'ten adres adres alır ve kendisi yeniler. Sertifikalar sunucuda `/srv/altyapi/on-kapi/veri` klasöründe durur. Şifresiz istek 308 koduyla aynı adresin şifreli hâline yönlenir. Tanınmayan adres şifresiz bağlantıda 404 alır, şifreli bağlantıda sertifika almaz. Bir sitenin sertifikasıyla bağlanıp istekte tanınmayan bir ad yazan da 404 alır. HTTP/3 kapalıdır, çünkü duvarlar yalnız TCP kapılarını açar.
- **Arama motorları:** Bütün deneme adresleri ortak `deneme` kuralını alır. Her cevaba `X-Robots-Tag: noindex, nofollow` başlığı eklenir. Kutu başka bir değer gönderse de bu başlık kalır. `robots.txt` bütün siteyi kapatır. Bu kural ön kapıdadır, uygulamaya bağlı değildir.
- **Kutu:** Caddy kök olmayan kendi kullanıcısıyla çalışır (10080). Kutunun dosya sistemi salt okunurdur, yetki yükseltme kapalıdır. Kutuda düşük kapıları açma yetkisinden başka yetki yoktur. Dışarıya yalnız TCP 80 ve 443 açılır. Ayar dosyaları kutuya klasör olarak bağlanır. Tek dosya bağlansaydı, yerine konan yeni dosyayı açık kutu görmezdi.
- **Ağlar:** Ortak `altyapi` ağında yalnız ön kapı ve yoklama kutusu durur, ağda IPv6 açıktır. Her site kutusu kendi ağındadır, ön kapı her sitenin ağına ayrıca bağlanır. Böylece bir site kutusu, ön kapıdan ve istek sınırından geçmeden başka bir sitenin kutusuna ulaşamaz (0024, değişmez kural 2). Site ağlarını yayın komutu kurar (kart 0021).
- **Yoklama kutusu:** Ön kapının arkasında, bir site kutusunun yerinde kalıcı küçük bir kutu durur. Adresi `kapi--yoklama.deneme.eticaretmagazasi.com`'dur. Kod adlarında iki tire yan yana gelemez, bu yüzden bu adres hiçbir siteyle çakışmaz. Sunucu denetimi ön kapıyı bu adresten ölçer.
- **Kurulum ve denetim:** `pnpm sunucu-kur --onayli` son adımda ön kapıyı kurar ya da ayarını yeniler. Yeni ayar önce bir hazırlık klasöründe Caddy'ye doğrulatılır. Geçersizse çalışan ön kapıya dokunulmadan durulur (bilerek bozularak ölçüldü). Kurulumdan sonra iki kutunun da çalıştığına bakılır. Komut tekrar çalıştırılabilir. Listede olmayan site satırını siler. `pnpm sunucu-denetle` ölçümlerinin hepsini dışarıdan, IPv4 ve IPv6 üzerinden ayrı ayrı yapar:
  - adresler herkese açık ad sunucularında sunucuya çözülüyor,
  - sertifika geçerli ve en az 14 günü var,
  - `http://` isteği yönleniyor,
  - adres arama motorlarına kapalı,
  - kutu ziyaretçinin gerçek adresini görüyor,
  - tanınmayan adres hiçbir yere gitmiyor,
  - kutular sunucuda tanımdaki kısıtlarla çalışıyor; beklenen değer tanımın kendisinden okunur.

## Neden

- Joker kayıt yeni siteyi alan adı değişikliğinden çıkarır. Alan adı değişikliği geri alınamaz sayıldığı için her sitede ayrı onay gerekirdi. Kayıt bir kez onaylanır.
- Deneme adresleri kendi `deneme` alt alanında toplanınca ana alan adı ileride başka işlere açık kalır, deneme ile öteki adresler karışmaz.
- Cloudflare vekili açık olsaydı ziyaretçinin bağlantısı Cloudflare'in sunucularında açılırdı. Müşteri verisi Almanya'daki sunucuya doğrudan gelmelidir (0009). Ayrıca sertifikayı Cloudflare tutardı ve Caddy'nin sertifika işi anlamsız kalırdı.
- Sertifika adres adres, alan adı sağlayıcısına anahtar vermeden alınır. Joker sertifika Caddy'nin Cloudflare anahtarını sunucuda tutmasını gerektirirdi. O anahtar ele geçerse bütün alan adının kayıtları değiştirilebilirdi.
- Arama motoru kuralı ön kapıda durunca, bir sürümdeki uygulama hatası deneme adresini dizine açamaz.
- Ağda IPv6 açık olmazsa Docker IPv6 ziyaretçiyi kendi aracından geçirir ve kutu bütün IPv6 ziyaretçilerini tek adres olarak görür. Bu durumda istek sınırı (0024) bütün IPv6 ziyaretçilerini birlikte durdururdu. Denetim bunu ölçer.
- Resmi Caddy görüntüsündeki program düşük kapı yetkisini dosyasında taşır. Kutuda bütün yetkiler kaldırılınca program hiç çalışmadı (ölçüldü). Bu yüzden kutuda yalnız bu yetki bırakıldı.

## Düşünülen diğer yollar

- `<kod-adi>.eticaretmagazasi.com`: Seçilmedi. Adres kısalırdı ama deneme adresleri ile ileride açılacak başka adresler aynı yerde karışırdı. Kullanıcı `deneme` alt alanını seçti.
- Her site için ayrı DNS kaydı: Seçilmedi. Her yeni sitede alan adı değişikliği ve onay gerekirdi.
- Joker sertifika (DNS doğrulamasıyla): Seçilmedi. Cloudflare anahtarı sunucuda dururdu ve Caddy'ye ek modül gerekirdi.
- Cloudflare vekili ve Cloudflare sertifikası: Seçilmedi. Gerekçesi yukarıda (0009).
- Kayıtları kullanıcının elle eklemesi: Kullanıcı anahtar vermeyi seçti. Böylece kayıtlar komutla kurulur ve denetlenir.
- Yoklama yerine Örnek Mağaza'yı ölçmek: Seçilmedi. Sitenin sunucuda yayını kart 0023'ün işidir. Ön kapının ölçümü hiçbir sitenin durumuna bağlı kalmamalıdır.
- Ayrı bir yoklama alan adı (`yoklama.eticaretmagazasi.com`): Seçilmedi. Alan adına bir kayıt daha gerekirdi.
- Bütün site kutularının ortak `altyapi` ağında durması: Seçilmedi. Kutular birbirine ön kapıdan geçmeden ulaşırdı.

## Sonuçları

- Let's Encrypt'in sınırları geçerlidir: alan adı başına haftada 50 yeni sertifika. Bu sınır 5–30 mağaza için yeterlidir. Deneme adresi DNS'te çözülmeden Caddy'ye eklenirse sertifika alınamaz, Caddy giderek seyrekleşen aralıklarla yeniden dener.
- Joker kayıt yüzünden `*.deneme` altındaki her ad sunucuya çözülür. Tanınmayan adın sonucu yukarıdaki "Ön kapı" maddesindedir.
- Cloudflare anahtarı `.env`'dedir ve yalnız alan adı komutunu çalıştıran bilgisayarda kullanılır. Sunucuya ve kontrol hattına gitmez. Sunucu denetimi anahtar istemez, kayıtları herkese açık ad sunucularından okur.
- Kurma komutu, listesinde olmayan site satırlarını siler. Bugün listede yalnız yoklama kutusu var. Yayın komutu (kart 0021) sitelerin satırlarını aynı listeden (`kurmaBetigi`) üretmelidir. Yoksa sonraki bir `pnpm sunucu-kur` sitelerin satırlarını siler.
- Doğrulamadan sonraki bir adım düşerse diskteki ayar ile çalışan ayar ayrışabilir. Örneğin Caddy ayarı çalışma anında reddeder ya da kutu açılamaz. Yeni dosyalar yerine konmuş olur, çalışan Caddy eski ayarla devam eder, sonraki açılışta yeni ayarla açılır. Komut bu durumda kırmızı biter, yani gözden kaçmaz. Bu bilerek kabul edildi.
- Ön kapının yeniden başlama kuralı burada tanımlanmadı. Sunucu yeniden başlayınca ön kapının da açılması kart 0038'in işidir.
- Güvenlik başlıkları (HSTS gibi) bu kararın dışındadır. Güvenlik kontrollerinde ele alınır.
- Mağazaların kendi alan adları teslimin işidir.
- Bu karar `planlar/komutlar.md` dosyasındaki "deneme adresinin biçimi" açık konusunu kapatır.
