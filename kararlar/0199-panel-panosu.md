# 0199 · Panelin panosu

## Tarih

2026-11-27

## Karar

Panelin açılış sayfası (Karşılama) panodur (kart 0186; taslaklar karar 0157 ve 0185). Başlık günün selamı ("Günaydın", "İyi günler", "İyi akşamlar"; sitenin saat diliminde 05–12, 12–18, ötesi), altı haftanın günüyle bugünün tarihi.

- **Bakılması gerekenler:** "N sipariş bakılmayı bekliyor" (sipariş listesinin "Bakılması gereken" sekmesinin sayısı; alt yazıda döküm: havale bildirimi, iade talebi, iade işi), hazırlanmayı bekleyen sipariş, onay bekleyen yorum, stoğu azalan ve tükenen ürün ve eklentilerin satırları (stoğa gelince haber ver talepleri). Sıfır olan satır yazılmaz; hepsi sıfırsa "Şu an bakılması gereken bir iş yok". Satır ilgili listenin süzülmüş adresine gider ve sayısı o listenin sayısıdır; işi tek siparişte olan satır o siparişin ayrıntısına.
- **Son 14 günün satışı:** raporların sayma kuralıyla günlük grafik; "Raporlar" aynı 14 günle açılır.
- **Kısa sayılar:** bugün ve son 7 günün satışı (raporun dönemleriyle, son 7 gün önceki 7 günle karşılaştırılır), hazırlanacak (alt yazısı en eskisinin zamanı: kapıda ödemeli sipariş ödemesi alınmadan hazırlanır) ve ödeme bekleyen siparişler; her kutu raporun ya da listenin süzülmüş adresine gider.
- **Kısayollar:** Ürün ekle, Elle sipariş, Kupon ekle (eylem kaydından), Vitrin bölümleri, Menüler ve Vitrine git.
- **Açılış adımları:** ilk ürün, mağaza bilgileri (telefon, adres ve satıcı bilgileri), kullanılabilir bir ödeme yöntemi ve logo. Kutu adımlardan biri eksikken görünür, dördü tamamlanınca kalkar (kullanıcı kararı); yalnız mağaza ayarlarını değiştirebilen (mağaza sahibi) görür. Tamamlanan adım soluk ve üstü çizili kalır.
- Her kutu ve satır yöneticinin iznine göre görünür: satış ve satış sayıları raporun iznini (yalnız mağaza sahibi), sipariş satırları siparişleri görmeyi, yorum yorumları görmeyi, stok stoğu ve ürün listesini görmeyi ister. Kısayol ve adımın bağlantısı sayfa ağacından izinle gelir.
- Sayılar çekirdeğin tek kurallarından gelir: siparişler sipariş listesinin "Bakılması gereken" koşullarından (`panoSayilari`), stok ürün listesinin stok süzgecinden (`urunStokSayilari`), yorum menüdeki sayının işlevinden, satış raporun servisinden. Pano kendi koşulunu yazmaz.
- Eklenti panoya bağlantı noktasından satır verir (`cekirdek/eklentiler/pano-satirlari.ts`): satır eklentinin panel sayfasına bağlıdır, sayfanın izni ve eklentisi satırın da iznidir; satırın yazısı panonun metinlerindedir.
- Her kaynak (siparişlerin sayıları, yorum, stok, her eklenti, satış) kendi okunur, okunamayanın hatası bir kez kaydedilir. Kaynağı okunamayan kutu öteki satırlarını gösterir ve bir kısmının yüklenemediğini söyler; hiçbiri okunamazsa yalnız o kutu hata söyler. Sayfanın geri kalanı açılır.

## Neden

- Mağaza sahibi açılışta ne yapması gerektiğini görmüyordu (müşteri gezisi, 2026-11-13). Onaylı taslak panoyu "bakılması gerekenler" önde çiziyor.
- Sayıların listelerin ve raporların koşulundan gelmesi, panodaki sayıyla bağlantının açtığı listenin aynı kalmasını sağlar.
- Bağlantı noktası, çekirdeğin ekranının eklentiyi tanımaması kuralını korur (karar 0117).

## Düşünülen diğer yollar

- **Taslaktaki gibi adımları yalnız siparişi olmayan mağazada göstermek:** Kullanıcı seçmedi; eksik adım varken görünmesi bir mağaza hiç sipariş almadan da açılış işlerini bitirebildiğini söyler.
- **"Bakılması gerekenler"i panel bildirimlerinden kurmak (taslağın notu):** Bildirim okununca kaybolurdu, iş ise bitmemiş olabilir. Pano işin şimdiki hâlini sayar.
- **Havale, iade talebi ve iade işlerini ayrı satırlarda yazmak (taslaktaki gibi):** Sipariş listesinde üçü tek sekmedir ("Bakılması gereken"); ayrı satır "2 havale bildirimi" deyip beş siparişlik listeyi açardı (bağımsız kontrolün bulgusu). Tek satırın sayısı açılan listeninkidir, döküm alt yazıdadır.
- **Stoğu tek satırda birleştirmek (taslak: "2 ürünün stoğu azaldı, 2 ürün tükendi"):** Azalan ve tükenen ürünler ürün listesinde ayrı süzgeçtir; iki satır her biri kendi süzülmüş listesine gider.
- **Taslaktaki "4 adımdan 0'ı tamam":** Türkçe ek sayıya göre değişir ("1'i", "2'si", "3'ü"); "Tamamlanan: 1 / 4" yazılır.
- **Sayı kutularını sağ sütunda ikişer:** Sağ sütunda satış tutarları sığmıyordu; masaüstünde tek sütun, tablette ikişer.

## Sonuçları

- Pano açılışta birkaç sorgu çalıştırır (siparişlerin dört işi ve ödeme bekleyenler, stok, yorum, satış raporunun üç dönemi). Sorgular listelerin indeksli koşullarıdır; büyük mağazada süre ayrıca ölçülmedi.
- Stoğa gelince haber ver satırının sayısı eklentinin panel listesinin sınırına kadar olan ürünlerin taleplerini toplar.
- Stok, yorum ve eklenti satırının alt yazısında en çok üç ürün adı ve "ve N tane daha" yazar (bedenli ürünün adı bir kez); siparişlerin satırında döküm ya da en eskisinin zamanı.
- Sayfa yenilenmeden sayılar değişmez; zil (karar 0198) ayrı sorar.
- Biçimleyiciye haftanın günüyle tam tarih eklendi (`tamTarih`): yalnız sunucuda kullanılan ayrı işlevdir, tarayıcı paketine girmez (karar 0172).
- Raporların sayı kutusu (`SayiKutusu`) ve seri verisi (`seriVerisi`) panoyla ortaktır; eylem bağlantısının çerçeveli görünümü (`cerceveli`) komut çubuğunun dışındaki düğme dizileri içindir.
