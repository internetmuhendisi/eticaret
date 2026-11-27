# 0201 · Fiyat girişinin değişikliği

## Tarih

2026-11-27

## Karar

Mağaza sahibi fiyat girişini (vergi dahil ya da hariç) vergi ekranından değiştirir (kart 0326; ilke karar 0185). Değişiklik önce önizlenir, onaylanınca kayıtlı tutarlar yeni girişe çevrilir ve müşterinin gördüğü fiyat değişmez.

- **Çevrilen tutarlar:** silinmemiş ürünlerin silinmemiş birimlerinin satış ve indirimli fiyatı (sitenin para biriminde), kargo ücreti, ücretsiz kargo sınırı, tutar kuponlarının indirimi ve kuponların en az sepet tutarı. Kullanılmış kuponun tutarı da çevrilir (kullanıcı kararı); kuponun kilidi yalnız bu işlemde açılır.
- **Oran:** ürün fiyatı ürünün sınıfının, kargo ücreti kargonun sınıfının oranıyla; birden çok oranlı tutarlar (ücretsiz kargo sınırı, kuponlar) sitede en çok ürünü olan vergi sınıfının oranıyla (kullanıcı kararı). Bölge, vitrinin fiyatı gösterirken kullandığı mağaza adresinin bölgesidir. Vergisiz ürün, vergi kapalı site ve verilmiş sipariş değişmez.
- **Kural:** yeni tutar, müşterinin şimdi gördüğü tutarın gösterim biçiminde girilmiş gibi yeni girişe çevrilmesidir; vitrinin gösterimiyle aynı işlevden (`giris-cevirisi.ts`). Vergi yuvarlaması bazı gösterimlere hiçbir tutardan ulaştırmaz (%20'de altıda biri): o fiyatlar müşteriye 1 kuruş farklı görünür; önizleme onları ürün adı ve seçimiyle söyler (ilk 20 satır, bütün liste CSV).
- **Fiyat geçmişi değişmez.** Girişin her değişikliği `fiyat_girisi_gecmisi`'ne yazılır (değiştirilemez); bir geçmiş satırının girişi zamanından önceki son değişiklikten bulunur. Eski fiyat (son 30 günün en düşüğü) satırları bugünkü girişe çevirerek karşılaştırır. Çevrilen fiyatlar geçmişe yeni satır olarak yazılır.
- **Tek işlem:** kilit sırası ürün (fiyat yazımlarıyla sıraya girer), kupon tablosu (eklenen kupon da bekler), mağaza ayarları, vergi tablosu; plan kilitlerin içinde yeniden kurulur. Uygulama önizlemenin sürümünü gönderir; arada fiyat, kupon, kargo ya da vergi tablosu değiştiyse hiçbir şey yazılmaz, ekran önizlemeyi yeniler.
- **Süren ödeme varken uygulanmaz** (siparişe dönmemiş, süresi dolmamış ödeme oturumu): çok adetli sepet satırının toplamı vergi yuvarlamasıyla kuruş kayabilir, süren ödemenin toplamı tutmaz ve sipariş kurulamazdı (kartlı ödeme iade edilirdi). Mağaza sahibi birkaç dakika sonra yeniden dener.
- **Açık kalmış eski sayfa:** fiyat girişi biçiminde tutar yazan ekranlar (kargo, ürünün fiyatları, kupon) gördükleri girişi gönderir; giriş arada değiştiyse kayıt çakışır, hiçbir şey yazılmaz (`gorulenGirisiDenetle`). Excel ile toplu ürün işlemlerinin yeni satırları kart 0337'de.
- Fiyat girişi artık yalnız bu işlevle değişir (`kendiIsleviyle`). İşlem vergiyi ve fiyatı değiştirme iznini birlikte ister (bugün yalnız mağaza sahibi).

## Neden

- Girişi değiştirip tutarları çevirmemek bütün vitrin fiyatlarını vergi oranı kadar değiştirirdi.
- Gösterimle aynı işlevden çevirmek "müşterinin gördüğü fiyat değişmez" sözünü kuralla korur; 1 kuruşluk istisnayı önceden söylemek sürprizi kaldırır.
- Geçmişi yeniden yazmak "fiyat geçmişi silinmez, değişmez" kuralını çiğnerdi; girişin değişikliklerini ayrı tutmak eski satırları doğru okumaya yeter.

## Düşünülen diğer yollar

- **Fiyat geçmişinin her satırına giriş sütunu eklemek:** Eski satırlara değeri yazmak sitenin o anki ayarını bilmeyi isterdi; değişiklik dosyası bunu bilemez (ayar başlangıç dosyasında da olabilir). Değişikliklerin ayrı tablosu bunu gerektirmez.
- **Kupon tutarlarını ve sınırı çevirmemek, mağaza sahibine söylemek:** Kullanıcı çevrilmesini seçti; çevrilmezse kuponlar vergi oranı kadar değer kazanır ya da kaybeder.
- **Sınır ve kuponları ağırlıklı ortalama oranla çevirmek:** Sepetin içeriğine bağlı tek doğru oran yok; en çok ürünü olan sınıf mağazanın çoğu sepetini temsil eder ve önizlemede adıyla söylenebilir.
- **1 kuruşluk farkları önlemek için fiyatı iki tutarla saklamak:** Bütün hesapları değiştirirdi; fark önizlemede söylenir.

## Sonuçları

- "Müşterinin gördüğü fiyat değişmez" birim fiyat içindir. Birden çok adetli satırda vergi satırın tutarından hesaplandığı için sepet toplamı birkaç kuruş değişebilir (bağımsız kontrolde yüzde yirmide 3 adetlik satırların çoğunda 1 kuruş ölçüldü); önizlemenin açıklaması bunu söyler.
- Sepette müşterinin teslimat bölgesi mağazanınkinden farklı orandaysa sepetteki tutar bugünkü gibi o bölgenin oranıyla hesaplanır; çeviri mağaza bölgesine göredir.
- Geri çevirme 1 kuruşluk farkları her zaman geri getirmez.
- Eski fiyat hesabı eski girişle yazılmış satırları bugünkü oranla çevirir: çeviriden sonra oran değişirse son 30 günün en düşük fiyatı orana göre kayabilir. Mağaza adresinin bölgesi bulunamazsa satırlar çevrilmez, vitrin düşmez.
- Vergi kapalı sitede giriş değişir, hiçbir tutar çevrilmez (dahil ve hariç aynıdır); vergi sonra açılırsa tutarlar yeni girişle okunur. Başka para birimindeki ve silinmiş birimlerin fiyatları ile silinmiş kuponlar çevrilmez.
- Uygulama büyük katalogda bütün birimleri tek işlemde yazar; süresi ölçülmedi.
- Sepetlerdeki "görülen fiyat" 1 kuruş değişen ürünlerde "fiyat değişti" uyarısını verir; açık ödeme oturumunun toplamı farklıysa onay bilinen çakışmayla durur.
- `fiyat_girisi_gecmisi` zamanla sıralı okunur (indeks `fiyat_girisi_gecmisi_zaman`); satır sayısı girişin değişiklik sayısıdır, küçük kalır.
