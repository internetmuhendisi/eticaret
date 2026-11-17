# 0142 · Kartla ödeme eklentisi ve ödeme kuruluşu

## Tarih

2026-11-17

## Karar

Kart 0215 ile müşteri ödeme adımında "Kartla öde"yi seçer, ödeme kuruluşunun güvenli sayfasında kartla, isterse taksitle öder. Bu iş bir eklentidir (`kartla-odeme`, tarif `eklentiler/kartla-odeme.md`). Ödeme kuruluşu **iyzico**'dur.

Kullanıcının kararları (kart 0215):

| Soru | Karar |
|---|---|
| Ödeme kuruluşu | iyzico (önerilen). Karşılaştırma aşağıda. |
| Taksit seçimi nerede | iyzico'nun formunda, kartın ilk hanelerine göre. Ürün sayfasındaki pencere bankalara göre genel tabloyu gösterir. |
| Ödeme alındı ama ayırma süresi dolup ürün satıldıysa | Ödeme aynı gün iyzico'nun iptal ucuyla geri alınır, sipariş kurulmaz, müşteri ödeme adımına metinle döner. |
| Örnek Mağaza | Eklenti açık, iyzico'nun deneme ortamında. |
| Kart formu nerede | Müşteri iyzico'nun sayfasına gider, ödeyince sitemize döner; form ödeme sayfamıza gömülmez (taslaktan ayrılır). |
| Alıcının kimlik numarası | Sorulmaz: kurumsal faturada vergi numarası, bireyselde yer tutucu `11111111111`. Canlıya geçmeden iyzico'ya teyit ettirilir. |

Ödeme kuruluşlarının karşılaştırması (2026-11-17, kuruluşların kendi sayfalarından; blogların verdiği oranlar birbirini tutmuyordu, kullanılmadı):

