---
paths:
  - "cekirdek/yonetim-paneli/**"
  - "cekirdek/uygulama/app/yonetim/**"
  - "sahip-paneli/**"
---

# Yönetim paneli düzeni

- Her panel sayfasını aynı iskeletle kur: üstte komut çubuğu, altında içerik.
- Liste, tablo, pano ve rapor ekranlarını tam genişlikte aç.
- Form, ayar ve detay pencerelerini küçük, orta ya da geniş standart genişliklerden birinde aç.
- Komut çubuğuna "Yeni ürün", "Dışa aktar", "Ayarlar" gibi eylemleri koy. Arama ve filtre altındaki şeritte durur.
- Komut çubuğunda dolu renkli tek düğme olsun, o da sayfanın asıl eylemi.
- Aynı eylem her sayfada aynı ikon, aynı ad ve aynı yerde dursun. Eylem tanımlarını tek dosyadan oku.
- Yan menüyü, sayfa yolunu ve sayfa başlıklarını tek sayfa ağacından üret.
- Ayar ve rapor alt sayfalarında ana sayfanın komut çubuğunu kullan, yalnız seçili öğe değişsin.
- Kullanıcının yetkisi olmayan düğme, menü ya da bağlantıyı hiç gösterme. Yetki bilgisini sunucudan oku, ikinci bir liste yazma.
- Panelin ana ekranında günün satışını, bekleyen siparişleri ve uyarıları tek bakışta göster.
- Her ayar penceresinin başına ne işe yaradığını söyleyen bir iki cümlelik açıklama koy.
- Bir düğmeyi yalnız fare üzerine gelince görünür yapma.

## Panelin kapısı (karar 0042)

- Girişsiz panel adresi `cekirdek/uygulama/proxy.ts` ile giriş sayfasına yönlenir, `(panel)` düzeni anahtarı değiştirmeden ikinci kez sorar. Yeni panel sayfası `app/yonetim/(panel)/` altına yazılır; yalnız giriş sayfası dışarıda durur.
- Sayfa çizerken `istektenOturumAl` çağrılmaz; oturum anahtarı değiştirmeden okunur: `oturumAcikMi`, yöneticinin kendisi gerekiyorsa `panelOturumu` (`oturumunHesabi`, kart 0141). Bu ve yukarıdaki yer kuralını `cekirdek/kapi/testler/panel-katmanlari.test.ts` denetler (adres dosyaları ve `cekirdek/yonetim-paneli/`).
- Girişten sonraki dönüş adresi yalnız `guvenliDonus` ile kullanılır (`cekirdek/yonetim-paneli/adresler.ts`).

## Çerçeve ve sayfa ağacı (karar 0111)

- Panelin sayfaları `cekirdek/yonetim-paneli/sayfa-agaci.ts` dosyasındadır. Yeni ekran önce ağaca yazılır, sonra `app/yonetim/(panel)/` altına; sayfa `<PanelSayfasi kod="...">` ile çizilir. Ağaç ile sayfa dosyalarının aynı olmasını `cekirdek/yonetim-paneli/testler/sayfa-agaci.test.ts` denetler.
- Menüdeki ve sayfadaki izin ağaçtaki `izin` alanından okunur, yöneticinin izinleri `panelOturumu` ile istek başına bir kez gelir. İzni olmayan sayfa bulunamadı verir (`panelSayfasiniAc`).
- Komut çubuğunun eylemleri `EylemDugmesi` ve `EylemBaglantisi` ile, kodu `cekirdek/yonetim-paneli/eylemler.ts` kaydında yazılır. Asıl eylem `asil` alır.
- Panelin ikonları (menü sayfası, eylem, boş hâl) `PanelIkon` ve `panelIkonu` ile çizilir (`panel-ikon.tsx`, karar 0172): yalnız panelin kullandığı ikon panelin sözlüğüne yazılır, vitrinin koduna gitmez.
- Elle sıralanan küçük listeler `SiralanabilirListe` ile, metinleri `siralamaMetinleri` ile yazılır.
- Eklentinin getirdiği sayfa ağaçta `eklenti` alanını taşır (karar 0117): eklenti sitede kapalıysa menüde yoktur, `panelSayfasiniAc` bulunamadı verir.

