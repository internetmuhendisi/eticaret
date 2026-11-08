# 0067 · Gösterilecek fiyat, eski fiyat ve para biriminin yeri

## Tarih

2026-11-08

## Karar

Vitrin, sepet ve e-posta bir birimin fiyatını yalnız `gosterilecekFiyatlar` (`cekirdek/moduller/fiyat/gosterim.ts`) ile alır (kart 0081). Geçerli fiyatı kart 0080'in `gecerliFiyat` işlevi verir; bu kart onu gösterilecek biçime çevirir.

- **Vergi dahil ya da hariç gösterim:** Mağaza ayarı `fiyatGosterimi` (varsayılan vergi dahil). Fiyatın girildiği biçimden (`fiyatGirisi`) farklıysa tutar vergi hesabıyla (`hesapla`, karar 0061) bir adet olarak çevrilir; ikisi aynıysa ya da vergi kapalıysa hesap yapılmaz. Bölge verilmezse mağaza adresinin bölgesi kullanılır: ürün sayfasında müşterinin adresi bilinmez. Sepet, teslimat adresi bilinince bölgeyi verir.
- **Fiyatın yanındaki metin:** Mağaza ayarı `fiyatEkMetni`. Yazılmazsa vergi adından ve tutarın vergi durumundan kurulur ("<vergi adı> dahil" ya da "hariç"; vergi adı yoksa "Vergiler dahil"). Vergi kapalıysa ya da ürün vergisizse (sınıfı yok) tutarın vergisi "yok"tur ve kendiliğinden metin yoktur; mağaza sahibinin yazdığı metin yine görünür. Boş metin hiçbir şey göstermez. Metin kalıbı metin dosyasındadır, çekirdekte vergi adı yazmaz.
- **Bölge bulunamazsa vitrin düşmez:** Çevirme gerekirken vergi hesabı bölge bulamazsa (mağaza adresi yok ya da tabloda değil; karar 0061 hesabı durdurur) tutar girildiği biçimde, kendi vergi durumu ve metniyle gösterilir; hata süreç başına bir kez kaydedilir. Tutar ve metin birbirini tutar: yanlış tutar gösterilmez, yalnız mağazanın seçtiği gösterim uygulanamaz.
- **Çevrilmiş tutarlar yeniden karşılaştırılır:** Eski fiyat ve indirimli fiyat çevrilince aynı kuruşa yuvarlanabilir; çevrilmiş eski fiyat yüksek değilse gösterilmez.
- **Eski fiyat (kullanıcı kararları):** Mağaza ayarı `indirimdeEnDusukFiyat` (varsayılan açık).
  - Açıksa eski fiyat, indirimin başladığı andan önceki 30 günde uygulanan en düşük fiyattır. 30 gün bugünden değil indirimin başlangıcından geriye sayılır. Önceki indirimler bu fiyata dahildir.
  - İndirim fiyatı değişerek kesintisiz sürdüyse başlangıç ilk indirimdir; ara verilip yeniden başlayan indirimin başlangıcı yenisidir.
  - O 30 günde hiç fiyat yoksa ya da bulunan en düşük fiyat bugünkü indirimli fiyattan yüksek değilse eski fiyat gösterilmez.
  - Kapalıysa eski fiyat, indirimden önceki satış fiyatıdır.
  - Hesap geçmişten yapılır (`eski-fiyat.ts`): geçmişin her satırı, sonraki satır yazılana kadar, içindeki indirim kendi başlangıç ve bitişiyle geçerlidir. Başka para birimindeki satırlar o dönemde fiyat yokmuş gibi sayılır. Eski fiyat da aynı biçimde vergi dahil ya da hariç gösterilir.
- **Para birimi sitenindir:** `paraBirimi` ayarının çekirdekte varsayılanı yoktur, site `ayarlar.json` dosyasında yazar. `paraBicimi.simge` isteğe bağlıdır; yazılmazsa simge para biriminden, sitenin dilinin verisinden (CLDR) bulunur (`paraSimgesi`). Çekirdekte ve bileşenlerde sitelerin para birimi kodu ve simgesi ile "TL" geçmez (`cekirdek/testler/para-simgesi-yok.test.ts`); testler ISO 4217'nin deneme kodunu (XTS) kullanır.
- **Sorgu:** Birimlerin fiyatı, geçmişi (yalnız indirimdeki birimlerin), vergi sınıfları ve tablo (yalnız çevirme gerekiyorsa) tek tek değil toplu okunur; sorgu sayısı birim sayısıyla artmaz. Geçmiş sayfasızdır: indirimin başlangıcı geçmişin ne kadar gerisinde olduğuna bağlıdır.

## Neden

