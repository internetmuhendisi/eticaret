# Site komutları

Altyapının üç komutunun tarifi: yeni site kurmak, bir siteyi güncellemek, bir siteyi mağaza sahibine teslim etmek. Her biri için ne zaman kullanıldığı, hangi soruları sorduğu, hangi adımları sırayla yaptığı ve ne zaman bitmiş sayıldığı yazar.

Durum: 2026-10-28 tarihinde taslak olarak yazıldı. Komutlar henüz yazılmaz. Her iş önce birer kez bu tarife göre elle yapılır, elle yaparken öğrenilenler buraya eklenir, komut ondan sonra yazılır. Yeni site kurma 2026-11-05'te Örnek Mağaza'da, o güne kadar yapılabilen adımlarıyla bir kez elle izlendi (kart 0023, aşağıda "Elle yaparken"). Klasör ve dosya adları karar 0015 ile kesinleşti (`.claude/rules/klasor-duzeni.md`).

**Teslim**, mağaza sahibine yönetim panelini ve kendi hesabını vermektir, kodu ya da sunucuyu vermek değildir. **Devir** başka bir iştir: ayrılmak isteyen mağazanın sitesini bütünüyle onun seçtiği sunucuya vermektir. Devir bu üç komutun dışındadır (karar 0014).

## Üç komutun ortak kuralları

- **Bir seferde bir site.** Hiçbir komut birden çok siteye birlikte dokunmaz (değişmez kural 3).
- **Önce sor, sonra yap.** Komut bütün sorularını başta sorar, cevapların özetini gösterir ve onay alır. İşin ortasında yeni soru çıkmaz, çıkarsa komut durur.
- **Ürün kararını sorar, teknik kararı kendi verir.** Siteden siteye değişebilen bir davranışı karar olarak sormaz. Ayar şemasındaki varsayılanı gösterir, bu site için önerdiği değeri söyler, değiştirmek isteyip istemediğini sorar.
- **Kontrol geçmezse durur.** Bir test ya da kontrol kırmızıysa komut sonraki adıma geçmez, eksikleri liste olarak söyler. Kontrolü atlatan bir seçeneği yoktur.
- **Geri alınamaz adımda ayrıca onay ister.** Alan adı bağlamak, siteyi satışa açmak, mağaza sahibine e-posta göndermek gibi adımlardan hemen önce bir kez daha sorar.
- **Gizli bilgiyi kayda yazmaz.** Veritabanı şifresi, durum ucu anahtarı gibi bilgiler sunucuda sitenin kendi gizli bilgi dosyalarında durur, site klasörüne ve GitHub'a girmez (karar 0031).
- **Kendi çalışma kopyasında çalışır.** Site klasöründeki değişiklik ayrı bir kopyada yapılır, kontrollerden geçince kaydedilir ve ana dala alınır.
- **İz bırakır.** Her çalıştırma yayın kaydına (sahip paneli buradan okur) ve tarihçeye bir giriş yazar: hangi site, ne yapıldı, sonuç.

## 1. Yeni site kurmak

### Ne zaman kullanılır

- Yeni bir mağazayla anlaşıldığında, onun sitesini açmak için.
- Yeni bir demo ya da deneme sitesi gerektiğinde.

Var olan bir siteyi değiştirmek için kullanılmaz. Kurulan site satışa açık değildir, yalnız deneme adresinde çalışır. Satışa açmak teslimin işidir.

**Önkoşul:** Çekirdeğin yayınlanmış en az bir sürümü olmalı. Yayınlanmış sürüm, `cekirdek/surum-notlari/` klasöründe notu olan sürümdür. Site gerçek bir mağazaysa yurt dışı veri aktarım belgelerinin şablonu hazır olmalı (karar 0009).

### Sorduğu sorular

