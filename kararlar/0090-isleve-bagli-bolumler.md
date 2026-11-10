# 0090 · İşleve bağlı bölümler: müşteri yorumları, blog yazıları, bülten kaydı

## Tarih

2026-11-10

## Karar

Bölüm kütüphanesine henüz olmayan özelliklerin üç bölümü girdi (kart 0112). Her biri bağlı olduğu işlev yazılana kadar vitrinde çizilmez; düzene eklenebilir, panel nedenini gösterir (karar 0081). İşlev yazılınca bölüm kendiliğinden açılır, yeniden tasarım gerekmez. Üçü de yalnız ana sayfaya konur.

- **Müşteri yorumları** (işlev: yorum, temel paket).
  - Alanlar: başlık, hangi yorumlar, kaç yorum (3 ya da 6).
  - Yorumlar ya mağaza sahibinin yorum listesinde "ana sayfada göster" diye işaretledikleridir ya da en yenilerdir (kullanıcı kararı). Yalnız onaylanmış yorumlar gelir; bu yorum işlevinin kuralıdır.
  - Her yorumda beş yıldızlı puan ("5 üzerinden 4 puan" ekran okuyucuda), yorum (alıntı) ve müşterinin adı, adın baş harfi dairede. Adın vitrinde nasıl yazılacağına (soyadın kısaltılması gibi) yorum işlevi karar verir.
  - Görünümler: kartlar (masaüstünde üç sütun, taslaktaki) ve kaydırmalı şerit.
- **Blog yazıları** (işlev: blog, temel paket).
  - Alanlar: başlık, blog kategorisi (seçilmezse son yazılar), kaç yazı (3 ya da 6), "Tümünü gör" bağlantısı.
  - Her yazıda 16:10 görsel, tarih (`<time>`), başlık, iki satırda kesilen özet ve "Devamını oku". Kartın tek bağlantısı başlıktır, kartın tamamına yayılır; "Devamını oku" görünüştür.
  - Görünümler: ızgara (masaüstünde üç sütun, taslaktaki) ve kaydırmalı şerit.
  - Yeni alan türü "blog kategorisi": kategorinin adres adıyla seçilir (menü gibi), başlangıç düzeni de seçebilir. Blog işlevi yazılana kadar kayıt tablosu yoktur; var olduğunun denetimi ve paneldeki seçenekleri blog işleviyle gelir.
- **Bülten kaydı** (işlev: bülten, eklenti; kullanıcının kararıyla temel pakette değil).
  - Alanlar: başlık (zorunlu), metin, zemin rengi (varsayılan ana renk).
  - Form: e-posta, zorunlu pazarlama onayı (kullanıcı kararı), KVKK aydınlatma bağlantısı, "Kaydol".
  - Onayın metni tektir: kayıt formundaki pazarlama izniyle aynı metin anahtarı (`vitrin.onay.pazarlama`); kayıt formu ona "(İsteğe bağlı)" ekler. Mağaza sahibi metni değiştirmez. Kaydı eklenti müşteri onaylarına "pazarlama" türüyle yazar (karar 0051).
  - Girdinin şeması formla eklentinin ucu arasında ortaktır (`bultenKaydiSemasi`). Gönderim adresi vitrin bağlamındadır (`bultenKaydi`, `{ tur: "uc", adres }`), eklenti verir. Bağlamda yoksa bölüm çizilmez: bülten işlevi açılsa da eklentisi kurulmamış sitede form görünmez. Katalog örnek kipte (`{ tur: "ornek" }`) çizer, form yalnız doğrular.
  - Başarıda form kalkar, odak teşekkür yazısına geçer.
  - Görünümler: şerit (sayfanın bütün genişliğinde bant, taslaktaki) ve kutu (içerik genişliğinde).

**Veri arayüzü.** Bölümler veriyi vitrin bağlamından alır, veritabanına gitmez (`cekirdek/vitrin/bolum-kutuphanesi/islev-verisi.ts`):

- `yorumlar` ve `blogYazilari`: kaynağın anahtarıyla (`yorumKaynagiAnahtari`, `blogKaynagiAnahtari`) yorumlar ve yazılar.
- `bultenKaydi`: eklentinin gönderim adresi; yoksa bülten bölümü çizilmez.
- Bağlamı okuyan bugün bunları boş bırakır. İşlev yazılınca aynı türlerle doldurur; bölüm değişmez.

**Paneldeki neden.** Çizilmeme nedeninin metni tek yerdedir (`cizilmemeNedeniMetni`, `cekirdek/yonetim-paneli/cizilmeme-nedeni.ts`). İşlevi olmayan bölümde metin işleve göredir: temel paketin özelliği "… özelliği gelince", bülten "bülten eklentisi kurulunca" görünür der.

**Robot koruması ertelenebilir.** Ortak gönderim kancası `useRobotluGonderim({ ertele: true })` ile açılınca robot sorusunu istemez ve çözmez; ilk cevabı gönderirken hazırlar. Bülten formu ana sayfada durur: her ziyaretçi her açılışta soru istemesin ve çözmesin.

**Ortak yıldızlar.** Ürün kartının puanı ile yorumun puanı aynı parçayla çizilir (`Yildizlar`, `cekirdek/vitrin/yildizlar.tsx`).

**Taslaktan bilerek ayrılan yerler (Canlı Çarşı taslağıyla bilgisayar ve telefonda, iki temada karşılaştırıldı):**

