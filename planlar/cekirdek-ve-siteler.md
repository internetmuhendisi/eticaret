# Çekirdek, siteler ve sahip paneli

Altyapı haritasındaki (`planlar/altyapi-haritasi.md`) üç parçanın ayrıntısı: bir site klasöründe ne durur, çekirdekte ne vardır, sitenin çekirdek sürümü nerede yazar, sahip paneli bilgiyi nereden alır. Örnek olarak Örnek Mağaza kullanılır.

Durum: 2026-10-28 tarihinde kullanıcı onayıyla yazıldı. Kararlar 0010, 0011 ve 0012 olarak kaydedildi. Klasör ve dosya adları karar 0015 ile kesinleşti. Kesin ağaç `.claude/rules/klasor-duzeni.md` dosyasındadır, örneğin `kimlik` dosyasının adı `kimlik.json`, `ayarlar` dosyasının adı `ayarlar.json` olur.

## Tek cümleyle

Çekirdek **motoru**, site klasörü **mağazanın kimliğini ve başlangıç değerlerini**, sitenin veritabanı **mağaza sahibinin panelden yaptığı her şeyi** tutar. Sahip paneli bu üçüne dokunmadan, her siteye ayrı ayrı sorarak bilgi toplar.

## Önce bir ayrım: ayarı kim değiştirir?

Bir site ayarını ya altyapı sahibi değiştirir ya da mağaza sahibi. Ayarın nerede durduğu da buna göre değişir.

| | Altyapı sahibinin ayarı | Mağaza sahibinin ayarı |
|---|---|---|
| Nerede durur | Site klasöründe | Sitenin veritabanında |
| Nasıl değişir | Kayıt ve yayınla | Panelden, anında |
| Geri alma | Önceki kayda dönerek | Panelden (tema için sürüm geçmişi) |
| Örnek | Para birimi, sipariş numarası öneki | Kargo ücreti, tema rengi, kapıda ödeme |

Mağaza sahibinin ayarları da site klasöründe bir kez yazılır: **başlangıç değeri** olarak. Site kurulurken veritabanına aktarılır, sonra yalnız panelden değişir. Böylece her değerin tek bir asıl yeri olur.

Aşağıdakileri yalnız altyapı sahibi değiştirir, geri kalan bütün ayarları mağaza sahibi panelden değiştirir (karar 0010). Her ayarın kimde olduğu `planlar/site-ayarlari.md` dosyasında yazar:

- satış ve teslimat ülkesi, dil, para birimi ve biçimi, saat dilimi, ağırlık ve boyut birimi;
- sipariş numarası öneki ve başlangıcı;
- "Mağaza sahibi temayı değiştirebilir" ve "Vitrinde altyapı adı".

Neden: Bunlar yayındaki bir mağazada değişirse eski fiyatlar, siparişler ve faturalar tutarsız kalır.

## 1. Site klasöründe neler durur

Örnek Mağaza'nın klasörü:

```
siteler/ornek-magaza/
  kimlik        ← kim olduğu, adresleri, hangi çekirdek sürümünde çalıştığı
  ayarlar       ← altyapı sahibinin ayarlarından varsayılandan farklı olanlar
  baslangic/    ← kurulumda veritabanına bir kez yazılan değerler
  marka/        ← logo, küçük site ikonu, paylaşım görseli
  tema/         ← yalnız bu siteye özel tema varsa (Örnek Mağaza'da yok)
  vitrin/       ← yalnız bu siteye özel vitrin bölümü varsa (Örnek Mağaza'da yok)
  testler/      ← bu sitenin kendi kontrolleri
  KURALLAR.md   ← bu sitenin kural dosyası
```