1. **Mağazanın adı ne?** Vitrinde ve panelde görünen ad. Kod adı (`ornek-magaza` gibi) ve sipariş numarası öneki (`ORN` gibi) bu addan önerilir.
2. **Gerçek mağaza mı, demo mu?** Demo sitede sahte ürünler yüklenir, site arama motoruna kapalı kalır, teslim edilmez.
3. **Hangi tema?** Hazır temalardan biri. Ardından: "Mağaza sahibi temayı değiştirebilsin mi?" (önerilen: evet; özel tasarlanan mağazada hayır).
4. **Sipariş numarası öneki ve başlangıcı uygun mu?** Önerilen önek mağaza adından üç harf, başlangıç 1001. Bunlar satış başladıktan sonra değiştirilmemeli, o yüzden kurulumda sorulur.
5. **Varsayılandan farklı olacak bir ayar var mı?** Komut mağaza sahibinin ayarlarının başlangıç değerlerini liste olarak gösterir (ödeme yöntemleri, kapıda ödeme seçenekleri, kargoya verme süresi, iade kargosunu kim öder gibi) ve bu site için önerisini söyler. Bunları sonra mağaza sahibi panelden değiştirebilir.
6. **Logo hazır mı?** Hazır değilse mağaza adından geçici bir yazı logosu kullanılır, mağaza sahibi sonra panelden yükler.
7. **Mağaza bilgileri hazır mı?** Ünvan, adres, telefon, e-posta, vergi dairesi ve numarası. Yasal metinler bunlarla dolar. Hazır değilse boş bırakılır, teslimden önce tamamlanması gerekir.

Eklenti sorulmaz. Katalogdaki bir eklenti ayrıca istenmedikçe kurulmaz.

### Adımlar

1. Kod adını üretir, başka bir sitenin kullanmadığını kontrol eder.
2. Cevapların özetini gösterir, onay alır.
3. Çalışma kopyasını açar.
4. Site klasörünü oluşturur:
   - `kimlik`: kod adı, görünen ad, türü (gerçek ya da demo), deneme adresi, çekirdek sürümü (yayınlanmış en yeni sürüm), teslim durumu "teslim edilmedi";
   - `ayarlar`: yalnız varsayılandan farklı olan altyapı sahibi ayarları;
   - `baslangic/`: mağaza sahibi ayarlarının ilk değerleri, seçilen tema, ilk ana sayfa düzeni; demoysa sahte kategori ve ürünler;
   - `marka/`: logo ya da geçici logo;
   - `testler/`: bu sitenin ayarlarına göre kontroller (örneğin sipariş numarası doğru önekle başlar);
   - `KURALLAR.md`: bu siteye özel kısa notlar.
5. Klasörü kimlikte yazan çekirdek sürümünün ayar şemasıyla doğrular.
6. Site klasörünü kaydeder ve kontrol hattından geçirir: kart dalı GitHub'a gönderilir, `pnpm hat-sonucu` yeşil olmalı. Yayın komutu yalnız yeşil hattan geçmiş, kaydedilmemiş değişikliği olmayan kayıtla çalışır (karar 0035).
7. Siteyi deneme adresinde yayınlar (`pnpm yayinla siteler/<kod-adi> deneme`). Komut sırasıyla şunları kendisi yapar: kilitler (hat yeşil, kaydedilmemiş değişiklik yok, hat koruması), hızlı sunucu denetimi, çekirdeğin görüntüsünü bu kayıttan üretip denetlemek, hata izleme projesi (karar 0036), gizli bilgiler (yoksa üretir, karar 0031), sitenin veritabanı ve kullanıcısı, o sürümün veritabanı değişiklikleri (karar 0034), görüntünün sunucuya aktarılması, site klasörünün aktarılması, yeni kutu, içeriden sağlık kontrolü, ön kapının yeni kutuya çevrilmesi, dışarıdan sağlık kontrolü, trafiğin yeni kutuya geçmesi, eski kutunun durması (karar 0035). Deneme adresi arama motoruna kapalıdır, gerçek ödeme almaz. Başlangıç değerlerinin bir kez aktarılması henüz yoktur.
8. Sitenin dosya deposunu, gece yedeğini ve zamanlanmış kontrollerini tanımlar.
9. Hata izlemenin çalıştığını dener (`pnpm hata-izleme-denemesi siteler/<kod-adi>`).
10. Kontrolleri çalıştırır: sağlık kontrolü, çekirdeğin ve sitenin testleri, veri ayrımı testi (yeni site başka bir sitenin verisini göremez), ekran ölçümü.
11. Sahip panelinde sitenin göründüğünü ve durum ucunun cevap verdiğini kontrol eder.
12. İlk yedeği alır ve o yedekten geri yüklemenin çalıştığını bir kez dener.
13. Site klasörünü kaydeder, ana dala alır, çalışma kopyasını kaldırır, tarihçeye yazar.

