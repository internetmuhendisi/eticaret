# 0021 · Uygulama hangi site olduğunu ortam değişkenindeki klasörden öğrenir

## Tarih

2026-10-28

## Karar

Çekirdek uygulaması hangi siteyi çalıştırdığını yalnız `SITE_KLASORU` ortam değişkeninden öğrenir. Değişkenin değeri sitenin klasörünün yoludur, örneğin `siteler/ornek-magaza`. Uygulama kimliği ve ayarları bu klasörden okur, ayar şemasından geçirir. Değişken yoksa ya da klasör şemadan geçmezse uygulama açılmaz ve bütün hataları sayar.

Değişken verilmezse varsayılan site Örnek Mağaza'dır (0007). Bu varsayılan çekirdeğin dışında, yalnız iki yerde yazar: geliştirme için kökteki `pnpm cekirdek` komutunda, tarayıcı testleri için `playwright.config.ts` dosyasında.

Site klasörlerini şemadan geçiren komut `pnpm site-dogrula [siteler/<kod-adi>]` komutudur. Klasör verilmezse bütün siteler doğrulanır.

## Neden

- Docker görüntüsü siteden bağımsızdır, site klasörü kutuya çalışırken bağlanır (0013). Kutunun bilmesi gereken tek şey o klasörün nerede olduğudur.
- Tek değişken olunca site adı çekirdeğe hiç girmez (değişmez kural 1). Bunu bir test korur: `cekirdek/testler/site-adi-yok.test.ts`.
- Geçersiz bir klasörle açılmamak, yanlış para birimi ya da yanlış sipariş öneki gibi geri dönüşü zor hataları satıştan önce durdurur.

## Düşünülen diğer yollar

- Değişkene kod adını yazmak, klasörü `siteler/<kod-adi>` diye bulmak: Seçilmedi. Klasörün kutudaki yeri yerelde ve sunucuda farklıdır. Uygulama bu yeri yine bir yerden öğrenmek zorunda kalırdı.
- Varsayılan siteyi çekirdek uygulamasının `.env` dosyasında tutmak: Seçilmedi. `.env` kayda girmez, yeni bir bilgisayarda kendiliğinden oluşmaz. Örnek dosyası (`.env.example`) da site adını çekirdeğin içine yazmış olurdu.

## Sonuçları

- Göreli bir yol, uygulamanın çalıştığı klasöre göre çözülür. Komutlar ve testler bu yüzden tam yol verir.
- Varsayılan site iki yerde yazar: geliştirme komutu ve test ayarı. Varsayılan demo site değişirse ikisi birlikte değişir.
- Next.js şimdilik sayfaları derleme anında hazırlıyor, bu yüzden site adı derlenmiş pakete giriyor. Görüntünün siteden bağımsız olması için sitenin çalışma anında okunması gerekir. Bu iş kart 0035'e yazıldı, Docker görüntüsünden (0015) önce yapılmalıdır.
- Ayar şeması ve kimlik şeması: `cekirdek/ayar-semasi/`. Sitenin dili ve para biçimi artık ayarlardan okunur (`cekirdek/metinler/site-metni.ts`).
