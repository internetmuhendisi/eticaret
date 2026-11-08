# 0068 · Stok ve stok geçmişi

## Tarih

2026-11-08

## Karar

Stok satılabilir birime bağlıdır (karar 0062), tek depo vardır. Stok yalnız `cekirdek/moduller/stok/servis.ts` ile okunur ve değişir (kart 0082).

- **Tablolar:** `birim_stoklari` birimin bugünkü miktarıdır (birim başına bir satır, satırı olmayan birimin stoğu sıfır, miktar sıfırın altına inmez). `stok_gecmisi` her değişikliği kim, ne zaman, sebep, not, kaynak (sipariş ya da iade kimliği), önceki ve sonraki miktarla tutar. Güncelleme, silme ve boşaltma veritabanındaki tetikleyiciyle reddedilir (fiyat geçmişiyle aynı yol, karar 0066).
- **Takip ürün bazındadır:** `urunler.stok_takibi`. Kapalıysa düşürme ve artırma stoğa dokunmaz, geçmişe bir şey yazmaz. Elle düzeltme takip kapalıyken de yapılır: takip açılmadan stok girilebilsin.
- **Üç yol:**
  - `stokDus`: sipariş oluşurken, çağıranın veritabanı işleminin içinde. "Yeterliyse düş" tek `update ... where miktar >= adet` sorgusudur. Satır kilidi aynı anda gelen istekleri sıraya koyar, ikincisi koşulu güncel miktarla yeniden sınar. Bir kalem yetmezse ya da birim veya ürünü silinmişse o çağrının hiçbir kalemi düşmez, çakışma hatası bütün sorunlu birimleri söyler.
  - `stokArtir`: iptal ve iadede, çağıranın işleminin içinde. Silinmiş birimin stoğu da artar.
  - `stokDuzelt`: panelden elle, kendi işlemiyle. Yeni miktar, ekranın o an gördüğü miktar, sebep ve not verilir. Gördüğü miktar artık doğru değilse (arada sipariş düştü) çakışma döner, hiçbir şey yazılmaz.
- **İç kayıt noktası:** Düşürme ve artırma kendi kayıt noktasında (iç işlem) çalışır. Reddedilen çağrı yalnız kendi kalemlerini geri alır, çağıranın işlemi bozulmadan sürebilir.
- **Kilit sırası:** Önce ürünün ve birimin satırı paylaşımlı kilitlenir (takip ve silinme işlem bitene kadar değişmesin), sonra stok satırı. Kalemler birim kimliği sırasıyla işlenir. Ürünün işlem kilidi (`urun/kilit.ts`) alınmaz.
- **Ürün kilidi düşürmeden sonra alınmaz:** Sipariş işlemi `stokDus` ya da `stokArtir`'dan sonra aynı işlemde ürünün işlem kilidini alan bir işlevi (ürün ya da fiyat yazımı) çağırmaz. Ürün değişikliği önce o kilidi alıp sonra paylaşımlı kilitli ürün satırını bekler; iki işlem birbirini bekleyip kilitlenir. Gerekirse kilit düşürmeden önce alınır (bağımsız kontrolün bulgusu, bugün böyle bir yol yok).
- **Üst sınır:** Bir birimin stoğu en çok 1.000.000.000'dur (`enCokStok`). Sınır elle düzeltmenin girdisinde, tek kalemde, aynı birimin toplanmış kalemlerinde ve artırmanın sonucunda serviste denetlenir. Veritabanında da aynı sınır vardır. Sınır olmasaydı artırma birimi panelden düzeltilemez hâle getirirdi, daha büyüğü de tam sayı taşmasıyla ham hataya dönerdi (bağımsız kontrolün bulgusu, ölçüldü).
- **Sebepler** kayıt dosyasındadır (`cekirdek/kayitlar/stok.ts`). Elle seçilenler kullanıcı kararıyla beştir: sayım düzeltmesi, yeni mal geldi, hasarlı ya da kayıp, iade edilen ürün, diğer. Not isteğe bağlıdır, "diğer"de zorunludur, en çok 500 harftir. Boş ya da yalnız boşluklu not yazılmamış sayılır. Notun her sorunu ekranın tanıdığı bir kodla döner. Sipariş, sipariş iptali ve sipariş iadesi yalnız kendi işlevlerinden gelir.
- **Kayıt:** Her değişiklik stok geçmişine aynı işlemde yazılır. Elle düzeltme değişiklik kaydına da girer (`stok.duzeltildi`). Siparişin düşürmesi ve iptalin artırması girmez: stok geçmişi ve siparişin kendi geçmişi onu taşır. Takibin açılıp kapanması ürün değişikliğidir (`urun.degisti`).
- **İzinler (kullanıcı kararı):** `stok.gor`, `stok.duzelt`. Görevli stoğu görür ve elle düzeltir.
- **Yeni ürün (kullanıcı kararı):** Takip açık, stok sıfır. Stok girilene kadar ürün tükenmiş sayılır.

