# 0139 · Kapının zarflı yanıtları önbelleğe alınmaz

## Tarih

2026-11-17

## Karar

Kapının zarfla dönen her yanıtı, başarılı ve hatalı, her girişte (herkese açık, müşteri, yönetici, sahip) `Cache-Control: no-store` taşır. Başlık tek yerde, zarfın kendisinde konur (`zarfOnbellegi`, `cekirdek/kapi/zarf.ts`). Ucun hatalı yanıta eklediği başlık korunur (`Retry-After`) ama önbelleği açamaz. Tek istisna dosya yanıtıdır (logo, ürün görseli, vitrin görseli, panel görseli): kendi kısa süresini taşır (karar 0059, kart 0142); dosya ucunun hatası zarfladır, önbelleksizdir. Kart 0065, kullanıcı onayıyla.

## Neden

- Kapının yanıtı kişiye özel olabilir: müşterinin hesabı, favorileri, panelin verisi. Başlıksız yanıtı tarayıcı ya da aradaki bir önbellek saklayabilir, çıkıştan sonra ya da başka birine geri verebilir (kart 0033'ün bağımsız kontrolünde görüldü).
- Uç uç istisna listesi tutmak yerine zarfın kendisinde koymak, yeni ucu kendiliğinden kapsar. Herkese açık JSON uçlarının (sağlık, robot sorusu, sepet hesabı) önbellekten bir kazancı yoktur: sağlık her sorguda taze olmalı, ötekiler kişiye ya da ana bağlıdır.

## Düşünülen diğer yollar

- **Yalnız müşteri ve yönetici girişinde:** Seçilmedi. Herkese açık uçlar da girişli kişinin çerezini okuyabilir (çıkış, şifre yenileme) ve bugün hiçbirinin önbelleğe ihtiyacı yok; iki kural yerine bir kural.
- **`private, no-cache`:** Seçilmedi. Tarayıcı yanıtı yine diske yazar; kişisel veri için `no-store` gerekir.
- **Ön kapıda (Caddy) bütün `/kapi/` için başlık:** Seçilmedi. Dosya yanıtlarının süresini ezerdi, ve yerel geliştirme ile testler ön kapıdan geçmez.

## Sonuçları

- Erişim testi (`cekirdek/kapi/testler/erisim-denemesi.ts`) her uçta her kişinin yanıtını ölçer: dosya yanıtı dışında `no-store` taşımayan yanıt kırmızıdır. Yeni bir önbellekli uç gerekirse ayrı karar ister.
- Tarayıcı `no-store` yanıtın gövdesini kendiliğinden indirmez: yalnız durum koduna bakılıp gövdesi okunmayan yanıt (vitrinin hesap sorusunun 401'i) isteği bitmemiş bırakır, bağlantıyı tutar ve tarayıcı testlerinin "sayfa hazır" beklemesini süresiz bekletir (ilk tam çalışmada 88 tarayıcı testi bu yüzden düştü, ölçüldü). Bu yüzden tarayıcıdan kapıya her istek gövdeyi her zaman sonuna kadar okuyan `kapiyaIstek` ile gider (`cekirdek/kapi/istemci.ts`); doğrudan `fetch` denetimde hatadır (`denetim/kurallar/dogrudan-istek.grit`; muaf: ortak işlev, hata izleme aracına gönderim, testler ve komutlar). Uç uç gövdeyi okumak seçilmedi: yeni bir ekranın unutması aynı hatayı geri getirirdi.
- Kapı dışında kalan yanıtlar (ara katmanın gövdesiz 404'ü, Next.js'in kendi sayfaları) bu kuralın dışındadır; vitrin sayfalarının önbelleği ayrı iştir.
