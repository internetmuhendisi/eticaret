# 0013 · Teknoloji: TypeScript, PostgreSQL, Docker, Hetzner

## Tarih

2026-10-28

## Karar

- **Dil:** Bütün kod TypeScript ile yazılır. Sunucu tarafında Node.js'in uzun destekli (LTS) sürümleri kullanılır.
- **Vitrin, yönetim paneli ve kapı:** React ve Next.js ile tek bir uygulamadır. Her site bu uygulamayı kendi kutusunda çalıştırır. Sahip paneli ayrı bir Next.js uygulamasıdır.
- **Ortak şema:** Kapının girdi şemaları Zod ile yazılır. Ekran ve kapı aynı şemayı kullanır.
- **Veritabanı:** PostgreSQL. Bir sunucuda tek PostgreSQL çalışır. Her sitenin ayrı bir veritabanı ve yalnız o veritabanına girebilen ayrı bir kullanıcısı vardır (0003).
- **Arka plan işleri:** İş kuyruğu sitenin kendi veritabanında durur. İşleri, sitenin kutusundan başlatılan ikinci bir süreç çalıştırır. Ayrı bir kuyruk sunucusu kurulmaz.
- **Paketleme:** Çekirdeğin her sürümü bir Docker görüntüsüdür ve sürüm numarasıyla etiketlenir (0011). Çalışan site dört şeyin birleşimidir: o görüntü, sitenin klasörü, sitenin veritabanı ve sitenin dosya deposundaki bölmesi.
- **Yönlendirme:** Önde Caddy durur. Gelen isteği alan adına göre doğru sitenin kutusuna gönderir, şifreli bağlantı sertifikalarını kendisi alır ve yeniler.
- **Görseller:** S3 uyumlu bir dosya deposunda, her siteye ayrı bir kovada tutulur.
- **Sunucu:** Hetzner Cloud, Almanya. Başta bütün siteler ve sahip paneli tek sunucuda çalışır. Sunucu dolunca büyütülür ya da ikinci bir sunucu eklenir. Yedekler sunucudan farklı bir Alman veri merkezindeki depoda durur (0009).
- **Bağımlılık sınırı:** Yalnız açık kaynak yazılım kullanılır. Sunucu firmasına özgü bir hizmete bağlanılmaz. Her parçanın yerine başka bir sağlayıcıdaki dengi konabilir.
- **Sürüm kilidi:** Her çekirdek sürümü kullandığı paketlerin sürümünü kilitler. Bir paket güncellemesi ancak yeni bir çekirdek sürümüyle sitelere gider.

## Neden

- TypeScript web'de en yaygın dildir. Vitrin, panel ve sunucu aynı dilde yazılınca bir kural tek yerde yazılır, ekran ile kapı aynı kuralı kullanır (`.claude/rules/sunucu-arayuzu.md`). Tür denetimi yanlış değeri ve eksik alanı yazım anında yakalar (`.claude/rules/kurallari-koruyan-kontroller.md`).
- React ve Next.js en yaygın arayüz araçlarıdır. Vitrin sayfaları sunucuda hazırlanıp gönderildiği için telefonda hızlı açılır ve arama motorlarında iyi görünür.
- PostgreSQL uzun ömürlü, ücretsiz ve güvenilirdir. Tutarları sabit ondalıkla saklar, tek sunucuda çok sayıda ayrı veritabanını taşıyabilir.
- Her veritabanına ayrı kullanıcı verilince veri ayrımı yalnız kodun doğruluğuna bağlı kalmaz, veritabanının kendisi de bir sitenin başka bir sitenin verisini açmasını engeller (değişmez kural 2).
- Docker sayesinde farklı çekirdek sürümleri aynı sunucuda yan yana çalışır (0011, değişmez kural 3). Aynı kutu Docker çalıştıran her sunucuda aynen çalıştığı için bir site tek başına taşınabilir (0014).
- Kuyruğun sitenin veritabanında durması, çalıştırılacak ve yedeklenecek parça sayısını azaltır. Site taşınırken bekleyen işler de onunla birlikte gider.
- Hetzner Alman bir firmadır, yaygın ve uygun fiyatlıdır. Almanya'da birden çok veri merkezi olduğu için yedekler canlı sunucudan ayrı tutulabilir (0009).
- Başlangıçta 5–30 site tek sunucuya sığar. Gider site sayısıyla birlikte değil, basamak basamak artar.