## Vitrin bölümleri ekranı (karar 0115)

- Panel ekranı kapıya yalnız `panelIstegi` ile gider (`cekirdek/yonetim-paneli/panel-istegi.ts`); sonucu bildirimle verir (`bildirimGoster`). Bildirim alanı çerçevededir, ekran ikinci bir alan açmaz.
- Sayfa izni `panelSayfasiniAc` ile veriden önce denetlenir; veri sunucuda servisle okunur, değişiklik uçlardan gider, sonra `router.refresh()`.
- Bölümün formu `BolumDuzenleyici` ile (`vitrin-bolumleri/bolum-duzenleyici.tsx`): görünüm, tariften çıkan alanlar (`BolumFormu`), "Kaydet ve yayınla"; formun hatası formun içindedir, bildirim verilmez. Görsel alanı `GorselSecimi` ile, önizlemesi `panel-gorseli` ucundandır.
- Geri dönüş ekranın gördüğü sürümün sırasını gönderir (`son`); "Geri al" kendi işleminin yazdığı sürümün sırasını. Son sürüme göre koşulsuz geri dönüş yazma.
- Menüdeki sayfanın adının yanındaki işaret ağaçtaki `isaret` alanıdır ("Kısayol").
- Menüdeki sayı (bakılması gereken kayıt, kart 0277, karar 0174) ağaçtaki `sayac` alanıdır; değeri ve ekran okuyucu yazısı `cekirdek/yonetim-paneli/menu-sayaclari.ts`'tedir. Düzen yalnız menüde görünen sayfaların sayısını okur, okunamayan sayı menüyü düşürmez. Yeni sayı aynı kayda eklenir; ekran menüyü kendisi yazmaz.

## Menüler ekranı ve ortak parçalar (karar 0116)

- Değiştiren işlem `usePanelIslemi` ile yapılır (`cekirdek/yonetim-paneli/panel-islemi.ts`): uca gönderir, sayfayı yeniler, bildirir; formun hatası formda kalır. Ekran kendi işlem kalıbını yazmaz.
- Sunucunun verisinden kurulan form `useSunucuFormu` ile tutulur (`cekirdek/yonetim-paneli/sunucu-formu.ts`, kart 0223): başarıda `kaydedildi(gonderilen)` çağrılır, "Vazgeç" `vazgec`'tir. Kaydın yankısı olan yenileme formu ezmez; farklı veri yalnız kaydedilmemiş değişiklik yoksa forma geçer. Ekran sunucunun verisi değişince formu `useEffect` ile baştan kurmaz.
- Kategori, marka ve ürün yalnız `KayitArama` ile, arayarak seçilir (`cekirdek/yonetim-paneli/kayit-arama.tsx`, uç `kayit-ara`). Başka bir kaynakta arama aynı kutuyu kendi `ara` işleviyle kullanır (elle siparişin ürün ve müşterisi, kart 0236); seçilemeyen öneri `secilemez` ile işaretlenir. Çevreleyen pencere öneri listesi açıkken Escape'i yok sayar (`kayitAramaAcikMi`).
- Pencerede kaydedilmemiş değişiklik sorusu `useKapatmaSorusu` iledir (`cekirdek/yonetim-paneli/kapatma-sorusu.tsx`); ekran kendi kopyasını yazmaz.
- Geri dönüşsüz eylem (silme) `OnayPenceresi` ile sorulur. Açılır menüden açılan pencere menü kapandıktan sonra açılır (`onCloseAutoFocus`): aynı anda açılınca menü sonra yeniden açılmıyordu.
- Menü öğesinin taşınması yalnız derinlik sınırını aşmayan yerleri sunar; kural menü kaydındadır (`menuSinirlari.derinlik`), ekran onu yeniden yazmaz, servis yine denetler.

## Tema ekranı (karar 0129)