### Ne zaman bitmiş sayılır

- [ ] Site klasörü ana dalda ve ayar şemasından geçiyor.
- [ ] Kimlik dosyasında çekirdek sürümü ve "teslim edilmedi" yazıyor.
- [ ] Sitenin ayrı veritabanı var, başlangıç değerleri yüklü.
- [ ] Site deneme adresinde açılıyor, arama motoruna kapalı, gerçek ödeme kapalı.
- [ ] Çekirdeğin ve sitenin testleri, veri ayrımı testi ve ekran ölçümü geçti.
- [ ] Sahip panelinde site görünüyor; çalışan sürüm kimlikteki sürümle aynı.
- [ ] Gece yedeği tanımlı, ilk yedek alındı, geri yükleme denendi.
- [ ] Hiçbir gizli bilgi kayda girmedi.
- [ ] Tarihçeye giriş yazıldı.

## 2. Bir siteyi güncellemek

### Ne zaman kullanılır

- Çekirdeğin yeni bir sürümü çıktığında, bir siteyi o sürüme geçirmek için.
- Güvenlik açığı kapatan bir sürüm çıktığında. Sahip paneli bu siteleri ayrıca işaretler, bunlar önce güncellenir.

Yalnız site klasörü değiştiğinde (örneğin altyapı sahibinin bir ayarı) bu komut değil, yayın komutu kullanılır. Bir güncellemeyi geri almak için de yayın komutu kullanılır.

**Sıra:** Her yeni sürüm önce Örnek Mağaza'ya gider (karar 0007). Örnek Mağaza o sürümde sorunsuz çalışmadan başka bir site o sürüme geçirilmez, komut bunu kontrol eder.

### Sorduğu sorular

1. **Hangi site?** Komut sahip panelinden siteleri, çalıştıkları sürümü ve bekleyen güvenlik güncellemesini gösterir.
2. **Hangi sürüme?** Önerilen: yayınlanmış en yeni sürüm. Komut aradaki bütün sürümlerin notlarını sade dille özetler: ne değişti, bu siteye etkisi, mağaza sahibi panelde yeni bir şey görecek mi.
3. **Ne zaman?** Hemen ya da mağazanın en az ziyaret aldığı saatte (önerilen: gece). Güncelleme sırasında site kısa süre bakım moduna geçecekse bu ayrıca söylenir.
4. **Mağaza sahibine haber verilsin mi?** Yalnız sürüm notunda mağaza sahibinin göreceği bir değişiklik varsa sorulur.

Büyük sürümde (ilk sayı artıyorsa) site klasöründe de değişiklik gerekir. Komut bu değişiklikleri gösterir ve ayrıca onay alır. Veritabanı değişikliği geri alınamıyor ve yedekten dönmek gerekiyorsa bu da baştan söylenir.

### Adımlar

