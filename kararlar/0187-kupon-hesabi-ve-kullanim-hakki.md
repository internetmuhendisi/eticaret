# 0187 · Kuponun hesabı, siparişteki kaydı ve kullanım hakkı

## Tarih

2026-11-26

## Karar

Kupon (kart 0312) kampanya modülündedir (`cekirdek/moduller/kampanya/`). Geçerliliği ve indirimi tek saf işlev verir (`kuponuUygula`); sepet hesabı (`sepetiHesapla`) onu çağırır, ödeme, sipariş, e-posta, fiş ve iade sonucu siparişin kaydından okur. Ürün kararları karar 0185'tedir; buradakiler teknik kararlardır:

- İndirim fiyat girişi biçimindeki tutarlardan hesaplanır: yüzde kapsamın toplamından bir kez yuvarlanır, tutar kuponu kapsamın toplamını aşmaz ve kargoya uygulanmaz. İndirim kapsamdaki satırlara tutarlarıyla orantılı dağılır, artan kuruş vergi modülünün kuralıyla (`oranlaDagit`).
- Kupon ürünleri sıfıra indiremez (kullanıcı kararı): yüzde en çok 99'dur, indirim bütün ürünlerin toplamından en az 1 kuruş bırakır. Toplamı sıfır sipariş, ödemesiz sipariş ve sıfır tutarlı kart kalemi böylece hiç oluşmaz.
- Ücretsiz kargo kuponu kargosu zaten ücretsiz ya da kargosuz sepette geçmez (`kargo-ucretsiz`, kullanıcı kararı): müşteri bir şey kazanmadan hakkını harcamaz.
- Vergi hesabı satırın indirimini alır (`HesapSatiri.indirim`): vergi indirimden sonraki tutardan, aynı kurallarla. Sepet hesabı iki kez yapılır: kupondan önceki hesap satırların tutarını ve ara toplamı, kupondan sonraki hesap vergiyi, kargoyu ve toplamı verir. Kuponun gösterimdeki indirimi iki hesabın toplam farkıdır; satırların payı bu farkın, indirim alan satırlara giriş biçimindeki indirimleriyle orantılı dağılımıdır (bağımsız kontrolün bulgusu: ara toplam yuvarlamasında vergi yeniden dağılınca kapsam dışı satırın gösterimi bir kuruş oynayabilir, satır satır fark eksi pay doğurabiliyordu). Böylece ara toplam − kupon + kargo (hariç gösterimde + vergi) her ayarda toplamdır, pay hiç eksi olmaz.
- Siparişe kupon kodu, türü, ürün indirimi ve (ücretsiz kargo kuponunda) verilmeyen kargo ücreti; kaleme payı yazılır. Kalemin vergisiz tutarı ve vergisi kupondan sonradır: iade hesabı değişmeden müşterinin ödediğini döndürür.
- Kullanım hakkı stok ayırmasının kalıbıyla ayrılır: ödeme oturumu açılırken, oturumla aynı işlemde ve aynı süreyle (`kupon_kullanimlari`); kuponun satırı kilitlenir, sınırlar kilitten sonra sayılır. Sipariş kurulunca kullanım siparişe bağlanır. Ödeme başarısız olunca ya da oturum silinince ayırma gider; oturumun ayırmalarını birlikte bırakan tek işlev `oturumunAyirmalariniBirak`'tır. İptalde ve siparişin tamamı iade edilince kullanım serbest bırakılır.
- Kişi başı sınır kişi bilinince sayılır: ödeme adımında (üyede hesap, üye olmayanda e-posta, ikisinden biri tutarsa aynı kişi). Müşteri yeniden onaylarken bir önceki oturumunun ayırması ön kontrolde sayılmaz; kesin sayım ayırmada, kilitle yapılır. Sepet ucu oturumsuzdur ve tema demosunda açıktır: orada kişi başı sınır sayılmaz.
- Kartla ödemede sipariş bankadan dönüşte kurulurken kupon oturuma kimliğiyle yazılmış hâlinden bulunur ve oturumun açıldığı ana göre denetlenir; oturumun kendi ayırması sınıra sayılmaz. Ayırma geçerliyken mağaza kuponu kapatsa ya da silse de kupon geçer (müşteri ödemeyi kupon geçerliyken başlattı; bağımsız kontrolün bulgusu). Ayırmanın süresi dolup sınır başkasınca doldurulduysa sipariş kurulmaz, ödeme iptal edilir (stokla aynı).
- Kullanılmış kuponun kodu, türü, değeri, kapsamı ve "indirimde geçmez"i veritabanındaki tetikleyiciyle de değişmez (karar 0185'in kuralı). Kod tekilliği her zaman harf ayrımsızdır; müşterinin yazdığı kodun harf büyüklüğünün fark edip etmediği altyapı sahibinin ayarıdır (`kuponKoduHarfDuyarli`).
- Kartla ödemenin kuruluşa giden kalemi kalemin ödenen tutarıdır (vergisiz artı vergi, kupondan sonra); kuponla sıfıra inen kalem gönderilmez (ürünlerin toplamı sıfıra inmediği için en az bir ürün kalemi kalır).

## Neden

- Fiyat girişi biçimi mağaza sahibinin fiyat yazdığı biçimdir; vergi hesabı da o biçimle çalışır. Gösterim biçiminde dağıtılan indirim, dahil ve hariç farklıyken vergi hesabına ikinci bir çevirme ve yuvarlama eklerdi.
- İki hesap, tek vergi işlevini ve tek yuvarlama kuralını korur: kuponun vergisi için ayrı bir formül yazılmaz, satır ve ara toplam yuvarlaması kendiliğinden geçerli kalır.
- Kullanım hakkı ödeme oturumunda ayrılmazsa kartla ödemede para çekildikten sonra sınır dolmuş çıkabilir; stok ayırmasıyla aynı kalıp bu yarışı aynı yerde ve aynı kilit sırasıyla çözer.
- Oturumun açıldığı an, müşterinin "Siparişi onayla"ya bastığı andır: kupon o an geçiyorsa bankadan dönüşün gecikmesi müşteriye yüklenmemeli.

## Düşünülen diğer yollar

- İndirimi sepet toplamından tek satır olarak düşmek, vergiyi kupondan önceki tutardan hesaplamak: müşteri ödemediği tutarın vergisini öder, fatura tutmaz.
- Kullanımı yalnız sipariş kurulurken saymak: kartla ödemede sınır aşılır ya da ödenmiş sipariş iptal edilir.
- Kişi başı sınırı sepet ucunda da saymak: uç oturumsuzdur; e-posta sepette bilinmez, üyenin oturumunu okumak ucu tema demosunda ve önbellekte değiştirirdi.
- Kartla ödemede kuponu dönüş anında yeniden denetlemek: süre bitişine denk gelen ödeme iptal edilirdi.

## Sonuçları

- Giriş ile gösterimin farklı olduğu sitede ara toplam yuvarlamasıyla çok küçük kuponun gösterimdeki indirimi 0 kuruş olabilir (indirim verginin içinde kalır); toplam yine doğrudur.
- Kuponlu sepette vergi hesabı iki kez yapılır (aynı ayar ve tablo okumasıyla, `vergiHesaplari`).
- Tutar kuponunun değeri fiyat girişi biçimindedir: giriş ve gösterim farklı sitede (hariç giriş, dahil gösterim) 50,00'lık kupon müşteriye vergisiyle görünür. Bugünkü sitelerde ikisi aynıdır.
- Sipariş tablosunda ara toplam kupondan öncedir; raporlar indirimi ayrı alandan okur (kart 0317).
- Sepette geçmeyen kupon kodu depoda kalır, sepet değişince yeniden denenir; ödemeye yalnız sepette uygulanmış kupon gider.
- Kişisel veri temizliği kullanımın e-postasını siler: saklama süresinden sonra kişi başı sınır o siparişi e-postayla saymaz (hesapla sayar).