- Ekran `cekirdek/yonetim-paneli/tema/` klasöründedir; verisi `temaEkraniVerisi` ile sunucuda kurulur. Her temaya geçerken gönderilecek ayarlar orada `yeniTemaninAyarlari` ile hazırlanır; tarayıcı tema tanımını taşımaz.
- "Demoyu gez" bağlantısı yalnız `temaDemosuBaglantisi` ile kurulur (`cekirdek/ayar-semasi/tema-demosu-adresi.ts`). Adres kutuya `TEMA_DEMOSU_ADRESI` ile gelir; değeri komutlar demo sitesinin kimliğinden üretir (`komutlar/tema-demosu-adresi.mts`). Siteye özel temanın bağlantısı yoktur.
- Tema değişikliği düzenin yolunu pencerede sorar; varsayılan seçim yoktur. Geri dönüş ekranın gördüğü sürümü gönderir (`son`).
- Tema ayarları Tema'nın alt sayfasıdır (`tema/ayarlar-ekrani.tsx`, kart 0260, karar 0168): Logo, Renkler, Yazı tipi, Köşeler ve düğmeler, Görünüm (vitrinde koyu tema, filtrenin yeri). Verisi `temaAyarlariVerisi` (`tema/ayarlar-verisi.ts`), formun başlangıcı ve tema ucunun girdisi `temaAyarlariFormu` ve `temaAyarlariGirdisi` ile (`tema/ayarlar-formu.ts`); alanlar temanın açtıklarından çıkar, ekran tema tanımını taşımaz. Dokunulmayan seçim ve temanın kendi rengi yazılmaz. Panelde önizleme yoktur (karar 0080): seçenek kartlarında örnek ve demo bağlantısı vardır. Okunmayan renk kayıtta reddedilir, sunucunun önerisi (`oneri`) alanın altında "Bu tonu kullan" ile seçilir; alana bağlanan kodların metni `temaAyariAlanHatasi`'ndadır. Kayıt ekranın gördüğü sürümü (`son`) gönderir, arada yazılan sürümde çakışır; kaydedilmemiş form yeni veriyle üç yönlü birleşir (`ucYonluBirlestir`). Kayıtlı tema kullanılamıyorsa ekran yalnız gösterir. Tema ile tema ayarları komut çubuğunda birbirine bağlıdır (`tema-ayarlari`, `tema-degistir` eylemleri).
- Logo tema ayarlarının "Logo" bölümündedir (`tema/logo-bolumu.tsx`, kart 0094, karar 0165): önizleme logo ucunun özetli adresinden, yükleme `DosyaYukleme` ile `logo-yukle` ucuna, kaldırma onayla `logo-kaldir` ucuna. Logo mağaza ayarıdır: `magaza-ayarlari.degistir` ister, "Mağaza sahibi temayı değiştirebilir" ayarına bağlı değildir. Dosyanın reddi alanın altında yazar, odak yükleme düğmesine gider.

## Kargo ekranı (karar 0135)

- Ekran `cekirdek/yonetim-paneli/kargo/` klasöründe, menüde "Satış" altındadır. Ayarlar mağaza ayarlarıdır: görmek `magaza-ayarlari.gor`, değiştirmek `magaza-ayarlari.degistir` ister.
- Tutar sitenin para biçimiyle yazılı gider, sunucuda `kargoAyarlariniDegistir` (`cekirdek/moduller/kargo/servis.ts`) biçimleyicinin `paraOku`'suyla okur. Ekran tutarı kendisi çevirmez; alanın hatası koduyla döner. Uç şemasının kendi kodu (boş zorunlu alan) ortak eşlemeden (`kodluAlanHatalari`) alana bağlanır (kart 0284); kendi kod eşlemesini yazan ekran şemanın kodunu da karşılar.

## Siparişler (karar 0146)