1. Sitenin şu anki durumunu kontrol eder: site açık, son kontroller yeşil, çalışan sürüm kimlikteki sürümle aynı. Değilse durur, önce bu düzeltilir.
2. Örnek Mağaza'nın hedef sürümde çalıştığını kontrol eder (güncellenen site Örnek Mağaza değilse).
3. Çalışma kopyasını açar.
4. Büyük sürümse site klasöründeki gerekli değişiklikleri yapar.
5. Site klasörünü hedef sürümün ayar şemasıyla doğrular.
6. Veritabanı değişikliği varsa onu canlının kişisel bilgileri silinmiş bir kopyasında dener.
7. Çekirdeğin ve sitenin testlerini hedef sürümle çalıştırır.
8. Kimlik dosyasındaki sürümü değiştirir, kaydeder ve kontrol hattından geçirir. Yayın komutu kimlikteki sürümün kayıttaki çekirdekle aynı olmasını ister, bu yüzden bu adım yayından öncedir (kart 0041).
9. Siteyi önce deneme adresinde hedef sürümle yayınlar ve kontrolleri orada çalıştırır.
10. Canlı veritabanının yedeğini hemen alır.
11. Yayın komutunu çalıştırır: veritabanı değişikliklerini sırayla uygular, siteyi yayınlar, sağlık kontrolü yapar. Sorun çıkarsa site kendiliğinden önceki sürüme döner ve komut durur.
12. Yayından sonra sağlık kontrolünü ve ekran ölçümünü canlıda çalıştırır.
13. Sahip panelinde çalışan sürümün hedef sürüm olduğunu kontrol eder.
14. Bir saat boyunca hata izleme aracında bu siteye ait yeni hata olup olmadığına bakar.
15. İstendiyse mağaza sahibine yenilikleri anlatan e-postayı gönderir.
16. Ana dala alır, çalışma kopyasını kaldırır, tarihçeye yazar.

Geri dönüş: Sorun yayından sonra çıkarsa `pnpm geri-don` siteyi önceki yayına döndürür; dönülen yayın kendi kutu tanımını, site klasörünü ve görüntüsünü kullanır (karar 0035). Kimlikteki sürüm ana dalda yeni sürümde kalır; kimliği eski sürüme çekip yeniden yayınlamak olmaz, çünkü yayın komutu kimlikteki sürümün kayıttaki çekirdekle aynı olmasını ister. Düzeltme yeni bir sürümle yayınlanır. Veritabanı değişikliği geri alınamıyorsa ("yedekten" notu) geri dönüş durur, site 10. adımdaki yedekten döner.

### Ne zaman bitmiş sayılır

- [ ] Kimlik dosyasında yeni sürüm yazıyor ve ana dalda.
- [ ] Sahip panelinde çalışan sürüm ile kimlikteki sürüm aynı.
- [ ] Testler, sağlık kontrolü ve ekran ölçümü geçti.
- [ ] Bir saat içinde bu siteye ait yeni hata yok.
- [ ] Güncellemeden hemen önce alınan yedek duruyor.
- [ ] Yayın kaydında ve tarihçede giriş var.
- [ ] Güvenlik güncellemesiyse sahip panelindeki işaret kalktı.

## 3. Bir siteyi mağaza sahibine teslim etmek

### Ne zaman kullanılır

- Kurulmuş ve denenmiş bir gerçek mağaza sitesi, sahibine verilip satışa açılacağı zaman. Her sitede bir kez kullanılır.

Demo sitede kullanılmaz, Örnek Mağaza teslim edilmez. Teslimde mağaza sahibine panel ve kendi hesabı verilir, kod ve sunucu verilmez (karar 0014).

### Sorduğu sorular

1. **Hangi site?** Yalnız "teslim edilmedi" durumundaki gerçek mağazalar listelenir.
2. **Mağaza sahibinin adı, e-postası ve telefonu?** Hesap bu e-postayla açılır. Telefon iki aşamalı giriş için gerekebilir.
3. **Hangi alan adı?** Alan adının kimin adına kayıtlı olduğu ve yönetimine erişimimiz olup olmadığı da sorulur. Alan adı bağlamak geri alınamaz sayılır, ayrıca onay alınır.
4. **Satışa ne zaman açılsın?** Hemen ya da belirli bir tarihte. O tarihe kadar vitrinde bakım modu ("Yakında açılıyoruz") görünür, mağaza sahibi panelde çalışabilir.
5. **Yasal metinler mağaza sahibinin hukukçusuna kontrol ettirildi mi?**
6. **Yurt dışı veri aktarım belgeleri imzalandı ve Kurum'a bildirildi mi?** (karar 0009)

