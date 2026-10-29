# 0024 · Kapının yapısı: tek uç tanımı, tek zarf, çekirdeğin sürümü kodda

## Tarih

2026-10-29

## Karar

- **Uç tanımı:** Kapıdaki her uç `ucTanimla` ile yazılır (`cekirdek/kapi/uc.ts`). Tanımda giriş, Zod şeması, izin beyanı ve istek sınırı zorunludur, biri eksikse tür kontrolü geçmez. Herkese açık girişteki uç yalnız `herkese-acik` beyanını, öteki girişlerdeki uç izin kaydındaki bir izni alır. İzin kaydı kart 0026'ya kadar boştur, bu yüzden o zamana kadar öteki girişlere uç yazılamaz.
- **Adres dosyası:** Next.js'in `app/kapi/<giriş>/.../route.ts` dosyası yalnız ucu bağlar (`export const GET = saglikUcu`). Uç `cekirdek/kapi/` altında, işi yapan servis kendi modülünde ya da `cekirdek/izleme/` altında durur.
- **Zarf:** Başarılı yanıt `{ basarili: true, veri }`, hatalı yanıt `{ basarili: false, hata: { kod, ayrinti? } }` (`cekirdek/kapi/zarf.ts`). Hata kodları ve HTTP karşılıkları `cekirdek/kayitlar/kapi.ts` dosyasındadır. Servis bilinen bir hatayı `BilinenHata` ile bildirir; beklenmeyen hata `sunucu-hatasi` olur ve mesajı istemciye gitmez.
- **İstek sınırı:** Sayaçlar uygulamanın belleğinde, uç ve istemci adresi başına, sabit pencereyle tutulur (`cekirdek/kapi/istek-siniri.ts`). Sınır değerleri kayıttadır (`genel`, `siki`). İstemci adresi `X-Forwarded-For` başlığının son değeridir; bu değeri önündeki ters vekil yazar.
- **Çekirdeğin sürümü:** Çalışan çekirdeğin sürümü `cekirdek/surum.ts` dosyasında yazar. Sağlık ucu sürümü buradan söyler. Sitenin kayıtlı sürümü kimlik dosyasında kalır (karar 0011).
- **Uç belgesi:** `cekirdek/kapi/uclar.md`. Uygulamadaki her kapı adresinin belgede, belgedeki her adresin uygulamada olduğunu bir test denetler.

## Neden

- Kural "şemasız ya da izinsiz uç yayına çıkmaz" diyor. Bunu yazım anında ancak tür kontrolü yakalar. Denetim kuralı ya da gözden geçirme sonradan yakalar.
- İzin kontrolü gelmeden yetkili bir uç yazılabilseydi, o uç kontrolsüz açık kalırdı. Boş izin kaydı bunu türle engeller.
- Hata kodu sabit olunca ekran ve dış yazılımlar hataya metne bakmadan karar verir. Metin dile göre değişir, kod değişmez.
- Her site tek kutuda, tek süreçte çalışır (karar 0013). Bellekteki sayaç bu ölçekte yeterlidir, ayrıca bir sunucu gerekmez.
- Kimlik dosyasındaki sürüm "bu site hangi sürümde olmalı" sorusunun cevabıdır. "Şu an hangi kod çalışıyor" sorusunun cevabı ise kodun kendisinde olmalıdır. İkisi ayrı yerde durunca sahip paneli farkı görebilir (karar 0011).

## Düşünülen diğer yollar

- Şemasız ya da izinsiz ucu denetim kuralıyla yakalamak: Seçilmedi. Denetim dosyanın biçimine bakar ve kolayca atlatılır. Tür kontrolü tanımın kendisini zorlar.
- Next.js'in ara katmanında (proxy) ortak işleri yapmak: Seçilmedi. Uç başına şema ve sınır bilgisi ara katmana ulaşmaz, iki yerde tanım olurdu.
- İstek sınırını veritabanında ya da ayrı bir önbellek sunucusunda tutmak: Seçilmedi. Her isteğe bir veritabanı yazması ekler. Site birden çok süreçte çalışırsa yeniden düşünülür.
- Sürümü `package.json` dosyasından okumak: Seçilmedi. Kökteki `package.json` bütün çalışma alanınındır, uygulamanınki ise yalnız Next.js uygulamasınındır. Çekirdeğin sürümü ikisine de tam oturmaz. Ayrıca derlenmiş pakete dosya yolu taşımak gerekirdi.
- Sürümü Docker görüntüsünün etiketinden ortam değişkeniyle vermek: Seçilmedi. Yerelde ve testte değişken olmazdı. Etiket bu dosyadan üretilebilir (kart 0015).
- Uç belgesini OpenAPI biçiminde şemalardan üretmek: Şimdilik seçilmedi. Tek uç için fazla kurulum. Dış entegrasyon gelince yeniden düşünülür.

## Sonuçları

- Bellekteki sayaç uygulama yeniden başlayınca sıfırlanır. Site birden çok süreçte çalışırsa sınır süreç başına olur.
- İstemci adresi başlıktan okunduğu için uygulama canlıda yalnız ters vekil üzerinden erişilebilir olmalıdır (kartlar 0016, 0020). Doğrudan erişilirse istemci başlığı kendisi yazıp sınırı atlatabilir.
- İmzayla doğrulanan, sınırdan muaf bildirim uçları (ödeme, kargo) ilk böyle uç gelince eklenir.
- Çekirdek sürümü değişince `cekirdek/surum.ts` güncellenir ve sürüm notu yazılır. Sürümün biçimini bir test denetler.
- Veritabanı bağlantısına 5 saniyelik bağlantı zaman aşımı ve boştaki bağlantılar için hata dinleyicisi eklendi. Bunlar olmadan veritabanı kapanınca uygulama düşebilir ya da cevapsız kalabilirdi.
- Uygulama yerelde bağlantı bilgisini kökteki `.env` dosyasından okur (`cekirdek/uygulama/next.config.ts`). Sunucuda bu dosya yoktur, değişkenler kutunun ortamından gelir.
- Hatalar şimdilik yalnız konsola yazılır. Ortak hata katmanı kart 0014'tedir.