- Ekranlar `cekirdek/yonetim-paneli/siparisler/` klasöründe, menüde "Satış" altındadır: Siparişler, Sipariş ayrıntısı (alt sayfa, `?numara=`), Sipariş ayarları. Görmek `siparis.gor`, işlemler `siparis.yonet`, havale onayı `siparis.havale-onayla` (görevlide yok); sipariş ayarları mağaza ayarıdır.
- Hangi işlemin görüneceği sunucuda siparişin durumu, ödeme yöntemi ve yöneticinin izniyle bulunur (`siparisAyrintisiVerisi`); ekran işlemi yeniden süzmez. İşlem ekranın gördüğü durumu gönderir.
- Durumun rozeti ve metni kayıttan okunur (`siparisDurumTanimlari`, `durumMetni`); durum adını ekranda elle yazma.
- Siparişler listesi liste motorundadır (karar 0158, `liste-tanimi.ts`): durum sekmesi, tarih, ödeme yöntemi ve kargo firması süzgeçleri (karar 0169), sıralama ve sayfa adrestedir; arama aranan metni adrese yazmaz, liste ucuna gider. Toplu işlem "Hazırlamaya al" (`siparisler-toplu`), her sipariş `islemYap` ile. "Bakılması gereken" sekmesi (`bakilacak`) bildirilmiş havaleyi, bekleyen iade talebini, sonucu beklenen iadeyi, onaylanmış ve iadesi yapılmamış talebi ve başarısız iadeyi toplar; satırın işaretleri aynı koşullardır (servis `liste`). Kargo firması seçenekleri siparişlerdeki adlardır (`kargoFirmalari`), sayfa `siparisListesiSecenekleri` ile verir.
- Elle sipariş (karar 0148) Siparişler'in alt sayfasıdır (`elle-siparis.tsx`, verisi `elle-veri.ts`): ürün ve müşteri `KayitArama`'nın kendi aramasıyla, adres alanları vitrinin ödeme adımınınkilerle (`cekirdek/vitrin/odeme/alanlar.tsx`), özet elle sipariş hesabı ucundan (`sepetGorunumu`). Hatalar ve odak ortak form yapısındadır (karar 0159); özet sol sütunun başındadır (`FormunHataOzeti`).
- Müşterinin iade talebi (karar 0151) ayrıntının en üstünde `IadeTalebiKutusu`'dur (`iade-talebi-kutusu.tsx`): onay onay penceresiyle, ret yan pencerede zorunlu açıklamayla, yalnız `siparis.iade` izni olana. Onaylı ve iadesi yapılmamış talep varken iade penceresi talebin ürünleri ve nedeniyle seçili açılır, iade talebe bağlanır. Bekleyen talebi olan sipariş listede işaretlidir ve "Bakılması gereken" sekmesindedir (`?durum=bakilacak`; eski `?durum=iade-talebi` adresi de onu açar, kart 0267). Sipariş ayarlarının "İptal ve iade" bölümü `iptal-ve-iade-ayarlari.tsx`'tir.
- Sipariş ayarlarının "Yönetici bildirimleri" bölümü (karar 0154) `yonetici-bildirimleri-ayarlari.tsx`'tir: adresler tek alanda virgülle yazılır, sunucuda ayrılıp doğrulanır (hata alanın koduyla); her bildirim `Anahtar` ile. Ekranda yalnız sitede görünen bildirimler durur (`gorunenBildirimler`). Siparişin ayrıntı adresi tek yerdedir (`siparisAyrintisiAdresi`, `cekirdek/yonetim-paneli/adresler.ts`); e-posta da onu kullanır.
- Fatura (karar 0170) ayrıntının sol sütunundaki karttır, düğmeleri ve yan penceresi `FaturaIslemleri`'dir (`fatura.tsx`): numara ve tarih zorunlu, PDF isteğe bağlı ve seçilince `fatura-yukle` ucuyla hemen yüklenir (`useDosyaYuklemesi(belgeSinirlari.enCokBayt)`, hata metni `dosyaHatasiMetni(…, "belge")`), "Faturanız hazır" kutusu eklemede işaretli, düzenlemede işaretsiz, e-posta gidemezken yok (`faturaEpostasiGidebilir`). Pencere açıldığında gördüğü faturayı gönderir (çakışmadan sonra da); kaldırma onay penceresiyledir. Ekler, değiştirir ve kaldırır `siparis.yonet`; indirme bağlantısı `siparis.gor` ucundandır, adı görünen yazısıdır.
- Sipariş fişi (karar 0171) Siparişler'in alt sayfasıdır (`fis.tsx`, verisi `fis-verisi.ts`, `?numara=A,B`): ayrıntının ve listenin toplu çubuğunun "Fiş yazdır"ı (`siparisFisiAdresi`) yeni sekmede açar ve yazdırma penceresini getirir. Fiş her zaman açık renktedir (`data-renk="acik"`), A4'tür (`fis-sayfasi`, `@page fis`), her fiş yeni sayfadan başlar, satır bölünmez. Kalemler, tutarlar ve fatura bilgisi ayrıntıdakiyle aynı işlevlerden yazılır. Fiyatlar `fisteFiyatlar` ayarıyla (Sipariş ayarlarının "Sipariş fişi" bölümü, `fis-ayarlari.tsx`); iç notlar fişe girmez; kişisel bilgisi silinmiş siparişin fişi yoktur (toplu fişte atlanır ve söylenir; adresteki numaralar `fisNumaralariniOku` ile). Yazdırma penceresi sayfanın görselleri ve yazı tipleri yüklenince açılır (`fis-yazdirma.tsx`); yazdırırken fişin dışında zemin yoktur (`tailwind.css`).
- Yazdırılacak panel sayfası çerçeveyi kendisi gizlemez: yazdırırken yan menü, üst çubuk ve komut çubuğu `print:hidden`'dır (panel-cercevesi, panel-sayfasi).
- İptal ve iade (karar 0147) yan penceredir (`iade-penceresi.tsx`), yalnız `siparis.iade` izni olana ve durumu izin veren siparişte görünür; tutar ve vergi önizlemesi sunucunun `iadeyiHesapla`'sıyla ve sitenin biçim ayarlarıyla (`siteninBicimAyarlari`) çizilir, gönderilen yalnız seçimdir.

