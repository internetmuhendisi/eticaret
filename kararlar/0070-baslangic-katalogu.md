# 0070 · Başlangıç kataloğu site klasöründe, arka plan süreci açılırken bir kez yazılır

## Tarih

2026-11-08

## Karar

Bir sitenin ilk kategorileri, markaları, etiketleri ve ürünleri (fiyatı ve stoğuyla) sitenin klasöründe `baslangic/katalog.json` dosyasında veri olarak durur (kart 0084). Örnek Mağaza'nın örnek ürünleri bu dosyadadır, çekirdeğe girmez.

- **Ne zaman:** Arka plan süreci açılırken `katalogBaslangiciniKur` (`cekirdek/moduller/urun/baslangic.ts`) çalışır. Katalog hiç kurulmamışsa, yani ürün, kategori, marka ve etiket tablolarında (silinmiş bile olsa) tek satır yoksa dosya yazılır. Sonra dosya kullanılmaz; dosya yine her açılışta ve `pnpm site-dogrula`'da şemadan geçer (karar 0055, 0060'taki yol). Yazılamazsa hata kaydedilir, kuyruk yine çalışır, sonraki açılışta yeniden denenir.
- **Nasıl:** Yalnız servislerle: `kategoriEkle`, marka ve etiket servisinin `ekle`'si, `urunEkle`, `fiyatYaz`, `stokDuzelt` (sebep `yeni-mal`) ve ilgili ürünler için `urunDegistir`. Doğrulama, adres adı, değişiklik kaydı, fiyat geçmişi ve stok geçmişi panelden girilen bir üründeki gibidir. Yazan `baslangic-katalog` adlı sistem işlemidir.
- **Tek işlem:** Bütün katalog tek veritabanı işleminde yazılır. Bir parça yazılamazsa hiçbir parçası kalmaz. Bunun için bu servisler bağlantı havuzunun yanında bir işlemi de kabul eder ve kendi işlemlerini onun içinde kayıt noktası olarak açar. İşlem önce kendi kilidini (`katalog-baslangic`), sonra kategori, marka, etiket ve ürün kilitlerini alır; katalog kurulu mu sorusu ancak bundan sonra sorulur. Böylece aynı anda açılan iki süreç kataloğu iki kez yazmaz ve o anda panelden açılmakta olan bir kategori, marka, etiket ya da ürün kataloğa karışmaz (bağımsız kontrolün bulgusu). Vergi kilidi en son, yalnız vergi tablosu kurulmamışsa alınır. Hiçbir iş ürün kilidinden sonra kategori ya da grup kilidini, vergi kilidinden sonra ötekileri almaz.
- **Dosyanın biçimi:** Şema `cekirdek/moduller/urun/baslangic-semasi.ts` dosyasındadır, alanlar panelin girdi şemalarından alınır. Kimlik yerine adres adı yazılır. Ürün kategoriye, markaya, etikete ve ilgili ürüne bunların adres adıyla, vergi sınıfına sınıf adıyla bağlanır. Fiyat kuruş, zaman sitenin saat diliminde yereldir. Denetim iki katmandır (bağımsız kontrolün bulgusu: ilk hâlinde alanlar arası kurallar denetlenmiyordu, servisin reddedeceği dosya doğrulamadan geçiyordu):
  - Site doğrulaması (`pnpm site-dogrula` ve açılış): alanlar; karşılığı olmayan bağlantı, aynı adres adı, listede tekrar ve sınır, ürünün kendisini ilgili seçmesi, stok takibi kapalı üründe stok; servislerin alanlar arası kuralları aynı işlevlerle (`urunAlanKurallari`, `fiyatAlanKurallari`); yerel zamanın sitenin saat diliminde var olması; vergi başlangıcında olmayan sınıf.
  - Veritabanında aranan kurallar (aynı ad, aynı stok kodu) doğrulamada yoktur: ad anahtarı yalnız veritabanında hesaplanır (karar 0064). Onları her sitenin kataloğunu boş bir veritabanına gerçekten kuran test yakalar (`cekirdek/moduller/urun/testler/site-kataloglari.test.ts`), her yayında.
- **Hangi ürünün neyi denediği:** Sitenin `KURALLAR.md` dosyasındaki tabloda yazar. Her durumu sitenin kendi testi (`siteler/ornek-magaza/testler/katalog.test.ts`) gerçek veritabanıyla ve sabit zamanla dener.
- **Örnek Mağaza'nın ürünleri (kullanıcı kararı):** Ürünler, fiyatlar ve stoklar kullanıcının listesidir. Kartın istediği ama listede olmayan durumlar için önerilen ve kabul edilen yollar: gizli ve kategorisiz Hediye Paketleme, en az 2 en çok 6 adetli Porselen Kupa, iki kategorili Pamuklu Bez Çanta, uydurma "Örnek Ses" markalı ve iki etiketli Kablosuz Kulaklık, Porselen Kupa'nın elle seçilmiş iki ilgili ürünü.

