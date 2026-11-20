# 0151 · Müşterinin iade talebi ve kendi iptali

## Tarih

2026-11-20

## Karar

Müşteri teslim aldığı siparişin iadesini hesabından ya da sipariş takibinden ister; ayar izin veriyorsa siparişini kendisi iptal eder (kart 0239; taslak `planlar/tasarim-yonu/siparis-ve-hesap.html`, karar 0145).

- **Talep** `siparis_iade_talepleri` tablosunda bir satırdır, yalnız `iadeTalebiServisi` (`cekirdek/moduller/siparis/iade-talebi.ts`) yazar. Durumlar kayıttadır: bekliyor, onaylandı, reddedildi. Müşteri ürün ve adet, nedeni (müşterinin nedenleri: beklentimi karşılamadı, kusurlu ya da hasarlı, yanlış ürün geldi, bedeni uymadı, diğer) ve isteğe bağlı açıklama verir. Talep yalnız teslim edilmiş ya da kısmen iade edilmiş siparişte, teslimden sonra iade talebi süresi içinde açılır. Süre veritabanının saatiyle denetlenir, son an kapalıdır. Talep, onay ve ret siparişin geçmişine yazılır, durum değişmez.
- **Talep edilebilir adet** (`talepEdilebilirAdetler`): kalemin adedinden iade edilmiş ya da iadesi bekleyen adet, bekleyen talepteki adet ve onaylanmış ama iadesi yapılmamış talepteki adet düşülür. Reddedilen talebin adedi yeniden istenebilir. Bir siparişte aynı anda en çok bir bekleyen talep olur (kullanıcı kararı; veritabanında tekil kısmi indeks).
- **Karar**: mağaza sahibi (`siparis.iade`) onaylar ya da müşteriye açıklama yazarak reddeder. Onay parayı geri ödemez: ürün gelince "İade yap" talebin ürünleri ve nedeniyle seçili açılır, iade kart 0235'in akışıyla (`iadeYap`) yapılır ve talebe bağlanır (`siparis_iadeleri.talep_kimligi`; bir talepten en çok bir yürüyen ya da tamamlanmış iade). Tutarı yine mağaza sahibi belirler.
- **Müşterinin iptali** kart 0235'in iptal akışıdır (`iadeYap`, `siparis_iadeleri.kaynak = "musteri"`, geçmişte `musteri-iptali`): bütün ürünler stoğa döner. Ayar (`musteriIptali`) hangi durumda açık olduğunu verir: kapalı, ödeme beklenirken (varsayılan), kargoya verilene kadar. Ödemesi alınmış ve parası ödeme kuruluşundan dönmeyen siparişi (havale, panelde "ödeme alındı") müşteri iptal edemez; ekran mağazayla iletişimi söyler (kullanıcı kararı). Kartla ödenmişse para kuruluştan döner. Siparişin durumu ve ödeme kuralı siparişin kilidi altında denetlenir; ayarın değeri işlemden hemen önce okunur (aynı anda değişen ayar en çok o isteği etkiler).
- **Ayarlar** mağaza sahibinindir, Sipariş ayarları ekranının "İptal ve iade" bölümünde birlikte kaydedilir: `musteriIptali`, `iadeTalebiSuresi` (gün, 1–365, varsayılan 14), `iadeKargosu` (mağaza ya da müşteri, varsayılan mağaza; talep formunda söylenir).
- **Üye olmayan müşteri** takip sayfasından talep açar ve iptal eder. Uçlar takip anahtarıyla siparişi bulur, robot korumalı ve sıkı sınırlıdır (`/kapi/herkese-acik/siparis-takibi/iade-talebi` ve `/iptal`). Takip çerezi iki yola yazılır: takip sayfası ve takip uçlarının yolu (`siparisTakipCerezi.kapiYolu`). Takipte geçmiş olmadığı için (karar 0150) talepler ve sonucu ayrı bölümde, ret açıklamasıyla görünür.

## Neden

- Talep tutar belirlemez: ürünün durumu mağazaya ulaşınca anlaşılır; iade tutarı ve vergisi tek akıştan (kart 0235) gelir.
- Onaylanmış ama iadesi yapılmamış talepteki adedi saymamak, aynı ürünün iki kez onaylanıp iki kez iade edilmesini önler. Reddedilen talebin adedini serbest bırakmak, eksik bilgiyle reddedilen müşteriye ikinci şans verir.
- Havaleyle ödenmiş siparişin müşteri iptali, kimse parayı göndermeden "iade edildi" yazardı (karar 0147: elle iade kaydedilince yapılmış sayılır). Kartla ödemede para kuruluştan kendiliğinden döner.
- Tarayıcı çerezi yalnız yolunun altındaki isteklere gönderir. Takip çerezi yalnız sayfanın yolundayken takip uçları anahtarı göremiyordu: kart 0238'in "Başka bir sipariş sorgula"sı tarayıcıda çerezi siliyor ama veritabanındaki anahtarı silemiyordu (bu iş sırasında bulundu; uç testi çerezi elle verdiği için yakalamıyordu). İkinci yol bunu da düzeltir; anahtar yine sitenin başka yoluna gitmez.

## Düşünülen diğer yollar

- **Ödenmiş havalede de müşteri iptali, iade "mağazanın göndermesi bekleniyor" diye açık kalır:** müşteri için tek adım olurdu, iade akışına yeni bir ara durum ve mağazaya ikinci işaretleme eklerdi. Kullanıcı seçmedi.
- **Siparişte birden çok bekleyen talep:** müşteri ürünleri ayrı ayrı isteyebilirdi, mağaza aynı ürün için çakışan talepler görürdü. Kullanıcı seçmedi.
- **Takip çerezini sitenin köküne yazmak:** tek çerez yeterdi, anahtar sitenin her isteğine giderdi (karar 0150 bunu yalnız takip sayfasına sınırladı).
- **Onayda iadeyi kendiliğinden yapmak:** mağaza ürünü görmeden para dönerdi; taslak ve iş kuralı onayı ve iadeyi ayırır.
- **İptal penceresinde neden seçimi (taslaktaki isteğe bağlı alan):** müşterinin iptal nedenleri kayıtta yok; iptal "müşteri vazgeçti" nedeniyle yazılır. Gerekirse ayrı kartla eklenir.

## Sonuçları

- Talebin ve kararın e-postaları kart 0240 ve 0241'dedir; bugün müşteri sonucu yalnız sipariş sayfasında görür. Teşekkür ekranı "inceleme süresi" söz vermez.
- Onaylanmış talebin iadesi yapılmadan mağaza aynı ürünü talepsiz iade ederse talep açık kalır ve o adet iki kez düşülür; "İade yap" onaylı talep varken talebe bağlı açılır, iki yolun karışması yalnız disiplindir.
- Ürün düzeyinde "iade edilemez" bilgisi (taslaktaki kişisel bakım örneği) temel pakette yoktur.
- Cayma süresiyle iade talebi süresinin ilişkisi ve iade koşulları metni hukukçuya teyit ettirilir (kart 0063).