## Mağaza bilgileri (karar 0175)

- Ekran `cekirdek/yonetim-paneli/magaza-bilgileri/` klasöründe, menüde "Satış" altındadır (ayrı "Ayarlar" grubu kart 0301). Mağaza ayarıdır: görmek `magaza-ayarlari.gor`, değiştirmek `magaza-ayarlari.degistir`.
- Alanlar yazı olarak `magaza-bilgileri` ucuna gider; kurallar ayar şemasındadır, servis `magazaBilgileriniDegistir` (`cekirdek/moduller/magaza-ayarlari/bilgiler.ts`) uygular ve hatayı alanın yolu ve şemanın koduyla döndürür. Ekran kural yazmaz; kodların metni ekrandadır (`kodMetinleri`). Sosyal hesabın hata yolu gönderilen sıradır, ekran onu alanına çevirir.
- Adres alanları ödeme adımının parçalarıdır (`AdresAlanlari`, ülkeler `bolgeUlkeleri` ile sitenin satış ülkelerinden). İzni olmayan yönetici için alanlar kapalı bir fieldset içindedir.

## Müşteriler (karar 0173)

- Ekranlar `cekirdek/yonetim-paneli/musteriler/` klasöründe, menüde "Satış" altındadır: Müşteriler (liste motoruyla, `liste-tanimi.ts`) ve Müşteri ayrıntısı (alt sayfa, `?kimlik=`). Görmek `musteri.gor`, not `musteri.not`, şifre sıfırlama bağlantısı `musteri.sifre-sifirlama` ister; görevlide yok.
- Servis `musteriYonetimi` (`cekirdek/moduller/musteri/yonetim.ts`): yalnız üyeler; ad, sipariş sayısı, toplam (iptal ve tamamlanan iade düşülerek) ve kampanya izni tek sorguda. Panelin şemaları `panel-semalari.ts`'tedir, vitrinin müşteri şemalarına yazılmaz.
- Notlar `MusteriNotlari` ile (`notlar.tsx`): ekleme ortak form yapısıyla, silme onay penceresiyle; not düzenlenmez, müşteriye gitmez, değişiklik kaydına metni girmez. Şifre sıfırlama `sifreSifirlamaIste` ile gider, sonucu söylenir (sınır doluysa).
- Ayrıntı ekranlarının bölüm, satır ve bilgi parçaları `ayrinti-parcalari.tsx`'tedir (sipariş ve müşteri ayrıntısı). Sipariş ayrıntısında üye müşterinin adı, izni olana müşteri ayrıntısına bağlantıdır (`musteri.ayrintiAdresi`).

