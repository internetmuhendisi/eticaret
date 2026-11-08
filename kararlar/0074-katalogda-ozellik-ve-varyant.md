# 0074 · Başlangıç kataloğunda özellik ve varyant

## Tarih

2026-11-08

## Karar

- **Özellikler:** `baslangic/katalog.json` yeni bir `ozellikler` listesi taşır. Tanımlar panelin özellik girdisinden alınır (`ozellikGirdisi`), sıra alanı yoktur, sıra dosyadaki sıradır. Ürün değerlerini `{ "ozellik": "<ad>", "deger": ... }` biçiminde verir. Özellik adıyla bağlanır, çünkü özelliğin adres adı yoktur. Liste türünde değer seçeneğin adıdır, kurulum onu seçeneğin kimliğine çevirir.
- **Değer denetimi dosyada:** Site doğrulaması özellik tanımını servisin alanlar arası kurallarıyla (`ozellikAlanKurallari`; seçenek yalnız listede), değeri servisin kendi değer şemasıyla (`degerSemalari`) denetler. Liste değerinin seçenekler arasında olmasını, özelliğin tanımlı olmasını ve tekrarı da denetler. Ad tekilliği harf ayrımsız aranmaz: ad anahtarı yalnız veritabanında hesaplanır (karar 0064). Onu her sitenin kataloğunu gerçekten kuran test yakalar (`site-kataloglari.test.ts`).
- **Varyantlar:** Ürün `secenekler` (ad ve değer adları) ve `birlesimler` taşır. Birleşimin `degerler` alanı seçeneklerin sırasıyla değer adlarıdır, örneğin `["XL", "Beyaz"]`. Birim alanları panelin birleşim girdisinden alınır. Birleşimin kendi `fiyat`, `stok` ve `gorsel` alanları vardır; `gorsel` ürünün galerisindeki dosya adıdır.
- **Seçenekli üründe ürün düzeyinde birim bilgisi yok:** Fiyat, stok, stok kodu, barkod ve ölçüler seçenekli üründe yalnız birleşimlerde yazılır. Ürünün kendisinde yazılırsa doğrulama reddeder (`varyant-birim-alani`). Birleşimler fiyatı ürününkinden devralmaz, her birleşimin fiyatı açıkça yazılır.
- **Kurulum panelin yoluyla:** Ürün basit birimiyle eklenir, ilk seçenek basit birimi siler, sonra birleşimler eklenir (karar 0071). Değişiklik kaydında silinen basit birim görünür.
- **Kurulu sayma ve kilit:** Özellik tablosu da "katalog kurulu mu" sorusuna girer. Katalog işlemi özellik kilidini etiket kilidinden sonra, ürün kilidinden önce alır. Hiçbir iş ürün kilidinden sonra özellik kilidini almaz: ürün servisi özellik kilidini hiç almaz, özellik servisi ürün kilidini hiç almaz.

## Neden

- Panelin girdi şemalarını kullanmak, dosyadaki bir ürünün panelden girilebilecek bir ürün olmasını sağlar (karar 0070 ile aynı ilke). Alanlar iki yerde ayrışmaz.
- Değerleri seçeneklerin sırasıyla yazmak, iki seçenekte aynı değer adı olsa bile anlamı belirsiz bırakmaz ve tablo gibi okunur.
- Birleşimin fiyatını açıkça yazmak, "hangi fiyat nereden geldi" sorusunu dosyada bırakmaz. Devralma kuralı başka bir kural daha demekti ve panelde karşılığı yok.
- Özellik tablosunu kurulu saymaya katmazsak panelden özellik açılmış bir sitede katalog aynı adla özellik açmaya çalışır ve hata verir.

## Düşünülen diğer yollar

- **Birleşimin değerlerini nesneyle yazmak** (`{ "Beden": "XL", "Renk": "Beyaz" }`): Okunur, ama seçenek adlarının dosyada iki kez yazılmasını ve yazım farkında ayrı bir hatayı gerektirir. Sıralı liste panelin birleşim girdisine (değer listesi) daha yakın.
- **Seçeneklerden bütün birleşimleri kendiliğinden üretmek:** Kısa olurdu, ama birleşime özel stok kodu, fiyat ve stok yine ayrıca yazılmalı. Olmayan birleşim (satılmayan bir beden-renk) de yazılamazdı.
- **Ürünün fiyatını birleşimlere varsayılan yapmak:** Yukarıdaki nedenle seçilmedi.
- **Özelliği kendi adres adıyla bağlamak:** Özelliğin adres adı yok, yalnız katalog için bir ad uydurmak gerekirdi.

## Sonuçları

- Varyantlı ürünün dosyası uzundur: her birleşim fiyatıyla ayrı yazılır (Örnek Mağaza'da 14 birleşim).
- Harf ayrımsız ad tekrarı (özellik, seçenek, değer) dosya doğrulamasında değil, kataloğu kuran testte yakalanır.
- Özellik tanımlamış ama başka bir şeyi olmayan sitede katalog artık kurulmaz.
- Örnek Mağaza (kullanıcı kararı): Kumaş tek seçimli liste kaldı; Kapüşonlu Sweatshirt'te Kumaş Pamuk, karışım bakım notunda yazılı. Lacivert indirimi sabit tarihlidir (15 Kasım–1 Aralık 2026). Katalog 15 Kasım'dan önce kurulursa üstü çizili eski fiyat 649,90 görünür, 2026-11-08'de ölçüldü. Sonra kurulursa indirimden önceki geçmiş olmadığı için görünmemesi beklenir (Kablosuz Kulaklık gibi), bu ölçülmedi.
- Örnek Mağaza'nın "Basic Tişört" ürünü çekirdekteki bir örnek metinle çakıştı (değişiklik kaydının "Basic " kalıbı, karar 0062). Katalogdaki adlar çekirdekte geçemez (`cekirdek/testler/site-adi-yok.test.ts`), bu yüzden çekirdekteki örnek "Basic Kazak" oldu. Yayınlanmamış 0.19.0 notu da buna dahil.
