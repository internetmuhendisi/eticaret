# 0147 · İptal, tam ve kısmi iade

## Tarih

2026-11-19

## Karar

İptal, tam iade ve kısmi iade tek akıştır (`iadeServisi`, `cekirdek/moduller/siparis/iade.ts`). Tutar ve vergi siparişin saklanan değerlerinden tek saf işlevle hesaplanır (`iadeyiHesapla`, `iade-hesabi.ts`); panelin penceresi aynı işlevle önizler, sunucu yeniden hesaplar. Her iptal ve iade `siparis_iadeleri` tablosuna bir satırdır.

- Hesap: a adetin tutarı ve vergisi, iade edilen toplam adede kadar olan yuvarlanmış payın bir öncekinden farkıdır; kalemin bütün adetleri iade edilince tam kalemin kendisi döner. Kargo bir kerede, maliyeti ve vergisi siparişin kalanından. Siparişin kalanının tamamı seçilirse ödenen kalan döner: kartla taksitli ödemenin taksit farkı da (kullanıcı kararı). Elle tutar hesaplananın yerine geçer, vergisi orantılıdır, ödenen kalanı aşamaz.
- İptal ödeme bekleniyor ve hazırlanıyor durumunda, iade teslim edildi ve kısmi iade durumunda yapılır. Kargodaki sipariş iptal edilmez (kart 0233 kararı).
- Havale ve kapıda ödemede para elle geri ödenir: iade kaydedilince yapılmış sayılır (kullanıcı kararı, tek adım).
- Kartla ödemede para ödeme kuruluşundan döner. Çekirdek eklentiyi tanımaz: ödeme yöntemi bağlantı noktasına `iadeEt` eklendi. İade önce "bekliyor" yazılır, işlem kapanır, kuruluşa işlemin dışında gidilir. Sonuç tamamsa iade tamamlanır (durum, stok, geçmiş, değişiklik kaydı aynı işlemde); redse "başarısız" olur ve sipariş değişmez; yanıt gelmezse bekler. Bekleyen iade varken ne durum işlemi ne yeni iade yapılır (veritabanında tekil indeks).
- Kuruluşa her zaman kalem kalem iade gider (`/payment/refund`, sepet kaleminin işlem kimliği ve tutarı); iptal (`/payment/cancel`) kullanılmaz. Ödemenin sonucundaki kalem işlemleri `kart_odemeleri.kalem_islemleri`'ne yazılır. Bu alandan önce ödenmiş siparişte tek parça ödemenin kimliğiyle gider (`/v2/payment/refund`).
- Her parça önce `kart_iadeleri`'ne yazılır, gönderilmeden önce tek güncellemeyle "belirsiz"e alınır: aynı parça iki kez gönderilmez. conversationId parçanın kimliğidir; yanıtı gelmeyen parçayı 15 dakikalık tarama günlük rapordaki REFUND satırında bu kimlikle bulur. İki günde bulunamayan parça gönderilmemiş sayılır. Reddedilen parça mağaza sahibinin "Yeniden dene"siyle yeniden gönderilir.
- İptal ve iade yalnız mağaza sahibinindir (`siparis.iade`, görevlide yok; kullanıcı kararı).
- Stoğa geri koymak seçimlidir; geri konan adet yalnız siparişin düşürüp geri konmamış adedidir.

## Neden

- Tek akış ve tek hesap işlevi iş kuralıdır ("İade tutarını ve vergisini fiyat hesabıyla aynı fonksiyondan al"). Fiyat yeniden hesaplanırsa sonradan değişen fiyat ya da oran eski siparişin iadesini bozar.
- Kuruluşu beklerken siparişin kilidini tutmak öteki işlemleri saniyelerce durdururdu; yanıt gelmeyebilir.
- iyzico tekrar önleyen bir anahtar belgelemez. Aynı parçanın iki kez gitmemesi bizim satırımızın tek güncellemeyle alınmasıyla, sonucu bilinmeyen parçanın bulunması raporla sağlanır.
- Belge çok kalemli sepette ödeme kimliğiyle iadeyi önermez; kısmi iade kalem kalem yapılır. Aynı gün iptal yalnız tam tutar içindir; kısmi iadeyle birlikte doğru sonuç vermez.

## Düşünülen diğer yollar

- Elle iadede "iade bekleniyor" ara adımı (mağaza sahibi parayı gönderince ikinci kez işaretler): kullanıcı tek adımı seçti.
- Taksit farkının dönmemesi: kullanıcı tam iadede dönmesini seçti.
- Aynı gün tam iptalde `/payment/cancel`: tek kurala indirmek için kullanılmadı; iade aynı sonucu verir.
- Kuruluşa işlemin içinde gitmek: kilit tutulur, yanıt gelmezse işlem ne geri alınabilir ne kaydedilebilir.

## Sonuçları

- Gerçek iyzico deneme ortamında iade ölçülmedi (kullanıcı kararı: şimdilik ölçme); yerel sahte kuruluşla denenir. Ölçümü kart 0243'tedir. Ölçülene kadar kalem işlemlerinin ve REFUND satırının alan adları belgeye dayanır.
- Bir kalemi reddedilen iade bekler: para kısmen dönmüştür, siparişin durumu değişmez; mağaza sahibi yeniden dener. Yöneticiye bildirim bugün hata izleme aracındandır, e-postası kart 0241.
- Kuruluşa ulaşmayan parça iki gün "bekliyor"da kalabilir.
- Müşteriye iade e-postası kart 0240'tadır.
