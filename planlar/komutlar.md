# Site komutları

Altyapının üç komutunun tarifi: yeni site kurmak, bir siteyi güncellemek, bir siteyi mağaza sahibine teslim etmek. Her biri için ne zaman kullanıldığı, hangi soruları sorduğu, hangi adımları sırayla yaptığı ve ne zaman bitmiş sayıldığı yazar.

Durum: 2026-10-28 tarihinde taslak olarak yazıldı. Komutlar henüz yazılmaz. Her iş önce birer kez bu tarife göre elle yapılır, elle yaparken öğrenilenler buraya eklenir, komut ondan sonra yazılır. Klasör ve dosya adları örnektir, teknoloji kararından sonra kesinleşir.

"Siteyi devretmek" bu projede **teslim** diye geçer: mağaza sahibine yönetim panelini ve kendi hesabını vermektir, kodu ya da sunucuyu vermek değildir (karar 0001).

## Üç komutun ortak kuralları

- **Bir seferde bir site.** Hiçbir komut birden çok siteye birlikte dokunmaz (değişmez kural 3).
- **Önce sor, sonra yap.** Komut bütün sorularını başta sorar, cevapların özetini gösterir ve onay alır. İşin ortasında yeni soru çıkmaz, çıkarsa komut durur.
- **Ürün kararını sorar, teknik kararı kendi verir.** Siteden siteye değişebilen bir davranışı karar olarak sormaz. Ayar şemasındaki varsayılanı gösterir, bu site için önerdiği değeri söyler, değiştirmek isteyip istemediğini sorar.
- **Kontrol geçmezse durur.** Bir test ya da kontrol kırmızıysa komut sonraki adıma geçmez, eksikleri liste olarak söyler. Kontrolü atlatan bir seçeneği yoktur.
- **Geri alınamaz adımda ayrıca onay ister.** Alan adı bağlamak, siteyi satışa açmak, mağaza sahibine e-posta göndermek gibi adımlardan hemen önce bir kez daha sorar.
- **Gizli bilgiyi kayda yazmaz.** Veritabanı şifresi, durum ucu anahtarı gibi bilgiler sunucunun korumalı ortam değişkenlerine gider, site klasörüne ve GitHub'a girmez.
- **Kendi çalışma kopyasında çalışır.** Site klasöründeki değişiklik ayrı bir kopyada yapılır, kontrollerden geçince kaydedilir ve ana dala alınır.
- **İz bırakır.** Her çalıştırma yayın kaydına (sahip paneli buradan okur) ve tarihçeye bir giriş yazar: hangi site, ne yapıldı, sonuç.

## 1. Yeni site kurmak

### Ne zaman kullanılır

- Yeni bir mağazayla anlaşıldığında, onun sitesini açmak için.
- Yeni bir demo ya da deneme sitesi gerektiğinde.

Var olan bir siteyi değiştirmek için kullanılmaz. Kurulan site satışa açık değildir, yalnız deneme adresinde çalışır. Satışa açmak teslimin işidir.

**Önkoşul:** Çekirdeğin yayınlanmış en az bir sürümü olmalı. Site gerçek bir mağazaysa yurt dışı veri aktarım belgelerinin şablonu hazır olmalı (karar 0009).

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
6. Gizli bilgileri üretir ve korumalı ortam değişkenlerine yazar.
7. Sitenin kendi veritabanını açar, o sürümün veritabanı değişikliklerini sırayla uygular, başlangıç değerlerini bir kez aktarır.
8. Sitenin dosya deposunu, gece yedeğini, hata izleme etiketini ve zamanlanmış kontrollerini tanımlar.
9. Siteyi deneme adresinde yayınlar. Deneme adresi arama motoruna kapalıdır, gerçek ödeme almaz.
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
8. Siteyi önce deneme adresinde hedef sürümle yayınlar ve kontrolleri orada çalıştırır.
9. Kimlik dosyasındaki sürümü değiştirir ve kaydeder.
10. Canlı veritabanının yedeğini hemen alır.
11. Yayın komutunu çalıştırır: veritabanı değişikliklerini sırayla uygular, siteyi yayınlar, sağlık kontrolü yapar. Sorun çıkarsa site kendiliğinden önceki sürüme döner ve komut durur.
12. Yayından sonra sağlık kontrolünü ve ekran ölçümünü canlıda çalıştırır.
13. Sahip panelinde çalışan sürümün hedef sürüm olduğunu kontrol eder.
14. Bir saat boyunca hata izleme aracında bu siteye ait yeni hata olup olmadığına bakar.
15. İstendiyse mağaza sahibine yenilikleri anlatan e-postayı gönderir.
16. Ana dala alır, çalışma kopyasını kaldırır, tarihçeye yazar.

Geri dönüş: Sorun yayından sonra çıkarsa kimlikteki sürüm eski hâline döner ve yeniden yayınlanır. Veritabanı değişikliği geri alınamıyorsa site 10. adımdaki yedekten döner.

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

Demo sitede kullanılmaz, Örnek Mağaza teslim edilmez. Teslimde mağaza sahibine panel ve kendi hesabı verilir, kod ve sunucu verilmez (karar 0001).

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

## Henüz açık olanlar

- Klasör adları, deneme adresinin biçimi ve gizli bilgilerin sunucuda nasıl saklanacağı: teknoloji kararıyla.
- Alan adını kimin satın alıp kimin adına kaydettireceği.
- Teslim edilmiş bir sitenin sahibi değişirse ya da bir site kapatılırsa ne yapılacağı. Bunlar bu üç komutun dışındadır, gerekince ayrı tarif yazılır.
