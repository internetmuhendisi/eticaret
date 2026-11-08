# 0072 · Ürün özellikleri: değer türleri, tür bağı, silme kuralı ve değere göre ürün listesi

## Tarih

2026-11-08

## Karar

Site ürünlerine kendi ek alanlarını (özellik) tanımlar: kumaş, malzeme, yazar gibi (kart 0086). Özellikler sitenin geneline aittir, her ürün aynı "Malzeme" özelliğine değer girer; filtre bu sayede ürünler arasında çalışır.

- **Tablolar:** `ozellikler` (ad, tür, birim, filtrede, sıra), `ozellik_secenekleri` (liste türünün seçenekleri: ad, sıra) ve `urun_ozellik_degerleri` (ürünün bir özellikteki değeri). Modül `cekirdek/moduller/ozellik/`: tanımlar `servis.ts` (`ozellikServisi`) ile, ürünün değerleri `degerler.ts` ile yazılır. Değerleri ürün servisi kendi kilidi altında, ürün girdisinin `ozellikler` alanıyla yazar.
- **Değer türleri (kullanıcı kararı):** `metin`, `sayi`, `evet-hayir`, `liste`. Kayıt `cekirdek/kayitlar/ozellik.ts` dosyasındadır, her türün veritabanı alanı da orada yazar (`ozellikDegerAlanlari`). Liste türünde ürün tanımlı seçeneklerden yalnız birini seçer. Sayı en çok 4 ondalık basamaklı, 11 tam basamaklıdır (`numeric(16, 4)`, `ondalikSayi`); birimi ("cm", "saat") sitenin verisidir ve yalnız sayı türünde girilir.
- **Doğrulama:** Ürün girdisi değeri ham alır (metin, sayı ya da evet/hayır). Servis özelliğin türünü okuyup türün şemasıyla (`degerSemalari`) doğrular; türüne uymayan değer `ozellik-deger-gecersiz`, olmayan ya da silinmiş özellik `ozellik-gecersiz`, özelliğin olmayan ya da silinmiş seçeneği `ozellik-secenek-gecersiz`, aynı özellik iki kez `ozellik-tekrar` alır. Bütün sorunlar girdinin sırasıyla birlikte döner.
- **Veritabanı ikinci ağdır:** Değer satırı türünü de taşır. `(özellik, tür)` çifti özelliğe bağlıdır, bu yüzden satırın türü özelliğinkiyle aynı olmak zorundadır ve değeri olan özelliğin türü veritabanında da değişemez. Bir denetim satırda yalnız türünün alanının dolu olmasını ister. Liste değerinin `(seçenek, özellik)` çifti seçeneğe bağlıdır: başka özelliğin seçeneği yazılamaz.
- **Tür değişikliği:** Değeri olan ya da (liste türünde) silinmemiş seçeneği olan özelliğin türü değişmez (`tur-degisemez`). Birim yalnız sayıda (`birim-yalniz-sayi`), seçenek yalnız listede (`secenek-yalniz-liste`) olur; kural birleşmiş kayda uygulanır.
- **Adlar:** Özellik adı sitenin silinmemiş özellikleri, seçenek adı özelliğin silinmemiş seçenekleri arasında ad anahtarıyla (karar 0064) tekildir. Girdi içindeki tekrar da veritabanında yakalanır.
- **Silme (kullanıcı kararı):** Özellik ya da seçenek silinmiş işaretlenir, değerleri ürünlerden kalkar; ürünün kendisi ve öteki bilgileri değişmez. Değerleri kalkan ürünler silme kaydında listelenir. Silinen özelliğin seçenekleri ayrıca işaretlenmez, özellikle birlikte görünmez olur. Aynı adla yeniden özellik ya da seçenek açılabilir.
- **Yarış:** Tanımların bütün yazmaları özellik işlem kilidini alır. Değeri etkileyen yazma (tür değişikliği, özellik ve seçenek silme) satırı da kilitler. Ürün yazması değer satırlarına dokunmadan önce ilgili özellik ve seçenek satırlarını paylaşımlı kilitler: aynı anda silinen özelliğe değer yazılmaz, tür değişmez, kayda silinmiş seçenek girmez. Kilit sırası hep özellik satırı, sonra değer satırıdır.
- **Değere göre ürünler:** `ozellikServisi.urunleri(vt, ozellik, deger)` bir değere sahip ürünleri kategori, marka ve etiketle aynı tek sorgudan (`cekirdek/moduller/urun/liste.ts`) verir. Değerin türü JavaScript türünden çıkar; metin ad anahtarıyla karşılaştırılır. Silinmiş özelliğin ve seçeneğin ürünü gelmez (silme değerleri zaten kaldırır, süzgeç ikinci ağdır). Her tür için ayrı indeks vardır.
- **Sınırlar:** Sitede en çok 200 özellik, özellikte 200 seçenek, 500 karakterlik metin (`ozellikSinirlari`).
- **İzinler (kullanıcı kararı):** `ozellik.gor`, `ozellik.degistir`, `ozellik.sil`. Görevli görür, ekler ve değiştirir, silemez (marka ve etiketle aynı). Ürünün değerleri ürünün parçasıdır, `urun.degistir` ile yazılır.
- **Değişiklik kaydı:** `ozellik.*`, `ozellik-secenegi.*`; özellikle birlikte eklenen her seçenek kendi satırıyla. Ürünün değerleri `urun.*` kaydında `ozellikler` alanıyla, özellik kimliğine göre sıralı yazılır.

