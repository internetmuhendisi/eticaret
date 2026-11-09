# 0080 · Tema yapısı: önizleme yerine demo, özel tema site klasöründe

## Tarih

2026-11-09

## Karar

Bu kayıt karar 0005'in iki maddesinin yerine geçer: önizleme ve özel tema. Tema seçmenin temel pakette olduğu kararı aynen geçerlidir.

**Önizleme yok, demo var (kullanıcı kararı).** Panelde canlı önizleme yapılmaz. Her hazır temanın gezilebilir bir demosu olur (kart 0116), mağaza sahibi temayı seçmeden önce orada gezer. Önizleme olmadığı için taslak adımı da yoktur: tema ya da tema ayarı değişikliği doğrudan yeni bir sürüm olarak yayınlanır. Her sürüm saklanır, önceki sürüme tek adımda dönülür.

**Tema.** Bir tema dört şeyden oluşur:

- açık ve koyu temada bütün tasarım değerleri
- mağaza sahibinin değiştirebileceği değerler ve seçenekleri: hangi renkleri seçebileceği, yazı tipi, köşe ve düğme biçimi seçenekleri
- parçaların görünüm tipleri
- başlangıç düzeni: üst kısım, ana sayfa ve alt kısım bölümleri

Tema şemadan geçer (`cekirdek/temalar/sema.ts`). Şu temalar açılmaz, onu kullanan site doğrulamadan geçmez:

- eksik değeri olan
- tanımsız seçeneği olan
- sitede barındırılmayan bir yazı tipi kullanan
- kütüphanede olmayan ya da o alana konamayan bir bölüm içeren
- eksik ya da tanımsız bir görünüm içeren
- açık ya da koyu temada okunmayan bir renk çifti içeren

**Hazır ve özel tema.** Hazır temalar çekirdekte durur (`cekirdek/temalar/hazir/`). Bir müşteriye özel tema o sitenin klasöründe durur (`siteler/<kod>/tema/<tema kodu>.json`) ve başka hiçbir sitede görünmez. Sitenin kullanabileceği temalar altyapı sahibinin "Kullanılabilir temalar" ayarıdır (`temalar`). Ayar verilmezse bütün hazır temalar kullanılabilir. Listenin ilk teması sitenin başlangıç temasıdır. Panel yalnız bu listeyi gösterir, listede olmayan tema seçilemez.

Özel temalı sitede mağaza sahibinin temayı değiştirmesi kapalı olmak zorunda değildir. Bu, "Mağaza sahibi temayı değiştirebilir" ayarıyla site başına seçilir.

**Mağaza sahibinin ayarları.** Ayarlar sitenin veritabanında sürüm sürüm durur (`tema_surumleri`). Sürüm satırı sonradan değiştirilemez. İlk sürüm sitenin başlangıç değeridir (`baslangic/tema.json`). Önceki bir sürüme dönmek, o sürümün kopyasını yeni sürüm olarak yazmaktır, geçmiş kaybolmaz. Sırası verilmeyen dönüş "son değişikliği geri al" demektir: son sürümden bir öncekine döner, art arda çağrılırsa son iki sürüm arasında gidip gelir. Daha eski bir sürüme sırası verilerek dönülür. Dönülen sürüm bugünkü kurallardan geçmelidir: teması kullanılabilir, ayarları temaya uygun ve renkleri okunur olmalı.

- **Renk (kullanıcı kararı).** Mağaza sahibi temanın açtığı her renk için tek bir renk seçer. Renk açık temada okunur değilse kaydedilmez ve aynı tonun okunur olan en yakın hâli önerilir. Koyu temada okunur değilse vitrin o rengin okunur tonunu kendisi kullanır. Seçilen renkler birlikte ölçülür: ana renk ile üstündeki yazı gibi birbirine bağlı iki renk birlikte okunursa ikisi de aynen çizilir. Tema mağaza sahibine yalnız okunurluğu ölçülen renkleri açabilir.
- **"Mağaza sahibi temayı değiştirebilir" kapalıysa (kullanıcı kararı).** Mağaza sahibi temayı, rengi, yazı tipini, köşe ve düğme biçimini, koyu temayı değiştiremez, önceki sürüme de dönemez. Logo bu ayara bağlı değildir.
- **Vitrinde koyu tema.** Tema ayarlarının bir parçasıdır, varsayılanı kapalıdır. Kapalıyken vitrin cihazın koyu tema tercihine uymaz.
- **İzinler (kullanıcı kararı).** `tema.gor` ve `tema.degistir` izinleri yalnız tam yetkili rollerdedir. Görevli temayı ne görür ne değiştirir.

**Panel.** Panel bütün sitelerde aynı değerlerle (`varsayilanTemaDegerleri`) çizilir, siteden yalnız ana rengi alır. Ana renk panelde okunur değilse okunur tonu türetilir. Logo panel ekranlarıyla gelir.

