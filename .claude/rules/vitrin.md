---
paths:
  - "cekirdek/vitrin/**"
  - "cekirdek/moduller/duzen/**"
  - "cekirdek/moduller/menu/**"
  - "cekirdek/katalog/deneme-bolumu/**"
  - "cekirdek/uygulama/app/**"
  - "cekirdek/temalar/**"
  - "siteler/**"
  - "**/sitemap*"
  - "**/robots*"
---

# Vitrin yapısı

- Ana sayfa afişi, ürün ızgarası, kategori listesi, yorum alanı gibi vitrin bölümlerini ortak bileşenlerden kur ve site tasarım değerleriyle giydir.
- Ortak bileşenle yapılamayan vitrin bölümünü o sitenin klasöründe yaz. İkinci bir sitede de gerekince çekirdeğe taşı.
- Sepet, ödeme formu, adres formu, stok kontrolü ve sipariş takibi bütün sitelerde aynı koddur. Yalnız görünümü site tasarımıyla değişir.
- Ana sayfanın ilk düzenini sitenin klasöründe başlangıç değeri olarak yaz (`baslangic/duzen.json`, yoksa temanın düzeni). Sonraki düzen mağaza sahibinin ayarıdır, veritabanında durur ve panelden değişir (karar 0010). Düzen değişikliği kod değişikliği gerektirmesin.
- Ürünün listede, aramada, önerilerde ve sepette görünen kartını tek bileşenden çıkar.
- İndirimli fiyatı, üstü çizili eski fiyatı ve para birimini her yerde tek fiyat bileşeniyle göster.
- Sayfa başlığı, açıklama, yapılandırılmış veri ve paylaşım görselini sayfa türüne göre ortak bir üreticiden al.
- Ürün ya da kategori adresi değişince eski adresi kalıcı olarak yenisine yönlendir. Site haritası kendiliğinden üretilsin.

## Bölüm kütüphanesi (karar 0081)

- Üst kısım, ana sayfa ve alt kısım bölümlerden kurulur. Bölüm türünün tarifi (`cekirdek/vitrin/bolum-kutuphanesi/tarif.ts`) adını, konabileceği alanları, alanlarını ve türlerini, görünümlerini ve bağlı olduğu işlevi yazar. Alanların şeması, panelin düzenleme formu ve düzen servisi bu tariften çıkar.
- Yeni bölüm türü `cekirdek/vitrin/bolumler/<tür>/` klasörüne yazılır, tarifi `kutuphane.ts`'e, görünüşü `gorunumler.tsx`'e kaydedilir. Bölüm kodunda elle içerik (ürün adı, fiyat, görsel adresi, bağlantı, cümle) yazmak denetimde hatadır; içerik alan değerlerinden ve veriden gelir.
- Düzen yalnız `cekirdek/moduller/duzen/servis.ts` ile okunur ve değişir. Vitrin bölümleri `cizilecekBolumler` ile alır ve `DuzenAlaniCizimi` ile çizer: her bölüm kendi hata sınırının içindedir.
- Bölümün bağlı olduğu işlev `cekirdek/kayitlar/islevler.ts` kaydındadır. İşlev yazılınca orada açılır; bölüm kendiliğinden çizilir.

## Menüler (karar 0082)

- Menüler ve alt bilgi bağlantıları mağaza sahibinin verisidir. Yalnız `cekirdek/moduller/menu/servis.ts` ile okunur ve değişir. Türler, hedefler, derinlik ve sınırlar `cekirdek/kayitlar/menu.ts` kaydındadır: derinliği ya da hedef türünü kodda elle yazma.
- Vitrin menüyü koduyla `vitrinMenusu` ile alır. Görünmeyen öğeyi (silinmiş ya da açılmayan hedef, boş başlık) süzmek servisin işidir, bölüm yeniden süzmez. Kategori menüsü ağaçtan gelir, kategori listesini bölümde ayrıca okuma.
- Başlangıç menüleri sitenin `baslangic/menuler.json` dosyasındadır. Kayıtlı hedef adres adıyla yazılır, başlangıç kataloğunda olmalıdır.
