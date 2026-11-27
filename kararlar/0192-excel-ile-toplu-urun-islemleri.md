# 0192 · Excel ile toplu ürün işlemleri eklentisi

## Tarih

2026-11-27

## Karar

Excel ile toplu ürün işlemleri eklentisi kuruldu (kart 0315, tarif `eklentiler/excel-ile-toplu-urun-islemleri.md`, plan `planlar/excel-ile-toplu-urun-islemleri.md`). Taslağın kararları (karar 0185: her birleşim bir satır, boş hücre değiştirmez, hatalı dosya uygulanmaz) ve kullanıcının kararları (indirildiği anla karşılaştırma, dosyadan silinen satır silmez, olmayan kategori, marka ve etiket hatalı satır, durumu boş yeni ürün taslak, Örnek Mağaza'da açık) uygulandı. Teknik seçimler:

- **Ürün kodu ürünün adres adıdır;** adı değişmiş ürün eski adresiyle de bulunur. Birleşimi ürün kodu ile seçenekleri ("Renk: Beyaz; Beden: L") tanır.
- **İndirildiği andaki değerler dışa aktarmanın kaydındadır** (birim ve ürün başına düz değerler, ürün kodlarının ürünü ve birleşimlerin birimi); dosyanın "Bilgi" sayfası kaydın kimliğini taşır. Dosyadaki hücre o değere eşitse alan değişmez (ad aranmaz: sitede adı değişen kategori, marka, etiket ve özellik dokunulmamış hücreyi bozmaz); hem dosyada hem sitede değişen alan hatalıdır. İndirildikten sonra sitede silinen ürün ve birleşim yeniden açılmaz: dokunulmamış satırı bir şey yapmaz, değiştirilmiş satırı hatalıdır. Kayıt 30 gün saklanır; daha eski ya da elle hazırlanmış dosyada dolu hücre sitedekinden farklıysa yazılır ve önizleme bunu uyarıyla söyler.
- **Dosyalar eklentinin tablosunda durur** (dışa aktarılan dosya ve yüklenen dosya), dosya servisinin görsel ve belge yollarına girmez: geçicidirler, yalnız sahibi indirir; yüklenen dosya iş bitince ya da vazgeçilince silinir.
- **Kütüphane `read-excel-file` ve `write-excel-file`'dır;** `fflate` doğrudan bağımlılıktır: arşiv açılırken açılan bayt gerçekten sayılır (başlıktaki boyut bilgisine güvenilmez), okuyucuya ölçülen içerikten yeniden kurulan arşiv verilir. Metin hücreleri metin türünde yazılır, formül hiç yazılmaz.
- **İşler arka planda, satırlar ürün grubu başına bir işlemde yazılır;** grubun satırları aynı işlemde "uygulandı" işaretlenir, yarıda kalan iş kaldığı gruptan sürer. Önizlemeden sonra sitede yazılacak alanı değişen grup uygulanmaz (başka alanı değişen grup yazılır). Beklenmeyen hata yalnız o grubu "uygulanamadı" yapar, iş sürer. İşler eklenti kapalıyken bir şey yapmaz; zamanlı tarama (10 dakika) ilerlemeyen işi sürdürür.
- **Her parça kendi servisiyle yazılır** (ürün, seçenek, değer, birleşim, fiyat, stok). Stok geçmişinin yeni sebebi "Excel ile içe aktarma"dır (`excel-ice-aktarma`, elle seçilemez); stok servisi panelin aracının düzeltmesini (`aracDuzeltmesi`) aynı kurallarla alır.
- **Yeni ürünün vergi sınıfı panelin yeni ürününkiyle aynıdır** (silinmemiş ilk sınıf); dosyada vergi sınıfı sütunu yoktur.
- **İzinler var olanlardır:** dışa aktarma `urun.gor` (fiyat sütunları `fiyat.gor`, stok `stok.gor`; indirmede yeniden sorulur), içe aktarma `urun.degistir`; fiyat ve stok değiştiren satır `fiyat.degistir` ve `stok.duzelt` ister (önizlemede ve uygulamada yeniden).

## Neden

- Adres adı okunur ve tekildir; kimlik (UUID) dosyada okunmaz, stok kodu boş olabilir ve dosyada değiştirilebilir.
- İndirildiği andaki değer olmadan "dosyaya dokunulmadı" ile "eski değer geri yazılsın" ayırt edilemez: arada satılan ürünün eski stoğu geri yazılırdı (kullanıcı kararı).
- Arka plan işinin süresi 300 saniyedir; büyük dosya partilerle yazılmazsa iş yarıda kalırdı. Grup başına işlem, bir ürünün satırlarını birlikte yazar ya da hiç yazmaz.
- `exceljs` 2023'ten beri yayın almadı; SheetJS'in npm'deki sürümünde bilinen açık var.

## Düşünülen diğer yollar

- Ürünü kimlikle tanımak (gizli sütun): dosyayı elle düzenleyen kişi yeni ürün satırını nasıl yazacağını bilemezdi.
- Birleşimi stok koduyla tanımak (taslaktaki not): stok kodu boş birleşim tanınmazdı, değiştirilen stok kodu yeni birleşim açardı.
- Dosyaları dosya servisinde tutmak: geçici dosya için silinme işaretli kayıt ve klasör temizliği gerekirdi.
- Dosyadaki her değeri yazmak: kullanıcının kararıyla seçilmedi.

## Sonuçları

- Dosya kişisel veri taşımaz; dışa aktarma kaydı birimlerin değerlerini 30 gün tutar.
- Görseller, uzun açıklama, vergi sınıfı, ilgili ürünler, ağırlık ve ölçüler dosyada yoktur; panelde düzenlenir.
- Var olan ürüne yeni seçenek dosyadan eklenmez; yeni değer (renk, beden) yeni birleşim olarak eklenir.
- Zamanlanmış durum dosyadan seçilmez (yayın zamanı sütunu yok).
- Panel içi bildirim yoktur (kart 0280); işin sonucu sayfada görünür.