5. ve 6. sorunun cevabı "hayır" ise komut satışa açmaz. Mağaza sahibi hesabı yine açılabilir, site bakım modunda kalır.

### Adımlar

1. Ön kontrolleri çalıştırır. Biri bile geçmezse eksikleri liste olarak söyler ve satışa açma adımlarına geçmez:
   - site kurulmuş, son kontrolleri yeşil, son güncellemesi başarılı;
   - mağaza bilgileri (ünvan, adres, iletişim, vergi bilgileri) dolu;
   - yasal metinler doldurulmuş ve kontrol edilmiş;
   - en az bir ödeme yöntemi açık, bilgileri dolu (örneğin havale için banka hesabı);
   - kargo ücreti ve kargoya verme süresi girilmiş;
   - e-posta gönderen adresi doğrulanmış, deneme e-postası ulaşıyor;
   - sitede sahte ürün ya da deneme siparişi kalmamış;
   - yurt dışı veri aktarım belgeleri tamam.
2. Deneme adresinde baştan sona bir sipariş dener: sepete ekleme, ödeme, sipariş e-postası, panelde görünme, iptal ve stoğun geri dönmesi. Bu deneme canlı veritabanında yapılmaz, böylece ilk gerçek sipariş ilk numarayı alır.
3. Cevapların ve kontrol sonuçlarının özetini gösterir, onay alır.
4. Mağaza sahibi hesabını açar: tam yetkili mağaza sahibi rolü, ilk girişte şifre belirleme ve iki aşamalı giriş zorunlu.
5. Alan adını siteye bağlar (ayrı onayla), şifreli bağlantı sertifikasını kurar, deneme adresinden yeni adrese yönlendirme ekler.
6. Satış tarihi gelmediyse siteyi bakım modunda bırakır. Geldiyse satışa açar: bakım modu kapanır, site arama motoruna açılır, site haritası gönderilir.
7. Canlı adreste sağlık kontrolünü, güvenlik kontrollerini ve ekran ölçümünü çalıştırır.
8. Kimlik dosyasına teslim durumunu yazar: teslim edildi, tarih, canlı adres, aktarım belgeleri tamam.
9. Mağaza sahibine teslim e-postasını gönderir (ayrı onayla): panel adresi, ilk giriş, ilk günlerde yapacakları, yardım içeriği.
10. Kaydeder, ana dala alır, tarihçeye yazar.

### Ne zaman bitmiş sayılır

- [ ] Ön kontrollerin hepsi geçti.
- [ ] Mağaza sahibi panele kendi hesabıyla girdi ve iki aşamalı girişi kurdu.
- [ ] Site kendi alan adında şifreli bağlantıyla açılıyor, deneme adresi oraya yönleniyor.
- [ ] Satış tarihi geldiyse site satışta ve arama motoruna açık; gelmediyse bakım modunda ve açılış tarihi sahip panelinde görünüyor.
- [ ] Kimlik dosyasında "teslim edildi" ve tarih yazıyor, ana dalda.
- [ ] Sahip panelinde site canlı ve teslim edilmiş görünüyor.
- [ ] Teslim e-postası gitti.
- [ ] Tarihçeye giriş yazıldı.

## Elle yaparken

Her komut yazılmadan önce bir kez elle yapılır:

- yeni site kurmak: ilk kez Örnek Mağaza kurulurken;
- güncellemek: çekirdeğin ikinci sürümü çıkınca, Örnek Mağaza'da;
- teslim: ilk gerçek mağazada.

