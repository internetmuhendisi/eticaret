# 0190 · Ürün kopyalama

## Tarih

2026-11-27

## Karar

Mağaza sahibi bir ürünü kopyalayarak benzer ürünü baştan girmeden başlatır (kart 0320). "Kopyala" ürün ekranının komut çubuğunda ve ürün listesinin satır menüsündedir ("Diğer işlemler"). Yan pencere yalnız kopyanın adını sorar ("… (kopya)" önerisiyle) ve neyin kopyalanmadığını söyler (karar 0185). Kopya kurulunca onun ürün ekranı açılır, üstünde taslak olduğu yazar. Servis `cekirdek/moduller/urun/kopyalama.ts`, uç `urun-kopyala`.

- **Kopyalanan:** kısa ve uzun açıklama, kargo gerekmez, stok takibi ve düşük stok eşiği, alım adetleri, vergi sınıfı, kategoriler, marka, etiketler, ilgili ürünler (kullanıcı kararı), özellik değerleri, ağırlık ve ölçüler, seçenekler ve değerleri (sırasıyla), birleşimler (ağırlığı, ölçüleri ve görseliyle), fiyatlar (indirim ve zamanıyla), galeri (sırasıyla; görsel dosyası yeniden kaydedilmez, iki ürün aynı dosyayı kullanır; video aynı bağlantıyla).
- **Kopyalanmayan:** stok kodu ve barkod (tekildir, boş kalır), stok (0), yorumlar, favoriler, fiyat ve stok geçmişi (kopyanın geçmişi kendi yazımıyla başlar), vitrin sırası, yayın zamanı. Silinmiş seçenek, değer, birleşim ve galeri öğesi kopyalanmaz. Sitenin para biriminde olmayan fiyat kopyalanmaz.
- **Kopya taslaktır.** Adı mağaza sahibinin verdiği addır; adres adı kaynağın adres adından sayıyla üretilir ("kazak-2").
- **Tek işlemdir:** kaynak ürün kilitten sonra okunur, her parça kendi servisinden yazılır (ürün, seçenek, birleşim, galeri, fiyat); bir adım düşerse hiçbir şey kalmaz. Değişiklik kaydına parçaların kendi kayıtları ve ayrıca `urun.kopyalandi` (kaynağıyla) girer.
- **İzin:** ürün ekleme izni (`urun.degistir`); görevli de kopyalar. Fiyatı değiştirme izni (`fiyat.degistir`) olmayan yöneticinin kopyası fiyatsız açılır, pencere bunu önceden söyler (kullanıcı kararı; görevli fiyat veremez, karar 0066).
- **Adres adı:** başka bir ürünün eski adresi de kullanılmış sayılır: kopya onu alsaydı o ürünün eski bağlantıları yönlenmezdi.
- **Kaydedilmemiş değişiklik:** kopya ürünün kaydedilmiş hâlinden yapılır. Ürün ekranında kaydedilmemiş değişiklik varken "Kopyala" penceresi bunu söyler; kopyanın ekranı baştan kurulur, kaynağın kaydedilmemiş değişikliği kopyaya taşınmaz.

## Neden

- Servislerden geçmek kuralları (ad, adres adı, galeri sınırı, video sitesi, fiyat kuralı) kopyalamadan korur; kopya elle girilmiş bir üründen farksızdır.
- Dosyanın paylaşılması kopyalamayı hızlı tutar, diski doldurmaz; görsel silinse de öteki ürünün galeri satırı kendi dosya bağıyla kalır (karar 0073'ün silinen öğe kuralı).
- Adres adının kaynaktan türemesi iki ürünün birbirine benzer adreslerle durmasını sağlar; ad ise mağaza sahibinin seçimidir.

## Düşünülen diğer yollar

- Pencerede kutularla neyin kopyalanacağını sormak: taslakta gösterildi, kullanıcı "sormadan hepsi"ni seçti (karar 0185).
- Görselleri yeniden kaydetmek: disk ve süre ister, aynı görselin iki kopyası olur.
- İlgili ürünleri kopyalamamak: kullanıcı kopyalanmasını seçti.
- Kopyanın adres adını kopyanın adından üretmek ("kazak-kopya"): taslak kaynaktan sayıyla üretilmesini gösterdi.

## Sonuçları

- Kaynağın galerisindeki video sitesi bu sitede artık kabul edilmiyorsa kopyalama durur ve nedeni söylenir; mağaza sahibi videoyu kaynaktan kaldırıp yeniden dener.
- Kaynağın vergi sınıfı silinmişse ürün servisi kopyayı o sınıfla açmaz (silinmiş sınıf seçilemez); kopyalama hatayla durur.
- Kopyanın ürün ekranının adresinde `kopya=1` durur, bilgi sayfa yenilenince de görünür.
- Taslaktaki "…'ten kopyalandı" alt başlığı yoktur; kopyanın taslak olduğunu üstteki bilgi kutusu söyler.
- Kaynakta ilk değerlerin birleşimi yoksa kopyanın ilk birimi eklemelerden önce silinir: birleşim sınırı ara adımda aşılmaz.
- İndirim zamanı sitenin saat diliminde dakikaya çevrilip yazılır (fiyat servisinin girdisi): yaz saati olan bir sitede saatin iki kez yaşandığı aralıktaki an bir saat kayabilir. Türkiye'de yaz saati yoktur; bilinen sınırdır.