| | iyzico | PayTR |
|---|---|---|
| Tek çekim komisyonu | %4,29 + 0,25 TL, BSMV dahil, aylık 20.000 TL üstü satışta ([iyzico Sanal POS](https://www.iyzico.com/isim-icin/sanal-pos), [fiyatlandırma](https://www.iyzico.com/fiyatlandirma)) | "%2,19'dan başlayan" (7 gün valör); asıl oran teklifle ([PayTR Sanal POS](https://www.paytr.com/sanal-pos)) |
| Taksit farkı | Yayımlanmamış, bankaya göre | Yayımlanmamış, işletmeye göre |
| Kurulum ve aylık ücret | Yok | Yok |
| Deneme ortamı | Ayrı deneme sunucusu, yaklaşık 40 deneme kartı (hata verenler dahil) | Deneme kipi, 3 deneme kartı |
| İmzalı bildirim | Başlıkta HMAC-SHA256 (`X-IYZ-SIGNATURE-V3`), hesapta açtırılır | Gövdede imza, zaman bilgisi yok |
| Günlük kayıt listesi | Güne göre işlem işlem ([raporlama](https://docs.iyzico.com/ek-servisler/raporlama-servisi.md)) | Belgelenen gün toplamı |
| Verinin yeri | Yazı bulunamadı; BDDK lisanslı, PCI DSS | Yazı bulunamadı; PCI DSS |

Teknik kurallar:

- **Ödeme yöntemi bağlantı noktası** (`cekirdek/eklentiler/odeme-yontemleri.ts`): kayıttaki yöntem (`kart`) bir eklentiye bağlıdır (`eklentiliOdemeYontemleri`). Ödeme modülü eklentiyi tanımaz, buradan sorar: yöntem sitede var mı (eklenti açık), hazır mı (anahtarlar, sitenin adresi, kuruluşun desteklediği para birimi), ödeme nasıl başlar. Eklenti kapalıyken yöntem ödeme adımında ve panelde yoktur; panelin kaydettiği liste görünmeyen yöntemin kayıtlı yerini ve açıklığını korur.
- **"Siparişi onayla"** (`odemeServisi.onayla`): eklentili yöntemde oturum ve ayırma yazılır, sipariş kurulmaz; eklenti ödeme formunu başlatır ve müşterinin gideceği adresi döner. Başlatılamazsa ayırma bırakılır, `yontem-ulasilamadi`.
- **Sipariş** ödeme doğrulanınca aynı `siparisiKur`'dan kurulur (`eklentiliSiparisiKur`, `cekirdek/moduller/odeme/oturum-hesabi.ts`): oturumun kalemleri sunucuda yeniden hesaplanır, toplam oturumunkiyle ve kuruluşun söylediği tutarla aynı olmalıdır; oturum satırı kilitlenir. Sipariş "hazırlanıyor" durumuyla ve tahsilatla (ödenen tutar, taksit, ödeme kimliği) kurulur. Kayıtta "hazırlanıyor" durumu ve geçişleri, siparişte `tahsilat` alanı açıldı.
- **Doğrulama:** ödemenin sonucu yalnız kuruluşa imzalı sonuç sorgusuyla öğrenilir. Tarayıcının dönüşü ve kuruluşun bildirimi yalnız belirteci getirir; ikisi de aynı tamamlamayı çağırır. Bildirimin imzası tutmazsa reddedilir. Ödeme satırı kilitlenir, yalnız "başlatıldı"daki ödeme sipariş kurar: ikinci dönüş ya da bildirim var olan siparişi bulur.
- **Kurulamayan sipariş:** stok yoksa ya da fiyat değiştiyse ödeme satır kilitliyken aynı gün iptal edilir, ayırma bırakılır. İptal edilemezse ödeme "başlatıldı"da kalır, hata izlemeye yazılır, tarama yeniden dener.
- **Tarama** (15 dakikada bir): 30 dakikadır sonuçlanmamış ödemeyi kuruluşa sorar; müşteri dönmese de sipariş kurulur. Kuruluş 2 saat sonra hâlâ sonuç vermiyorsa ödeme başarısız sayılır.
- **Günlük karşılaştırma:** bir önceki günün (sitenin takvimiyle) ödemeleri kuruluşun işlem raporuyla karşılaştırılır; kuruluşta ödendi ama sitede sipariş yok, sitede ödendi ama kuruluşta yok, tutar farklı hata izlemeye yazılır. Eklenti kapandıktan sonra yedi gün daha çalışır.
- **Kapının dış kuruluş dönüşü** (`disKurulus`, `cekirdek/kapi/uc.ts`): başka siteden gelen form ve sunucudan bildirim; sahte istek denetimi uygulanmaz, gövde form ya da JSON, yalnız `bildirim` sınırıyla (60 saniyede 600). Uç `Yonlendirme` ile 303 verebilir (`cekirdek/kapi/zarf.ts`).
- **Dış servise istek** tek dosyadan gider (`cekirdek/dis-servis/istek.ts`): zaman aşımı zorunlu, gövde sonuna kadar okunur. Doğrudan `fetch` denetimde hatadır, bu dosya muaftır.
- **Kuruluşa özgü her şey** `cekirdek/eklentiler/kartla-odeme/iyzico.ts`'tedir: IYZWSv2 kimliği, ödeme formu, sonuç ve imzası, iptal, taksit, rapor, bildirim imzası. Başka bir kuruluş aynı işlevlerle yeni dosya olur.
- **Anahtarlar** dışarıdan gelen gizli bilgidir (`cekirdek/kayitlar/disaridan-gizli-bilgiler.ts`, okuma `cekirdek/ayar-semasi/disaridan-gizli-bilgi.ts`): sunucuda üretilmez, yoksa hata değildir, yöntem görünmez. Veritabanı adresinin okuma yolu bu yüzden genişlemedi.
- **Ortam** altyapı sahibinin ayarıdır (`kartlaOdemeOrtami`, varsayılan deneme). Deneme ortamında kuruluşun adresi yalnız yerel bir adrese çevrilebilir (`KARTLA_ODEME_DENEME_ADRESI`, testlerin sahte kuruluşu).
- **Dönüşte form:** müşteri gitmeden önce formun bilgileri sekmenin deposuna yazılır (şifre ve onaylar hariç), başarısız dönüşte geri konur ve silinir. Başarılı dönüşte sipariş alındı sayfası sepeti, yalnız ödemeyi başlatan sekmede ve bir kez, temizler.
- **Kart ödemesi satırı** oturuma bağlıdır ve oturum temizliğinde onunla silinir (kişisel veri taşımaz); ödenen satır siparişe bağlıdır, kalır.
- **Ödemesi dışarıda başlamış oturum** (`odeme_disarida`): müşterinin yeniden onayı onu silmez, yalnız ayırmasını bırakır; temizlik 24 saat yerine 30 gün sonra siler (`odemeOturumuDisaridaSaklamaGun`). Parası sonradan çekilen ödemenin kaydı kaybolmaz; stok yetmezse ödeme iptal edilir.
- **Belirsiz sonuç bekler:** sonuç sorgusu `status: failure` dönerse (müşteri henüz ödemedi, kuruluşun geçici hatası) ödeme başarısız sayılmaz. Yalnız `paymentStatus: FAILURE` ya da sahtecilik reddi (`fraudStatus: -1`) başarısızdır. Sahtecilik incelemesindeki ödeme (`fraudStatus: 0`) süre dolsa da başarısız sayılmaz; öteki belirsiz ödemeler 2 saat sonra başarısız sayılır.
- **Sipariş kurulamazsa** satır yeniden okunur: aynı anda gelen öteki yol (dönüş, bildirim) siparişi kurmuşsa müşteri o siparişe gider, ödeme iptal edilmez.
- **Erişim anahtarı** belirteçle yalnız bir kez verilir (`erisim_verildi`): belirteci sonradan ele geçiren sipariş alındı sayfasını açamaz, müşterinin erişimini düşüremez.
- **Tarama** en az sorulandan başlar (`son_sorgu_zamani`), 7 günden eski ödemeyi sormaz: sonuçlanamayan ödemeler yenilerini tıkamaz.
- **Bildirim** kuruluşa ulaşılamadıysa 503 döner: kuruluş yeniden dener.
- **Karşılaştırma** o gün sonuçlanan ödemeleri ve raporda geçenleri alır; gün sınırında başlayıp ertesi gün ödenen ödeme önceki günde uyuşmazlık sayılmaz.

## Neden

- iyzico kartın zorunlu tuttuğu iki şeyi resmî belgeleriyle karşılıyor: imzalı bildirim ve işlem işlem günlük karşılaştırma. Deneme kartları hata durumlarını da sınamaya yetiyor. Komisyonu mağaza sahibi kendi sözleşmesiyle öder; kuruluşa özgü kod tek dosyada olduğu için başka kuruluş sonradan eklenebilir.
- Formu kuruluşun sayfasında açmak kuruluşun kodunu sitenin sayfasına yüklemez; kart bilgisi hiçbir yolda sunucumuza gelmez (kullanıcı kararı).
- Sonucu tarayıcıdan değil kuruluşa sorarak almak, sahte dönüşle sipariş kurulmasını önler.
- Ödeme yöntemini bağlantı noktasından sormak çekirdeğin ödeme modülünü eklentiden bağımsız tutar (karar 0117).
- Ödeme alınıp stok yokken iptal, müşterinin parasının siparişsiz kalmasını önler; iptal aynı gün yapılırsa ekstrede görünmez.

## Düşünülen diğer yollar

- **PayTR:** yayımlanan başlangıç oranı daha düşük, ama belgelenen günlük kayıt listesi gün toplamı; işlem işlem karşılaştırma için ölçüm gerekirdi. Kullanıcı seçmedi.
- **Formu ödeme sayfamıza gömmek** (taslaktaki): kuruluşun betiği sayfamıza yüklenirdi. Kullanıcı seçmedi.
- **Kimlik numarasını sormak:** müşteriye bir alan ve saklanan kişisel veri eklerdi. Kullanıcı seçmedi.
- **Stok yokken siparişi yine kurmak:** stok eksiye düşmeden "stok sorunu" işaretiyle mağaza sahibine bırakırdı. Kullanıcı seçmedi.
- **Anahtarları sunucuda üretilen gizli bilgilere eklemek:** sunucu komutu rastgele değer üretirdi ve her sitede dosya isterdi; anahtar mağazanın sözleşmesinden gelir.
- **Sipariş hesabını tamamlamanın işleminde yapmak:** sepet hesabı ve ayarlar işlemin içinde çağrılacak türde yazılmamış; hesap işlemden önce yapılır, işlemin içinde oturum kilitlenir, stok `stokDus`'un koşuluyla denetlenir.

## Gerçek deneme ortamında ölçülenler (2026-11-17)

Kullanıcının iyzico deneme hesabının anahtarlarıyla, belgelenmiş deneme kartıyla (Halkbank kredi kartı) bir kez elle:

- Ödeme formu başlatıldı, yanıtın imzası tuttu; ödeme sayfası `sandbox-cpp.iyzipay.com`'da açıldı.
- 3D Secure seçilerek ödendi (kod sayfada yazılı), kuruluş müşteriyi dönüş adresine aynı belirteçle gönderdi; sonuç sorgusu "ödendi", tutar ve oturum doğru, imzası tuttu. 3D Secure seçilmeyince de ödeme alındı.
- Aynı gün iptal çalıştı; ikinci iptal "8514: işlem önceden başlatıldı" döndü. İptalden sonra sonuç sorgusu yine "ödendi" diyor.
- Başarısız ödemede sorgu `status: success`, `paymentStatus: FAILURE` döndü. Henüz ödenmemiş belirteçte `status: failure`, "5122: Gönderilen tokena ait ödeme bilgisi bulunamadı" döndü (kod bu yüzden belirsiz sonucu bekletir).
- Sonuç yanıtı `conversationId`'yi istekte gönderilmezse yazmıyor: oturum `basketId`'den okunur.
- GET isteğinin (rapor) imzası sorgu kısmı olmadan kabul edildi, sorguyla reddedildi.
- Taksit sorgusu 6 banka döndü. Ödeme sayfasında deneme kartı için yalnız "Tek Çekim" çıktı (deneme hesabının taksit ayarına bağlı olabilir): taksitli ödeme gerçek ortamda ölçülmedi.
- Bugünün raporu ödemeleri hemen göstermedi; rapor gecikmeyle doluyor olabilir (karşılaştırma bir önceki günü yapar). Ertesi gün ölçülmedi.
- Bildirim (webhook) ölçülmedi: kuruluşun ulaşacağı açık bir adres gerekir.
- Müşteri e-postası `.test` uzantılı adresi "hatalı biçim" diye reddetti; kuruluşun reddettiği gerçek adreste müşteri "kartla ödeme başlatılamadı" görür.

## Sonuçları

- Sipariş e-postası ve yöneticiye uyuşmazlık e-postası yoktur (on üçüncü bölüm); uyuşmazlık yalnız hata izlemede görünür. Panelde kart ödemeleri listesi yoktur.
- Kartla iade ve kısmi iade on üçüncü bölümdeki iade akışıyla gelir; bugün yalnız siparişi kurulamayan ödeme iptal edilir.
- Taksit farkı müşteriye yansıtılıyorsa siparişin toplamı ile ödenen tutar farklıdır; ikisi de siparişte durur.
- Gerçek deneme ortamıyla baştan sona deneme bir kez elle yapılır (anahtarlar kullanıcıdan); testler ve hat yerel sahte kuruluşla çalışır, iyzico'nun gerçek davranışından ayrılan yer testte yakalanmaz. IYZWSv2 imzasında GET isteğinin sorgu kısmının imzaya girip girmediği belgede yazmıyor; rapor ucunda gerçek ortamda ölçülür.
- Bildirim imzası iyzico hesabında açtırılmadıkça gelmez: bildirimsiz de sipariş dönüşle ve taramayla kurulur.
- Anahtarların sunucuya kurulması yoktur: Örnek Mağaza sunucuda eklentisi açık olsa da anahtarsız olduğu için "Kartla öde"yi göstermez.
- Ürün sayfasının taksit satırı eklentilerin ürün sayfası yuvasındadır (stok yazısının altında); taslakta fiyatın altındaydı.
- Alt kısmın ödeme işaretleri bu karta girmedi (kart 0221).
- 3D Secure'u zorunlu tutmak iyzico panelindeki ayardır: deneme formu 3D Secure'suz ödemeye izin verdi. Canlıya geçmeden mağazanın iyzico hesabında 3D Secure zorunlu yapılmalıdır; kod bunu denetlemez.
- İptal kuruluşta başarılı olup veritabanına yazılamazsa (bağlantı kopması) ödeme "başlatıldı"da kalır; sonuç sorgusu iptalden sonra da "ödendi" dediği için tarama sonradan sipariş kurabilir. Olasılığı düşüktür, günlük karşılaştırma iptali ve siparişi birlikte görür ama bunu uyuşmazlık saymaz; yalnız disiplin.
- Sitede yalnız "Kartla öde" açıkken anahtarlar kaldırılırsa müşterinin kullanabileceği yöntem kalmaz ("en az bir yöntem" kuralı ortamı görmez).
- Kuruluş iptali başarıyla yapıp yanıtı zaman aşımına uğrarsa her denemede "iptal edilemedi" alınır; ödeme 7 gün sonra artık sorulmaz, hata izlemede görünür.
