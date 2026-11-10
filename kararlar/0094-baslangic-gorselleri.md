# 0094 · Başlangıç dosyalarında görsel: kategori ve düzen dosya adıyla başvurur

## Tarih

2026-11-10

## Karar

- **Dosya adıyla başvuru:** Başlangıç kataloğunun kategorisi (`gorsel`) ve başlangıç düzeninin görsel alanları `baslangic/gorseller/` klasöründeki dosyanın adını yazar. Ad, galerideki kalıpla aynıdır, alt klasör yazılamaz. Site doğrulaması her adın düz bir dosya olduğunu ve içeriğinin uzantısıyla uyduğunu denetler. Temanın düzeni görsele başvuramaz, tema siteyi bilmez.
- **Katalogda:** Kategorinin görseli galeri görselleriyle birlikte, katalog işleminden önce kaydedilir.
- **Düzende:** Dosya kaydetme veritabanı işleminin içinde çağrılamaz (karar 0058). Görsele başvuran düzeni yalnız arka plan sürecinin açılıştaki kurulumu (`baslangiciKur`) yazar: görselleri kaydeder, işlemde adları kimliğe çevirir. Düzen yazılmazsa kaydedilen görseller silinmiş işaretlenir. Vitrin ve uçlar bu düzeni yazamaz: `KatalogBekleniyor` alırlar, vitrin düzeni boş görür (karar 0092 ile aynı yol).
- **Yalnız görsele başvuran düzen kataloğu beklemez:** Görselin kataloğa bağı yoktur.
- **Örnek Mağaza (kullanıcı kararları):** İki yeni kategori ve on bir yeni ürün. Eski on ürünün çizimleri fotoğraflarla değişti, Hediye Paketleme de görsel aldı. Üç yeni indirim sweatshirtle aynı tarihlidir (15 Kasım–1 Aralık 2026): indirim katalog kurulduktan sonra başlamazsa 30 gün kuralı eski fiyatı, dolayısıyla fırsatı göstermez (karar 0067, 0088). Fırsatlar dört ürün gösterir. `afis-yan-2` Öne çıkanların yan afişidir, Öne çıkanlar altı üründür. Marka logoları pakette logo olmadığı için gizli kalır.

## Neden

- Kimlik kurulumda üretilir, dosyaya yazılamaz. Adres adı gibi bir bağlama biçimi gerekiyordu, görselin adres adı olmadığı için dosya adı kullanıldı.
- Dosya adıyla kimlik eşlemesini saklamak yeni tablo gerektirirdi. Düzen açılışta bir kez kurulduğu için görselleri o anda kaydetmek yetiyor.

## Düşünülen diğer yollar

- **Görselleri katalogla kaydedip dosya adı ile kimliği yeni bir tabloda tutmak:** Yalnız ilk kurulumda kullanılacak bir tablo ve veritabanı değişikliği demekti.
- **Vitrinin ilk okumasında görselleri kaydetmek:** Ziyaretçi isteği onlarca görsel kodlamayı bekler, işlem içinde dosya kaydedilemez.
- **Düzeni görselsiz kurup sonra görselleri eklemek:** Düzen sürümlerinde kurulumdan kalma fazladan sürüm olurdu, yarıda kalırsa görselsiz düzen kalırdı.

## Sonuçları

- Görsele başvuran sitede arka plan süreci kurulumu bitirene kadar ana sayfa sade görünür, düzene dokunan uçlar 503 döner. Örnek Mağaza'da 59 görselle kurulum yaklaşık yarım dakika sürdü (bilgisayarda).
- Düzen görselleri kaydedilip süreç ölürse kayıtsız görsel kalır. Kurulumdan önce silinen kayıt yüzünden düşen bölümün görseli de başvurusuz kalır, vitrinde görünmez (bağımsız kontrolün bulgusu). İkisinin temizliği kart 0093.
- `gorsel` yazan site klasörü eski çekirdekte doğrulamadan geçmez: Örnek Mağaza'nın kimliği klasörle birlikte 0.50.0 oldu. Yayın ayrı iştir (kart 0128).
- Örnek Mağaza 15 Kasım'dan sonra sıfırdan kurulursa üç ürünün ve sweatshirtin eski fiyatı görünmez, fırsatlar boş kalır.
- Depo görsellerle 37 MB büyüdü: görseller kurulumda site klasöründen okunur.
