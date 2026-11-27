---
paths:
  - "cekirdek/moduller/urun/**"
  - "cekirdek/moduller/kategori/**"
  - "cekirdek/moduller/marka/**"
  - "cekirdek/moduller/etiket/**"
  - "cekirdek/moduller/ozellik/**"
  - "cekirdek/moduller/stok/**"
  - "cekirdek/moduller/fiyat/**"
  - "cekirdek/moduller/vergi/**"
  - "cekirdek/moduller/sepet/**"
  - "cekirdek/moduller/odeme/**"
  - "cekirdek/moduller/siparis/**"
  - "cekirdek/moduller/iade/**"
  - "cekirdek/moduller/kargo/**"
  - "cekirdek/moduller/kampanya/**"
  - "cekirdek/moduller/eposta/**"
  - "cekirdek/arka-plan-isleri/**"
  - "cekirdek/eklentiler/**"
---

# E-ticarete özgü iş kuralları

## Fiyat, vergi ve indirim

- Sepet, ödeme, sipariş, fatura ve e-postadaki tutarı aynı hesaplama fonksiyonundan al.
- Ödemeye geçerken fiyatı, indirimi, kargoyu ve vergiyi sunucuda yeniden hesapla. Tarayıcıdan gelen tutarı kullanma.
- Vergi ve indirimin satır satır mı toplamda mı yuvarlanacağını tek yerde tanımla.
- Kargo ücretini, ücretsiz kargo sınırını ve bölge kurallarını tek kargo hesabında tut. Kargo yalnız `kargoHesapla` (`cekirdek/moduller/kargo/hesap.ts`) ile, sepetin satırları, kargosu, vergisi ve toplamı yalnız `sepetiHesapla` (`cekirdek/moduller/sepet/hesap.ts`) ile hesaplanır; ödeme ve sipariş de onu kullanır (karar 0135).
- Para tutarını küsuratlı sayı olarak tutma. Yuvarlama hatası olmayan biçimde, para birimiyle birlikte sakla.
- Kupon, otomatik indirim ve kampanyaları tek kampanya motorunda hesapla. Birleşme kurallarını orada tanımla. Kupon yalnız `kuponServisi` (`cekirdek/moduller/kampanya/servis.ts`) ile okunur, kullanımı yalnız onunla ayrılır, siparişe bağlanır ve serbest bırakılır; geçerliliği ve indirimi yalnız `kuponuUygula` (`hesap.ts`) verir, sepet hesabı onu çağırır. Sepette tek kupon olur. Kupon ürünleri sıfıra indiremez (yüzde en çok 99, en az 1 kuruş kalır); ücretsiz kargo kuponu kargosu zaten ücretsiz sepette geçmez. İndirim fiyat girişi biçimindeki tutarlardan hesaplanır, kapsamdaki satırlara orantılı dağılır, vergi satırın indiriminden sonraki tutardandır (`HesapSatiri.indirim`). Siparişe kupon ve kalemin payı yazılır; kalemin vergisiz tutarı ve vergisi kupondan sonradır. Kullanım ödeme oturumunda stok ayırmasıyla aynı işlemde ve süreyle ayrılır; oturumun ayırmaları yalnız `oturumunAyirmalariniBirak` ile birlikte bırakılır (karar 0187). Tür, kapsam ve red nedenleri `cekirdek/kayitlar/kampanya.ts` kaydındadır.
- Vergi oranlarını ve hesabını tek modülde yap. Vergi yalnız `hesapla` (`cekirdek/moduller/vergi/hesap.ts`) ile, sitenin ayarları ve tablosuyla `vergiHesapla` ile hesaplanır. Kuruş yalnız `cekirdek/moduller/vergi/yuvarlama.ts` ile yuvarlanır (karar 0061).
- Vergi ülkeye bağlı yazılmaz: çekirdekte "KDV", bir oran ya da bir ülke sabit yazılmaz. Vergi sınıfları, oranlar, vergi adı, fiyatın vergi dahil ya da hariç girilmesi ve hesaplamanın hangi adrese göre yapılacağı site ayarıdır.
- Oranı ürünün vergi sınıfı ile müşterinin bölgesinden bul. Bölge bulunamazsa mağaza adresini kullan.
- Siparişe her satırın o anki vergi oranını ve tutarını yaz. Oran sonradan değişse de eski sipariş değişmesin.
- Para birimini ve para biçimini site ayarından al. Çekirdekte "TL" ya da "₺" sabit yazılmaz: para biriminin çekirdekte varsayılanı yoktur, simge ayardan ya da dil verisinden gelir (`cekirdek/testler/para-simgesi-yok.test.ts`, karar 0067).
- Fiyat yalnız `cekirdek/moduller/fiyat/servis.ts` ile okunur ve değişir; bir anın fiyatını yalnız `gecerliFiyat` (`cekirdek/moduller/fiyat/gecerli.ts`) verir, birimlerin fiyatları tek sorguyla `gecerliFiyatlar` ile gelir. Tutar kuruş, para birimi satırda saklanır (karar 0066).
- Vitrin, sepet ve e-posta fiyatı yalnız `gosterilecekFiyatlar` (`cekirdek/moduller/fiyat/gosterim.ts`) ile gösterir: vergi dahil ya da hariç tutar, eski fiyat, fiyatın yanındaki metin ve biçimli yazılış oradan gelir. Eski fiyat yalnız `eskiFiyatiBul` (`cekirdek/moduller/fiyat/eski-fiyat.ts`) ile hesaplanır (karar 0067).
- Her fiyat değişikliğini tarihiyle ve yazanıyla fiyat geçmişine yaz, geçmiş silinmez (yazan kart 0265'ten beri). İndirimli üründe eski fiyatı fiyat geçmişinden hesapla: son 30 günün en düşük fiyatını göstermek site ayarıdır.

## Ürün

- Ürün yalnız `cekirdek/moduller/urun/servis.ts` ile okunur ve değişir. Fiyat, stok ve stok kodu ürüne değil satılabilir birime bağlanır (karar 0062).
- Kategori yalnız `cekirdek/moduller/kategori/servis.ts` ile okunur ve değişir. Kategorinin ürünleri tek sorguyla `kategorininUrunleri` ile gelir; döngüyü servis ve veritabanındaki tetikleyici aynı kilitle denetler (karar 0063).
- Marka ve etiket aynı grup servisini kullanır (`cekirdek/moduller/urun/grup-servisi.ts`); ürünün kategori, marka ve etiket bağlantıları `cekirdek/moduller/urun/baglantilar.ts`, grupların ürünleri `cekirdek/moduller/urun/liste.ts` ile tek sorgudan gelir. Ad tekilliği yalnız ad anahtarıyla karşılaştırılır (`cekirdek/metinler/ad-anahtari.ts`, karar 0064).
- Varyantlı ürünün seçenekleri, değerleri ve birleşimleri yalnız ürün servisinin varyant işlemleriyle (`cekirdek/moduller/urun/varyant.ts`) yazılır. Her birleşim bir satılabilir birimdir; fiyat ve stok onu basit ürünün birimi gibi kullanır. Ürünün türü kayıttan (`urunTurleri`), sınırları `varyantSinirlari` ile, fiyat aralığı yalnız `fiyatAraliklari`, genel stok durumu yalnız `urunStokDurumu` ile bulunur (karar 0071). Ürüne yeni seçenek eklenince var olan birimler (basit ürünün birimi ya da birleşimler) yeni seçeneğin ilk değerini alır; stok kodu, fiyat, stok ve geçmiş birimde kalır (karar 0163). Panelin seçenekler bölümü son hâli `varyantlariKaydet` ile, ürünün değişikliğiyle aynı işlemde yazar; birleşimler bütün değerlerin birleşimidir, eksik olan açılır; kayıtlı seçenek ya da değer silmek `urun.sil` ister.
- Ürün özellikleri (sitenin kendi ek alanları) yalnız `ozellikServisi` (`cekirdek/moduller/ozellik/servis.ts`) ile tanımlanır; ürünün değerleri ürün girdisinin `ozellikler` alanıyla ürün servisinden yazılır ve türün şemasıyla doğrulanır (`cekirdek/moduller/ozellik/degerler.ts`). Değer türleri `cekirdek/kayitlar/ozellik.ts` kaydındadır. Bir değere sahip ürünler tek sorguyla `ozellikServisi.urunleri` ile gelir (karar 0072).
- Ürünün galerisi (görseller ve video bağlantıları) yalnız ürün servisinin galeri işlemleriyle (`cekirdek/moduller/urun/galeri.ts`) yazılır. Görsel önce `gorselKaydet` (`cekirdek/moduller/dosya/servis.ts`) ile boyutlarıyla kaydedilir, sonra kimliğiyle galeriye bağlanır. Boyutlar `cekirdek/kayitlar/gorsel.ts`, video siteleri `cekirdek/kayitlar/video-siteleri.ts` kaydındadır. Video bağlantısı yalnız `videoAdresiniCoz` ile çözülür, oynatıcı adresi kimlikten kurulur. Ana görseli `anaGorseller`, bir birimin gösterilecek görselini `birimGorseli` verir. Silinen öğenin dosyası silinmez (karar 0073). Panelin galerisi son hâli `panelGaleriYaz` ile, ürünün değişikliğiyle aynı işlemde yazar; görsel önce `urun-gorseli-yukle` ucuyla kaydedilir (karar 0167).
- Ürün yalnız `urunKopyala` (`cekirdek/moduller/urun/kopyalama.ts`) ile kopyalanır: tek işlemde, her parça kendi servisinden; stok kodu, barkod, stok ve geçmişler kopyalanmaz, kopya taslaktır, görsel dosyası paylaşılır (karar 0190).
- İlgili ürünler yalnız `ilgiliUrunleriGetir` (`cekirdek/moduller/urun/ilgili.ts`) ile bulunur; kural ve sayı oradadır (karar 0065).
- "En yeni" sırası ürünün oluşturma zamanıdır. Ürün `clock_timestamp()` ile yazılır: aynı işlemde eklenen ürünlerde (başlangıç kataloğu) sonra eklenen daha yenidir (kart 0127). Birincil sıralama ölçütü bir zaman olan tabloda o alan `now()` ile yazılmaz, çünkü aynı işlemdeki bütün satırlarda aynıdır; `clock_timestamp()` ile yazılır. Önce sıra numarasıyla sıralanan tablolarda (menü öğeleri, vergi oranları, seçenekler, birimler) zaman yalnız eşitlik bozucudur, `now()` kalabilir. Bu kuralın kontrolü yoktur, yalnız disiplindir.
- Sitenin ilk kategorileri, markaları, etiketleri, özellikleri ve ürünleri (seçenekleri ve birleşimleriyle, karar 0074) sitenin klasöründe `baslangic/katalog.json` dosyasındadır; katalog hiç kurulmamışsa arka plan süreci açılırken `katalogBaslangiciniKur` (`cekirdek/moduller/urun/baslangic.ts`) onları servislerle, tek işlemde, bir kez yazar (karar 0070). Kategori görseli `gorsel` alanıyla dosya adıyla yazılır (karar 0094). Örnek ürün çekirdeğe yazılmaz.
- Ürünün vitrinde görünüp görünmediği yalnız `vitrinKosulu` (`cekirdek/moduller/urun/vitrin.ts`) ile bulunur. Koşul mağaza sahibinin `tukenenUrun` ayarını ister: "gizle"de tükenmiş ürün listelere girmez, sayfası açılır. Yayın durumlarının nerede göründüğü `cekirdek/kayitlar/urun.ts` kaydındadır, durum adını kodda elle yazma.

## Stok

- Stok yalnız `cekirdek/moduller/stok/servis.ts` ile okunur ve değişir. Sipariş `stokDus`, iptal ve iade `stokArtir` kullanır, ikisi de çağıranın işleminde çalışır. Panel `stokDuzelt` ile ekranın gördüğü miktarı da gönderir; birden çok birimi aynı işlemde düzelten yazım birimleri kimlik sırasıyla kilitler (kart 0265). Sebepler `cekirdek/kayitlar/stok.ts` kaydındadır, geçmiş değiştirilemez (karar 0068). Aynı işlemde düşürmeden sonra ürünün işlem kilidi alınmaz (ürün ya da fiyat yazılmaz), iptal ve iade yalnız o siparişin stok geçmişinde düşürdüğü adedi geri koyar.
- Bir birimin satılabilir olup olmadığı, tükenip tükenmediği, düşük stokta olup olmadığı ve müşteriye yazılan durum yalnız `stokDurumu` (`cekirdek/moduller/stok/durum.ts`) ile, birimlerin durumu tek sorguyla `stokDurumlari` ile bulunur. Tükenen ürünün listelerde gizlenmesi vitrin koşulundadır; koşul tükenen ürün ayarını zorunlu değer olarak alır (karar 0069).
- Fiyatı olmayan birim (fiyat satırı yok ya da sitenin para biriminde değil) satılamaz ve tükenmiş sayılır, stoğu olsa da takibi kapalı olsa da (karar 0133). Stok ayarları sitenin para birimini taşır (`siteninStokAyarlari`). Veritabanında "satılabilir birim" yalnız `birimSatilabilirKosulu` ile yazılır; sorguda stok ya da fiyat koşulunu elle yazma. Vitrin koşulunun "gizle" seçeneği siteden `vitrinStokSecenegi` ile kurulur.
- Sipariş oluşurken stoğu "yeterliyse düş" koşuluyla ve siparişin kaydıyla aynı veritabanı işleminde düş. Aynı anda gelen iki sipariş son ürünü iki kez satmasın.
- Ödemeye geçen sepetin ürünlerini belli bir süre ayır. Ödeme başarısız olur ya da süre dolarsa geri bırak. Ayırma yalnız `stokAyir` ile, oturumla aynı işlemde yapılır; süresi `stokAyirmaSuresi` ayarıdır, süresi dolan ayırma sayılmaz, `ayirmayiBirak` serbest bırakır (karar 0140). Sipariş `stokDus`'a kendi oturumunu verir: başka oturumların süresi dolmamış ayırmaları düşülmüş sayılır, kendi ayırması siparişe geçer (karar 0141).
- Beden ve renk gibi seçeneklerin her birleşiminin kendi stok kodu, stoğu ve fiyatı olsun.

## Ödeme

- Havale ve kapıda ödemede sipariş, ödeme alınana kadar "ödeme bekleniyor" durumunda kalır. Havaleyi yönetici panelden onaylar.
- Süresi içinde ödenmeyen havale siparişini kendiliğinden iptal et ve stoğu geri koy. Süre site ayarıdır.
- Kartla ödeme eklentisi ya da başka bir ödeme kuruluşu bağlıysa:
  - Ödeme kuruluşundan gelen bildirim iki kez gelse de siparişi bir kez işle.
  - Ödemenin başarılı olup olmadığını tarayıcıdan gelen bilgiyle değil, ödeme kuruluşunun doğrulamasıyla kabul et.
  - Sitedeki siparişleri her gün ödeme kuruluşunun kayıtlarıyla karşılaştır. Uyuşmayanları yöneticiye bildir.
  - Kartla ödeme eklentisi (kart 0215, karar 0142): sonuç yalnız `kartlaOdemeServisi.tamamla` ile işlenir (dönüş, bildirim ve tarama aynısını çağırır); sipariş ödeme satırı kilitliyken bir kez kurulur. Ödeme alındı ama sipariş kurulamadıysa ödeme aynı gün iptal edilir (kullanıcı kararı). Kart bilgisi sunucuya gelmez; form kuruluşun sayfasındadır.

## Sipariş ve iade

- İptal, tam iade ve kısmi iadeyi tek akıştan yürüt. İade tutarını ve vergisini fiyat hesabıyla aynı fonksiyondan al. Stoğa geri koymak seçimlidir (kusurlu ürün geri konmaz).
- İptal ve iade yalnız `iadeServisi(site).iadeYap` (`cekirdek/moduller/siparis/iade.ts`) ile yapılır; süresi dolan havalenin kendiliğinden iptali aynı dosyadaki `odemesiAlinmayaniIptalEt` ile, aynı tamamlama adımından (karar 0186); tutarı ve vergisi yalnız `iadeyiHesapla` (`iade-hesabi.ts`) siparişin saklanan kalem değerlerinden hesaplar, panelin önizlemesi de onu kullanır. Para kartla ödemede ödeme yöntemi bağlantı noktasının `iadeEt`'iyle kuruluştan döner, iade sonuç gelene kadar "bekliyor"dur ve bekleyen iade varken ne durum işlemi ne yeni iade yapılır; öteki yöntemlerde kaydedilince yapılmış sayılır. Kuruluşa kalem kalem iade gider, her parça bir kez (karar 0147).
- Müşterinin iade talebi yalnız `iadeTalebiServisi` (`cekirdek/moduller/siparis/iade-talebi.ts`) ile açılır ve karara bağlanır; talep edilebilir adet yalnız `talepEdilebilirAdetler` ile bulunur. Talep tutar belirlemez: onaylanan talebin iadesi `iadeYap`'a talebin kimliğiyle verilir. Müşterinin kendi iptali de `iadeYap`'tır (`musteriIptali` girdisiyle, kaynak "musteri"); ayarın izin verdiği durum ve ödeme kuralı (havaleyle ödenmiş sipariş müşteriden iptal edilmez) siparişin kilidi altında denetlenir, ayarın değeri işlemden hemen önce okunur (karar 0151).
- Siparişin ve stoğun her değişikliğini kimin, ne zaman, neden yaptığıyla geçmişe yaz.
- Siparişin içinde verildiği andaki ürün adını, fiyatı, vergiyi ve adresi sakla. Ürün fiyatı sonradan değişince eski sipariş değişmesin.
- Her siparişin müşteriye gösterilen kısa ve tekil bir numarası olsun. Öneki ve başlangıç numarası site ayarıdır.
- Sipariş yalnız `siparisServisi.siparisiKur` (`cekirdek/moduller/siparis/servis.ts`) ile, ödeme oturumundan ve çağıranın işleminde kurulur; havale ve kapıda ödemede "Siparişi onayla" oturum, ayırma ve siparişi tek işlemde yazar (`odemeServisi.siparisVer`, karar 0141). Numara veritabanının sırasından gelir, tam yazılışıyla saklanır. Durumlar ve geçişleri `cekirdek/kayitlar/siparis.ts` kaydındadır; geçmiş yalnız `gecmiseYaz` (`gecmis.ts`) ile yazılır ve değiştirilemez.
- Panelden elle sipariş yalnız `odemeServisi.elleSiparisVer` ile, vitrin siparişiyle aynı oturum, ayırma ve `siparisiKur` yolundan kurulur; tutar sunucunun sepet hesabıdır. "Elden" (ödeme alındı) yalnız panelin ve siparişin yöntemidir (`paneldenOdemeYontemleri`), ayrı izin ister (`siparis.elden-tahsil`). Sözleşmelerin iletildiği yöneticinin beyanıdır (`beyan`), üye olmadan alışveriş ayarı paneli bağlamaz (karar 0148).
- Ödeme yöntemleri ve kapıda ödemenin seçenekleri `cekirdek/kayitlar/odeme.ts` kaydındadır; açıklığı, sırası, havalenin iptal süresi ve banka hesapları mağaza ayarıdır, yalnız `odemeYontemiServisi` (`cekirdek/moduller/odeme/yontemler.ts`) değiştirir. Müşterinin gördüğü yöntemler yalnız `kullanilabilirYontemler` ile bulunur. IBAN yalnız `cekirdek/bolgeler/iban.ts` ile doğrulanır.
- Panelin sipariş işlemleri (havale onayı, hazırlamaya alma, kargoya verme, kargo düzeltme, teslim edildi) kayıttaki `siparisIslemleri`'dir ve yalnız `siparisYonetimi(site).islemYap` (`cekirdek/moduller/siparis/yonetim.ts`) ile yapılır: satır kilitlenir, ekranın gördüğü durum geçerli değilse "cakisma"; kayıtta olmayan geçişi veritabanındaki `siparis_durum_gecisi` tetikleyicisi de reddeder. Notlar `notEkle` ile, değiştirilemez `siparis_notlari` tablosuna yazılır. Kargo firmaları mağaza ayarıdır (`kargoFirmalari`), yalnız `siparisAyarlari(site).kargoFirmalariniKaydet` değiştirir; siparişe o anki firma adı ve takip adresi yazılır (karar 0146).
- Siparişin teslimat ve fatura bilgileri yalnız `siparisAdresServisi(site).duzelt` (`cekirdek/moduller/siparis/adres-duzeltme.ts`, karar 0180) ile düzeltilir: kargoya verilene kadar, ekranın gördüğü özetle (`adresSurumu`), ödeme adımının kurallarıyla. Verginin bölgesi değişip oranlar farklıysa reddedilir; tutar ve vergi hiç değişmez. Önceki ve yeni bilgiler `siparis_adres_duzeltmeleri`'ndedir (temizlik siler), geçmişe `adres-duzeltildi`. Verginin bölgesi yalnız `vergiBolgesiniSec` ile seçilir (`cekirdek/moduller/vergi/hesap.ts`).
- Siparişin faturası yalnız `siparisFaturaServisi` (`cekirdek/moduller/siparis/fatura.ts`, karar 0170) ile yazılır, kaldırılır ve okunur: numara ve tarih zorunlu, PDF isteğe bağlı ve belge olarak (`belgeKaydet`); dosyayı panel, sahibi üye ve takip anahtarı alır. "Faturanız hazır" e-postası yazımla aynı işlemde, değişiklik kaydının kimliğiyle gider.
- Raporların saydığı satış ve iade yalnız `satisRaporu` (`cekirdek/moduller/rapor/satis.ts`, karar 0195) ile bulunur: satış ödemenin alındığı günde (`odeme_zamani`), iade tamamlandığı günde (`sonuc_zamani`); tutarlar siparişin ve iadenin saklanan değerleridir, yeniden hesaplanmaz; bir siparişin iadeleri toplamını aşmaz; yalnız sitenin para birimi. Ürün, müşteri ve kupon raporları ve panonun satış özeti aynı kuralı kullanır.
- Saklama süresi dolan siparişin kişisel bilgileri yalnız `kisiselVeriTemizligi` (`cekirdek/moduller/siparis/temizlik.ts`) ile, günlük işle silinir; süre altyapı sahibinin `kisiselVeriSaklamaYili` ayarıdır (karar 0145, 0146).
- Ödenmeyen havalenin iptali yalnız `havaleIptalTaramasi` (`cekirdek/moduller/siparis/iptal.ts`) ile, saatlik işle yapılır; iptal iptalin tek akışından geçer (`odemesiAlinmayaniIptalEt`, iade.ts; sistemin iade satırı, karar 0186). Ödediğini bildiren müşterinin siparişi kendiliğinden iptal olmaz (kullanıcı kararı).

## E-posta, dış servis ve arka plan işleri

- Bütün müşteri ve yönetici e-postalarını tek şablon sistemiyle, site tasarım değerleriyle üret. E-posta yalnız `epostaGonder` ile gönderilir, kuyruktan gider. Gönderim hizmeti tek dosyada bağlanır: `cekirdek/moduller/eposta/gonderici.ts` (karar 0050).
- Müşteriye giden sipariş e-postaları (karar 0153): geçmişin her nedeninin e-postası `siparisGecmisiEpostalari` kaydındadır (`cekirdek/kayitlar/siparis.ts`); `gecmiseYaz` onu geçmiş satırıyla aynı işlemde, satırın kimliğini olay anahtarı yaparak `siparisEpostasiYaz` (`cekirdek/moduller/siparis/epostalar.ts`) ile yazar. Müşteriye not notun kimliğiyle gider. Yeni bir olay e-posta gönderecekse kayda yazılır, çağıran e-postayı kendisi yazmaz. Veri olay anında siparişin saklanan değerlerinden alınır, gönderimde yalnız biçimlenir (`eposta-icerigi.ts`); tutar ya da vergi yeniden hesaplanmaz. Aynı olay anahtarıyla ikinci e-posta yazılmaz (`eposta_kayitlari_olay`). E-posta siparişin değişikliğini düşürmez: kişisel bilgisi silinmiş siparişe ve geçersiz adrese yazılmaz. "E-postanıza gönderdik" diyen ekran `epostaGidebilirMi` sorar.
- Yönetici bildirimleri (karar 0154): bildirimler `cekirdek/kayitlar/yonetici-bildirimi.ts` kaydında, siparişin olaylarınınkiler `siparisGecmisiYoneticiBildirimleri`'nde; olayla aynı işlemde yalnız `yoneticiBildirimiYaz` (`cekirdek/moduller/yonetici-bildirimi/servis.ts`) ile, olayın kalıcı kaydının kimliğiyle kuyruğa girer. Açıklık (`kapaliYoneticiBildirimleri`; eklentiye bağlı bildirim eklenti kapalıyken de gider, panelde yalnız eklenti açıkken görünür, karar 0155) ve alıcılar (`yoneticiBildirimAlicilari`, boşsa tam yetkili rolün yöneticileri) iş çalışırken `bildirimiGonder` ile okunur. Veri müşterinin e-postasını, telefonunu ve açık adresini taşımaz (`kisaAdVerisi`, il ve ilçe). Stok uyarısı yalnız siparişin düşürmesinde, eşiği yukarıdan geçerken `stokDus`'un `uyari` seçeneğiyle yazılır; uyarılar saatte en çok bir e-postayla gider (`stokUyarilariniGonder`).
- E-postanın görünüşü sitenin açık temasıdır (`epostaGorunusu`, `cekirdek/moduller/eposta/gorunus.ts`); ölçüler tasarım değerlerinden piksele çevrilir, stil satır içidir. Gövde blokla kurulur (`EpostaBlogu`: paragraf, kutu, tablo, düğme, bilgi), düz metin karşılığı aynı bloklardan çıkar.
- Kargo, fatura, pazaryeri ve ödeme bağlantılarını aynı kalıpla yaz: zaman aşımı, yeniden deneme, kayıt ve hata bildirimi her birinde olsun. Sunucunun dış servise isteği yalnız `disServiseIstek` ile gider (`cekirdek/dis-servis/istek.ts`, kart 0215): zaman aşımı zorunlu, gövde okunur.
- Dış servisten beklenmeyen yanıt gelince işlemi yarım bırakma. Geri al ve yöneticiye bildir.
- E-posta, fatura, pazaryeri eşitleme gibi uzun işleri kuyrukta yürüt. Başarısız işi sınırlı sayıda yeniden dene, yine olmazsa ayrı listeye düşür ve yöneticiye bildir.
- Yeni arka plan işi `isTanimla` ile tanımlanır, `cekirdek/arka-plan-isleri/isler.ts` listesine eklenir (karar 0049). Dış servise giden iş, yeniden çalışabileceği için `isKimligi` ile tekrarı önler.