## Neden

- Değerin özelliğe göre doğrulanması kartın istediği şeydir: tür sitenin verisinde durduğu için şema ancak özellik okununca seçilebilir. Veritabanı bağı da aynı kuralı servisi atlayan bir yazmaya karşı tutar.
- Her türün kendi alanı (metin, sayı, evet/hayır, seçenek) filtreyi doğru ve hızlı yapar: "1,5" ile "1,50" aynı sayıdır, seçenek adı değişince ürünler etkilenmez, her alana indeks kurulur.
- Liste türünde tek seçim ve marka ile aynı silme kuralı kullanıcının seçtiği yoldur. Silinen seçeneğin değerinin üründe kalması, vitrinde artık olmayan bir seçeneğin görünmesi demek olurdu.
- Değeri olan özelliğin türünü değiştirmek, var olan değerleri sessizce bozmak ya da dönüştürmek demekti.

## Düşünülen diğer yollar

- **Değeri tek bir JSON alanında tutmak:** Seçilmedi. Türü veritabanı denetleyemez, filtre için indeks kurmak zordur, seçenek silinince değeri bulmak tam tarama ister.
- **Bütün değerleri metin olarak tutmak:** Seçilmedi. Sayı karşılaştırması ("1.5" ve "1.50") ve evet/hayır anlamını kaybeder.
- **Liste türünde birden çok seçenek:** Kullanıcı seçmedi. Gerekirse ayrı bir tür olarak eklenir; bugünkü satır yapısı ürün ve özellik başına tek değer tutar.
- **Görevlinin özellikleri yalnız görmesi:** Kullanıcı seçmedi.
- **Değeri olan seçeneğin silinmesini reddetmek:** Kullanıcı seçmedi.
- **Silinen özelliğin değerlerini ürünlerde silinmiş işaretli bırakmak:** Seçilmedi. Görünmeyen değerler filtre sorgusunda ve ürün kaydında sürekli süzülmek zorunda kalırdı; marka ve etiketin silme kuralıyla aynı davranış daha az yanılgı bırakır.
- **Tür değişince değerleri dönüştürmek:** Seçilmedi. "Pamuk" metni sayıya, sayı listeye anlamlı dönüşmez.

## Sonuçları

- Örnek Mağaza'nın örnek ürünlerine özellik değerleri bu kartta eklenmedi. Kullanıcı onları varyantlı ürünlerle birlikte ayrı bir kartta verecek (kullanıcı kararı). Başlangıç kataloğunun dosya biçimi (`baslangic-semasi.ts`) bugün özellik taşımaz; o kart genişletmelidir. Kartın Örnek Mağaza maddesi bu yüzden açık kaldı.
- Özellik ve ürün uçları yoktur. İzinlerin her uçta gerçek istekle denenmesi uçlarla gelir.
- `filtrede` alanı yalnız saklanır; vitrin filtresi hangi özellikleri göstereceğini bu alandan okumalıdır. `urunleri` alanı denetlemez: panel her özelliğe göre ürün arayabilir.
- Filtre bugün tek değer eşitliğidir. Sayı aralığı ("100–200 cm") ve birden çok değerin birlikte süzülmesi vitrin bölümüyle gelir; indeksler bunu karşılar.
- Özellik silindikten sonra geri alınırsa (geri alma ekranı yok) değerler kendiliğinden dönmez; silme kaydındaki ürün listesi değerleri değil yalnız ürünleri söyler. Değerlerin kendisi her ürünün `urun.*` kaydından bulunabilir.
- Silinmiş ürünün değerleri satırında kalır; ürünle birlikte görünmez olur.
- Ürünün değerleri bir değişiklikte baştan yazılır: değer satırının oluşturma zamanı değerin ilk girildiği an değil, son değişikliğin anıdır. Geçmiş değişiklik kaydındadır.
- Sayı alanının sınırı (11 tam, 4 ondalık basamak) JavaScript sayısının kayıpsız taşıyabildiği basamak sayısından gelir; daha büyük ya da daha ince sayı gerekirse alan ve okuma biçimi değişmelidir.