- Tek işlev, vitrin, sepet ve e-postanın aynı ürüne farklı fiyat göstermesini önler.
- Pencereyi indirimin başlangıcından saymak, uzun süren indirimde eski fiyatın zamanla indirimli fiyata yaklaşıp anlamsızlaşmasını önler; kullanıcının seçtiği yorum budur.
- Eski fiyatın indirimli fiyattan yüksek değilken gösterilmemesi, üstü çizili daha düşük ya da aynı fiyat gibi yanıltıcı bir görüntüyü önler.
- Gösterimi girişten ayrı ayar yapmak, fiyatı vergi hariç girip tüketiciye dahil gösteren (ya da kurumsal satışta tersini yapan) mağazaya da uyar; siteden siteye değişebildiği için ayardır.
- Para birimini ve simgesini çekirdekten çıkarmak, kartın ve iş kuralının ("çekirdekte TL ya da ₺ sabit yazılmaz") gereğidir. Simgeyi dil verisinden almak, her sitenin simge yazmasını gerektirmez.

## Düşünülen diğer yollar

- **30 günü bugünden geriye saymak:** Kullanıcı seçmedi.
- **Önceki indirimleri saymamak (yalnız indirimsiz fiyatlar):** Kullanıcı seçmedi; "uygulanan en düşük fiyat" önceki indirimi de kapsar.
- **En düşük fiyat indirimli fiyattan düşükse yine göstermek:** Kullanıcı seçmedi.
- **Gösterimi yalnız fiyat girişine bağlamak:** Seçilmedi. Girişi ve gösterimi farklı mağaza ayarla çözülebilir; tek ayar onu dışarıda bırakırdı.
- **Para birimi varsayılanını çekirdekte bırakıp testten muaf tutmak:** Seçilmedi. Kural çekirdekte para simgesi yazılmamasıdır; muafiyet kuralı delerdi.
- **Simgeyi zorunlu yapmak:** Seçilmedi. Dil verisi doğru simgeyi zaten bilir; her siteye fazladan satır olurdu.
- **Eski fiyatı ayrı bir tabloda tutmak (her gün hesaplanan):** Seçilmedi. Geçmiş zaten tam hâli tutar; ikinci kayıt ayrışabilirdi.

## Sonuçları

- Her site `ayarlar.json` dosyasına `paraBirimi` yazmak zorundadır; yazmayan doğrulamadan geçmez. Yeni site kurma komutu bunu sormalıdır.
- 30 gün kuralının yasal dayanağı hukukçuya sorulacaktır (kart 0081). Yorum değişirse yalnız `eski-fiyat.ts` ve testi değişir.
- Ürün sayfasında vergi, mağaza adresinin bölgesiyle çevrilir. Farklı oranlı bölgeye gönderilen siparişte sepet tutarı ürün sayfasındakinden farklı olabilir; yalnız giriş ve gösterim farklıyken olur.
- Vergi açık, giriş ve gösterim farklı ve bölge bulunamıyorsa fiyat seçilen gösterimle değil girildiği biçimle görünür, hata kaydedilir (bağımsız kontrolün bulgusu). Panel, gösterim girişten farklıyken mağaza adresini zorunlu tutmalıdır.
- Bölgede oranı olmayan sınıftaki ürün (karar 0061: o ürüne vergi uygulanmaz) çevrilir ama vergisi sıfırdır; metni yine "dahil" der. Yalnız sınıfı olmayan ürün "vergi yok" sayılır.
- Geçmiş verilen ana kadar (`an`) okunur, geçerli fiyat bugünkü satırdan. Uygulamanın saati veritabanınınkinin gerisindeyse yeni yazılmış indirimin eski fiyatı saat farkı kadar görünmeyebilir. İkisi aynı sunucuda çalışır; fark ölçülmedi.
- Komutların kurduğu deneme sitelerinin ayarları tek yerdedir (`komutlar/deneme-sitesi-ayarlari.mts`); ayar dosyası yazan her komutun onu kullandığını test denetler. Yayın denemesinin deneme sitesi bu işte unutulmuştu, bağımsız kontrol buldu.
- Gösterim tutarı her birim için tek başına yuvarlanır; sepet toplamı vergiyi kendi satırlarıyla hesaplar. Ara toplam yuvarlamalı sitede sepet toplamı ürün sayfasındaki tutarların toplamından bir iki kuruş farklı olabilir.
- Geçmiş sayfasız okunur. Birim başına satır sayısı fiyat değişikliği kadardır; toplu fiyat değişikliği gelince ölçülmelidir.
- Silinmiş birimin ve görünmeyen ürünün fiyatı da gelir (karar 0066); vitrin ve sepet birimi önce kendi koşuluyla süzer.
- Çekirdekte ülkeye bağlı başka varsayılanlar (satış ülkesi, saat dilimi, dil) duruyor; bu kartın kapsamı dışındadır.
