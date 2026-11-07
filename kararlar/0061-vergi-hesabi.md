# 0061 · Verginin tek hesap işlevi, bölge ve yuvarlama kuralları

## Tarih

2026-11-07

## Karar

Vergi yalnız `cekirdek/moduller/vergi/hesap.ts` dosyasındaki `hesapla` işleviyle hesaplanır (kart 0075). Sitenin ayarlarını ve tablosunu veritabanından okuyan yol `vergiHesapla`'dır (`servis.ts`). Kuruş yuvarlaması yalnız `yuvarlama.ts` ile yapılır. Sepet, ödeme, sipariş, e-posta, panel ve iade gelince bu işlevi kullanır.

- **Ayarlar (mağaza sahibinin):** `fiyatGirisi` (vergi dahil ya da hariç, varsayılanı dahil), `vergiAdresi` (teslimat, fatura ya da mağaza, varsayılanı teslimat), `vergiYuvarlama` (satır satır ya da ara toplamda, varsayılanı satır).
- **Kargo sınıfı:** Kargo ücretinin vergi sınıfı vergi tablosunda tutulur: en çok bir sınıf `kargo_sinifi` işaretlidir. İşaretli sınıf yoksa kargo vergisizdir. Başlangıç verisinde `"kargo": true` ile verilir, sonra `kargoSinifiniDegistir` ile değişir ve değişiklik kaydına girer. Silinmiş sınıf kargo sınıfı yapılamaz. Kargo sınıfıyken silinen sınıf kargo sınıfı kalır. Örnek Mağaza'da kargo sınıfı %20'dir.
- **Bölge bulunamadı (kullanıcı kararı):** Ayardaki adres kullanılır. Adres yoksa ya da silinmemiş sınıfların hiçbirinde o bölgeye uyan oran yoksa mağaza adresi kullanılır. Silinmiş bir sınıfta kalmış oran, bölgeyi "tabloda var" saydırmaz (kullanıcı kararı). Bölge tabloda varsa ama ürünün sınıfının orada oranı yoksa o ürüne vergi uygulanmaz.
- **Hiçbir bölge yoksa (kullanıcı kararı):** Ne müşterinin ne mağazanın bölgesi tabloda bulunursa ve sınıfı olan bir kalem varsa hesap durur (`is-kurali`, `vergi-bolgesi-yok`). Sıfır oranlı sınıftaki ürün de sınıfı olan kalemdir, durdurur (kullanıcı kararı). Yalnız vergisiz ürün (sınıfı yok) ve sınıfsız kargo durdurmaz.
- **En özel oran (kullanıcı kararı):** Bir sınıfın bölgeye uyan oranlarından en özel düzeydekiler geçer. Üç düzey vardır: posta kodu, il, ülke. Posta kodu oranının ayrıca il taşıması düzeyini değiştirmez. Aynı düzeydeki oranlar toplanır.
- **Ticari yuvarlama (kullanıcı kararı):** Yarım kuruş ve üstü yukarı yuvarlanır. Vergi tutarı yuvarlanır, vergisiz tutar vergili tutardan vergi çıkarılarak bulunur.
- **Vergi dahil giriş:** vergi = vergili × toplam oran / (1 + toplam oran). Birden çok oranda bu vergi oranlara göre paylaştırılır, artan kuruş küsuratı en büyük paya gider.
- **Vergi hariç giriş:** Her oranın vergisi ayrı yuvarlanır.
- **Satır ve ara toplam:** Satır yuvarlamasında her kalem (birim fiyat × adet ve kargo) ayrı yuvarlanır. Ara toplamda aynı oran kümesine düşen kalemler toplanıp bir kez yuvarlanır. Oran kümesi, oranların adı ve yüzdesidir; oranın hangi sınıftan geldiği önemli değildir. Sonuç kalemlere tutarlarına göre dağıtılır, artan kuruş küsuratı büyüğe, eşitse önce gelene gider. Kalemlerin vergisi her zaman toplamla aynıdır.
- **Döküm:** Aynı ad ve yüzdedeki vergiler tek satırdır, büyük oran önce gelir. Matrah, o oranın uygulandığı vergisiz tutardır. Oranın kendi adı yoksa mağazanın vergi adı kullanılır. Bir kaleme aynı ad ve yüzdede iki oran uygulanırsa ikincisi ayrı satırdır, matrah iki kez sayılmaz.
- **Hesap:** Tutarlar kuruş, oranlar milyonda bir birimindedir. Hesap BigInt ile yapılır, küsuratlı sayı kullanılmaz. Güvenli tam sayı sınırını aşan sonuç hata verir.