Elle yaparken bu tarifin adımları sırayla izlenir. Eksik, fazla ya da yanlış sıradaki adım buraya not edilir. Komut, düzeltilmiş tarife göre yazılır.

### Yeni site kurmak: ilk kez elle, Örnek Mağaza (kart 0023, 2026-11-05)

Kurulan: Örnek Mağaza, çekirdek `0.1.0` ile `https://ornek-magaza.deneme.eticaretmagazasi.com` adresinde. Adımlar sırayla:

| Adım | Ne oldu |
|---|---|
| Sorular | Ad, tür (demo), kod adı ve sipariş numarası öneki (`ORN`, başlangıç varsayılan 1001) Örnek Mağaza'nın klasöründe zaten vardı (kart 0010). Şemadaki öteki bütün ayarlar (ülke, dil, para birimi ve biçimi, saat dilimi, ölçü birimleri, sipariş başlangıcı, tema değiştirilebilir mi, vitrinde altyapı adı) varsayılanında kaldı. Hazır tema, logo ve mağaza bilgileri sorulamadı: temalar, marka dosyaları ve mağaza bilgisi alanları henüz yok. Mağaza sahibinin ayarları da yok; şemada yalnız altyapı sahibinin ayarları var. |
| 1. Kod adı | `ornek-magaza`. Başka sitenin kullanmadığını bugün `sunucu/site-kullanicilari.json` ve `siteler/` klasörü gösteriyor; ikisine birlikte bakan bir kontrol yok. |
| 2. Özet ve onay | Kullanıcı kartın planını onayladı. |
| 3. Çalışma kopyası | `.claude/worktrees/0023`. Kopyada `.env` yoktur; veritabanı testleri için ana klasördeki `.env` kopyaya alınır (kayda girmez). |
| 4. Site klasörü | Yalnız `kimlik.json`, `ayarlar.json`, `KURALLAR.md` var. Kimliğe deneme adresi yazıldı; adres ön kapının kod adından ürettiği adresle aynı olmalı, testi `komutlar/testler/on-kapi.test.ts`. `baslangic/`, `marka/`, `testler/` açılmadı: içine konacak tema, ürün, logo ve siteye özel kural yok. |
| 5. Doğrulama | `pnpm site-dogrula` geçti. Klasör "kimlikte yazan sürümün şemasıyla" değil, çalışma kopyasındaki çekirdeğin şemasıyla doğrulanıyor; ikisi bugün aynı (0.1.0). Sürümler ayrışınca bu adım o sürümün kaydını kullanmalı. |
| 6. Kayıt ve hat | Kart dalı GitHub'a gönderildi, hat yeşil geçti. Tarifin ilk hâlinde bu adım yoktu. |
| 7. Yayın | `pnpm yayinla` gizli bilgiyi, veritabanını, hata izleme projesini ve yayını tek komutta yaptı. Tarifin ilk hâlindeki 6 ve 7. adım ayrı komut değil, yayının parçası. |
| 8. Depo, yedek, kontroller | Yapılamadı: dosya deposu (ürün görseli yok), gece yedeği (kart 0024) ve zamanlanmış kontroller henüz yok. Hata izleme etiketi yayın komutunun içinde. |
| 9. Hata izleme | `pnpm hata-izleme-denemesi` yeşil. |
| 10. Kontroller | Sağlık: yayın komutu içeriden ve dışarıdan ölçtü; `pnpm sunucu-denetle` artık her yayındaki sitenin adresini, arama motorlarına kapalılığını ve sağlık ucundaki sürümü ölçüyor. Beklenen sürüm bilgisayardaki kimlikten değil, sunucudaki etkin yayının kaydından okunur: kimlik bir sonraki sürüme geçmişken eski yayın çalışıyorsa öteki sitelerin yayını durmamalı (bağımsız kontrol buldu). Çekirdeğin testleri hatta geçti. Sitenin kendi testleri yok. Veri ayrımı: `pnpm sunucu-veritabani-denemesi` yeşil (sunucuda iki site birbirinin veritabanına giremiyor). Ekran ölçümü kurulmadı. |
| 11. Sahip paneli | Yapılamadı: sahip paneli yok. |
| 12. İlk yedek | Yapılamadı: kart 0024. |
| 13. Kayıt ve tarihçe | Kart dalı ana dala alınır, tarihçeye `/is-bitti` yazar. |

