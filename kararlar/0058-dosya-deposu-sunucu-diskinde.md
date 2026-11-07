# 0058 · Dosya deposu sunucunun diskinde, site başına kullanıcıya açık klasörde

## Tarih

2026-11-07

## Karar

- **Yer:** Her sitenin dosyaları sunucunun diskinde `/srv/altyapi/dosyalar/<ortam>/<kod adı>` klasöründe durur. Klasör yalnız sitenin kutu kullanıcısına açıktır (0700, karar 0031'deki kullanıcı), kutuya `/dosyalar` olarak yazılabilir bağlanır; kutunun geri kalanı salt okunur kalır. Uygulama yeri `DOSYA_KLASORU` ortam değişkeninden öğrenir. Klasör yayın klasöründen ayrıdır, yayınla değişmez, geri dönüşte kalır. Ek ücret yoktur, dosyalar Falkenstein'da, Almanya'dadır (karar 0009).
- **Kurulum:** Kutuyu açan betik, kutular açılmadan önce klasörü yayının kutu kullanıcısıyla `install -d -m 0700` ile kurar ya da sahibini ve iznini yeniden verir; içeriğine dokunmaz.
- **Yerel ortam ve kontrol hattı:** Sunucudaki gibi her site kendi kullanıcısıyla çalışır (40001, 40002, ...). Klasör Docker'ın adlandırılmış birimidir (`altyapi-yerel-dosyalar-<kod adı>`), her açılışta ağsız geçici bir kutuyla o kullanıcıya 0700 verilir. Bilgisayardaki bir klasör seçilmedi: sahibi başka kullanıcı olunca onu çalıştıran kişi silemezdi.
- **Kaydetme:** Tek yol `dosyaKaydet` (`cekirdek/moduller/dosya/servis.ts`). Tür içerikten anlaşılır, ad ve uzantı alınmaz. İzin verilen türler (JPEG, PNG, WebP) ve sınırlar (10 MB, 40 milyon piksel) `cekirdek/kayitlar/dosya.ts` dosyasındadır. SVG ve HTML yoktur: içlerinde çalışan kod taşıyabilirler. Görsel `sharp` ile her zaman yeniden kodlanır; konum, cihaz, tarih gibi gömülü bilgiler düşer, yön bilgisi görsele işlenir. İmzası ile içeriği uyuşmayan dosya reddedilir.
- **Ad ve kayıt:** Dosyanın adı veritabanındaki kaydın kimliği ve türün uzantısıdır. Dosya önce geçici adla yazılır, kayıtla aynı işlemde yerine konur; işlem geri alınırsa dosya silinir. Kayıt içeriğin özetini tutar, okumada özet tutmazsa hata verilir. Silme önce işarettir.
- **Yedek:** Kullanıcının kararıyla kart 0093'e ayrıldı. O kart bitmeden gerçek bir mağazaya dosya yüklenmez.

## Neden

- Her site zaten kendi işletim sistemi kullanıcısıyla çalışıyor (karar 0031). Klasörü o kullanıcıya açmak, bir sitenin başka sitenin dosyasına ulaşamamasını işletim sistemi düzeyinde sağlar: yanlış bağlanmış bir klasör bile okunamaz. Bu, yerel ortamda gerçek kutularla ölçülür.
- Hetzner'in nesne deposunda erişim anahtarı bütün projeye geçer. Siteleri orada ayırmak site başına ayrı proje (ve ücret) isterdi; tek proje, bir sitenin kutusuna bütün sitelerin dosyalarını açardı.
- 5-30 mağaza için sunucunun diski yeter. Ek hizmet, ek anahtar ve dış bağımlılık yoktur.
- Yeniden kodlama, gömülü bilgiyi silmenin ve içinde görsel olmayan bir şey taşıyan dosyayı dışarıda bırakmanın en güvenli yoludur. `sharp` bunu yapabilen, yaygın kullanılan ve bakımı süren tek seçenektir.

## Düşünülen diğer yollar

- **Hetzner Object Storage:** Seçilmedi. Site başına ayrım ayrı proje ister; yedek deposunun anahtarıyla aynı projede olmamalı (karar 0037). Disk dolunca yeniden bakılır.
- **Dosyaları veritabanında tutmak:** Seçilmedi. Veritabanını ve gece yedeğini şişirir, sunması yavaştır.
- **Gömülü bilgiyi yeniden kodlamadan silmek (yalnız EXIF'i ayıklamak):** Seçilmedi. Biçimlerin her köşesini bilmeyi gerektirir, içinde başka içerik taşıyan dosyayı geçirir.
- **SVG logoya izin vermek:** Seçilmedi. SVG çalışan kod taşıyabilir; temizlemek ayrı ve riskli bir iştir.

## Sonuçları

- Logo SVG olarak yüklenemez, PNG ya da WebP olur.
- Sunucunun diski sınırlıdır. Sunucu denetimi doluluğu ölçer, yüzde 85'te kırmızıdır; dolmadan nesne deposuna geçilir.
- Dosyalar tek sunucudadır. Yedeği gelene kadar (kart 0093) sunucunun diski kaybolursa dosyalar da gider; bu yüzden gerçek mağazaya yükleme 0093'ü bekler. Bu kuralın kontrolü yoktur, yalnız disiplindir.
- Yerel ortamda site kutuları artık kendi kullanıcılarıyla çalışır. Kullanıcı numarası sitenin açılıştaki sırasıdır; birim her açılışta o kullanıcıya verilir.
- `sharp` yerli (native) bir pakettir. Uygulama dosya servisini kullanmaya başlayınca (kart 0073) çekirdek görüntüsünde Alpine üzerinde çalıştığı ölçülmelidir; bugün görüntüye girmez.
- Sunucuya henüz uygulanmadı: klasör ilk yayında kurulur, denetimin klasör ölçümü 0.15.0 ve sonraki yayınlarda çalışır.