## Ödeme yöntemleri ve banka hesapları (karar 0141)

- Ekranlar `cekirdek/yonetim-paneli/odeme-yontemleri/` klasöründe, menüde "Satış" altındadır. Görmek `odeme-yontemi.gor` (görevli de), değiştirmek `odeme-yontemi.degistir` (yalnız mağaza sahibi) ister; izni olmayan yönetici yalnız okur, anahtar ve düğmeler kapalıdır ya da yoktur.
- Ödeme yöntemlerinin anahtarları, kapıda seçenekleri ve iptal süresi tek formdur, birlikte "Kaydet" ile kaydedilir. Yöntemlerin sırası taşınır taşınmaz kendi ucuyla (`odeme-yontemleri-sirala`) kaydedilir ve formun kaydedilmemiş değişikliğini götürmez (karar 0144). Banka hesabı yan pencerede eklenir ve düzenlenir, onay penceresiyle silinir, sıralama hemen kaydedilir. IBAN'ın hatası alanın koduyla döner, ekran doğrulamaz.
- Açma-kapama yalnız `Anahtar` parçasıyladır (`bilesenler/parcalar/anahtar.tsx`); durumun yazısı yanında görünür.

## Ortak form yapısı (karar 0159)

- Panelin veri formu `usePanelFormu` ve `PanelFormu` ile yazılır (`cekirdek/yonetim-paneli/form/panel-formu.tsx`); alan `PanelAlani` ya da (radyo grubu, kayıt arama, tablo) `AlanKabi` ile. Elle `<Form>` panelde taramayla yakalanır (`panel-formu.test.tsx`; giriş, kod formu ve liste araması dışında).
- Sunucunun ve tarayıcının hataları yalnız `hatalariGoster(alanlar, genel)` ile gösterilir: alan hatası alanın altında, tek hatada odak alana, birden çok hatada ya da alanı olmayan hatada özete. Ekran odağı kendisi taşımaz, alan sırası tutmaz; hatanın yolunda alan yoksa en yakın üst alan bulunur. Tek girişi olmayan alanın odaklanacak öğesi `data-hata-odagi` ile işaretlenir.
- Gönderim `isle` ile yapılır: sürerken ikinci gönderim yok sayılır, `KaydetCubugu` kapalıdır. Sayfadaki ayar formunda çubuk durum yazısıyla ve değişiklik yokken kapalı düğmelerle çizilir (`durumYazisi`, `degisiklikGerekli`).
- Kaydedilmemiş değişiklikle çıkarken çerçevedeki `CikisKorumasi` sorar (`cikis-korumasi.tsx`): form `usePanelFormu`'na `degisti` ve varsa `kaydet` verir ("Kaydet ve çık"). Ekran `beforeunload` dinleyicisini kendisi yazmaz. Pencere kapatılırken soru `useKapatmaSorusu`'ndadır.
- Zorunlu alan `zorunlu` ile işaretlenir: etiketin yanında yıldız, alan `aria-required`; `zorunlu={false}` "(isteğe bağlı)" yazar.

## Kategoriler, markalar ve etiketler, özellikler (karar 0160)