Öğrenilenler, komut yazılırken uyulacak:

- **Sıra:** Yayın komutu kurma tarifinin ortasını kendisi yapıyor. Kurma komutu yayın komutunu çağırmalı, onun adımlarını yeniden yazmamalı.
- **Hat:** Yayın yalnız GitHub'da yeşil geçmiş kayıtla yapılır. Kurma komutu site klasörünü kaydedip gönderdikten sonra hattı beklemeli; gönderme kullanıcının onayını ister.
- **Sürüm:** "Yayınlanmış sürüm" ancak sürüm notuyla tanımlı oldu. Notun varlığını ve biçimini `cekirdek/testler/surum-notlari.test.ts` denetliyor. Aynı numarayla farklı çekirdeğin yayınlanabilmesi ayrı bir iştir (kart 0040).
- **Adres:** Deneme adresi kimlikte belge olarak, ön kapıda kod adından üretilerek iki yerde duruyor. Kurma komutu adresi kimliğe kendisi yazmalı; adres yoksa ya da farklıysa test yakalar (`kimlikAdresiHatasi`, `komutlar/on-kapi.mts`).
- **Ölçüm:** Yayından sonra sağlık kontrolü yalnız yayın anında değil, her sunucu denetiminde de çalışıyor. Bu yüzden ayrı bir "sağlık kontrolü" adımı komutta denetim çağrısı olur.
- **Kimlik ile çalışan sürüm:** Sunucu denetimi çalışan sürümü yayın kaydıyla karşılaştırır, kimlikle karşılaştırmaz. Bir site geri dönünce ya da yayını düşünce kimlik sonraki sürümde kalabilir; bugün bunu hiçbir ölçüm söylemez. Farkı sahip paneli göstermeli (karar 0011), güncelleme komutu da 1. adımda bu farkta durmalı.
- **Henüz yapılamayanlar:** Tarifin 4 (`baslangic/`, `marka/`, `testler/`), 8, 11 ve 12. adımları ve ekran ölçümü. Her biri ilgili parça yazılınca bu tabloya işlenir.

### Bir siteyi güncellemek: ilk kez elle, Örnek Mağaza (kart 0041, 2026-11-05)

Güncellenen: Örnek Mağaza, çekirdek `0.1.0` → `0.2.0` (ana sayfada "Yakında açılıyoruz." yazısı, yeni site ayarı). Veritabanı değişikliği yoktu. Canlı ortam olmadığı için güncelleme deneme adresinde yapıldı. Ardından geri dönüş ve yeniden yayın denendi.

