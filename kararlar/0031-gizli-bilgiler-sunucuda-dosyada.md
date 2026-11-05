# 0031 · Gizli bilgiler sunucuda sitenin kendi dosyasında, Docker gizli bilgisiyle

## Tarih

2026-11-05

## Karar

- **Yer:** Her sitenin her ortamdaki gizli bilgileri sunucuda ayrı dosyalarda durur: `/srv/altyapi/gizli/<ortam>/<kod adı>/<dosya>`. Klasörler kök kullanıcıya aittir ve yalnız ona açıktır (0700). Dosya, sitenin o ortamdaki kutu kullanıcısına aittir ve yalnız o okuyabilir (0400).
- **Kutuya ulaşması:** Dosya, Docker'ın gizli bilgi özelliğiyle (compose `secrets`) yalnız o sitenin kutusuna, `/run/secrets/<dosya>` yoluna salt okunur bağlanır. Uygulama yolu `<AD>_DOSYASI` ortam değişkeninden öğrenir. Değer ortam değişkenine konmaz. Kutunun gizli bilgi tanımı tek yerde üretilir (`kutuGizliTanimi`, `komutlar/gizli-bilgi.mts`). Yayın komutu (kart 0021) da bunu kullanır.
- **Kutu kullanıcıları:** Her site her ortamda kendi kullanıcı numarasıyla çalışır. Numara, ortamın tabanı ile sitenin numarasının toplamıdır: canlıda 20000 + n, denemede 30000 + n. Sitelerin numaraları `sunucu/site-kullanicilari.json` dosyasındadır. Numara bir kez verilir, değişmez.
- **Okuma:** Uygulama gizli bilgiyi yalnız `gizliBilgi()` ile okur (`cekirdek/ayar-semasi/gizli-bilgi.ts`). Önce dosyaya bakar, dosya verilmemişse ortam değişkenine bakar. Hangi gizli bilgilerin olduğu ve değerlerinin nasıl kurulacağı tek kayıttadır (`cekirdek/kayitlar/gizli-bilgiler.ts`).
- **Üretme ve yenileme:** `pnpm sunucu-gizli <site klasörü> <deneme|canli>` değeri sunucuda üretir (`openssl rand`). Değer bilgisayara gelmez, ekrana ve günlüğe basılmaz, hiçbir sürecin komut satırında görünmez. Var olan değere dokunmaz. `--yenile` ile bütün değerler yenilenir. Devirde kullanılacak yol budur (0014).
- **Ortamlar:** Geliştirme ortamının gizli bilgileri bilgisayardaki `.env` dosyasındadır. Deneme ve canlı ortamların değerleri sunucuda ayrı klasörlerde, ayrı değerler olarak durur.
- **Denetim:** `pnpm sunucu-denetle` yerleşimi ve izinleri denetler. Sunucudaki her değeri, projenin bütün kayıt geçmişinde ve izlenen dosyalarında arar. Arama sunucuda yapılır, dönen tek bilgi eşleşme sayısıdır. `pnpm sunucu-gizli-denemesi` iki sitenin ayrımını gerçek kutularla ölçer.

## Neden

- Ortam değişkeni `docker inspect` çıktısında ve süreç bilgilerinde görünür (0028'deki bilinen sınır). Dosyada duran değer görünmez. Deneme bunu ölçtü: değer bilerek ortam değişkenine konunca `docker inspect` çıktısında yakalandı, dosyayla verilince geçmedi.
- Kutu yalnız kendisine bağlanan dosyayı görür. Başka sitenin klasörü kutunun içinde hiç yoktur.
- Her siteye ayrı kullanıcı numarası ikinci bir kattır. Bir ayar hatasıyla başka sitenin dosyası bir kutuya bağlansa bile o kutu dosyayı okuyamaz. Bu da bilerek bozularak ölçüldü. Çekirdeğin görüntüsü başka kullanıcı numarasıyla da sorunsuz çalışıyor, çünkü kod kök kullanıcıya aittir ve uygulama ona yazmaz.
- Değerin sunucuda üretilmesi, onun hiçbir zaman bu bilgisayardan, terminalden ya da kayıttan geçmemesini sağlar.
- Bilgisayardaki `.env` düzeni aynen sürer. Testler ve yerel ortam değişmez.

## Düşünülen diğer yollar

- **Ortam değişkeni dosyası (`env_file`):** Seçilmedi. Değer `docker inspect` ile görünür, bir kutudan sızan süreç bilgisi değeri taşır.
- **Ayrı bir gizli bilgi sunucusu (Vault, Infisical gibi):** Seçilmedi. Tek sunucuda çalışacak, yedeklenecek ve güncellenecek bir servis daha getirir. Kendisi de bir gizli bilgiyle açılır. Site sayısı ve sunucu sayısı artınca yeniden bakılabilir.
- **Şifrelenmiş olarak depoda tutmak (SOPS, age):** Seçilmedi. Kart, gizli bilginin kayda hiç girmemesini istiyor. Şifre çözme anahtarı da ayrıca bir yerde saklanmak zorunda kalırdı.
- **Docker Swarm'ın gizli bilgi deposu:** Seçilmedi. Swarm'a geçmeyi gerektirir. Tek sunucuda compose'un dosyayla bağlaması aynı sonucu verir.
- **Bütün sitelerin aynı kullanıcıyla çalışması:** Seçilmedi. Ayrımı yalnız bağlama tanımına bırakır, bir ayar hatasında ikinci kat kalmaz.

## Sonuçları

- Kutu dosyayı açılışta bağlar. Yenilenen değeri kutu ancak yeniden başlayınca görür (ölçüldü). `pnpm sunucu-gizli --yenile` bunu uyarı olarak söyler.
- Veritabanı şifresi yenilenince PostgreSQL'deki kullanıcının şifresi de değişmelidir. Veritabanı bugün sunucuda yoktur. Bu bağlantı yayın komutunda kurulur (kart 0021).
- Gizli bilgiler sunucunun diskinde şifresiz durur, yalnız dosya izinleriyle korunur. Sunucuya kök yetkisiyle giren her şeyi okur. `yonetici` kullanıcısı şifresiz sudo hakkına sahip olduğu için giriş anahtarının korunması bu yüzden de önemlidir (0030).
- Gizli bilgiler gece yedeğine girmez. Sunucu kaybolursa değerler yeniden üretilir. Veritabanı yedekten dönerken şifre de yenilenir. Gece yedeği kartında (0024) bu adım yazılır.
- Hetzner anahtarı gibi altyapının kendi gizli bilgileri sitelere ait değildir. Bilgisayarda `.env` dosyasında kalır.
- Bu karar `planlar/komutlar.md` dosyasındaki "gizli bilgilerin sunucuda nasıl saklanacağı" açık konusunu kapatır.