## Neden

- Canlı önizleme, vitrinin bütün sayfalarını taslak değerlerle ikinci kez çizmeyi gerektirir. Gezilebilir demo aynı soruyu ("bu tema mağazamda nasıl durur?") çok daha az işle cevaplar, mağaza sahibi de temayı gerçek sayfalarda görür. Kullanıcı bu yolu seçti.
- Taslak, önizlemeye bakmak için vardı. Önizleme yokken taslak yalnız fazladan bir adım olurdu. Geri dönüş tek adım olduğu için yanlış bir yayın kolayca düzelir.
- Özel temayı site klasöründe tutmak "siteye özel kod çekirdeğe girmez" kuralını korur. Kullanılabilir temalar listesi bir sitenin temasının başka sitede seçilmesini yapı gereği imkânsız kılar: başka sitenin dosyası okunmaz bile.
- Renk açık temada reddedilip öneri döner, çünkü mağaza sahibinin seçtiği şey açık temada görünür. Koyu tema için ikinci bir renk sordurmak kafa karıştırırdı (kullanıcı kararı). Okunurluk iki temada da korunur.
- Bölüm kütüphanesi (kart 0106) ve parça görünümleri (kart 0109) henüz yok. Şema onları kayıttan okur ve kayıt bugün boştur. Şemanın bölüm ve görünüm kuralları testte deneme kayıtlarıyla denenir. Böylece sonraki kartlar şemayı değiştirmeden yalnız kayda ekler.

## Düşünülen diğer yollar

- **Panelde canlı önizleme (karar 0005):** Kullanıcı demo yolunu seçti. Önizleme tema değişikliği kartında (0113) ya da sonra yeniden istenirse yeni bir kayıtla gelir.
- **Taslak ve yayın ayrı kalsın:** Önizlemesiz taslak yalnız fazladan bir adım olurdu, seçilmedi.
- **Tema ayarlarını mağaza ayarları tablosunda (`magaza_ayarlari`) tutmak:** O tabloda her ayar tek satırdır ve geçmişi yalnız değişiklik kaydındadır. Tema ve ayarları birlikte, sürüm olarak saklanmalı ki bir sürüme bütün hâliyle dönülebilsin. Ayrı tablo seçildi.
- **Mağaza sahibinin açık ve koyu tema için ayrı renk seçmesi:** Kullanıcı tek rengi seçti.
- **Özel temalı sitede "temayı değiştirebilir" ayarının zorunlu kapalı olması (karar 0005):** Bir müşteri özel temasının içinde renk seçmek isteyebilir. Ayar site başına seçilsin diye zorunluluk kaldırıldı.

## Sonuçları

- Çekirdekte ilk hazır tema Canlı Çarşı'dır. Bugün yalnız değerleri ve seçilebilen ana rengi vardır. Seçenekleri, görünümleri ve başlangıç düzeni kart 0114'te yazılır, öteki iki tema da orada gelir.
- Kök düzen ve panel düzeni her istekte sitenin tema sürümünü veritabanından okur, istek başına bir kez. Okunamazsa sayfa düşmez: hata kaydedilir, sayfa sitenin başlangıç temasıyla açılır. Veritabanı kapalıyken bu, bağlantının zaman aşımı kadar (5 saniye) bekleme demektir; panelin giriş sayfası da artık veritabanını okur. İstekler arası önbellek henüz yoktur.
- Koyu temanın varsayılanı kapalıdır. Bu sürüme güncellenen bir site, `baslangic/tema.json` dosyasında koyu temayı açmadıysa vitrinini cihazın koyu tercihine rağmen açık temayla gösterir. Örnek Mağaza'da koyu tema açıktır (site ayarları taslağı).
- Panelin ana rengi, mağaza sahibinin seçtiği rengin okunur tonu olabilir. Panelde gördüğü renk vitrindekiyle birebir aynı olmayabilir.
- Kayıtlı tema ya da ayarları sonradan geçersiz kalırsa vitrin düşmez. Bu, altyapı sahibi temayı listeden çıkarınca ya da çekirdek bir seçeneği kaldırınca olur.
  - Tema kullanılamıyorsa başlangıç teması çizilir.
  - Ayarlardan yalnız temaya uymayan ayar atılır ve yerine temanın kendi değeri çizilir.
  - Hata süreç başına bir kez kaydedilir.
  - Böyle bir sürüme geri dönülemez.
- "Değiştirebilir" ayarı kapalı sitede bugün altyapı sahibinin de temayı sonradan değiştirecek bir yolu yoktur, çünkü başlangıç dosyası yalnız ilk sürümde okunur. Bu yol kart 0117'dedir.
- Tema uçları ve panel ekranı yoktur. İzinlerin gerçek istekle denenmesi uçlarla gelir.
- Kural: `.claude/rules/tasarim-sistemi.md`. Kapsam: `temel-paket.md` (Vitrin yönetimi).
