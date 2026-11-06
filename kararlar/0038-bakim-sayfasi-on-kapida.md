# 0038 · Bakım sayfası ön kapıda

## Tarih

2026-11-06

## Karar

- **Yer:** Bakım sayfası uygulamanın değil ön kapının (Caddy) parçasıdır, her sitenin ayar satırına gömülür. Uygulama düşmüşken de açılır, çekirdek sürümüne bağlı değildir.
- **Kendiliğinden bakım:** Kutu kapalıysa bağlantı hatası sayfaya düşer. Ön kapı sağlık ucunu 10 saniyede bir yoklar, üç yoklama üst üste düşerse (veritabanı düştü) ziyaretçi kutuya gönderilmez. Düzelince sayfa kendiliğinden kalkar.
- **Elle bakım:** `pnpm bakim <site> <ortam> ac|kapat|durum`. Vitrin ve yönetim paneli birlikte kapanır (kullanıcı kararı): bakım çoğunlukla veri değişirken açılır, panelden yapılan değişiklik karışabilir. İşaret sunucudadır (`/srv/altyapi/on-kapi/bakim-acik/<kod adı>`), yayın, geri dönüş ve yeniden kurulum onu korur. Açılıp kapanması `bakim-kaydi.jsonl` dosyasına yazılır.
- **Güncelleme:** Bakım yayına otomatik bağlanmaz. Yayın zaten kesintisizdir (0035), ziyaretçi gereksiz yere kapalı site görürdü. Veri düzenini riskli biçimde değiştiren güncellemede elle açılır.
- **Cevap:** 503, `Retry-After: 300`, önbelleksiz, arama motorlarına kapalı. Kapıya gelen istek zarfla `hizmet-kullanilamiyor` alır. Sağlık ucu elle bakımda da kutuya gider, kontroller gerçek durumu görür.
- **Metin:** Ortak metin `vitrin.bakim.*` anahtarlarında, sitenin metni site ayarı `bakimMetni` (boş bırakılabilir, çekirdek 0.3.0). Ad ve metin sitenin yayındaki klasöründen okunur. Tasarım değerleri henüz yok, sayfa sistem renkleriyle açık ve koyu temaya uyar.
- **Denetim:** `pnpm sunucu-denetle` elle bakımdaki sitede sayfayı bekler, 24 saatten uzun açık kaldıysa kırmızıdır. Bakımdaki sitede yayın durmaz.

## Neden

- Uygulamanın içindeki sayfa, en çok gereken anda, uygulama düşmüşken açılmazdı.
- Yoklama olmadan veritabanı düşünce ziyaretçi hata sayfası görürdü: kutu ayakta olduğu için ön kapı bunu tek başına bilemez.

## Düşünülen diğer yollar

- **Uygulama içinde site ayarı:** Seçilmedi. Uygulama düşünce çalışmaz, açıp kapatmak yeniden yayın ister.
- **Ayrı bir bakım kutusu:** Seçilmedi. Ön kapının yapabildiği iş için bir kutu daha bakım yükü getirir.
- **Sayfayı ayrı dosyadan sunmak:** Seçilmedi. POST isteği sayfa yerine 405 alırdı, ayara gömülü cevap her yöntemde 503'tür.
- **Her güncellemede otomatik bakım:** Seçilmedi. Yukarıda.

## Sonuçları

- Veritabanı düşünce sayfanın gelmesi yaklaşık 30 saniye sürer (ölçüldü: 31 sn). Bu sürede ziyaretçi uygulamanın hata cevabını görebilir. Yoklama sıklığı bu süreyle anlık aksamaya karşı dayanıklılık arasında bir denge.
- Kendiliğinden açılan bakım kayda yazılmaz ve bildirim göndermez; görünmesi için hata izleme ve zamanlanmış kontroller gerekir.
- Bakım sayfası ön kapıyla geldiği için, ön kapı kurulunca bütün sitelerde çalışır. Bu çekirdek güncellemesi değildir, değişmez kural 3'e girmez: site davranışı değil altyapının hata cevabı değişir.
- Ön kapının kendisi düşerse sayfa da görünmez.
- Ayar yeniden okununca Caddy boştaki bağlantıları kapatır; tarayıcılar yeniden bağlanır, ölçülen bir kesinti yok.
- Elle bakımda altyapı sahibi de siteye giremez. Deneme için ayrı bir geçiş yolu yoktur.
- Erişilebilirlik ölçümü elle yazılı kurallarla yapıldı (dil, başlık, yapı, kontrast, yakınlaştırma); otomatik tarama aracı projede henüz yok.
