# 0117 · İlk eklenti ve eklentilerin bağlantı noktaları: stoğa gelince haber ver

Bu kararın sonraki seçeneklerde önce satılabilir değerin arandığı maddesinin yerine 0118 numaralı karar geçti.

## Tarih

2026-11-13

## Karar

"Stoğa gelince haber ver" ilk eklenti olarak elle kuruldu (kart 0144). Tarifi `eklentiler/stoga-gelince-haber-ver.md`, planı `planlar/stoga-gelince-haber-ver.md`. Eklentinin yeri ve çekirdeğe bağlandığı noktalar her eklentinin kullanabileceği biçimde kuruldu; eklenti ekleme komutu (kart 0145) bu kurulumdan çıkarılacak.

**Eklentinin yeri ve açıklığı:**

- Eklentinin kodu çekirdektedir: `cekirdek/eklentiler/<kod>/`, modülle aynı parçalar (model, servis, şemalar, izinler, işler, ekran parçaları, testler). Kodlar tek kayıttadır (`cekirdek/kayitlar/eklentiler.ts`).
- Kurulu eklenti kapalı başlar. Sitede açık olması altyapı sahibinin `eklentiler` ayarıdır (`ayarlar.json`, varsayılan boş liste): eklenti başka bir hizmet ya da ücret getirebilir. Açıklık yalnız `eklentiAcikMi` ile sorulur (`cekirdek/eklentiler/acik.ts`).
- Eklentinin site başına davranışları mağaza sahibinin ayarlarıdır ve çekirdeğin ayar şemasındadır (`stokBildirimiUyeOlmayan`, `stokBildirimiSaklamaGun`); eklenti kapalıyken okunmaz.
- Eklentinin tablosu kendi `model.ts`'indedir; değişiklik üreten araç `cekirdek/eklentiler/*/model.ts`'i de okur.

**Bağlantı noktaları (her eklenti kullanır, çekirdeğin modülü eklentiyi bilmez):**

