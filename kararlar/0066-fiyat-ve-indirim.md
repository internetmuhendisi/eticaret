# 0066 · Fiyat, indirim ve fiyat geçmişi

## Tarih

2026-11-08

## Karar

Fiyat satılabilir birime bağlıdır (karar 0062) ve yalnız `cekirdek/moduller/fiyat/servis.ts` ile okunur ve değişir (kart 0080).

- **Tablolar:** `birim_fiyatlari` birimin bugünkü fiyatıdır (birim başına bir satır). `fiyat_gecmisi` her değişikliğin tam hâlini yazıldığı anla tutar; güncelleme, silme ve boşaltma veritabanındaki tetikleyiciyle reddedilir (değişiklik kaydıyla aynı yol, karar 0045).
- **Tutar ve para birimi:** Kuruş olarak tam sayı (`tutar`, karar 0019). Para birimi yazıldığı andaki site ayarıdır (`paraBirimi`) ve her satırda saklanır. Saklanan para birimi sitenin bugünkü para biriminden farklıysa fiyat yok sayılır ve hata kaydedilir.
- **Girdi fiyatın tam hâlidir:** Satış fiyatı, indirimli fiyat, indirimin başlangıcı ve bitişi birlikte gelir; verilmeyen indirim alanı boş sayılır. İndirimi kaldırmak indirimli fiyatı göndermemektir. Geçmişin her satırı fiyatın bütününü taşır. Aynı kalan fiyat hiçbir yere yazılmaz.
- **Kurallar (kullanıcı kararları):** Satış fiyatı sıfır olabilir (ücretsiz ürün). İndirimli fiyat sıfırdan büyük ve satış fiyatından küçüktür. İndirimin başlangıcı da bitişi de isteğe bağlıdır: boş başlangıç hemen, boş bitiş indirim kaldırılana kadar demektir. Fiyatı girilmemiş birim kaydedilir ama satılamaz. Bitiş başlangıçtan sonradır. Kurallar serviste koddur, veritabanında denetimdir.
- **Zaman:** İndirim zamanları sitenin saat diliminde yerel olarak girilir ve `yerelZamandan` ile ana çevrilip saklanır (ürünün yayın zamanıyla aynı yol). Başlangıç anı dahil, bitiş anı hariçtir: bitişi `2026-11-16T00:00` olan indirim 15 Kasım günü sonuna kadar sürer. Panel gün seçtirirse bitiş günü ertesi günün gece yarısı olarak gönderilir.
- **Geçerli fiyat:** Bir anın fiyatını yalnız `gecerliFiyat` (`gecerli.ts`) verir. Sepet, ödeme, sipariş ve vitrin onu kullanır; birden çok birimin fiyatı tek sorguyla `gecerliFiyatlar` ile gelir.
- **Yazma:** Bugünkü fiyat, geçmiş satırı ve değişiklik kaydı aynı işlemde yazılır. Yazmalar ürün kilidini alır (`cekirdek/moduller/urun/kilit.ts`); geçmişin zamanı kilit alındıktan sonraki saattir (`clock_timestamp`), işlemin başladığı an değil. Silinmiş ürünün ya da birimin fiyatı değişmez, eski fiyatı okunur.
- **İzinler (kullanıcı kararı):** `fiyat.gor`, `fiyat.degistir`. Görevli fiyatı görür, değiştiremez.

## Neden

- Bugünkü fiyatı ayrı tabloda tutmak, sepet ve vitrinin geçmişi taramadan tek satır okumasını sağlar. Geçmişte tam hâl durduğu için kart 0081 "son 30 günün en düşük fiyatı"nı her an için yeniden kurabilir.
- Geçmişin değiştirilemezliğini veritabanına bırakmak, ileride yazılacak bir kodun ya da elle yapılan bir düzeltmenin geçmişi sessizce bozmasını önler. Fiyat geçmişi yasal bir yükümlülüğün (indirim öncesi fiyat) dayanağıdır.
- Para birimini satırda saklamak, ayar değişince eski tutarın yeni para birimiyle satılmasını önler.
- Fiyatı ürün değiştirme izninden ayırmak, ürün bilgisini düzenleyen çalışana fiyat yetkisi vermeden çalışmayı mümkün kılar.
- İşlemin başlangıç zamanı (`now()`) kullanılsaydı, önce başlayıp kilidi sonra alan işlem geçmişte önce görünürdü; bilerek bozulunca test kırmızıya düştü.

## Düşünülen diğer yollar

- **Yalnız geçmiş tablosu, bugünkü fiyat son satır:** Seçilmedi. Her vitrin ve sepet okuması birim başına en son satırı aramak zorunda kalırdı.
- **Fiyatı ürün tablosunda tutmak:** Seçilmedi. Varyantlarda her birleşimin kendi fiyatı olur (karar 0062).
- **Kısmi değişiklik (yalnız verilen alan):** Seçilmedi. İndirim alanları birbirine bağlıdır; tam hâl hem geçmişi hem kuralları basit tutar.
- **İndirimi gün olarak saklamak:** Seçilmedi. Saatli indirim (gece yarısı yerine 20.00'de başlayan kampanya) yapılamazdı; gün seçimi ekranın işidir.
- **Para birimi değişince fiyatı çevirmek:** Seçilmedi. Kur çekirdeğin işi değildir; fiyatlar yeniden girilir.
- **Görevliye fiyat değiştirme izni:** Kullanıcı seçmedi.
- **İndirimli fiyatın sıfır olabilmesi:** Kullanıcı seçmedi; ücretsiz ürün satış fiyatını sıfır yapmaktır.

## Sonuçları

- Fiyat ve ürün yazmaları aynı kilitten geçer. 30 mağazalık ölçekte sorun değildir; toplu fiyat değişikliği gelince ölçülmelidir.
- Fiyatı silmenin yolu yoktur: bir kez fiyat girilen birim fiyatsız kalamaz. Gerekirse ürün taslağa alınır.
- Para birimi ayarı değişirse bütün fiyatlar yeniden girilene kadar ürünler satılamaz. Bu ayar altyapı sahibinindir; değişiklik bunu bilerek yapılmalıdır.
- Ürün uçları ve fiyat ekranı yoktur. İzinler erişim testinde yalnız beklentiyle denenir; her uçta gerçek istekle denenmesi uçlar yazılınca olur.
- Geçmişin kalıcı silinmemesi, birimin kalıcı silinmesini de engeller (bağ `restrict`). Birim zaten işaretle silinir.
- Fiyat vergi dahil mi hariç mi girilir sorusu vergi ayarındadır (`fiyatGirisi`, karar 0061); fiyat modülü tutarı olduğu gibi saklar.