## Neden

- "Yeterliyse düş"ü tek sorguda yapmak, okuyup sonra yazmanın açtığı yarışı kapatır. Veritabanı satırı kilitler ve koşulu ikinci istek için güncel değerle yeniden sınar; ayrıca bir kilit gerekmez.
- Ürünün işlem kilidi bütün yazmaları sıraya koyar. Siparişte alınsaydı farklı ürünleri alan siparişler de birbirini beklerdi. Satır kilidi yalnız aynı birimi isteyenleri bekletir.
- Kalemleri hep aynı sırayla kilitlemek, ters sırada aynı birimleri isteyen iki siparişin birbirini sonsuza kadar beklemesini (deadlock) önler. Sıra bilerek rastgele yapılınca test üç denemede de kırmızıya düştü.
- Paylaşımlı ürün kilidi olmasaydı, açık duran bir sipariş takibi açık sanıp stoğu düşerken mağaza sahibi takibi kapatabilirdi. Kilit kaldırılınca test kırmızıya düştü.
- Görülen miktarla düzeltmek, sayım yapan çalışanın o arada satılan ürünü sessizce geri yazmasını önler.
- İç kayıt noktası olmasaydı, hatayı yakalayıp süren bir sipariş akışında yarım düşmüş kalemler kalırdı.

## Düşünülen diğer yollar

- **Okuyup yazmak (`select ... for update`, sonra `update`):** Seçilmedi. Aynı güvenliği iki sorguyla verir. Kilidi unutan bir değişiklik yarışı sessizce açar.
- **Ürünün işlem kilidiyle düşürmek:** Seçilmedi. Bütün siparişler tek kuyruğa girerdi.
- **Elle düzeltmeyi fark olarak almak (+3, −2):** Seçilmedi. Mağaza sahibi sayımda elindeki sayıyı yazar. Fark, arada değişen stokla yanlış sonuç verir; görülen miktar bu sorunu açıkça gösterir.
- **Geçmişte yalnız sonraki miktar:** Seçilmedi. Önceki miktar sipariş geçmişiyle karşılaştırmayı ve bozuk satırı görmeyi kolaylaştırır.
- **Her stok hareketini değişiklik kaydına da yazmak:** Seçilmedi. Her sipariş kalemi kaydı doldururdu, aynı bilgi stok geçmişinde var.
- **Görevliye yalnız görme izni:** Kullanıcı seçmedi.
- **Sebep yerine yalnız not:** Kullanıcı seçmedi. Sebep listesi rapor ve süzgeç için gerekir.
- **Yeni üründe takip kapalı:** Kullanıcı seçmedi. Stok girmeyi unutan, olmayan malı satardı.

## Sonuçları

- **Korumanın sınırı (karar 0045 ve 0066 ile aynı):** Sitenin veritabanı kullanıcısı stok geçmişi tablosunun sahibidir: tetikleyiciyi kapatıp satırları silebilir. Panel ve hatalı kod geçmişi değiştiremez. Geçmişin kopyası her sitenin günlük yedeğindedir.
- Stok geçmişinin kalıcı silinmemesi, birimin kalıcı silinmesini de engeller (bağ `restrict`). Birim zaten işaretle silinir.
- Ürün değişikliği, o ürünün birimini düşüren açık bir siparişi bekler. Sipariş işlemi kısa olduğu için 30 mağazalık ölçekte sorun değildir. Toplu ürün düzenleme gelince ölçülmelidir.
- `stok_takibi` alanı var olan ürünlerde de açık başlar. Ürünü olan bir sitede güncellemeden sonra bütün ürünler stok girilene kadar tükenmiş sayılır. Bugün hiçbir sitenin ürünü yoktur; ilk ürünlü site güncellemesinde bunu sürüm notu söyler.
- **Artırma, düşmüş olana bakmaz:** `stokArtir` ürünün o anki takibine bakar, siparişte stoğun gerçekten düşüp düşmediğine bakmaz. Takip kapalıyken verilen sipariş, takip açıldıktan sonra iptal edilirse hiç düşmemiş stok artar. Sipariş bölümü iptalde ve iadede yalnız stok geçmişinde o siparişin (`kaynak_kimligi`) düşürdüğü kalemleri ve adetleri geri koyar. Bu kural sipariş kartında yazılıp test edilmelidir (bağımsız kontrolün bulgusu).
- Tükenen ürünün davranışı, düşük stok eşiği ve "Son 3 ürün" gibi gösterim kart 0083 ile gelir. Stok ayırma sepet ve ödemeyle, düşük stok e-postası e-postalarla, toplu güncelleme panelle gelir.
- Stok uçları ve ekranı yoktur. İzinler erişim testinde yalnız beklentiyle denenir, her uçta gerçek istekle denenmesi uçlar yazılınca olur.
- Sebep listesi veritabanı denetiminde düz yazılıdır (`sql.raw` içine değişken verilemez, kod denetimi). Kayıtla aynı olduğunu servis testi denetler.
