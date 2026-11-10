---
paths:
  - "cekirdek/vitrin/**"
  - "cekirdek/moduller/duzen/**"
  - "cekirdek/moduller/menu/**"
  - "cekirdek/katalog/deneme-bolumu/**"
  - "cekirdek/uygulama/app/**"
  - "cekirdek/temalar/**"
  - "siteler/**"
  - "**/sitemap*"
  - "**/robots*"
---

# Vitrin yapısı

- Ana sayfa afişi, ürün ızgarası, kategori listesi, yorum alanı gibi vitrin bölümlerini ortak bileşenlerden kur ve site tasarım değerleriyle giydir.
- Ortak bileşenle yapılamayan vitrin bölümünü o sitenin klasöründe yaz. İkinci bir sitede de gerekince çekirdeğe taşı.
- Sepet, ödeme formu, adres formu, stok kontrolü ve sipariş takibi bütün sitelerde aynı koddur. Yalnız görünümü site tasarımıyla değişir.
- Ana sayfanın ilk düzenini sitenin klasöründe başlangıç değeri olarak yaz (`baslangic/duzen.json`, yoksa temanın düzeni). Sonraki düzen mağaza sahibinin ayarıdır, veritabanında durur ve panelden değişir (karar 0010). Düzen değişikliği kod değişikliği gerektirmesin.
- Sitenin başlangıç düzeni kategori, marka, etiket ve ürüne adres adıyla başvurur; adres adı başlangıç kataloğunda olmalıdır. Düzen katalogdan sonra kurulur ve adres adları `baslangicDuzeniniBagla` ile kimliğe çevrilir (`cekirdek/moduller/duzen/baslangic.ts`, karar 0092). Görsele `baslangic/gorseller/` klasöründeki dosyanın adıyla başvurur; görsele başvuran düzeni yalnız arka plan sürecinin açılıştaki kurulumu yazar (karar 0094). Açılıştaki kurulum `baslangiclariKur` (`cekirdek/arka-plan-isleri/baslangic.ts`) ile yapılır; tarayıcı testlerinin hazırlığı da onu çağırır (karar 0097). Temanın düzeni kayda başvurmaz, metin isteyen bölüm de koymaz.
- Ürünün listede, aramada, önerilerde ve sepette görünen kartını tek bileşenden çıkar.
- İndirimli fiyatı, üstü çizili eski fiyatı ve para birimini her yerde tek fiyat bileşeniyle göster.
- Sayfa başlığı, açıklama, yapılandırılmış veri ve paylaşım görselini sayfa türüne göre ortak bir üreticiden al.
- Ürün ya da kategori adresi değişince eski adresi kalıcı olarak yenisine yönlendir. Site haritası kendiliğinden üretilsin.

## Ürün kartı ve fiyat (karar 0085)

- Ürünün kartı `UrunKarti`, fiyatı `FiyatGosterimi` ile çizilir (`cekirdek/vitrin/urun-karti/`). Kartın verisi yalnız `urunKartlari` ile gelir: görünürlük, fiyat aralığı, indirim oranı, stok durumu ve görsel çekirdeğin tek işlevlerinden. Kartta ya da bölümde fiyat, oran ya da stok durumu yeniden hesaplanmaz.
- Kartın görünümü `urunKartiGorunumu` ile bulunur: bölümün seçimi, yoksa temanınki (vitrin bağlamındaki `parcaGorunumleri`). Görünümler `cekirdek/kayitlar/tema.ts` kaydındadır.
- Ürün görseli yalnız ürün görseli ucundan (`urunGorseliAdresi`) gösterilir; dosyanın kimliği vitrinde adres olmaz.

## Ana sayfa bölümleri ve görseller (karar 0087)

- Ana sayfa düzenin ana sayfa alanını çizer; bölüm yoksa sade sayfa görünür. Bölümün başlığı h2'dir, sayfanın h1'i mağaza adıdır.
- Bölümün ve kategorinin görseli yalnız vitrin görseli ucundan (`vitrinGorseliAdresi`) ve `BolumGorseli` ile (`cekirdek/vitrin/bolum-kutuphanesi/gorsel.tsx`) gösterilir. Görselin ölçüsü ve adresleri vitrin bağlamındadır; bölüm görsel adresi yazmaz.
- Bölüm metnindeki ayar değeri yalnız yer tutucuyla gelir (`cekirdek/kayitlar/yer-tutucular.ts`, `yerTutuculariDoldur`). Değeri olmayan yer tutucuyu taşıyan metin çizilmez.
- Renkli zemin `zeminSiniflari` ile okunur çiftiyle seçilir (`cekirdek/vitrin/bolumler/ortak/zemin.ts`), renkli zeminde odak yazının rengindedir.
- Kendiliğinden hareket eden bölüm durdurulabilir ve hareket azaltma tercihinde kendiliğinden hareket etmez (`useHareketAzaltma`).

## Ürün bölümleri (karar 0088)

- Ürün gösteren bölüm ürünlerini yalnız ürün kaynağından, vitrin bağlamı üzerinden alır (`kaynaklarinUrunleri`, `cekirdek/vitrin/urun-kaynagi.ts`; anahtar `urunKaynagiAnahtari`). Kaynakta görünürlük, tükenen ürün ve sıra sorgudadır; bölüm ürünü yeniden süzmez, sıralamaz.
- İndirimdeki ürünün listesi yalnız `indirimdekiUrunKosulu` ile süzülür. Kartta görünen indirim tek ölçüdür: rozeti çıkaran oran (`fiyat.indirim`); geri sayım, "indirimdekiler" ve fırsatlar ona bakar. İndirimin bitişi kartın fiyatından (`indirimBitisi`) okunur; geri sayımın bitişi elle girilmez, bölümde hesaplanmaz.
- Ürün bölümünün ızgarası, başlık satırı ve yan afişi ortak parçalardır (`cekirdek/vitrin/bolumler/ortak/urun-izgarasi.tsx`, alanları `urun-alanlari.ts`).
- Sayfa açıkken değişen vitrin bilgisi (geri sayım) sunucuda bağlamın anıyla çizilir, tarayıcıda yalnız değişeceği anda yeniden kurulur.

