# 0038 · Bakım sayfası ön kapıda

## Tarih

2026-11-06

## Karar

- **Yer:** Bakım sayfası uygulamanın değil ön kapının (Caddy) parçasıdır, her sitenin ayar satırına gömülür. Uygulama düşmüşken de açılır, çekirdek sürümüne bağlı değildir.
- **Kendiliğinden bakım:** Kutu kapalıysa bağlantı hatası sayfaya düşer. Kutu 30 saniye cevap vermezse istek de sayfaya düşer. Ön kapı sağlık ucunu 5 saniyede bir yoklar, altı hatada (veritabanı düştü) ziyaretçi kutuya gönderilmez. Düzelince sayfa kendiliğinden kalkar.
- **Elle bakım:** `pnpm bakim <site> <ortam> ac|kapat|durum`. Vitrin ve yönetim paneli birlikte kapanır (kullanıcı kararı): bakım çoğunlukla veri değişirken açılır, panelden yapılan değişiklik karışabilir. İşaret sunucudadır (`/srv/altyapi/on-kapi/bakim-acik/<kod adı>`), yayın, geri dönüş ve yeniden kurulum onu korur. Açılıp kapanması `bakim-kaydi.jsonl` dosyasına yazılır.
- **Güncelleme:** Bakım yayına otomatik bağlanmaz. Yayın zaten kesintisizdir (0035), ziyaretçi gereksiz yere kapalı site görürdü. Veri düzenini riskli biçimde değiştiren güncellemede elle açılır.
- **Cevap:** 503, `Retry-After: 300`, önbelleksiz, arama motorlarına kapalı. Kapıya gelen istek zarfla `hizmet-kullanilamiyor` alır. Sağlık ucu elle bakımda da kutuya gider, kontroller gerçek durumu görür; yalnız tam adresle ve GET ile eşleşir, yakın biçimleri bakımı aşamaz.
- **Metin:** Ortak metin `vitrin.bakim.*` anahtarlarında, sitenin metni site ayarı `bakimMetni` (boş bırakılabilir, çekirdek 0.3.0). Ad ve metin sitenin yayındaki klasöründen okunur. Tasarım değerleri henüz yok, sayfa sistem renkleriyle açık ve koyu temaya uyar.
- **Denetim:** `pnpm sunucu-denetle` elle bakımdaki sitede sayfayı bekler, 24 saatten uzun açık kaldıysa kırmızıdır. Bu satır yayını durdurmaz: unutulan bir bakım başka sitenin güvenlik yayınını engellemesin.

## Neden

- Uygulamanın içindeki sayfa, en çok gereken anda, uygulama düşmüşken açılmazdı.
- Yoklama olmadan veritabanı düşünce ziyaretçi hata sayfası görürdü: kutu ayakta olduğu için ön kapı bunu tek başına bilemez.

## Düşünülen diğer yollar

- **Uygulama içinde site ayarı:** Seçilmedi. Uygulama düşünce çalışmaz, açıp kapatmak yeniden yayın ister.
- **Ayrı bir bakım kutusu:** Seçilmedi. Ön kapının yapabildiği iş için bir kutu daha bakım yükü getirir.
- **Yoklamayı kendi zamanlayıcımızla yapmak:** Seçilmedi. Üst üste sayardı ama bir servis ve ön kapıyı değiştiren bir yol daha getirirdi.
- **Sayfayı ayrı dosyadan sunmak:** Seçilmedi. POST isteği sayfa yerine 405 alırdı, ayara gömülü cevap her yöntemde 503'tür.
- **Her güncellemede otomatik bakım:** Seçilmedi. Yukarıda.

## Sonuçları

- Veritabanı düşünce sayfanın gelmesi en çok yaklaşık 30 saniye sürer; önceden birikmiş yoklama hatası varsa daha kısadır (6 saniye ölçüldü). Bu sürede ziyaretçi uygulamanın hata cevabını görebilir.
- **Yanlış bakım:** Caddy yoklama hatalarını üst üste değil biriktirerek sayar, araya giren başarılı yoklama sayacı sıfırlamaz (bağımsız kontrol ölçtü). Seyrek aksamalar birikip altıya ulaşırsa sağlıklı site, bir sonraki başarılı yoklamaya kadar (en çok yaklaşık 5 saniye) bakım sayfası gösterebilir, o sırada gelen istek 503 alır. Eşik bu olasılığı seyreltir, bitirmez. Kabul edildi: kendini düzeltir ve zararı küçüktür; veritabanı düşünce ziyaretçiye sayfa göstermek bundan değerlidir. Gerçek mağazada sık görülürse yoklama kaldırılır.
- Başka bir sitenin yayını ya da bakımı ön kapıyı yeniden okutunca, kendiliğinden açılmış bakım birkaç saniye kalkar ve uygulama trafik alır.
- Bakımdaki bir sitenin kutusu bilerek durdurulursa sağlık ölçümü kırmızıdır ve öteki sitelerin yayınını da durdurur.
- Kendiliğinden açılan bakım kayda yazılmaz ve bildirim göndermez; görünmesi için hata izleme ve zamanlanmış kontroller gerekir.
- Bakım sayfası ön kapıyla geldiği için, ön kapı kurulunca bütün sitelerde çalışır. Bu çekirdek güncellemesi değildir, değişmez kural 3'e girmez: site davranışı değil altyapının hata cevabı değişir.
- Ön kapının kendisi düşerse sayfa da görünmez.
- Ayar yeniden okununca Caddy boştaki bağlantıları kapatır; tarayıcılar yeniden bağlanır, ölçülen bir kesinti yok.
- Elle bakımda altyapı sahibi de siteye giremez. Deneme için ayrı bir geçiş yolu yoktur.
- Erişilebilirlik ölçümü elle yazılı kurallarla yapıldı (dil, başlık, yapı, kontrast, yakınlaştırma); otomatik tarama aracı projede henüz yok.
