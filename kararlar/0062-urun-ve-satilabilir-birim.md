# 0062 · Ürün, satılabilir birim ve yayın durumunun vitrindeki yeri

## Tarih

2026-11-08

## Karar

Ürün `urunler`, satılabilir birimi `urun_birimleri` tablosunda durur (kart 0076). Okuma ve değiştirme yalnız `cekirdek/moduller/urun/servis.ts` ile yapılır.

- **Satılabilir birim:** Her ürünün en az bir birimi olur, basit ürünün tek. Stok kodu, barkod, ağırlık ve ölçüler birimdedir; fiyat (0080) ve stok (0082) birime bağlanır. Ad, açıklamalar, adres adı, yayın durumu, kargo gerekmez, alım adetleri ve vergi sınıfı üründedir.
- **Yayın durumları ve vitrin (kullanıcı kararı):** Durumlar `cekirdek/kayitlar/urun.ts` kaydındadır, her durumun nerede göründüğü de orada yazar. Yayında: sayfası açılır, listelerde ve aramada görünür. Gizli: listelerde ve aramada yoktur, bağlantıyı bilen sayfayı açıp satın alır. Arşiv: vitrinden bütünüyle çıkar. Taslak: görünmez. Zamanlanmış: yayın zamanına kadar görünmez, sonra yayında gibidir. Görünürlüğü tek koşul bulur (`vitrinKosulu`, `vitrin.ts`); vitrin, arama ve site haritası ürünü yalnız onunla süzer.
- **Zamanlanmış yayın:** Zaman sitenin saat diliminde yerel olarak girilir (`2026-11-08T09:30`), `yerelZamandan` ile ana çevrilip saklanır. Görünürlük okuma anında karşılaştırılır; durumu değiştiren bir arka plan işi yoktur, zamanı geçen ürünün durumu "zamanlanmış" kalır. Yaz saatine geçişte atlanan saat reddedilir, iki kez yaşanan saatte önceki an seçilir. Zamanlanmış olmayan ürünün yayın zamanı tutulmaz; bunu veritabanı da denetler.
- **Tekillik:** Stok kodu (büyük küçük harf ayrımsız) ve adres adı yalnız silinmemiş ürünler arasında tekildir. Silinen ürünün kodu ve adı yeniden kullanılabilir. Bütün yazmalar aynı işlem kilidini alır, tekillik kilit altında aranır; kısmi tekil indeksler ikinci ağdır. Tekrar `cakisma` hatası ve alanıyla döner.
- **Adres adı:** Yalnız küçük İngiliz harfleri, rakam ve tire. Verilmezse ürünün adından üretilir (aksanlar düşer: "Çiçekli Şal" → `cicekli-sal`), kullanılıyorsa sonuna sayı eklenir (`-2`, `-3`). Addan harf kalmazsa kimliğin ilk parçası kullanılır. Elle verilen ad kullanılıyorsa reddedilir. Ürünün adı değişince adres adı değişmez.
- **Barkod:** GTIN-8, GTIN-12, GTIN-13 (ISBN-13 dahil), GTIN-14 ve ISBN-10 kabul edilir, kontrol hanesi denetlenir. Boşluk ve tire atılarak saklanır. Barkod tekil değildir.
- **Ölçüler:** Ağırlık gram, en, boy ve yükseklik milimetre biriminde tam sayıdır. Ekran sitenin `agirlikBirimi` ve `boyutBirimi` ayarına çevirir.
- **Vergi sınıfı:** Girdide zorunludur; `null` ürünü vergisiz yapar. Yeni bağlantı yalnız silinmemiş sınıfa kurulur. Bağlıyken silinen sınıf üründe kalır (karar 0060).
- **Uzun açıklama:** Bugün düz metin olarak saklanır. Biçimli metin düzenleyicisi panel bölümüyle gelir; vitrin açıklamayı ekrana yazmadan önce temizler (`.claude/rules/guvenlik.md`).
- **Kayda girmeyen değer:** Değeri tamamen bir e-posta adresi ya da giriş anahtarı olan metin şemada `kayda-uygun-degil` ile reddedilir; değişiklik kaydı onu reddettiği için mağaza sahibi beklenmeyen hata görmesin. Değişiklik kaydının "Basic " kalıbı daraltıldı: yalnız ardından "kullanıcı:şifre"nin base64 hâli gelirse yakalar. Yoksa "Basic Tişört" adlı ürün kaydedilemezdi. Kalıpların tek tanımı `cekirdek/moduller/degisiklik-kaydi/deger.ts`.
- **İzinler (kullanıcı kararı):** `urun.gor`, `urun.degistir` (ekleme ve değiştirme), `urun.sil`. Görevli rolü görür ve değiştirir, silemez.
- **Değişiklik kaydı:** Eklemede ve silmede bütün dolu alanlar, değişiklikte yalnız değişen alanlar yazılır.

