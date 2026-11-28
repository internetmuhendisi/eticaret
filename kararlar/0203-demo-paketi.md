# 0203 · Demo paketi

## Tarih

2026-11-28

## Karar

Tema vitrinin görünüşüdür (karar 0080, 0092). **Demo**, bir sektöre özel dolu bir mağazanın içeriğidir ve bir **demo paketi** olarak durur. Yeni site bir paketle başlar (kart 0350), açık mağaza panelden bir paketi içe aktarır (kart 0347).

- **Yeri ve sürümü (teknik karar):** Paketler çekirdeğin içinde, `cekirdek/demolar/<kod>/` klasöründedir ve çekirdekle birlikte sürümlenir. Klasörün içi sitenin başlangıç klasörüyle aynı düzendedir: `paket.json` ve `baslangic/` (`katalog.json`, `gorseller/`, `menuler.json`, `duzen.json`, `sayfalar.json`, `blog.json`, `kuponlar.json`). İlk paket `demo1`'dir: Örnek Mağaza'nın içeriği.
- **Parçalar tek listede (`cekirdek/ayar-semasi/demo-paketi.ts`):** Pakette olanlar katalog, görseller, menüler, düzen, sayfalar, blog ve kuponlardır; paketin tanımında önerilen tema da yazar. Mağazanın kendisine ait olanlar pakette yoktur, sitede kalır: mağaza adı, logo, iletişim ve satıcı bilgileri, ödeme ve kargo ayarları (`baslangic/ayarlar.json`), vergi (`baslangic/vergi.json`), tema seçimi (`baslangic/tema.json`), e-posta metinleri, ekip. İçe aktarma (kart 0347) aynı listeyi okur.
- **Sitenin seçimi (site ayarı):** `baslangicDemosu`, altyapı sahibinin ayarı, varsayılanı yok (demosuz site kendi başlangıç dosyalarıyla ya da boş başlar). Örnek Mağaza ve Tema Galerisi `demo1`.
- **Parçanın sitede değiştirilmesi (kullanıcı kararı, Tema Galerisi için):** Site paketin bir parçasını kendi başlangıç dosyasıyla değiştirebilir; değiştirdiği parçalar `demoParcasiSiteden` ayarında açıkça yazılır. Listede olmayan bir paket parçası sitenin klasöründe bulunursa doğrulama hatasıdır, listede olup sitede bulunmayan da. İki kaynak bir parça içinde karışmaz. Tema Galerisi ana sayfa düzenini kendinden alır ("Öne çıkanlar" 10 ürün, kart 0116'nın kullanıcı kararı); Örnek Mağaza paketin düzenini (5 ürün) kullanır.
- **Mağazanın adı (kullanıcı kararı):** Paketin metinlerinde mağazanın adı yer tutucuyla (`{magazaAdi}`) yazılır; kurulumda (ve içe aktarmada) mağazanın kendi adı konur. Yer tutucu sabit sayfaların ve blog yazılarının başlığında, açıklamasında ve içeriğinde geçer; ötekilerde geçmesi doğrulama hatasıdır. Metin yer tutucudan sonra ek almayacak biçimde yazılır (Türkçe ek ada göre değişir). Şehir gibi öteki ayrıntılar demonun kendi metnidir.
- **Dil, para birimi ve saat dilimi (teknik karar):** Paket kendi dilini, para birimini ve saat dilimini tanımında yazar (`demo1`: Türkçe, TRY, Europe/Istanbul). Bunlardan biri sitenin ayarından farklıysa site o paketle başlayamaz (doğrulama hatası); çeviri ya da dönüştürme yapılmaz. Kod ülkeye bağlı yazılmaz, paket yazılır. Başka ülkede kurulacak site için o ülkenin paketi gerekir.
- **Vergi:** Vergi mağazanındır. Paket ürünlerinin kullandığı vergi sınıflarının adlarını tanımında yazar (`demo1`: `%20`); paketi kullanan sitenin vergi başlangıcında bu adlar olmalıdır (doğrulama).
- **Doğrulama:** Paket kendi başına (tanımındaki dil, para birimi, saat dilimi, vergi sınıfları ve önerilen temayla) ve onu kullanan her sitenin içinde, bugünkü site doğrulamasının başlangıç denetimlerinden geçer. Pakette hiçbir sitenin adı ya da kodu geçmez (`site-adi-yok.test.ts` paketleri de tarar). Paketin ürün ve marka adları yalnız `cekirdek/demolar/` altında geçebilir.
- **Sunucuya ve kutuya (teknik karar):** Site klasörünün bulunduğu yerden iki üst klasörün altındaki `cekirdek/demolar/<kod>` paketin yeridir: depoda `siteler/<kod>/` için deponun kendisi. Kutularda site `/siteler/<kod>` altına bağlanır, paketler `/cekirdek/demolar` altına salt okunur bağlanır. Yayın komutu sitenin paketini site klasörüyle aynı kayıttan çıkarıp yayının klasörüne (`<yayın>/demolar/`) koyar; yerel ortam deponun klasörünü bağlar. Çekirdeğin görüntüsü değişmez.
- **Kurulu mağaza:** Paket yalnız boş veritabanına kurulumda (ve kart 0347'de elle içe aktarmada) okunur. Paketin yeni hâli kurulu mağazayı değiştirmez (değişmez kural 3).

## Neden

- Demo içeriği her sitenin kendi kopyası olarak dururken kopyalar ayrışıyordu: Tema Galerisi Örnek Mağaza'nın elle alınmış eski kopyasıydı, indirim tarihleri, menü ve düzen ayrılmıştı (ölçüldü).
- Panelden içe aktarma çalışan çekirdekten yapılacak; paketin çekirdekle birlikte sürümlenmesi, hangi sürümün hangi paketi verdiğini sürüm notunda tek yerde gösterir.
- Paketi görüntüye koymak her demoyla görüntüyü onlarca MB büyütürdü ve görüntünün site adı denetimi paket içeriğini her üretimde tarardı; bugün yalnız kurulumda okunan bir veri için gereksiz. Kutuya bağlamak site klasörünün bugünkü yolunu kullanır, uygulama kendi yerini (paketlenmiş kodda değişen `import.meta`) bilmek zorunda kalmaz.
- Sitenin bir parçayı değiştirebilmesi, siteye özel bir kararı (Tema Galerisi'nin 10 ürünü) paketi bölmeden korur; listede açıkça yazılması parçanın nereden geldiğini klasöre bakınca belli eder.
- Mağaza adı yer tutucuyla yazılınca demo kuran her mağazada "Hakkımızda" sayfası kendi adını söyler.

## Düşünülen diğer yollar

- Paketin ayrı sürümlenmesi (`demolar/` kök klasöründe): seçilmedi. İki sürüm numarası olurdu; içe aktarma çekirdeğin hangi paket sürümünü desteklediğini ayrıca bilmek zorunda kalırdı.
- Paketin çekirdeğin görüntüsüne girmesi: seçilmedi, nedeni yukarıda. Kart 0347 bütün paketleri panelde sunarken yeniden ele alınır (yayın her paketi koyabilir ya da görüntüye girer).
- Paketin site klasörüne kopyalanması: seçilmedi; kopyaların ayrışması bugünkü sorundur.
- Tema Galerisi'nin paketi kullanmaması ya da paketin 10 ürünle değişmesi: seçilmedi (kullanıcı kararı).
- Metinlerin mağaza adı olmadan ya da demonun kendi adıyla yazılması: seçilmedi (kullanıcı kararı).
- Paketin dili ve para birimi farklı siteye çevrilerek kurulması: seçilmedi; tutar ve metin çevirisi ürün kararı ister, bugün bir ihtiyaç değil.

## Sonuçları

- Kutuların tanımına bir bağlama eklenir (`/cekirdek/demolar`); yayının klasöründe paket de durur. Eski yayınların kutusu bu klasörü bilmez, okumaz.
- Paketi kullanan site paketsiz okunamaz: yanlış ya da silinmiş paket kodu doğrulamada ve açılışta durur.
- Paketin bir parçası değişince onu kullanan her sitenin testleri ve doğrulaması çalışır; paketi değiştirmek sitelerin kurulu verisini değiştirmez, yalnız sonraki boş kurulumu.
- Yer tutucu bugün yalnız `{magazaAdi}`'dır; yeni yer tutucu bu kayda ek bir kararla gelir.
- Paketin ürün adları artık çekirdekte durur; "çekirdekte örnek ürün adı geçmez" denetimi `cekirdek/demolar/` dışını tarar.