## Neden

- Aynı tutarın sepette, siparişte ve e-postada farklı çıkmaması için tek işlev gerekir (kural dosyası).
- Hesap işlevi veritabanına dokunmaz: sipariş anındaki oranı yazmak, iadeyi hesaplamak ve testi elle hesaplanmış örnekle yapmak aynı işlevle olur.
- Bölgesi bulunamayan müşteride mağaza adresine düşmek, kuralın ve kartın istediğidir. Hiçbir bölge yoksa durmak, yanlış yapılandırılmış bir mağazanın sessizce vergisiz satış yapmasını önler.
- En özel oranın geçmesi hem bir ile özel oranı hem üst üste binen vergileri yazmaya izin verir.
- Kargo sınıfının vergi tablosunda durması, silinmiş sınıf kuralının kargo için de aynı çalışmasını sağlar. Ayar olarak bir sınıf kimliği tutmak, başlangıç dosyasında kimlik bilinmediği için yazılamazdı.

## Düşünülen diğer yollar

- **Bölge bulunamadıyı sınıf sınıf değerlendirmek:** Seçilmedi. Bir ürünün sınıfının o ülkede oranı yoksa mağazanın ülkesinin oranı uygulanırdı. Bölgesinde bilerek vergisiz bırakılmış bir ürün vergilenirdi.
- **Uyan bütün oranları toplamak:** Seçilmedi. İl oranı ülke oranının üstüne binerdi, bir ile özel oran yazılamazdı.
- **Ara toplamda oranı kaydına göre gruplamak:** Seçilmedi. Aynı yüzdeli iki sınıf (örneğin ikisi de %18) ayrı yuvarlanırdı, dökümdeki tek satırın vergisi matrah × oran'la tutmazdı.
- **Bölge yokken vergisiz devam etmek:** Kullanıcı seçmedi.
- **Bankacı yuvarlaması (yarımı çifte):** Seçilmedi. Fatura ve muhasebe yaygın olarak ticari yuvarlamayı kullanır.
- **Kargo sınıfını mağaza ayarında kimlik olarak tutmak:** Seçilmedi. Başlangıç dosyası sınıfın kimliğini bilemez, sınıf silinince ayar ile tablo ayrı düşerdi.
- **Vergisiz tutarı yuvarlayıp vergiyi farktan bulmak:** Seçilmedi. Yasal tutar vergidir, dökümdeki vergi tutarı doğrudan yuvarlanmış değer olmalıdır.

## Sonuçları

- Ara toplam yuvarlamasında bir kalemin vergisi, tek başına hesaplansaydı çıkacak tutardan bir kuruş farklı olabilir. Toplam her zaman doğrudur. Oran kümesi farklı kalemlerde (biri yalnız %18, öteki %18 ve ek bir oran) aynı oran ayrı yuvarlanır. Bu yüzden dökümde o oranın vergisi matrah × oran'dan bir iki kuruş farklı olabilir.
- Silinmiş sınıfların oranları bölgeyi saydırmadığı için, bir ülkenin oranı yalnız silinmiş sınıflarda kaldıysa o ülkeye satışta mağaza adresi kullanılır. Bütün etkin sınıfları silinmiş bir mağazada vergilenecek ürünle hesap durur. Fatura satırlarıyla aynı tutar isteyen site satır satır yuvarlamayı seçer.
- Bölgesi tabloda olmayan bir ülkeye satış, mağazanın ülkesinin oranıyla vergilenir. Yurt dışına vergisiz satış isteyen mağaza o ülke için %0 oranı yazmalıdır.
- Kurulmuş bir sitenin tablosuna başlangıç dosyasındaki kargo işareti gelmez (karar 0060: başlangıç bir kez yazılır). Böyle bir sitede kargo sınıfı panelden ya da `kargoSinifiniDegistir` ile seçilir. Bugün yayında vergi tablosu kurulmuş site yoktur.
- Eksi tutar (indirim, iade) bu işleve girmez. İndirim önce kampanya hesabından düşülür, iade kendi akışıyla aynı kuralları kullanır (sipariş bölümü).
- Hesap sonucu sepet ve siparişe yazılmaz. O, sipariş bölümünün işidir.
