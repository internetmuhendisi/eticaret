# 0035 · Yayın: kayıttan görüntü ve klasör, yan yana kutu, ön kapı yayın listesinden, kayıtla geri dönüş

## Tarih

2026-11-05

## Karar

- **Komutlar:** `pnpm yayinla siteler/<kod adı> deneme` siteyi yayınlar. `pnpm geri-don siteler/<kod adı> deneme` bir önceki başarılı yayına döner. `pnpm yayin-kaydi siteler/<kod adı> deneme` kaydı gösterir. Bir seferde bir site. Şimdilik yalnız deneme ortamına yayın yapılır (kullanıcı kararı).
- **Kilitler:** Yayın komutu ancak üç koşul tutarsa başlar, tutmazsa hiçbir şeye dokunmaz (`komutlar/yayin-hazirligi.mts`):
  - Kontrol hattı bu kayıt için yeşil olmalı ve kaydedilmemiş değişiklik olmamalı (`pnpm hat-sonucu`, 0029).
  - Kayıttaki hat dosyası ana daldakiyle (`origin/main`) aynı olmalı. Hattı zayıflatan bir kaydın kendi hattı yeşil biter, bu kilit onu durdurur.
  - Ardından hızlı sunucu denetimi (`pnpm sunucu-denetle --hizli`) yeşil olmalı. Deneme komutu bu adımı atlar: geçici siteleri kayıtlı numara taşımadığı için denetimi bilerek kırmızıya düşürür.
  - Geri dönüşte kilit yoktur. Dönülen yayın zaten bu kilitlerden geçmiştir, acil durumda hattı beklemek gerekmez.
- **Yayın birimi:** Çekirdeğin görüntüsü ve sitenin klasörü aynı kayıttan gelir.
  - Klasör çalışma klasöründen değil kayıttan çıkarılır (`git archive`).
  - Görüntü üretildiği kaydı taşır (`org.opencontainers.image.revision`). Kayıt uyuşmazsa görüntü yeniden üretilir.
  - Sürüm yalnız kimlik dosyasından okunur. Bu kayıttan yalnız kaydın kendi çekirdek sürümü yayınlanabilir.
- **Sunucudaki yerleşim:** Her yayının bir numarası vardır.
  - Klasörü `/srv/altyapi/yayin/<ortam>/<kod>/<no>/`'dur: `site/` ve `compose.json`.
  - Görüntü etiketi `altyapi-yayin:<ortam>-<kod>-<no>`, kutusu `site-<ortam>-<kod>-<no>`'dur.
  - `etkin` dosyası trafiği alan yayının numarasını, `kayit.jsonl` her çalıştırmanın satırını tutar.
  - Son üç başarılı yayın saklanır, gerisi silinir (`saklananYayinSayisi`).
- **Site kutusu:** Kutunun tanımı tek yerdedir (`yayinKutusuTanimi`). Kutu:
  - sitenin kendi kullanıcı numarasıyla ve gizli bilgi dosyasıyla çalışır (0031);
  - salt okunur dosya sistemiyle, yetkisiz ve yetki yükseltmesi kapalı çalışır;
  - yeniden başlayınca açılır (0033);
  - yalnız sitenin kendi ağındadır (0034), portu açılmaz.
  - Sağlık yoklaması yerel ortamla aynıdır (`siteSaglikYoklamasi`).
- **Sıra:**
  1. Veritabanı değişiklikleri uygulanır (0034).
  2. Yeni kutu eski kutunun yanında açılır, sağlıklı olana kadar beklenir.
  3. Sağlık ucu kutunun içinden okunur: kimlikteki sürümü söylemeli ve veritabanını ayakta göstermeli.
  4. Ön kapının site satırı yeni kutuya çevrilir.
  5. Deneme adresi dışarıdan, şifreli bağlantıyla yoklanır.
  6. `etkin` yazılır, eski kutu durdurulur.
  Bir adım geçmezse ön kapı eski hâline döner, yeni kutu ve yayın silinir. Eski kutuya hiç dokunulmaz.
- **Ön kapı:** Site satırları ve ön kapının bağlandığı site ağları sunucudaki `etkin` dosyalarından kurulur (`yayindakiSiteleriOku`). `pnpm sunucu-kur` de aynı listeyi okur, yayındaki siteyi silmez.
  - Ön kapı her yayındaki sitenin ağına bağlanır. Ortak ağ varsayılan çıkış olarak kalır (`gw_priority`).
  - Satır kutunun adını gösterir. Trafik, Caddy ayarı bağlantıları kesmeden yeniden okuyunca değişir.
- **Geri dönüş:** Hedef kayıttan hesaplanır (`geriDonusHedefi`).
  - Başarılı yayınlar bir yığına eklenir, başarılı geri dönüş üsttekini kaldırır. Hedef üsttekinin altındaki yayındır. Bu yüzden art arda iki geri dönüş daha da geriye gider.
  - Veritabanında hedeften sonra uygulanmış değişikliklerden biri "yedekten" (ya da notsuz) ise dönülmez, komut yedekten dönülmesi gerektiğini söyler. Başarısız bir yayının uyguladığı değişiklikler de sayılır.
  - Dönülen yayının klasörü ve görüntüsü kullanılır, veritabanına dokunulmaz.
