# 0063 · Kategori ağacı, döngü denetimi ve silme kuralı

## Tarih

2026-11-08

## Karar

Kategoriler `kategoriler`, ürünlerle bağlantıları `urun_kategorileri` tablosunda durur (kart 0077). Kategori yalnız `cekirdek/moduller/kategori/servis.ts` ile okunur ve değişir. Ürünün kategorileri ürün girdisinin `kategoriler` alanıyla ürün servisinden yazılır.

- **Ağaç:** Her kategorinin bir üstü olur ya da en üsttedir. Derinlik sınırı yoktur. Sıra kardeşler arasındadır, verilmezse kardeşlerin sonudur.
- **Tekillik:** Ad aynı üstün altındaki silinmemiş kardeşler arasında tekildir (büyük küçük harf ayrımsız): "Erkek › Tişört" ve "Kadın › Tişört" olabilir. Adres adı sitede silinmemiş kategoriler arasında tekildir ve ürünle aynı kuralla üretilir (`cekirdek/metinler/adres-adi.ts`). Ürün ve kategori adresleri ayrı adlandırma alanıdır.
- **Döngü:** Taşıma üst kategorinin değişmesidir. Kategori kendi altına ya da bir torununun altına taşınamaz (`dongu`). Servis bunu bir işlem kilidi altında atalarını okuyarak denetler. Veritabanındaki `kategoriler_dongu` tetikleyicisi aynı kilidi alıp aynı denetimi yapar: servisi atlayan yazılar ve aynı anda gelen iki ters taşıma da döngü kuramaz. Tetikleyici yalnız READ COMMITTED işlemde taşımaya izin verir: daha yüksek yalıtımda ataları işlemin baştaki görüntüsünden okuyacağı ve aynı anda yapılan ters taşımayı göremeyeceği için reddeder.
- **Silme (kullanıcı kararı):** Kategori silinmiş olarak işaretlenir. Alt kategorileri silinenin üstüne çıkar, onların altları yerinde kalır. Ürünlerle bağlantıları kalkar, ürünler başka kategorilerinde kalır. Bağlantılar satır olarak silinir, kalkan ürünler silme kaydında listelenir. Üste çıkan bir alt kategori orada aynı adlı bir kardeşle karşılaşacaksa silme hiç yapılmaz (`silmede-ad-tekrar`), mağaza sahibi önce bir adı değiştirir.
- **Ürünün kategorileri:** Kimlik listesi, en çok 50, tekrarsız. Yalnız silinmemiş kategoriye bağlanılır. Kategori satırları paylaşımlı kilitle okunur: aynı anda silinen kategoriye bağlantı kurulmaz. Ürünün mevcut kategorileri de paylaşımlı kilitle okunur: aynı anda silinen kategori kayda bağlıymış gibi girmez. Değişiklik ürünün değişiklik kaydına (`kategoriler`) girer.
- **Kategorinin ürünleri:** `kategorininUrunleri` tek sorgudur: kategori alt ağacı (özyinelemeli), bağlantılar, görünürlük, sayfa ve toplam birlikte gelir. Alt kategorilerin ürünlerinin de gelmesi bir seçenektir; kategori sayfasında hangisinin kullanılacağına vitrin kartı karar verir. Vitrin süzgeci ürünün tek görünürlük koşuludur (`vitrinKosulu`, karar 0062). Sıra en yeni önce; elle sıralama vitrin yönetimiyle gelir. Sayfa sınırı `cekirdek/kayitlar/liste.ts`.
- **İzinler (kullanıcı kararı):** `kategori.gor`, `kategori.degistir` (ekleme, değiştirme, taşıma), `kategori.sil`. Görevli görür ve değiştirir, silemez.

## Neden

- Altların bir üste çıkması hiçbir kategoriyi ve ürünü kaybettirmez, mağaza sahibini silmeden önce ağacı boşaltmaya zorlamaz (kullanıcının seçtiği yol).
- Kardeşler arasında ad tekilliği, ağaçta aynı yerde iki aynı adlı kategoriyle karışıklığı önler, farklı dallarda aynı adı serbest bırakır.
- Döngünün veritabanında da denetlenmesi, bozuk bir ağacın vitrin ve menüyü sonsuz döngüye sokmasını kesin olarak önler. Kilit olmadan aynı anda yapılan iki ters taşıma, her biri tek başına geçerli olduğu için ikisi birden geçerdi.
- Tek sorgu, kategori sayfasının ürün sayısı arttıkça sorgu sayısının artmamasını sağlar (kural dosyası).

## Düşünülen diğer yollar

- **Dolu kategoriyi silmeyi reddetmek:** Kullanıcı seçmedi.
- **Alt kategorileri de silmek:** Kullanıcı seçmedi, bir tıklamayla bütün dal kaybolurdu.
- **Silmede çakışan alt kategorinin adını kendiliğinden değiştirmek ("Tişört (2)"):** Seçilmedi. Mağaza sahibinin bilmediği bir ad vitrinde görünürdü.
- **Bağlantıları silinmiş kategoride bırakıp okurken süzmek:** Seçilmedi. Ürünün kategori listesi değiştirilirken silinmiş bağlantılar ayrıca ele alınmalıydı; kalkan ürünler zaten silme kaydında yazılı.
- **Yol sütunu (materialized path) ya da kapanış tablosu:** Seçilmedi. Sitede en çok birkaç yüz kategori olur; özyinelemeli sorgu yeterince hızlı, taşımada başka satırları güncellemek gerekmez.
- **Döngüyü yalnız serviste denetlemek:** Seçilmedi, doğrudan yazı ve yarış açık kalırdı.

## Sonuçları

- Silme, alt kategorilerin üstünü değiştirdiği için her alt kategori için ayrı bir değişiklik kaydı yazar.
- Silinen kategori geri alınırsa (geri alma ekranı yok) ürün bağlantıları kendiliğinden dönmez; silme kaydındaki liste kullanılır.
- Servisin kilidi kaldırılsa bile tetikleyici yarışı yakalar; bu yüzden servis kilidinin tek başına kaldırılması testte kırmızıya düşmez, tetikleyicininki düşer.
- Kimlik biçiminde olmayan metin sorguya girmeden "bulunamadı" sayılır (`kimlikMi`, `cekirdek/veritabani/turler.ts`). Kategori ve ürün servisleri bunu yapar; vergi ve öteki servisler kart 0097'dedir.
- Silmede üste çıkan alt kategoriler eski sıra numaralarını korur, yeni kardeşlerinin numaralarıyla çakışabilir; sıralamada eşitliği ad bozar.
- Sayfa sonun ötesindeyse liste boş ve toplam 0 döner. Ekran toplamı ilk sayfadan alır.
- Kategori uçları yoktur. Yeni izinlerin her rolde beklentisi erişim testinde denenir; her uçta gerçek istekle denenmesi uçlar yazılınca olur.
- Kategorinin görünürlüğü (gizli kategori), sayfa başlığı ve görseli bu kartta yoktur; görünürlük ve vitrin bölümleriyle gelir.