## İşleve bağlı bölümler (karar 0090)

- Yorum, blog ve bülten bölümlerinin verisi vitrin bağlamındadır (`yorumlar`, `blogYazilari`, `bultenKaydi`; türleri `cekirdek/vitrin/bolum-kutuphanesi/islev-verisi.ts`). İşlev yazılınca bağlamı bu türlerle doldur, bölümü değiştirme. Bülten bölümü bağlamda gönderim adresi yoksa çizilmez.
- Bütün odaklanabilir öğeleri zemin renginde bir kutuda olan renkli bölge `zeminSiniflari(…, { odak: false })` kullanır: renkli zeminin odak kuralı iç kutuya geçip odağı görünmez yapar.
- Paneldeki çizilmeme nedeninin metni yalnız `cizilmemeNedeniMetni` ile seçilir. Yeni işlev eklenince `islevYokMetinleri`'ne metni eklenir (tür kontrolü ister).
- Pazarlama onayının metni tektir (`vitrin.onay.pazarlama`). Onay isteyen yeni form da onu kullanır.
- Her sayfada ya da ana sayfada duran robotlu form `useRobotluGonderim({ ertele: true })` kullanır: sayfa açılınca robot sorusu istenmez.

## Bölüm kütüphanesi (karar 0081)

- Üst kısım, ana sayfa ve alt kısım bölümlerden kurulur. Bölüm türünün tarifi (`cekirdek/vitrin/bolum-kutuphanesi/tarif.ts`) adını, konabileceği alanları, alanlarını ve türlerini, görünümlerini ve bağlı olduğu işlevi yazar. Alanların şeması, panelin düzenleme formu ve düzen servisi bu tariften çıkar.
- Yeni bölüm türü `cekirdek/vitrin/bolumler/<tür>/` klasörüne yazılır, tarifi `kutuphane.ts`'e, görünüşü `gorunumler.tsx`'e kaydedilir. Bölüm kodunda elle içerik (ürün adı, fiyat, görsel adresi, bağlantı, cümle) yazmak denetimde hatadır; içerik alan değerlerinden ve veriden gelir.
- Düzen yalnız `cekirdek/moduller/duzen/servis.ts` ile okunur ve değişir. Vitrin bölümleri `cizilecekBolumler` ile alır ve `DuzenAlaniCizimi` ile çizer: her bölüm kendi hata sınırının içindedir.
- Bölümün bağlı olduğu işlev `cekirdek/kayitlar/islevler.ts` kaydındadır. İşlev yazılınca orada açılır; bölüm kendiliğinden çizilir.

## Menüler (karar 0082)

- Menüler ve alt bilgi bağlantıları mağaza sahibinin verisidir. Yalnız `cekirdek/moduller/menu/servis.ts` ile okunur ve değişir. Türler, hedefler, derinlik ve sınırlar `cekirdek/kayitlar/menu.ts` kaydındadır: derinliği ya da hedef türünü kodda elle yazma.
- Vitrin menüyü koduyla `vitrinMenusu` ile alır. Görünmeyen öğeyi (silinmiş ya da açılmayan hedef, boş başlık) süzmek servisin işidir, bölüm yeniden süzmez. Kategori menüsü ağaçtan gelir, kategori listesini bölümde ayrıca okuma.
- Başlangıç menüleri sitenin `baslangic/menuler.json` dosyasındadır. Kayıtlı hedef adres adıyla yazılır, başlangıç kataloğunda olmalıdır.

## Üst ve alt kısım (karar 0083)

- Vitrin sayfaları `app/(vitrin)/` altındadır; çerçeve üst ve alt kısmı düzenden `UstKisim` ve `AltKisim` (`cekirdek/vitrin/ust-alt-kisim.tsx`) ile çizer. Yeni vitrin sayfası bu klasöre yazılır.
- Bölüm mağaza adı, logo, iletişim, sosyal hesaplar, menüler gibi veriyi yalnız vitrin bağlamından alır (`baglam.ts`); bağlam istek başına bir kez `vitrinBaglaminiOku` ile okunur. Bölüm veritabanına kendisi gitmez.
- Vitrinin adresleri `cekirdek/vitrin/adresler.ts` dosyasındadır; kategori, marka ve ürün sayfasının adresi `kayitAdresleri` ile kurulur.
- Henüz yazılmamış bir sayfaya giden düğme (arama, favori, sepet) işlevine bağlanır; işlev açılınca görünür.
- Müşterinin oturumu vitrinde yalnız `useHesapDurumu`, çıkış yalnız `cikisYap` ile (`cekirdek/vitrin/hesap-durumu.ts`, karar 0098): sayfada tek istek gider, yalnız 401 girişsizdir. Hesabım menüsü üst satırdadır, katalogun örnek bağlamında (`musteriOturumu: "ornek"`) istek gitmez.
- Radix tetikleyicisine (`asChild`) verilen ve ipucuyla sarılı parça (ikon düğmesi) sunucuda çizilen bölümde tetikleyicinin özelliklerini almaz; böyle bir parça tarayıcıda çizilen bileşene yazılır (`menu-dugmesi.tsx`).
