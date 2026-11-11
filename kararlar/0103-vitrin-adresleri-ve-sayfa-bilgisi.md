# 0103 · Vitrin adresleri, eski adresin yönlenmesi ve sayfa bilgisi

## Tarih

2026-11-11

## Karar

Kart 0135 vitrin sayfalarının ortak iskeletini kurdu.

**Adresler.** Kategori, marka, etiket ve ürün sayfası `/<tür>/<adres adı>` adresinde açılır (`cekirdek/vitrin/adresler.ts`). Türler `cekirdek/kayitlar/adres.ts` kaydındadır. Adres adı yalnız `kayitAdresiniCoz` (`cekirdek/moduller/gorunurluk/adres.ts`) ile kayda çevrilir:

1. Kalıba uymayan ad için sorgu atılmaz, kayıt yoktur.
2. Adı bu olan ve vitrinde sayfası açılan kayıt varsa odur. Ürün yayın durumuyla süzülür (`vitrinKosulu`, sayfa yeri); kategori, marka ve etiket silinmemişse açılır.
3. Yoksa eski adreslerde aranır. Adı bir zamanlar bu olan kayıt hâlâ açılıyorsa onun bugünkü adresine kalıcı olarak yönlendirilir.
4. Hiçbiri değilse sayfa "bulunamadı"dır.

**Eski adresler.** Adres adı değişince eski ad `eski_adresler` tablosuna yazılır. Tabloyu yalnız veritabanındaki tetikleyici yazar (değişiklik 0031): servis, başlangıç kurulumu ya da doğrudan yazı fark etmez.
- Bir eski ad, bir türde tek kayda yönlenir; ad sonradan başka bir kaydın eski adı olursa satır o kayda geçer (en son bırakan kazanır).
- Eski ad bugün yaşayan bir kaydın adıysa yaşayan kayıt kazanır.
- Kayıt silinince satır kalır, ama silinmiş ya da sayfası açılmayan kayda yönlendirilmez: eski adres "bulunamadı"ya düşer.
- Yönlendirme her zaman kaydın bugünkü adına gider, zincir kurulmaz. Sorgu kısmı (`?sayfa=2`) korunur.

**Yönlendirmenin kodu 308'dir.** Next.js'in sayfa içi kalıcı yönlendirmesi (`permanentRedirect`) 308 verir. Arama motorları 308'i 301 gibi kalıcı sayar ve sıralamayı yeni adrese taşır; fark, 308'in istek yöntemini değiştirmemesidir. Kart 0135 "301" diyordu; 308 aynı amacı karşılar.

**Sayfa iskeleti.** Kayıt sayfası `KayitSayfasi` (`cekirdek/vitrin/kayit-sayfasi.tsx`) ile sayfa yolunu ve başlığı çizer; içeriği kartlar 0136 ve 0138 ekler. Ortak parçalar kütüphanededir: `SayfaYolu`, `SayfaBasligi`, `BosHal`, `Sayfalama` ve `DahaFazla` (sitenin "sayfa geçişi" ayarının iki değeri, karar 0102). İkisi de bağlantıdır, kod yüklenmeden çalışır, sayfa adreste durur.

**Sayfa bilgisi.** Sekme başlığı ve açıklama yalnız `cekirdek/moduller/gorunurluk/sayfa-bilgisi.ts` ile üretilir. Vitrin çerçevesi kalıbı bir kez kurar: "<sayfa> | <mağaza adı>" (metin dosyasında, mağaza adı ayardan). Sayfa yalnız kendi adını verir; ana sayfa mağaza adını alır. Kayıt sayfasının açıklaması kaydın açıklamasıdır (ürünün kısa açıklaması), yoksa türün kalıbından üretilir; 160 karakteri aşan açıklama sözcük sonunda kesilir.

## Neden

- Ürün ya da kategori adı değişince eski bağlantı (menüde, arama motorunda, paylaşılmış bir mesajda) kırılmamalı (`.claude/rules/vitrin.md`, temel paketin Görünürlük satırı).
- Tetikleyici hiçbir yazma yolunu atlamaz; dört servise ayrı ayrı kod eklemek birini unutmaya açıktı.
- Tek eski ad tablosu ve tek çözücü dört türü aynı kuralla yürütür. Zincirsiz yönlendirme hem tarayıcıyı hem arama motorunu tek adımda doğru adrese götürür.
- Sayfa yolu, başlık, boş hâl ve sayfalama bu bölümün beş sayfasında tekrar edecekti; kütüphanede bir kez yazılınca ayrışmaz.
- Başlık kalıbının tek yerde olması, mağaza adı değişince bütün sekme başlıklarının birlikte değişmesini sağlar.

## Düşünülen diğer yollar

- **Eski adı servislerde yazmak:** Dört servis ve başlangıç kurulumu ayrı ayrı yazmak zorunda kalırdı, doğrudan veritabanı yazısı atlanırdı. Seçilmedi.
- **Her türün kendi eski adres tablosu:** Aynı kural dört kez yazılırdı. Seçilmedi; tek tablo tür alanıyla ayrılır.
- **Zincirli yönlendirme (eski addan bir sonraki eski ada):** Her ad değişikliğinde bir adım uzar, arama motorları uzun zinciri izlemez. Seçilmedi.
- **Ara katmanda (proxy) 301 vermek:** Her kategori ve ürün isteğinde ara katmanın veritabanına gitmesi gerekirdi. 308 aynı işi gördüğü için seçilmedi.
- **Silinen kaydın eski adresini ana sayfaya ya da üst kategoriye yönlendirmek:** Müşteriyi beklemediği bir sayfaya götürür, arama motoru da bunu yumuşak 404 sayar. "Bulunamadı" sayfası (kart 0120) arama ve kategorilerle yol gösterir.

## Sonuçları

- Yeni tablo `eski_adresler` ve dört tetikleyici (değişiklik 0031). Satırlar silinmez; bir sitede adres adı sayısı kadar büyür, bu ölçekte sorun değildir.
- Kayda özel sayfa başlığı ve açıklama alanı henüz yoktur; panelle gelir (Görünürlük). Yapılandırılmış veri, paylaşım önizlemesi ve site haritası da Görünürlük işidir.
- Kategori, marka, etiket ve ürün sayfaları bugün yalnız iskelettir: menüden gelen müşteri başlığı görür, ürünleri görmez. Kartlar 0136 ve 0138 bitmeden Örnek Mağaza yayınlanmaz (kart 0147).
- Sayfalama parçası taslaktaki ilerleme çubuğunu çizmez: yeni CSS dosyası açılmadan tarayıcıların ilerleme öğesi biçimlenemiyor. "24 ürünün 8'ini gördünüz" yazısı aynı bilgiyi verir.
- Sayfa yolunun ve sayfa numaralarının bağlantıları menüdeki gibi alt çizgisizdir (taslak); fare üstüne gelince çizilir. Sitenin temel kuralı (bağlantı alt çizgiyle ayrılır) metin içindeki bağlantılar için geçerli kalır.