| Adım | Ne oldu |
|---|---|
| 1. Şu anki durum | Sağlık ucu `0.1.0`, ana daldaki kimlik `0.1.0`; site açık, son denetim yeşil. |
| 2. Örnek Mağaza hedef sürümde mi | Güncellenen site Örnek Mağaza olduğu için geçilmedi. |
| 3. Çalışma kopyası | `.claude/worktrees/0041`. |
| 4. Büyük sürüm | Değil (orta sürüm); site klasöründe yalnız yeni ayarın değeri ve kimlikteki sürüm değişti. |
| 5. Doğrulama | `pnpm site-dogrula` geçti. |
| 6. Veritabanı değişikliği denemesi | Değişiklik yoktu. Kişisel bilgileri silinmiş kopya da henüz yok (kontrol tablosunda "kurulmadı"). |
| 7. Testler | Birim, tarayıcı ve hat testleri geçti. Önce bilgisayarda bakıldı, kullanıcı onayladı; üç genişlikte yana kayma yok. |
| 8. Kimlikte sürüm | Yayından önce kaydedilmek zorunda: yayın komutu kimlikteki sürümün kayıttaki çekirdekle aynı olmasını ister. Tarifin ilk hâlinde bu adım deneme yayınından sonraydı; sıra düzeltildi. |
| 9. Deneme adresinde yayın | Tek ortam deneme olduğu için 9 ve 11. adım aynı yayın oldu. |
| 10. Yedek | Yapılamadı: gece yedeği ve yedek komutu yok (kart 0024). |
| 11. Yayın | `pnpm yayinla` yayın 4'ü açtı. Sağlık içeriden ve dışarıdan `0.2.0`. |
| 12. Sağlık ve ekran ölçümü | Sağlık geçti; `pnpm sunucu-denetle` yeşil. Ekran ölçümü kurulmadı, üç genişlik elle bir betikle ölçüldü. |
| 13. Sahip paneli | Yapılamadı: sahip paneli yok. |
| 14. Bir saat hata izleme | Hata izleme denemesi yeni sürümle yeşil. Bir saat boyunca "bu siteye ait yeni hata"yı soran bir komut yok; yönetim ekranından (`pnpm hata-izleme-ac`) elle bakılabilir. |
| 15. Mağaza sahibine e-posta | Demo site, gerekmedi. |
| 16. Ana dala alma | Kart dalı ana dala alınır, tarihçeye `/is-bitti` yazar. |
| Geri dönüş | `pnpm geri-don` yayın 3'e döndü: yazı kalktı, sağlık `0.1.0`. Kimlik ana dalda `0.2.0` kalırken denetim yeşil kaldı, çünkü denetim beklenen sürümü yayın kaydından okuyor (kart 0023). Ardından aynı kayıtla `pnpm yayinla` yayın 6'yı açtı, yazı geri geldi. |

Öğrenilenler, komut yazılırken uyulacak:

- **Sıra:** Kimlikteki sürüm yayından önce kaydedilir (tarifte düzeltildi, 8. adım). Komut: kimliği değiştir, kaydet, hattı bekle, yayınla.
- **Sürüm:** Çekirdekteki her yayınlanan değişiklik yeni bir sürüm ve not ister. Aynı numarayla farklı çekirdeğin yayınlanmasını henüz bir şey durdurmuyor (kart 0040).
- **Ayar ve eski sürüm:** Yeni bir ayar eski sürümün şemasında yoktur, eski sürüm o ayarla açılmaz. `pnpm geri-don` eski klasörü kullandığı için etkilenmez; elle eski sürüme dönülürken ayar da kaldırılmalı. Sürüm notunun "Sitelere etkisi" bölümü bunu söylemeli.
- **Hata izleme:** "Yayından sonra bu siteye ait yeni hata var mı" sorusunu cevaplayan bir komut gerekir (14. adım). Bugsink'in okuma ucu bunu verebilir.
- **Henüz yapılamayanlar:** 6 (kişisel bilgisi silinmiş kopya), 10 (yedek), 13 (sahip paneli), ekran ölçümü ve 14'ün komutu.

## Henüz açık olanlar

- Klasör adları karar 0015 ile, gizli bilgilerin sunucuda saklanması karar 0031 ile, deneme adresinin biçimi (`<kod-adi>.deneme.eticaretmagazasi.com`) karar 0032 ile kapandı.
- Alan adını kimin satın alıp kimin adına kaydettireceği.
- Teslim edilmiş bir sitenin sahibi değişirse ya da bir site kapatılırsa ne yapılacağı. Bunlar bu üç komutun dışındadır, gerekince ayrı tarif yazılır.
- Ayrılan mağazaya siteyi devretmenin tarifi (0014): ilk devir istendiğinde yazılır. Kodun başka yerde kullanılması ve devredilen siteyi kimin güncelleyeceği de o zaman konuşulur.