## Düşünülen diğer yollar

- Python (Django) ya da PHP (Laravel): Seçilmedi. İkisi de sağlam ve uzun ömürlüdür. Ama vitrin zaten JavaScript gerektirdiği için proje iki dilli olurdu ve aynı kurallar iki kez yazılırdı.
- Hazır bir e-ticaret yazılımının üzerine kurmak (WooCommerce, Shopware gibi): Seçilmedi. Tek kod ve site ayarı (0006), site site sürüm güncelleme (0011) ve durum ucu (0012) bu yazılımların yapısına uymaz. Eklenti dünyaları ayrıca güvenlik yükü getirir.
- Yönetilen bulut platformları (barındırılan uygulama ve veritabanı hizmetleri): Seçilmedi. Gider site başına artar, siteyi devretmek zorlaşır, verinin nerede durduğunu denetlemek güçleşir.
- Her siteye ayrı sunucu: Seçilmedi. Devretmek en kolay olurdu, ama gider site sayısıyla doğrudan artar. Kutu aynı olduğu için gerekirse bir site sonradan kendi sunucusuna alınabilir.
- Her siteye ayrı PostgreSQL kutusu: Seçilmedi. Her biri ayrı bellek harcar. Ayrı veritabanı ve ayrı kullanıcı aynı ayrımı daha az kaynakla sağlar.
- Ayrı bir kuyruk sunucusu (Redis gibi): Seçilmedi. Bir parça daha yönetilir, yedeklenir ve taşınırdı. Bu ölçekte veritabanındaki kuyruk yeterlidir.

## Sonuçları

- Yazılım ve lisans gideri yoktur. Aylık giderin büyük kısmı kiralık sunucudur. Küçük kalemler yedek deposu, görsel deposu ve dışarıdan yoklama hizmetidir.
- Her sitenin yaklaşık yarım GB bellek kullanacağı tahmin ediliyor. Bu değer Örnek Mağaza'da ölçülecek ve sunucu boyutu ona göre seçilecek.
- Başta sahip paneli de sitelerle aynı sunucuda durur. Sunucu tümden çökerse bunu sahip paneli göremez. Bu yüzden siteler ayrıca dışarıdaki bir yoklama hizmetiyle izlenir.
- Next.js sık değişen bir araçtır. Sürüm kilidi sayesinde bir değişiklik ancak yeni çekirdek sürümüyle sitelere gider, büyük geçişler çekirdeğin büyük sürümüne bırakılır.
- Next.js'i geliştiren firmanın barındırma hizmeti kullanılmaz. Uygulama Docker kutusunda kendi sunucumuzda çalışır.
- Açık konular:
  - Veritabanı erişim kütüphanesi ve test araçları ilk kod işinde seçilir.
  - E-posta gönderim hizmeti ve hata izleme aracı ayrıca seçilir. Kişisel veri taşıyabildikleri için verilerini Avrupa Birliği'nde, tercihen Almanya'da tutmaları gerekir (0009).
  - Hetzner'in dosya deposunun hangi veri merkezlerinde sunulduğu kurulumda doğrulanır.
- Bu kararla altyapı haritasındaki "programlama dili, veritabanı, sunucu firması" ve "sitelerin sunucuyu paylaşıp paylaşmayacağı" açık konuları kapanır. 0009'daki sunucu firması seçimi de bu kararla yapılmış olur.
- Klasör düzeni ve adlandırma: 0015.