- **Bülten formu zemin renginde bir kutuda:** Taslakta form doğrudan ana renkli şeridin üstündedir. Alanın kenarı, onay kutusu ve hata yazısının okunurluğu yalnız zemin üstünde ölçülmüştür. Bütün odaklanabilir öğeler bu kutuda olduğu için şeride renkli zeminin "odak yazı renginde" kuralı verilmez (`zeminSiniflari(…, { odak: false })`): kural kutuya geçip onay kutusunun ve düğmenin odağını zemin rengine çeviriyordu.
- **Bülten formunun sırası e-posta, onay, düğme:** Taslakta düğme e-postanın yanındadır ve onay yoktur. Klavyeyle dolduran kişi onaya düğmeden önce gelmeli; ekrandaki sıra da aynıdır.
- **Bülten şeridi taslaktan uzundur:** Onay kutusu ve aydınlatma bağlantısı yüzünden.
- **Adın baş harfi:** Taslakta yer tutucu bir daire vardır; bizde adın baş harfi yazılıdır (ekran okuyucudan gizli).
- **Ölçekte olmayan küçük değerler:** Yorumdaki daire 40 px, taslakta 36 px; yorum metni 16 px, taslakta 15 px.

**Şerit öğesi konumludur.** Ortak şerit parçasının her öğesi `relative`'dir: içindeki mutlak konumlu öğe (yorumdaki puanın ekran okuyucu yazısı) şeridin kırpma kutusunda kalır. Kutusu dışarıdayken kırpılmıyor, şeridin kodu yüklenene kadar telefonda sayfayı 224 piksel yana kaydırıyordu. Yalnız yük altında görüldü (tam tarayıcı takımı); yavaşlatılmış işlemciyle yükleme boyunca ölçen test eklendi.

## Bağımsız kontrolün bulguları

Düzeltilenler:

- Onay kutusunun ve "Kaydol"un odak çerçevesi formun zemininde görünmüyordu (yukarıda).
- Seçim alanının ve blog kategorisinin açıklaması panelin formunda çizilmiyordu ("Hangi yorumlar", "Blog kategorisi"). Açıklama artık her seçim alanında görünür ve alana bağlıdır.
- Bülten işlevi açıldığı gün eklentisi kurulmamış sitede de form çizilecek, gönderim sessizce hiçbir şey yapmayacaktı. Bölüm artık bağlamda gönderim adresi yoksa çizilmez.
- Başarıda odak sayfanın başına düşüyordu; teşekkür yazısına geçer.
- Bozuk puan (NaN) "5 üzerinden NaN puan" okunuyordu. Puan 1–5'e çekilir, sayılar biçimleyiciyle yazılır.
- Ertelenmiş robot korumasında ilk gönderim iki soru istiyordu; bir sonraki cevap önceden hazırlanmaz.
- Katalogdaki blog tarihinin makine biçimi UTC'ye göre kuruluyordu, yazılı tarihle ayrı gün gösterebiliyordu.
- "Her sınıf bir kural üretir" testi yıldızları ve bülten formunu kapsamıyordu; kapsar.
- Testlere eklendi: blog kategorisinin formda seçimi, yorum kaynak türlerinin tarifle aynı olması.

Bilerek bırakılanlar:

- Blog görselinin vitrin görseli ucundan verilmesi blog işleviyle gelir: uç bugün yalnız çizilen bölümün, kategorinin ve markanın görselini verir.
- Bölüm başlığı yokken blog kartlarının h3 başlıkları h2 olmadan gelir; ürün bölümlerinde de aynıdır.
- Yorumdaki baş harf `slice(0, 1)` ile alınır; ekran okuyucudan gizli, süstür.

## Neden

- Bölümlerin özellikten önce tarif edilmesi, özellik geldiği gün tasarım işini ortadan kaldırır; kart bunu ister.
- Yorumu yorum listesinde işaretlemek, yorumu okurken seçmeyi sağlar; bölüm formu yorum kimliği taşımaz, silinen yorum düzende kalmaz.
- Onay metninin tek olması, bir metin değişince sürüm artırmanın (karar 0051) iki yerde unutulmasını önler.
- Ertelenmiş robot korumasını ölçen test yakaladı: ortak kanca form açılınca soruyu istiyordu; ana sayfada her açılış bir ağ isteği ve tarayıcıda bir çözüm demekti.

## Düşünülen diğer yollar

- **Yorumları bölüm formunda tek tek seçmek:** Kullanıcı seçmedi.
- **Bülteni her sayfada alt kısmın üstünde göstermek:** Kullanıcı seçmedi; yalnız ana sayfa.
- **Onay kutusu yerine bilgi metni:** Kullanıcı seçmedi; açık rızanın kanıtı kutudur.
- **Blog kategorisini bugün metin alanı olarak almak:** Seçilmedi. Mağaza sahibi adres adını bilmez; seçenekler blog işleviyle gelir.

## Sonuçları

- Çekirdek 0.46.0 oldu. Veritabanı değişikliği yoktur.
- Bugün hiçbir sitede bu üç bölüm vitrinde görünmez. Katalogda örnek veriyle görünürler (`/gelistirme/bilesenler/bolum-kutuphanesi`).
- Yorum, blog ve bülten işlevleri gelince yapılacaklar: bağlamı doldurmak, işlevi `yazilanIslevler`'de açmak, blog kategorisinin denetimini ve panel seçeneklerini eklemek, blog görsellerini vitrin görseli ucuna eklemek, bülten ucunu `bultenKaydiSemasi` ile yazıp robot cevabını doğrulamak ve kurulu sitede bağlama gönderim adresini koymak. Bunlar o kartların işidir.
- İşlevin açık olup olmadığı bugün çekirdekte bütün siteler için tektir (`yazilanIslevler`). Eklentinin site başına kurulması eklenti kurulumu dersinde gelir; bülten o güne kadar gönderim adresinin bağlamda olmasıyla korunur.
- Kayıt formunun pazarlama izni artık iki anahtardan kurulur; yazısı değişmedi.
- Kural: `.claude/rules/vitrin.md`.