- **Yayın kaydı:** Her çalıştırma, başarısız olanlar dahil, bir satır yazar: numara, tür, etkin yayın, kayıt, sürüm, görüntü kimliği, zaman, sonuç, sebep, veritabanındaki değişiklik sayısı ve geri dönüş notları. Kayıtta gizli bilgi yoktur.
- **Gizli bilgi yenileme:** `pnpm sunucu-gizli --yenile` veritabanı şifresini eşitler (0034) ve yayındaki kutuyu aynı adımda yeniden başlatır.
- **Deneme:** `pnpm yayin-denemesi` iki geçici siteyle (9999 ve 9998 numaralı) kartın maddelerini sunucuda ölçer, sonunda kendini temizler.
  - Bilerek bozulmuş görüntü ayrı bir adla üretilir (`altyapi-cekirdek-bozuk`), açılır açılmaz kapanır. Yayın komutu bu görüntüyü kullanamaz, onu yalnız deneme verir.
- **Denetim:** `pnpm sunucu-denetle` yayındaki her sitenin kutusunun gerçek ayarını tanımıyla karşılaştırır.

## Neden

- **Kilitler:** Yalnız hattan geçmiş kod yayına çıkar. Hat dosyasının ana dalla karşılaştırılması, hattı kendisi zayıflatan bir kaydın kendi yeşiliyle geçmesini önler.
- **Klasörün kayıttan alınması:** Çalışma klasöründeki kaydedilmemiş ya da başka dalda kalmış bir değişiklik yayına çıkamaz. Yayının hangi kayıttan geldiği kesin bilinir.
- **Görüntünün kaydı taşıması:** Aynı sürüm numarası farklı kayıtlardan üretilebilir. Kayıt etiketi, yayınlanan görüntünün yayınlanan kayıttan geldiğini gösterir.
- **Yan yana kutu:** Ziyaretçi kesinti görmez. Yeni sürüm sağlıklı olmadan trafik ona verilmez.
- **İçeriden ve dışarıdan sağlık:** İçeriden yoklama kutunun açıldığını, dışarıdan yoklama ön kapının, sertifikanın ve ağın doğru kurulduğunu gösterir.
- **Yayın başına klasör, etiket ve kutu:** Geri dönüş, dönülen yayının tam olarak o anki hâlini kullanır. Yeniden derleme ya da yeniden çıkarma gerekmez.
- **Ön kapının listesinin sunucuda olması:** Hangi yayının trafiği aldığını yalnız sunucu bilir. Liste bilgisayarda tutulsaydı iki bilgisayardan yapılan yayın birbirinin satırını silebilirdi.
- **Geri dönüşün yığınla hesaplanması:** "Önceki sürüm" her durumda tek anlama gelir. Geri dönüş ileri gitmez.

## Düşünülen diğer yollar

- **Kutuyu durdurup yenisini aynı adla açmak:** Seçilmedi. Her yayında kesinti olurdu, bozuk sürüm siteyi kapatırdı.
- **Aynı ağ adıyla (takma adla) iki kutu ve dengeleme:** Seçilmedi. Geçiş sırasında istekler iki sürüme dağılırdı, bozuk sürüm de istek alırdı.
- **Görüntüyü sunucuda kayıttan üretmek:** Seçilmedi (0034). Sunucuya kaynak kod ve derleme araçları gerekirdi.
- **Geri dönüşte veritabanı değişikliklerini kendiliğinden geri almak:** Seçilmedi. Geri alma dosyaları yok ve veri kaybı riski var. "Yedekten" notlu değişiklikte komut durur, yedekten dönüş kart 0024'tedir.
- **Yayın kaydını depoda tutmak:** Seçilmedi. Her yayın bir kayıt oluşturur ve iki bilgisayar arasında çakışır. Sahip paneli kaydı sunucudan okuyacak.
- **Sınırsız saklama:** Seçilmedi. Disk zamanla dolar. Üç yayın, iki geri dönüşe yeter.

## Sonuçları

- **İlk yayında kesinti:** Bir sitenin ilk yayınında ve sitenin yayından kaldırılmasında ön kapı yeni ağ için yeniden kurulur. Bütün deneme adresleri birkaç saniye kesilir. Sonraki yayınlar ve geri dönüşler ön kapıyı yeniden kurmaz, yalnız ayarını yeniden okutur.
- **İlk yayında sertifika:** Bir adresin ilk yayınında Caddy sertifikayı o anda alır. Dışarıdan yoklama bu yüzden 90 saniyeye kadar bekler.
- **Hat beklemesi:** Yayın komutu kaydın hattının bitmesini bekler. Hat bitmeden yayın yapılamaz, hat yaklaşık 4 dakika sürer.
- **Tek sürüm:** Bir kayıttan yalnız o kaydın çekirdek sürümü yayınlanabilir. Bir siteyi eski bir çekirdek sürümünde yeniden yayınlamak için o sürümün kaydına gidilir. Bu sınır site güncelleme komutunda (`planlar/komutlar.md`) yeniden ele alınacak.
- **Saklanan yayınlar:** Silinen yayına geri dönülemez. Üçten eski bir yayına yalnız yeniden yayınla dönülür.
- **Ön kapının görebildikleri:** Ön kapı her sitenin ağına bağlıdır, yani bütün sitelerin kutularına ulaşabilir. Siteler birbirine ulaşamaz (ölçüldü: ad çözülmüyor, adres zaman aşımına uğruyor).
- **Yeniden başlatmada kısa kesinti:** Gizli bilgi yenilenince site birkaç saniye açılmaz. Süre deneme komutunun çıktısında yazar.
- **Kayıttaki sebep:** Başarısız yayının kayıttaki sebebi Docker'ın ve kutunun son günlük satırlarını içerebilir. Gizli bilgi bu satırlara girmez (değer dosyadadır), ama kayıt yine de kök kullanıcıya aittir.
