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
- Elle sıralanan küçük listeler `SiralanabilirListe` ile, metinleri `siralamaMetinleri` ile yazılır.
- Eklentinin getirdiği sayfa ağaçta `eklenti` alanını taşır (karar 0117): eklenti sitede kapalıysa menüde yoktur, `panelSayfasiniAc` bulunamadı verir.

## Vitrin bölümleri ekranı (karar 0115)

- Panel ekranı kapıya yalnız `panelIstegi` ile gider (`cekirdek/yonetim-paneli/panel-istegi.ts`); sonucu bildirimle verir (`bildirimGoster`). Bildirim alanı çerçevededir, ekran ikinci bir alan açmaz.
- Sayfa izni `panelSayfasiniAc` ile veriden önce denetlenir; veri sunucuda servisle okunur, değişiklik uçlardan gider, sonra `router.refresh()`.
- Bölümün formu `BolumDuzenleyici` ile (`vitrin-bolumleri/bolum-duzenleyici.tsx`): görünüm, tariften çıkan alanlar (`BolumFormu`), "Kaydet ve yayınla"; formun hatası formun içindedir, bildirim verilmez. Görsel alanı `GorselSecimi` ile, önizlemesi `panel-gorseli` ucundandır.
- Geri dönüş ekranın gördüğü sürümün sırasını gönderir (`son`); "Geri al" kendi işleminin yazdığı sürümün sırasını. Son sürüme göre koşulsuz geri dönüş yazma.
- Menüdeki sayfanın adının yanındaki işaret ağaçtaki `isaret` alanıdır ("Kısayol").

## Menüler ekranı ve ortak parçalar (karar 0116)

- Değiştiren işlem `usePanelIslemi` ile yapılır (`cekirdek/yonetim-paneli/panel-islemi.ts`): uca gönderir, sayfayı yeniler, bildirir; formun hatası formda kalır. Ekran kendi işlem kalıbını yazmaz.
- Sunucunun verisinden kurulan form `useSunucuFormu` ile tutulur (`cekirdek/yonetim-paneli/sunucu-formu.ts`, kart 0223): başarıda `kaydedildi(gonderilen)` çağrılır, "Vazgeç" `vazgec`'tir. Kaydın yankısı olan yenileme formu ezmez; farklı veri yalnız kaydedilmemiş değişiklik yoksa forma geçer. Ekran sunucunun verisi değişince formu `useEffect` ile baştan kurmaz.
- Kategori, marka ve ürün yalnız `KayitArama` ile, arayarak seçilir (`cekirdek/yonetim-paneli/kayit-arama.tsx`, uç `kayit-ara`). Çevreleyen pencere öneri listesi açıkken Escape'i yok sayar (`kayitAramaAcikMi`).
- Pencerede kaydedilmemiş değişiklik sorusu `useKapatmaSorusu` iledir (`cekirdek/yonetim-paneli/kapatma-sorusu.tsx`); ekran kendi kopyasını yazmaz.
- Geri dönüşsüz eylem (silme) `OnayPenceresi` ile sorulur. Açılır menüden açılan pencere menü kapandıktan sonra açılır (`onCloseAutoFocus`): aynı anda açılınca menü sonra yeniden açılmıyordu.
- Menü öğesinin taşınması yalnız derinlik sınırını aşmayan yerleri sunar; kural menü kaydındadır (`menuSinirlari.derinlik`), ekran onu yeniden yazmaz, servis yine denetler.

## Tema ekranı (karar 0129)

- Ekran `cekirdek/yonetim-paneli/tema/` klasöründedir; verisi `temaEkraniVerisi` ile sunucuda kurulur. Her temaya geçerken gönderilecek ayarlar orada `yeniTemaninAyarlari` ile hazırlanır; tarayıcı tema tanımını taşımaz.
- "Demoyu gez" bağlantısı yalnız `temaDemosuBaglantisi` ile kurulur (`cekirdek/ayar-semasi/tema-demosu-adresi.ts`). Adres kutuya `TEMA_DEMOSU_ADRESI` ile gelir; değeri komutlar demo sitesinin kimliğinden üretir (`komutlar/tema-demosu-adresi.mts`). Siteye özel temanın bağlantısı yoktur.
- Tema değişikliği düzenin yolunu pencerede sorar; varsayılan seçim yoktur. Geri dönüş ekranın gördüğü sürümü gönderir (`son`).

## Kargo ekranı (karar 0135)

- Ekran `cekirdek/yonetim-paneli/kargo/` klasöründe, menüde "Satış" altındadır. Ayarlar mağaza ayarlarıdır: görmek `magaza-ayarlari.gor`, değiştirmek `magaza-ayarlari.degistir` ister.
- Tutar sitenin para biçimiyle yazılı gider, sunucuda `kargoAyarlariniDegistir` (`cekirdek/moduller/kargo/servis.ts`) biçimleyicinin `paraOku`'suyla okur. Ekran tutarı kendisi çevirmez; alanın hatası koduyla döner.

## Siparişler (karar 0146)

- Ekranlar `cekirdek/yonetim-paneli/siparisler/` klasöründe, menüde "Satış" altındadır: Siparişler, Sipariş ayrıntısı (alt sayfa, `?numara=`), Sipariş ayarları. Görmek `siparis.gor`, işlemler `siparis.yonet`, havale onayı `siparis.havale-onayla` (görevlide yok); sipariş ayarları mağaza ayarıdır.
- Hangi işlemin görüneceği sunucuda siparişin durumu, ödeme yöntemi ve yöneticinin izniyle bulunur (`siparisAyrintisiVerisi`); ekran işlemi yeniden süzmez. İşlem ekranın gördüğü durumu gönderir.
- Durumun rozeti ve metni kayıttan okunur (`siparisDurumTanimlari`, `durumMetni`); durum adını ekranda elle yazma.
- Sipariş araması aranan metni adrese yazmaz: liste ucuna gider. Durum sekmesi ve sayfa adrestedir.
- İptal ve iade (karar 0147) yan penceredir (`iade-penceresi.tsx`), yalnız `siparis.iade` izni olana ve durumu izin veren siparişte görünür; tutar ve vergi önizlemesi sunucunun `iadeyiHesapla`'sıyla ve sitenin biçim ayarlarıyla (`siteninBicimAyarlari`) çizilir, gönderilen yalnız seçimdir.

## Ödeme yöntemleri ve banka hesapları (karar 0141)

- Ekranlar `cekirdek/yonetim-paneli/odeme-yontemleri/` klasöründe, menüde "Satış" altındadır. Görmek `odeme-yontemi.gor` (görevli de), değiştirmek `odeme-yontemi.degistir` (yalnız mağaza sahibi) ister; izni olmayan yönetici yalnız okur, anahtar ve düğmeler kapalıdır ya da yoktur.
- Ödeme yöntemlerinin anahtarları, kapıda seçenekleri ve iptal süresi tek formdur, birlikte "Kaydet" ile kaydedilir. Yöntemlerin sırası taşınır taşınmaz kendi ucuyla (`odeme-yontemleri-sirala`) kaydedilir ve formun kaydedilmemiş değişikliğini götürmez (karar 0144). Banka hesabı yan pencerede eklenir ve düzenlenir, onay penceresiyle silinir, sıralama hemen kaydedilir. IBAN'ın hatası alanın koduyla döner, ekran doğrulamaz.
- Açma-kapama yalnız `Anahtar` parçasıyladır (`bilesenler/parcalar/anahtar.tsx`); durumun yazısı yanında görünür.