## Neden

- Birimin baştan ayrı tablo olması, varyantlı ürünün (0085) fiyat ve stok için ikinci bir yol açmamasını sağlar (kartın istediği).
- Görünürlüğün durum tablosundan kurulması, durumun anlamını tek yerde tutar. Okuma anında karşılaştırma, kuyruk işi beklemeden tam zamanında görünür ve iş kaçarsa ürün takılı kalmaz.
- Silinen ürünün kodunu serbest bırakmak, mağaza sahibinin bir ürünü silip aynı kodla yeniden açmasına izin verir. Eski siparişler ürünün o anki bilgisini kendisi saklar (sipariş bölümü).
- Ad değişince adres adının değişmemesi, paylaşılmış ve arama motorundaki bağlantıları kırmaz. Yönlendirme görünürlük bölümüyle gelir.

## Düşünülen diğer yollar

- **Stok kodu ve barkodu ürün tablosunda tutmak:** Seçilmedi. Varyantta her birleşimin kendi kodu olur, ikinci bir yol gerekirdi.
- **Zamanı gelen ürünü bir arka plan işiyle "yayında" yapmak:** Seçilmedi. İş gecikirse ürün geç görünür, iş kaçarsa hiç görünmez. Koşul zaten tek yerdedir.
- **Görünürlüğü hem SQL'de hem JavaScript'te yazmak:** Seçilmedi. İki tanım ayrışabilirdi. Tek ürün için de aynı sorgu kullanılır.
- **Gizli ürünü hiç göstermemek, arşivi bağlantıyla açmak:** Kullanıcı seçmedi.
- **Silinmiş ürünün kodunu da tekil saymak:** Seçilmedi. Mağaza sahibinin silinmiş ürünün kodunu kullanamamasının bir yararı yok.
- **Adres adını adla birlikte güncellemek:** Seçilmedi, bağlantılar kırılırdı.
- **Vergi sınıfını isteğe bağlı yapmak (boşsa vergisiz):** Seçilmedi. Unutulan alan sessizce vergisiz satış olurdu.
- **Ağırlığı sitenin biriminde saklamak:** Seçilmedi. Birim ayarı değişince kayıtlı değerler yanlış olurdu.
- **Değişiklik kaydında açıklamaların yalnız uzunluğunu yazmak:** Seçilmedi. Kim neyi değiştirdi sorusunun cevabı metnin kendisidir.

## Sonuçları

- Zamanlanmış ürünün durumu zamanı geçse de "zamanlanmış" kalır. Panel bunu "yayında (zamanlanmıştı)" gibi göstermelidir (panel bölümü).
- Ürün uçları yoktur. Yeni izinlerin her rolde beklentisi erişim testinde (`cekirdek/kapi/testler/rol-uc-erisimi.test.ts`) ve veritabanındaki rol izinleriyle karşılaştırılarak denenir; her uçta gerçek istekle denenmesi uçlar yazılınca olur.
- Basit ürünün tek birimi vardır. Varyantlı ürün gelene kadar servis ürünün ilk silinmemiş birimini değiştirir.
- Bütün ürün yazmaları tek kilitten geçer. 30 mağazalık ölçekte ve tek mağaza içinde sorun değildir; toplu düzenleme ve içe aktarma gelince ölçülmelidir.
- Barkod tekil değildir. Aynı barkodlu iki ürün olabilir; panel araması ikisini de bulur.
- İnç biriminde girilen ölçü milimetreye yuvarlanır. Bu, kargo hesabı için yeterlidir.
- Uzun açıklamanın zararlı koddan temizlenmesi vitrin yazılana kadar yalnız disiplindir.
