# 0105 · Filtreli ürün listesi: veri, fiyat ve önerilen sıra

## Tarih

2026-11-12

## Karar

Kategori, marka ve etiket sayfasının ürün listesi filtrelenir ve sıralanır (kart 0136, karar 0102). Arama sayfası (kart 0137) aynı parçayı kullanır.

- **Veri:** Kapsamdaki (kategori ve alt ağacı, marka, etiket) görünür ürünler sırasıyla tek sorguyla gelir. Markalar, birimler (stok ve seçenek değerleriyle) ve filtrede kullanılan özellikler kapsamın üç sorgusuyla okunur (`cekirdek/vitrin/urun-listesi/veri.ts`). Filtre, seçeneklerin sayıları ve fiyat sıralaması saf işlevlerle hesaplanır (`cekirdek/moduller/urun/filtre.ts`). Sorgu sayısı ürün sayısıyla artmaz.
- **Fiyat:** Filtre ve sıralama kartta görünen en düşük fiyata bakar (`fiyatAraliklari`: vergi gösterimi, indirim ve satılabilir birleşimler dahil). Yalnız fiyat filtresi ya da sıralaması varken hesaplanır. Fiyatı olmayan ürün fiyat filtresine uymaz, fiyat sıralamasında sondadır.
- **Filtrelerin anlamı:** Grup içinde "veya", gruplar arası "ve". Ürün seçenekleri (beden, renk) aynı birleşimde aranır; "stoktakiler" de seçiliyse o birleşim stokta olmalıdır. Seçeneğin sayısı, o grupta yalnız o seçenek seçilseydi gelecek ürün sayısıdır. Seçenek ve özellik grupları adlarından üretilen okunur anahtarla birleşir (farklı ürünlerdeki "Beden" tek gruptur).
- **Adres:** Filtre, sıralama ve sayfa adreste durur (`cekirdek/vitrin/urun-listesi/adres.ts`). Fiyat müşterinin yazdığı gibi adrese girer, sunucu sitenin para biçimiyle okur (biçimleyicinin `paraOku`'su). Filtre ya da sıralama varsa sayfa arama motorlarının dizinine girmez.
- **Önerilen sıra:** Ürünün tek genel vitrin sırası (`urunler.vitrin_sirasi`, kullanıcı kararı). Yalnız `vitrinSirasiniDegistir` yazar; listede olmayan ürünlerin sırası kalkar. Sırası olmayan ürünler sıralananlardan sonra, en yeni önce gelir.
- **Ayarlar:** Varsayılan sıralama, sayfa geçişi ve sayfa başına ürün mağaza sahibinin ayarıdır. Masaüstünde filtrenin yeri temanın parça görünümüdür (`urun-filtresi`: solda, üstte); üç hazır temada solda.

## Neden

- Fiyatın vitrinde nasıl gösterileceği (vergi çevirme, yuvarlama, indirim, satılabilir birleşim) `gosterim.ts`'de tek yerde tanımlıdır. Aynı hesabı SQL'de ikinci kez yazmak iki tanım demekti; ayrışırsa müşteri filtrede bir fiyat, kartta başka bir fiyat görürdü.
- Seçenek sayıları her grup için ayrı hesaplanır; saf işlevlerle bu kurallar veritabanı olmadan da tek tek denenebilir.
- Okunur anahtar adreste durur ("secenek-beden=m"), paylaşılan adres anlaşılır.
- Tek genel sıra mağaza sahibine tek liste yönetimi verir (5–30 mağazalık başlangıçta yeterli).

## Düşünülen diğer yollar

- **Bütün filtreleri ve fiyatı SQL'de hesaplamak:** Büyük katalogda daha az bellek kullanır, ama fiyat gösterimi kuralı iki yerde yazılırdı.
- **Fiyatı ürünün kayıtlı fiyatıyla (vergi çevirmesiz) süzmek:** Vergi hariç gösteren sitede kartta görünen tutarla filtre farklı olurdu.
- **Her kategori, marka ve etiket için ayrı elle sıra:** Daha esnek ama mağaza sahibi her listeyi ayrı sıralardı; kullanıcı tek genel sırayı seçti.
- **Fiyatı adreste kuruş olarak tutmak:** Kesin ama paylaşılan adreste okunmaz; müşterinin yazdığı metin hatayı da sayfada göstermeye izin verir.

## Sonuçları

- Kapsamdaki bütün ürünlerin filtre verisi her istekte belleğe okunur; fiyat filtresi ya da sıralaması varken bütün adayların fiyatı hesaplanır. Binlerce ürünlü kategoride istek yavaşlar; o ölçeğe gelince veri SQL'e taşınır (ölçüm bu kartın testinde değil, kart 0151 ile birlikte bakılır).
- Seçenek seçiliyken de fiyat filtresi ürünün kartta görünen en düşük fiyatına bakar: Beden S seçili ve en az 500 yazılıyken S'si 1.000, M'si 300 olan ürün gelmez. Seçili birleşimin fiyatına bakmak birim başına fiyat ister; ürün kararı olarak kullanıcıya sorulacak.
- Seçimler düz nesnede tutulur; anahtar yalnız nesnenin kendi alanından okunur (`kendiAlani`): "Constructor" adlı özellik kalıtılmış alana düşmez (bağımsız kontrol).
- Marka ve değer adları sitenin dilinin alfabe sırasıyla sıralanır (biçimleyicinin `adKarsilastir`'ı); veri katmanının onu kullanması yalnız disiplindir.
- Seçenek ve özellik gruplarının anahtarı addan üretilir: Latin dışı yazıyla adlandırılmış seçenekte anahtar adın kendisidir; iki farklı ad aynı anahtara inerse (Beden ve Bedén) tek grup olur.
- Masaüstünde filtrenin yerini bugün tema belirler; site ayarları taslağındaki "mağaza sahibi değiştirir" panelin tema ekranıyla (kart 0148) tema ayarlarına girer.
- Kataloğu önceden kurulmuş sitede özelliğin "filtrede" alanı başlangıç dosyasından değişmez; demo site sıfırlamayla görür (sürüm notu).
- Bileşen kataloğunda ürün listesi sayfası iki filtre yerini gösterir; üstteki şerit bugün hiçbir hazır temada seçili olmadığı için taraması ve klavyesi orada ölçülür.
- Taslaktan ayrılan yerler: seçeneğin sayısı etiketin içinde parantezle yazılır (taslakta sağa yaslı); üstteki şeritte grubun paneli listenin üstünde akışta açılır ve seçim hemen uygulanır (taslakta açılır panel ve "Uygula" düğmesi); telefonda sıralama yan pencerede değil, "Filtrele" düğmesinin yanındadır.
- Çekirdek 0.56.0; veritabanı değişikliği `0033_urun-vitrin-sirasi`.