**kimlik.** Sitenin kod adı (`ornek-magaza`), görünen adı (Örnek Mağaza), türü (demo: gerçek satış yok, arama motoruna kapalı), canlı ve deneme adresleri, **çekirdek sürümü** ve teslim durumu (mağaza sahibi hesabı verildi mi, yurt dışı aktarım belgeleri tamam mı; Örnek Mağaza'da ikisi de gerekmez, karar 0007 ve 0009).

**ayarlar.** Yalnız varsayılandan farklı olan değerler yazılır, yazılmayan ayar varsayılanla çalışır. Örnek Mağaza'da tek satır: sipariş numarası öneki `ORN`. Dosya her yayında o çekirdek sürümünün ayar şemasıyla doğrulanır, şemada olmayan ya da yanlış türde bir değer yayını durdurur.

**baslangic/.** Mağaza sahibinin ayarlarının ilk değerleri ve ilk içerik. Örnek Mağaza'da:
- kapıda ödeme açık, seçenekler nakit ve kart;
- vitrinde koyu tema açık;
- seçilen tema ve ilk ana sayfa düzeni;
- üç kategori (Giyim, Ev ve Yaşam, Elektronik Aksesuar) ve sahte ürünler, hepsi %20 KDV sınıfında.

Sahte ürünler yalnız demo sitede olur. Gerçek mağazanın ürünlerini mağaza sahibi panelden girer.

**marka/.** Panelin ve vitrinin kullandığı logo ve görseller. Mağaza sahibi logoyu panelden değiştirirse yenisi veritabanında ve sitenin dosya deposunda durur, buradaki ilk logodur.

**tema/ ve vitrin/.** Normalde boştur. Özel tasarım isteyen mağazanın kendi teması ve ortak bileşenle yapılamayan vitrin bölümü burada yazılır. Aynı bölüm ikinci bir sitede gerekince çekirdeğe taşınır (karar 0006).

**testler/.** Çekirdeğin testlerine ek olarak bu sitenin ayarlarıyla çalışan kontroller. Örnek Mağaza'da: ödeme adımında kapıda nakit ve kart görünür, sipariş numarası ORN-1001 ile başlar, koyu temada sayfalar okunur. Site güncellenmeden önce bunlar çalışır.

**KURALLAR.md.** Bu siteye özel kısa notlar: mağazanın özel durumları, kimden onay alınacağı. Örnek Mağaza'da "her yeni özellik önce burada denenir, gerçek ödeme alınmaz".

**Site klasöründe olmayanlar:**
- Gizli bilgiler (veritabanı şifresi, ödeme ve e-posta anahtarları): sunucuda sitenin kendi gizli bilgi dosyalarında durur, yalnız o sitenin kutusuna bağlanır, kayda girmez (karar 0031).
- Müşteri, sipariş ve ürün verisi: sitenin veritabanında (karar 0003).
- Mağaza sahibinin yüklediği görseller: sitenin ayrı dosya deposunda.
- Mağaza sahibinin panelden yaptığı her değişiklik: veritabanında.

## 2. Çekirdekte neler olur

```
cekirdek/
  moduller/          ← ürün, stok, fiyat, vergi, sepet, ödeme, sipariş, iade,
                       kargo, kampanya, müşteri hesabı, yorum, içerik, e-posta,
                       görünürlük, yasal metinler, rapor, ekip ve roller
  ayar-semasi        ← bütün site ayarları: tür, varsayılan, açıklama, kim değiştirir
  kapi/              ← sunucu arayüzü: dört giriş (herkese açık, müşteri, yönetici, sahip)
  vitrin/            ← vitrin sayfaları
  yonetim-paneli/    ← panel ekranları (ayar ekranları ayar şemasından üretilir)
  temalar/           ← hazır temalar
  arka-plan-isleri/  ← e-posta, havale iptali, stok ayırmanın bitmesi, yedek, yoklamalar
  veritabani/        ← numaralı veritabanı değişiklik dosyaları
  metinler/          ← anahtarlı metin dosyaları ve terim sözlüğü
  eklentiler/        ← eklentilerin kodu; her sitede kapalı başlar, sitede ayarla açılır
  surum-notlari      ← her sürümde ne değişti, sitelere etkisi, güvenlik işareti
bilesenler/          ← ortak bileşen kütüphanesi (düğme, ürün kartı, fiyat, form)
sahip-paneli/        ← altyapı sahibinin kulesi
komutlar/            ← yeni site kurma, site güncelleme, teslim, yayın
siteler/             ← her site bir klasör
```

- Her modül aynı parçalardan oluşur: veri modeli, servis, uçlar, izinler, metinler, testler.
- Çekirdekte hiçbir site adı geçmez. Örnek Mağaza'da kapıda kartın görünmesi "bu Örnek Mağaza ise" diye değil, "kapıda ödeme seçeneklerinde kart var mı" diye sorulur.
- **Ortak bileşen kütüphanesi** ayrı klasördedir ama çekirdekle aynı sürüm numarasını taşır. Ayrı sürümlenirse bir düğme değişikliği sürüm değişmeden bütün sitelere giderdi (değişmez kural 3).
- **Sahip paneli** çekirdekle aynı projededir ama hiçbir sitenin parçası değildir, ayrı yayınlanır ve her zaman en yeni hâliyle çalışır. Bu yüzden eski çekirdek sürümündeki sitelerle de konuşabilmelidir (4. bölüm).

## 3. Sitenin çekirdek sürümü nerede yazar

**Tek asıl yer: site klasöründeki `kimlik` dosyası.** Örnek Mağaza için: `çekirdek sürümü: 1.0.0` (ilk sürüm çıkınca yazılır).

- Sürüm numarası üç parçalıdır: `büyük.orta.küçük`.
  - Küçük artarsa yalnız hata düzeltilmiştir.
  - Orta artarsa yeni özellik vardır, site klasöründe değişiklik gerekmez.
  - Büyük artarsa site klasöründe de değişiklik gerekir.
  - Güvenlik açığı kapatan sürüm sürüm notlarında ayrıca işaretlenir.
  - Neden: Numaraya bakınca güncellemenin ne kadar riskli olduğu anlaşılır.
- Yayın komutu kimlik dosyasındaki sürümü okur, çekirdeğin o sürümünü bu sitenin klasörüyle birleştirip yayınlar. Sürüm başka hiçbir yerde elle yazılmaz.
- Çalışan site kendi sürümünü bilir ve sorulunca söyler. Sahip paneli "kimlikte yazan" ile "çalışan" sürümü karşılaştırır, farklıysa uyarır.
- Sitenin veritabanı hangi numaralı değişikliklerin uygulandığını kendisi tutar. Bu bir sürüm kaydı değil, veritabanının kendi durumudur.

**Örnek Mağaza'nın 1.0.0'dan 1.1.0'a güncellenmesi:**
1. Sürüm notları okunur, Örnek Mağaza'ya etkisi yazılır.
2. Site klasörü 1.1.0'ın ayar şemasıyla doğrulanır.
3. Veritabanı değişikliği varsa kopyada denenir.
4. Çekirdeğin ve sitenin testleri 1.1.0 ile çalışır.
5. Kimlikteki sürüm 1.1.0 yapılır ve kaydedilir.
6. Yayın komutu çalışır, sağlık kontrolü yapılır.
7. Sahip paneli çalışan sürümü 1.1.0 olarak görür.

Sorun çıkarsa kimlik 1.0.0'a döner ve yeniden yayınlanır. Veritabanı değişikliği geri alınamıyorsa site yedekten döner. Bu, değişiklik dosyasının başında yazar.

Her yeni sürüm önce Örnek Mağaza'ya gider (karar 0007), sonra öteki siteler site site güncellenir.

## 4. Sahip paneli hangi bilgiyi nereden alır

Sahip paneli hiçbir sitenin veritabanına doğrudan bağlanmaz. Her siteye kapının **sahip girişinden** sorar. Her site soruyu kendi verisiyle cevaplar, sahip paneli cevapları yan yana koyar.

| Bilgi | Kaynak |
|---|---|
| Site listesi, adresler, kayıtlı çekirdek sürümü, teslim durumu | Site klasörlerindeki `kimlik` dosyaları |
| Çalışan sürüm, açık eklentiler | Sitenin durum ucu (sahip girişi) |
| Satış ve sipariş özeti | Sitenin durum ucu: yalnız toplamlar (ciro, sipariş sayısı, ödeme bekleyen, iade) |
| Site açık mı | Zamanlanmış kontroller: siteyi dışarıdan yoklar |
| Ödeme ve e-posta çalışıyor mu | Zamanlanmış kontroller |
| Son yayın: ne zaman, hangi sürüm, sonuç | Yayın komutunun kaydı |
| Hatalar | Hata izleme aracı: her hata site adıyla etiketlenir |
| Son yedek ve son geri yükleme provası | Yedek işlerinin kaydı |
| Bekleyen güvenlik güncellemesi | Sürüm notları ile kayıtlı sürümün karşılaştırması |

- **Kişisel veri sahip paneline gelmez.** Durum ucu müşteri adı, e-posta ya da adres döndürmez, yalnız sayı ve tutar döndürür. Neden: Müşteri verisinin sorumlusu her mağazanın kendisidir.
- **Site kapalıyken de bilgi görünür.** Sahip paneli son cevapları kendi küçük kaydında saklar. Örnek Mağaza çökse bile son bilinen sürümü, son satış özeti ve "en son ne zaman açıktı" bilgisi panelde kalır.
- Her sitenin durum ucuna yalnız sahip paneli girebilir, her sitenin anahtarı ayrıdır ve gizli bilgi olarak saklanır.
- Sahip paneli birkaç dakikada bir sorar, istenince hemen yeniler.
- Tutarlar her sitenin kendi para biriminde gösterilir. Para birimi farklı sitelerin tutarları toplanmaz.

Örnek Mağaza için sahip panelinde görünen satır şöyle olur:

```
Örnek Mağaza (demo) · açık · çekirdek 1.1.0 (kayıtlı 1.1.0) · son yayın bugün 14:02, başarılı
bugün 3 sipariş, 1.247,00 ₺ · 1 ödeme bekleyen havale · son 24 saatte 0 hata · son yedek bu gece 03:00
```

## Kararlar

- 0010: Ayarların iki sahibi var. Altyapı sahibinin ayarları site klasöründe, mağaza sahibinin ayarları veritabanında durur. Klasörde mağaza sahibinin ayarlarının yalnız başlangıç değerleri olur.
- 0011: Sitenin çekirdek sürümünün tek asıl yeri site klasöründeki kimlik dosyasıdır. Sürüm numarası üç parçalıdır.
- 0012: Sahip paneli sitelere kapının sahip girişinden sorar, veritabanlarına bağlanmaz ve kişisel veri almaz.

Bu kararlarla birlikte `planlar/altyapi-haritasi.md`, `planlar/site-ayarlari.md`, `.claude/rules/ayarlar.md` ve `.claude/rules/vitrin.md` güncellendi.

## Henüz açık olanlar

- Klasör adları, dosya biçimi (JSON) ve sürüm etiketi (Docker görüntüsünün etiketi) kararlarla kapandı (0013, 0015).
- Sahip paneli başta sitelerle aynı sunucuda durur, siteler sunucuyu paylaşır (0013).