- **Stok kancası** (`cekirdek/eklentiler/stok-kancalari.ts`): stok servisi, stoğu sıfırdan (ya da altından) yukarı çıkan birimi artırmada ve elle düzeltmede, stoğu değiştiren işlemin içinde kancalara bildirir. Kanca site bilgisi almaz, uzun iş yapmaz: işi kuyruğa koyar. İşlem geri alınırsa iş de girmez. Eklentinin açıklığına iş çalışırken bakılır.
- **Ürün sayfası yuvası** (`cekirdek/eklentiler/urun-sayfasi-yuvalari.tsx`): stok yazısının altında. Her eklenti sunucuda kendi parçasını verir ya da null döner; tarayıcıdaki parça seçili birimi `useSeciliBirim` ile okur (üst kısım sağlar). Yuva kendi hata sınırındadır. Bir eklenti tükenmiş birim için iş görüyorsa (`tukenmisBirimIster`) tükenmiş değer seçilebilir olur.
- **Panel sayfası:** sayfa ağacındaki sayfa `eklenti` alanını taşıyabilir. Eklenti kapalıysa sayfa menüde yoktur, adresi bulunamadı verir, sekme başlığı adını göstermez.
- **E-posta, arka plan işi, izin, uç ve metin** çekirdeğin var olan kayıtlarına eklenir (`epostaSablonlari`, `kayitliIsler`, `modulIzinleri`, uç belgesi, `tr.json`'da `eklenti.` altı). Bunlar zaten her modülün kullandığı tek yollardır; eklentiye ayrı bir kayıt açılmadı.

**Stoğa gelince haber ver (kullanıcı kararları):**

- Talep satılabilir birime bağlıdır (basit ürünün birimi ya da birleşim). Yalnız sayfası açılan ürünün silinmemiş, satın alınamayan birimine yazılır: stoğu tükenmiş (`stokDurumu`; takibi kapalı birim tükenmez) ya da fiyatı olmayan (ürün sayfasıyla aynı kural, karar 0108). Gönderim için stok satılabilir, fiyat geçerli ve sayfa açık olmalıdır.
- Eklenti yalnız gönderen adresi olan sitede çalışır: adres yoksa e-posta hiç gitmez, talep de alınmaz (bülten bölümüyle aynı kural, karar 0090). Aynı e-posta aynı birime bekleyen talep olarak bir kez yazılır; ikinci istek de başarı alır, adresin kayıtlı olduğu belli olmaz.
- Üye olmayan müşteri de isteyebilir (mağaza sahibinin ayarı, varsayılan evet). Üye olmayanın ucu herkese açıktır, robot korumalı ve sıkı sınırlıdır; robot cevabı veritabanına bakılmadan önce denetlenir. Giriş yapmış müşteri e-posta yazmaz, hesabının adresi kullanılır (müşteri ucu, izin `stok-bildirimi.kendi.iste`). Ayar kapalıysa herkese açık uç `oturum-yok` döner, form giriş bağlantısı gösterir.
- Formda onay kutusu yoktur: e-posta müşterinin isteğiyle bir kez gider, pazarlama değildir. Altında KVKK aydınlatma bağlantısı ve "Bu adresi yalnız bu bildirim için kullanırız." yazar. Hukukçuya kontrol ettirilecek.
- Gönderim parti partidir (50). Her partiden önce birim yeniden okunur: stok yeniden bittiyse ya da ürünün sayfası kapandıysa kalan talepler bekler. Talepler `FOR UPDATE SKIP LOCKED` ile ve "bekliyor" koşuluyla alınır, e-posta ile talebin "gönderildi"si aynı işlemdedir: aynı anda çalışan iki gönderim bir talebi iki kez göndermez. Stok satırı kilitlenmez: parti yazılırken gelen sipariş beklemesin; o partinin e-postaları yine gider.
- Stoğun sıfırdan çıktığı anda gönderilemeyen talepler kaybolmaz: saatlik tarama (`stok-bildirimi-taramasi`) bekleyen talebi olup şu an gönderilebilen birimlere gönderim işi koyar. Bu yolla giden durumlar: eklenti kapalıyken gelen stok, taslaktaki ürüne gelen stok, sonradan girilen fiyat, stokla aynı anda yazılan talep.
- E-posta gidince adres talepten silinir, birim ve tarihler kalır. Kuyruğun girdisinde adres yoktur (yalnız birim). E-posta kayıtları çekirdeğin kuralıyla alıcıyı 365 gün tutar (karar 0050).
- Talep 90 gün saklanır (mağaza sahibinin ayarı, 1–365), sonra bekleyen de gönderilmiş de silinir; günlük iş eklenti kapalıyken de çalışır.
- E-posta ürünün adını, seçimini ("Tişört (Siyah, M)") ve ürün sayfasının seçimli bağlantısını taşır, fiyat yazmaz. Bağlantının seçenek anahtarları ürün sayfasıyla aynı işlevden gelir (`sayfaSecenekleri`).
- Panelin en küçük ekranı "Stok bildirimleri" sayfasıdır (Ürünler grubu, izin `stok.gor`): bekleyen talebi olan her birim bir kart, ürünün adı (vitrin sayfasına), seçim, bekleyen kişi sayısı ve ilk talebin tarihi, en çok bekleyen önce, en çok 200 birim. E-posta adresleri panelde gösterilmez. Yeni rol izni gerekmedi: bekleyen talep stok bilgisidir. Liste motoru henüz yok; liste kartlarla yazıldı.
- Eklenti açıkken tükenmiş beden ya da renk ürün sayfasında seçilebilir (kullanıcı kararı): üstü çizili kalır, adı "tükendi" der, seçilince "Tükendi" ve haber ver kutusu görünür, satın alınamaz. Sonraki seçeneklerde önce satılabilir değer aranır, yoksa birleşimi olan değer seçili kalır. Eklenti kapalıyken karar 0108'deki kural geçerlidir (seçilemez). Tükenmiş değeri gizleyen sitede değer görünmediği için seçilemez.
- Kapatılınca form kalkar, uçlar bulunamadı verir (herkese açık uç önce bunu söyler), panel sayfası kalkar, e-posta gitmez; talepler silinmez. Yeniden açılınca stokta olan birimin talepleri en geç bir saat içinde taramayla gider.
- Panel yalnız silinmemiş ve sayfası açılan ürünlerin birimlerini gösterir: ötekinin bağlantısı bulunamadıya giderdi.

**Taslaktan bilerek ayrılan yerler (Canlı Çarşı taslağıyla iki temada, telefon ve bilgisayarda görüntüyle ve hesaplanan stillerle karşılaştırıldı; kenar, köşe, iç boşluk, zemin ve başlık boyu aynı):**

- E-posta alanının etiketi görünürdür; taslakta yalnız yer tutucu vardır. Sitenin öteki formları gibi etiket alanın üstündedir.
- Alan ve düğme sitenin ortak ölçüsündedir (44 px); taslakta 48 px'lik büyük düğmedir.
- Kutunun altında KVKK bağlantısı ve kullanım cümlesi vardır (kullanıcı kararı).

## Bağımsız kontrolün bulguları

Düzeltilenler (her biri testle ölçüldü, bozulunca kırmızı):

- Stoğun sıfırdan çıktığı anda gönderilemeyen talepler (eklenti kapalı, ürün taslakta) bir daha denenmiyordu, form da çıkmıyordu: saatlik tarama eklendi.
- Fiyatı olmayan birim stoğa girince e-posta gidiyordu, sayfada ise satın alınamıyordu: talep ve gönderim kuralı fiyatı da sınar.
- Gönderen adresi olmayan sitede talep alınıp adres siliniyor, e-posta hiç gitmiyordu: böyle sitede eklenti çalışmaz.
- Herkese açık uç, eklenti kapalı ve üye olmayana kapalıyken bulunamadı yerine oturum-yok veriyordu: önce eklentinin açıklığı sorulur.
- Panel, sayfası açılmayan ürünlerin taleplerini de sayıyordu: süzülür.
- Kendi bozma denememizde bulunan: silinmiş birleşime talep yazılabiliyordu (birim satırının silinmesine bakılmıyordu).

Bilerek bırakılan: talep yazılırken aynı anda stok girerse kanca talebi görmeyebilir (kilit yok); talep en geç bir saat sonra taramayla gider.

## Neden

- Eklentinin kodunu çekirdekte tutmak, eklentiyi siteye özel kod yapmadan (değişmez kural 1) bütün sitelere aynı sürümle sunar; açıp kapamak site ayarıdır.
- Bağlantı noktalarını eklentiden bağımsız kurmak, stok, ürün sayfası ve panel modüllerinin eklentiyi tanımamasını sağlar; ikinci eklenti yalnız listelere bir satır ekler.
- Kanca site bilgisi almadığı için stok servisi değişmeden kalır; açıklık iş çalışırken, sitenin kendi sürecinde sorulur.
- Partiyle ve talep satırlarının kilidiyle gönderim, stok biterken e-postanın gitmeye devam etmesini sınırlar ve iki gönderimin aynı talebi almasını önler.

## Düşünülen diğer yollar

- **Eklentinin kodunu sitenin klasörüne koymak:** Seçilmedi. Aynı eklenti birçok sitede çalışır; çekirdek sürümüyle güncellenmesi gerekir.
- **Stok servisine eklentiye özel çağrı yazmak:** Seçilmedi. Her eklenti stok servisini değiştirirdi.
- **Kancada eklentinin açıklığını sormak:** Seçilmedi. Stok servisi siteyi bilmez; bilgiyi oraya taşımak bütün çağıranları değiştirirdi. Kapalı eklentide iş boşa bir kez çalışır.
- **Gönderimde stok satırını kilitlemek:** Seçilmedi. Gönderim sürerken siparişler beklerdi.
- **Talebi ürün düzeyinde almak:** Seçilmedi. Müşteri belirli bir bedeni bekler; ürünün başka bedeni gelince e-posta yanlış olurdu.
- **Tükenmiş değeri seçilemez bırakmak (karar 0108'deki gibi):** Kullanıcı seçmedi. Bedenli ürünlerde müşteri tükenen bedeni seçip haber isteyemezdi.

## Sonuçları

- Çekirdek 0.67.0 oldu. Veritabanı değişikliği 0036 (talep tablosu).
- Eklenti açık sitede ürün sayfasının tükenmiş değer davranışı değişir; tarayıcı testlerinin sitesi (Örnek Mağaza) eklentiyi açtığı için ürün sayfası testi bu davranışı ölçer, kapalı davranış birim testlerindedir.
- Eklenti kapalıyken stoğu sıfırdan çıkan ve bekleyen talebi olan birime yine bir iş girer, çalışınca bir şey göndermez. Tarama eklenti açık sitede saatte bir bekleyen talepli birimleri okur (talep tablosu ve üç kısa sorgu).
- Arka plan süreci dosyaları Node ile doğrudan çalıştırdığı için eklentinin gönderim işinin ulaştığı vitrin dosyaları (`secenekler.ts`, `secim.ts`, `urun-listesi/adres.ts`) içe aktarmalarını uzantıyla yazar.
- Kural: `.claude/rules/eklentiler.md`.
