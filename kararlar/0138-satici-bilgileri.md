# 0138 · Satıcı bilgileri mağaza sahibinin ayarıdır, biçimleri ülkenin veri dosyasındadır

## Tarih

2026-11-17

## Karar

- **Tek ayar:** Mesafeli satış sözleşmesinin ve ön bilgilendirme formunun istediği satıcı bilgileri mağaza sahibinin tek ayarıdır (`saticiBilgileri`), mağaza adresi gibi tek şemayla denetlenir (`cekirdek/bolgeler/satici.ts`). Ayar boş başlar. Alanlar: ülke, işletme türü (şirket ya da şahıs, `cekirdek/kayitlar/satici.ts`), ticari unvan, vergi dairesi, vergi numarası, MERSİS numarası, ticaret sicil numarası, KEP adresi.
- **Zorunluluk (kullanıcı kararı):** Ayar verilirse ülke, işletme türü ve unvan zorunludur, öteki alanların hepsi isteğe bağlıdır. Hangilerinin gerçek mağaza açılmadan dolu olması gerektiği kart 0063'te hukukçuya sorulur, "dolu olmalı" kontrolü orada kurulur.
- **Kayıtta gizli:** Şahıs işletmesinde unvan kişinin adını, vergi numarası kimlik numarasını taşır. Değer değişiklik kaydına yazılmaz, yalnız ayarın değiştiği yazılır (`kayittaGizli`, karar 0057).
- **Biçim ülkenin veri dosyasında:** Numaraların biçimi ve hangi kontrol hanesi hesabıyla denetleneceği ülkenin dosyasındadır (`cekirdek/bolgeler/<ülke>.json`, `saticiKimligi`). Türkiye için şirkette 10 haneli vergi kimlik numarası, şahıs işletmesinde 11 haneli kimlik numarası (sıfırla başlamaz), ikisi de kontrol haneli; MERSİS numarası 16 hane; KEP adresi `.kep.tr` alan adında. Kontrol hanesi hesapları adlarıyla tek dosyadadır, kod ülke adı ya da ülkeye özgü biçim yazmaz. Kuralı olmayan ülkede numaralar yalnız genel biçimle (harf, rakam, boşluk, tire, en çok 30 karakter), KEP adresi e-posta biçimiyle denetlenir.
- **Örnek Mağaza:** Deneme değerleri açıkça uydurmadır: vergi numarası `1111111114`, MERSİS `0111111111400015`, ticaret sicil `000000`, KEP `ornek-magaza@deneme.kep.tr`. Kontrol hanesi geçerli olduğu için gerçek bir numaraya denk gelmediği kesin değildir; sitenin yayında görünen bir yerinde bugün gösterilmez.
- **Okuyanlar:** Yasal metinler (kart 0063) ve ödeme adımının sözleşme metinleri (kart 0213) bilgileri bu ayardan okur. Panel ekranı bu kartta yoktur (iletişim bilgilerinin de yoktur).

## Neden

- Adres gibi birbirine bağlı alanlar (işletme türü vergi numarasının biçimini seçer) tek ayarda tutarlı denetlenir; ayrı ayarlar yarım değişikliğe izin verirdi.
- Biçimin veri dosyasında durması, başka ülkede kurulan mağazanın kodu değiştirmeden kendi kuralını almasını sağlar (CLAUDE.md: kod ülkeye bağlı yazılmaz).
- Zorunluluğun hukukçu cevabına kalması, ödeme adımının (kart 0213) bu soruyu beklemeden ilerlemesini sağlar.

## Düşünülen diğer yollar

- **Önce hukukçuya sormak:** Kullanıcı seçmedi. Kart 0213 de beklerdi.
- **Yalnız unvan, vergi dairesi ve vergi numarası:** Kullanıcı seçmedi. MERSİS, ticaret sicil ve KEP mevzuatta anılıyor, sonradan eklemek ikinci bir şema değişikliği olurdu.
- **Her alan ayrı ayar:** Seçilmedi, yukarıdaki tutarlılık gerekçesi.
- **Kontrol hanesini denetlememek, yalnız uzunluk:** Seçilmedi. Mağaza sahibinin yazım hatası sözleşmeye yanlış numara olarak geçerdi.

## Sonuçları

- Kontrol hanesi formülleri yaygın yayımlanmış hesaplardır. Vergi numarasının formülü bağımsız bir kütüphanenin (python-stdnum) belgesindeki örnekle doğrulandı. Resmî kaynakla karşılaştırma yapılmadı. Formül yanlışsa gerçek bir numara reddedilir, mağaza sahibi bunu ayarı kaydedemeyince görür.
- Bilgiler isteğe bağlı olduğu için gerçek mağaza bugün satıcı bilgisi olmadan açılabilir. Bunu engelleyen kontrol kart 0063'tedir.
- Ayar kayıtta gizli olduğu için eski değeri değişiklik kaydından geri alınamaz.