## Neden

- Siteye özgü veri çekirdeğe girmez (değişmez kural 1). Dosya, vergi başlangıcındaki gibi site klasöründe durunca yeni bir site kendi kataloğuyla çekirdeğe dokunmadan başlar.
- Servislerden geçmek, dosyadaki ürünün panelden girilen üründen farklı bir yolla veritabanına girmesini önler. Doğrudan yazmak kuralları ikinci bir yerde tekrar ederdi; kart da bunu yasaklıyor.
- Tek işlem olmazsa yarıda kalan yazım "katalog kurulmuş" sayılır ve eksik katalog bir daha tamamlanmazdı.
- Arka plan süreci her sitede ve her yayında açılır. Sunucuya yeni bir adım eklemez, yeni bir komut ve geçici kutu gerektirmez. Uygulama süreci yerine arka plan sürecinde olması, ziyaretçi isteğinin açılışta bekletilmemesi içindir.
- Silinmiş satırları da saymak, bütün ürünlerini silen mağaza sahibinin örnek ürünleri geri görmemesini sağlar.

## Düşünülen diğer yollar

- **Ürünleri ilk okumada yazmak (mağaza ayarı ve vergideki gibi):** Seçilmedi. Katalog altı modüle yazar; her okumanın bunu tetiklemesi okumayı yazmaya ve kilitlere bağlardı.
- **Ayrı bir kurulum komutu:** Seçilmedi. Sunucuda sitenin gizli bilgileriyle çalışan geçici bir kutu gerekirdi (karar 0054'teki gibi). Site kurma komutu gelince aynı işlevi çağırabilir.
- **Doğrulamada alanlar arası kuralları yeniden yazmak:** Seçilmedi. Kural iki yerde ayrışırdı; servisteki kurallar saf işlevlere çıkarıldı, ikisi de onları kullanır.
- **Servisleri bağımsız işlemlerle çağırıp sonuna bir "kuruldu" işareti koymak:** Seçilmedi. İşaretten önce düşen yazım yarım katalog bırakır, sonraki deneme ilk parçalarda çakışırdı.
- **Veriyi veritabanı değişikliğiyle (SQL) yüklemek:** Seçilmedi. Değişiklikler bütün sitelere uygulanır ve servisleri atlar.
- **Dosyada kimlik yazmak:** Seçilmedi. Kimlik veritabanında üretilir; adres adı dosyada okunur ve zaten tekildir.

## Sonuçları

- 0.27.0 ile açılan, dosyası olan ve kataloğu boş site ürünlerini kendiliğinden alır. Sunucudaki Örnek Mağaza'ya ürünler bu sürümün o siteye yayınıyla gider; yayın kullanıcının onayıyla yapılır.
- Örnek Mağaza'nın tarihleri gerçektir. 1 Aralık 2026'dan sonra kurulan ya da bakılan demoda indirim görünmez, Yılbaşı Kupa Seti yayındadır. Testler zamanı kendileri verir, etkilenmez.
- Kablosuz Kulaklık doğrudan indirimle girildiği için indirimden önceki 30 günde fiyatı yoktur, eski fiyat görünmez (karar 0067).
- Kilit kurulum boyunca katalog, vergi, kategori, marka, etiket ve ürün yazmalarını bekletir. Kurulum boş sitede saniyeden kısadır. Büyük bir katalog (içe aktarma) bu yolla değil, içe aktarma kartıyla yüklenmelidir; dosya en çok 1000 ürün alır.
- Dosya değişince kurulu katalog değişmez. Örnek Mağaza'da yeni durum denemek için ya ürün panelden eklenir ya da veritabanı yeniden kurulur.
- Veritabanında aranan bir kurala aykırı dosya `pnpm site-dogrula`'dan geçer, kontrol hattında kırmızı olur. Hattan geçmeden elle yapılan bir yayında sunucu her açılışta yalnız hata kaydeder, katalog kurulmaz.
- Bugün kataloğu olan tek site Örnek Mağaza'dır. Gerçek bir mağazanın ilk ürünleri de bu dosyayla gelebilir; dosyayı hazırlamak site kurma komutunun işi olur.