- Ekranlar `cekirdek/yonetim-paneli/kategoriler/`, `markalar/` ve `ozellikler/` klasörlerinde, menüde "Ürünler" altındadır. Görmek `kategori.gor`, `marka.gor` (etiket listesi ayrıca `etiket.gor`), `ozellik.gor`; değiştirmek `*.degistir`, silmek `*.sil` ister (görevli silemez).
- Kategoriyi başka bir kategorinin altına almak satırın "Diğer işlemler" menüsünden ya da formdaki "Üst kategori"den yapılır (menüler ekranının yolu); kendisi ve alt ağacı sunulmaz. Sıralama kardeşlerin tamamını tek uçla gönderir; eski sıra `cakisma` alır.
- Kodlu hata döndüren modülün formu `useKodluForm` ile yazılır (`cekirdek/yonetim-paneli/kodlu-form.ts`): alan hatası alanın altında, alanı olmayan hata özette modülün metniyle. Açılır menüden pencere açmak `useMenudenPencere` iledir (`menuden-pencere.ts`).
- Özelliğin formu tek kayıtla gider (`ozellik-kaydet`); değeri olan özelliğin türü seçilemez, değeri olan seçenek çıkarılınca kayıttan önce sorulur. Var olan seçeneği çıkarmak `ozellik.sil` ister (uç denetler, ekran düğmeyi göstermez).
- Birden çok kategori ya da özellik satırını güncelleyen yazma (sıralama, silme) önce ürün kilidini alır (`urun/kilit.ts`). Görseli görme izni olmayana görsel alanı ve listesi gösterilmez. Silme onayı etkilenen ürün sayısını sunucunun sayımından söyler.
- Satırın küçük görseli `KatalogGorseli` ile, önizlemesi `panel-gorseli` ucundandır; o uç `dosya.gor` ister (sitedeki görselleri görmek, görevlide de vardır).

## Yorumlar (karar 0174)

- Ekran `cekirdek/yonetim-paneli/yorumlar/` klasöründe, menüde "Ürünler" altındadır; servisi `cekirdek/moduller/yorum/panel-listesi.ts`. Görmek `yorum.gor`, karar ve ana sayfa işareti `yorum.onayla` (görevlide de); ürün adı yalnız `urun.gor` izni olana ürün ekranına bağlantıdır.
- Liste Onay bekleyen sekmesiyle açılır (varsayılan sekme), her genişlikte karttır. Kart eylemleri `yorum-karari` ve `yorum-ana-sayfa` uçlarına, toplu işlem `yorumlar-toplu`'ya gider. Karar ekranın gördüğü durumu (`gorulen`) gönderir; arada değişen yorum çakışır (`yorum-degisti`). Toplu işlemler sekmeye göredir (`yorumTopluIslemleri`'nin `sekmeler`'i). Eylemden sonra odak kartta, sonraki ya da önceki kartta, liste boşalınca seçili sekmede kalır; odak yenilenen liste gelince yerleşir.
- Silinmiş ürünün yorumu listede, sayılarda ve menüdeki sayıda yoktur. Yönetici e-postasının "Yorumlara git" düğmesi `yorumlarAdresi`'ne gider.

## Ürünler listesi (karar 0161)

- Ekran `cekirdek/yonetim-paneli/urunler/` klasöründe, menüde "Ürünler" grubunun başındadır; servisi `cekirdek/moduller/urun/panel-listesi.ts`. Görmek `urun.gor`; yayınla, taslağa al, arşive al `urun.degistir`, sil `urun.sil` ister (`urunTopluIslemleri`, `cekirdek/kayitlar/urun.ts`).
- Satırın fiyatı yalnız `fiyatAraliklari`, stok durumu yalnız `urunPanelStokDurumu` ile bulunur; stok süzgeci `urunPanelStokKosulu` ile, iki kural aynı sonucu verir (test). Ad sıralaması sitenin dilinin harf sırasıyladır, dil koda yazılmaz.
- Listenin asıl eylemi "Ürün ekle"dir (`urun-ekle`), satırdaki ad ürün ekranına gider (kart 0263).

## Ürün ekranı (karar 0162)

