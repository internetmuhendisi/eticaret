# 0114 · Düzen yazması kategoriye başvurunca kategori kilidini alır

## Tarih

2026-11-13

## Karar

Panelden bölüm eklenirken ya da değiştirilirken, bölüm bir kategoriye başvuruyorsa düzen servisi kategori satırlarını kilitlemeden önce kategori kilidini (`kategoriKilidiAl`) alır (kart 0125). Kilit sırası: düzen, kategori, satırlar. Bu, başlangıç düzeninin kurulumundaki sırayla aynıdır (kart 0114, `cekirdek/moduller/duzen/baslangic.ts`). Başvurulan satırlar ayrıca kimlik sırasıyla kilitlenir.

## Neden

- Ölçüldü (gerçek veritabanıyla, sıra kurularak, üç kez):
  - Bölüm iki alt kategoriye başvuruyor, aynı anda üst kategori siliniyor.
  - Kategori silme üst kategoriyi ve alt kategorileri sıra numarasıyla tek tek günceller.
  - Bölüm ekleme aynı satırları başka bir sırayla paylaşımlı kilitler.
  - İkisi birbirinin tuttuğu satırı bekledi, veritabanı birini "deadlock detected" ile düşürdü. Mağaza sahibi bunu beklenmeyen hata olarak görür.
- Kategori kilidini alan bölüm yazması, kategori yazması bitene kadar bekler; kategori yazması da bölümü beklemez. Kilitlenme kalmaz.
- Kategori servisi düzen kilidini hiç almaz. Kategori kilidini alan öteki yollar ya yalnız onu alır (kategori servisi, başlangıç kataloğu, başlangıç menüleri) ya da düzenden sonra alır (başlangıç düzeni). Tema servisi tema, düzen, kategori sırasındadır. Ters sırada kilit alan yol yoktur, yeni bir kilitlenme açılmaz.

## Düşünülen diğer yollar

- **Yalnız satırları kimlik sırasıyla kilitlemek:**
  - Kategori silme altları kimlik sırasıyla değil, kendi sıra numarasıyla günceller. İki sıra ters düşünce kilitlenme sürer; test kimlikleri buna göre seçince bu ölçüldü.
  - Kategori silmenin güncelleme sırasını kimliğe çevirmek, kategori yazmalarının kendi kurallarına dokunmak olurdu.
- **Kilitlenmede işlemi yeniden denemek:** Hatayı gizler, kilitlenme kalır. Her yazmayı yeniden denenebilir kılmak ayrı bir altyapı ister.

## Sonuçları

- Kategoriye başvuran bölüm yazması aynı anda süren kategori yazmasını bekler. Kategori yazmaları kısa olduğu için bu bekleme küçüktür.
- Satırları kimlik sırasıyla kilitlemek bu kilitlenme için ikinci katmandır: tek başına kaldırılınca test yeşil kalır, kategori kilidi kaldırılınca kırmızıdır.
- Aynı kalıp ürünlerde de ölçüldü: elle seçilmiş ürünlere başvuran bölüm ile ürünlerin vitrin sırası kilitleniyor. Kart 0159'da ayrı çözülür. Marka, etiket ve menü yazmaları tek satır güncellediği için bu kalıbı kuramaz.
