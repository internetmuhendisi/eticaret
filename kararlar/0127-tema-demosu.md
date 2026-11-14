# 0127 · Tema demosu: tek demo sitesi, adresten seçilen tema, yalnız gezinti

## Tarih

2026-11-15

## Karar

Hazır temaların gezilebilir demosu (karar 0080, kart 0116) tek bir demo sitesidir: **Tema Galerisi** (`siteler/tema-galerisi/`, türü `demo`). Örnek Mağaza'nın kataloğunun, menülerinin ve düzeninin bir kopyasıyla açılır, sonra ondan bağımsızdır. Logo taşımaz, mağaza adını yazıyla gösterir.

- **Site ayarı `temaDemosu`** (altyapı sahibinin, varsayılan kapalı) demonun bütün davranışını açar. Davranışlar tek bir ürün kavramı olduğu için ayrı ayrı açılıp kapanmaz.
- **Tema adresten seçilir:** `…/?tema=<kod>`. Ara katman seçimi çereze yazar ve aynı adrese parametresiz yönlendirir (303). Sonraki her sayfa, arama dahil, temayı çerezden okur. Her hazır temanın kendi adresi böyle olur. Yeni hazır tema kendiliğinden demoya girer. Sitenin kullanamayacağı tema, siteye özel tema dahil, yok sayılır. Vitrin temayı yalnız `vitrinTemasi` ile okur, panel sitenin kayıtlı temasını okur. Demo temayı mağaza sahibinin ayarları olmadan, kendi değerleriyle gösterir; koyu tema sitenin başlangıç ayarındandır.
- **Demo şeridi ve temalar arası geçiş (kullanıcı kararı):** Vitrinin en üstünde "Bu bir tema demosudur: alışveriş yapılamaz, hesap açılamaz." yazar, temalar bağlantıdır, seçili tema işaretlidir. Geçiş sayfayı baştan yükler, çünkü temanın değerleri kök düzendedir.
- **Yalnız gezinti (kullanıcı kararı: düğmeler gizlenir, şerit açıklar):**
  - Hesap öğesi, "Yorum yaz" ve favoriler sayfasının giriş bağlantısı çizilmez.
  - Giriş, kayıt ve şifre sayfaları bulunamadı verir.
  - Tarayıcı oturum sormaz, favoriler üye olmayan müşteri gibi tarayıcıda durur.
  - Kapıda müşteri girişindeki her uç ve hesap, sipariş, yorum, bildirim ya da e-posta doğuran herkese açık uç `bulunamadi` döner. Herkese açık uç durumunu tanımında beyan eder (`temaDemosunda`, tür kontrolü ister), böylece ileride gelecek sipariş uçları da bu kurala bağlanır.
- **Site doğrulaması:** Yalnız türü `demo` olan site tema demosu olabilir, e-posta gönderen adresi ve eklenti yazılmaz.
- **Arama motorlarına kapalı:** Ara katman her yanıta `X-Robots-Tag: noindex, nofollow`, çerçeve `noindex` yazar.
- **Panel bağlantısı kart 0148'dedir:** Tema ekranının "Demoyu gez" bağlantısı demonun adresine `?tema=<kod>` ekler.

## Neden

- Tek site tek kez barındırılır ve güncellenir. Sunucu küçüktür (4 işlemci, 8 GB), her site iki kutu demektir. Çekirdek güncellemesi site site yapılır, üç ayrı demo üç kez güncelleme isterdi.
- Örnek Mağaza demo olamaz: tarayıcı testleri orada kayıt ve giriş dener, demoda bunlar kapalıdır.
- Tema adresten seçildiği için panel her temaya ayrı bağlantı verebilir, mağaza sahibi şeritte temaları aynı sayfada karşılaştırabilir.
- Kapının uç beyanı zorunludur: yalnız bilinen uçları listeleyen bir kural, yeni bir müşteri ucunda unutulurdu.

## Düşünülen diğer yollar

- **Her temaya ayrı demo sitesi:** Kartın "her temanın kendi adresi" maddesine en doğrudan uyan yoldu, ama üç kat barındırma ve güncelleme demek. Seçilmedi.
- **Örnek Mağaza'yı demo yapmak:** Ek site gerekmezdi, ama testler orada müşteri işlemlerini dener. Ayrıca demoda müşteri kapalı olmalı. Seçilmedi.
- **Temayı her bağlantıda adreste taşımak:** Çerez gerekmezdi, ama vitrinin bütün bağlantılarını değiştirmek gerekirdi. Seçilmedi.
- **Düğmeler görünsün, basınca açıklansın:** Tema gerçek mağazadaki gibi görünürdü, ama ziyaretçi işe yaramayan düğmelere basardı. Kullanıcı gizlemeyi seçti.

## Sonuçları

- Ara katman artık vitrin sayfalarında da çalışır (Next.js'in dosyaları ve kapı dışında). Demo olmayan sitede yalnız ayarı okuyup geçer.
- Herkese açık her yeni uç demodaki durumunu beyan etmek zorundadır.
- Demo, temayı mağaza sahibinin seçebileceği renk ve yazı tipi seçenekleri olmadan, temanın kendi hâliyle gösterir.
- Demo sitesinin sunucuya kurulması (deneme adresi, ön kapı, gizli bilgiler, yayın) ayrı bir adımdır. Kullanıcının onayıyla ve yeşil hatla yapılır.
- Örnek verinin görselleri (yaklaşık 34 MB) iki site klasöründe ayrı ayrı durur.