- Ekran `cekirdek/yonetim-paneli/urunler/urun-ekrani.tsx`, verisi `urun-verisi.ts`. Yeni ürün (`yeniUrunAdresi`) ve ürün (`urunEkraniAdresi`, `?kimlik=`) Ürünler'in alt sayfalarıdır. Tek sayfa, tek form: bölüm eklenecekse (varyant, fiyat, stok, galeri) aynı forma ve "Bu sayfada" listesine (`bolumler`) eklenir.
- Uçlar `urun-ekle`, `urun-degistir`, `urun-sil` (`cekirdek/kapi/yonetici/urun.ts`). Ağırlık ve sayı türündeki özellik değeri metin gider, sunucuda `panelGirdisiniCevir` okur (`cekirdek/moduller/urun/panel-girdisi.ts`); ekran sayı çevirmez.
- Birden çok kayıt seçimi `CokluKayitSecimi` iledir (`cekirdek/yonetim-paneli/coklu-kayit-secimi.tsx`): kategori, etiket, ilgili ürünler. Tek kayıt (marka) `KayitArama`'dır.
- Biçimli metin `BicimliMetinAlani` ile yazılır; bağlantı kuralı `aciklamaBaglantisiGecerliMi`'dir (`cekirdek/moduller/urun/aciklama-baglantisi.ts`), temizlik de onu kullanır.
- Seçenekler bölümü (kart 0264, karar 0163) `urunler/secenekler-bolumu.tsx`, kuralları `urunler/varyant-formu.ts`: formun `varyant` alanı seçenekleri ve birleşim alanlarını taşır, birleşim satırları `birlesimSatirlari` ile kurulur (yeni seçenekle dönen birimin alanları dahil), girdi `varyantGirdisi` ile yalnız bölüm değişince gider. Birleşimin ağırlığı metin gider, sunucuda `panelVaryantiniCevir` okur. Görünen etiketi olmayan alan (tablo hücresi, değer) adını `aria-label`'dan, hatasını altından alır.
- Fiyat ve stok bölümleri (kart 0265, karar 0164) `urunler/fiyat-stok-bolumleri.tsx`, girdisi `urunler/fiyat-stok-formu.ts` (`fiyatStokGirdisi`, yalnız değişen birim), verisi `fiyat-stok-verisi.ts`; sunucuda `panelFiyatStokYaz` ürünle aynı işlemde, en son yazar. Fiyat `fiyat.degistir`, stok `stok.duzelt` ister; izni olmayanın alanı kapalıdır. Birleşimlerin fiyatı ve stoğu seçenekler tablosunda, stok değişikliğinin sebebi tablonun altında tektir. Basit ürünün stoğu "Stoğu düzelt" penceresiyle hemen kaydedilir (`urun-stok-duzelt`). Sayfanın formunun içinden açılan pencerenin formu da `PanelFormu`'dur: gönderimi dıştaki forma taşmaz. Kayıtlı birimin satırı birim kimliğini taşır. Ürün ekranının formu sayfa yenilenince üç yönlü birleşir (`useSunucuFormu(veri, urunFormunuUzlastir)`): yalnız değişen alanı gönderen form dokunulmamış alanın eski değerini göndermez.
- Galeri bölümü (kart 0266, karar 0167) `urunler/galeri-bolumu.tsx`, kuralları `urunler/galeri-formu.ts`: görsel seçilince `urun-gorseli-yukle` ucuyla hemen yüklenir, formda dosyasıyla durur; galeriye bağlanması, sırası, alternatif metni, silme ve video bağlantısı `galeriGirdisi` ile ürünün "Kaydet"inde gider, sunucuda `panelGaleriYaz` (`cekirdek/moduller/urun/panel-galeri.ts`) ürünle aynı işlemde yazar. Ekran gördüğü kayıtlı öğeleri gönderir, arada değişen galeri `galeri-degisti` alır. Öğenin hatası `galeri.ogeler.<sıra>` yoluyla satırın Düzenle düğmesine bağlanır (`satirVerisi`). Küçük görsel reddedilmez, uyarılır (`galeriOnerilenEnAz`). Birleşime yalnız kayıtlı görsel seçilir. Sayfa yenilenince kayıtla bağlanmış yeni öğeler dosyasıyla eşlenir (`galeriyiEsle`, `urunFormunuUzlastir` içinde); yükleme sürerken çıkışta sorulur (`yuklemeSuruyor`), bölüm kalkınca yükleme iptal edilir. İzni olmayana sıralama düğmeleri gösterilmez.

