# 0159 · Bölüm eklemede elle seçilen ürünler ile vitrin sırası kilitleniyor

## Amaç

Kart 0125'te bölüm ekleme ile kategori silmenin kilitlenmesi düzeltilirken aynı kalıp ürünlerde ölçüldü: elle seçilmiş iki ürüne başvuran bölüm eklemesi ile o ürünlerin vitrin sırasını değiştiren işlem aynı anda, sıra kurularak çalıştırıldı. Üç ölçümün üçünde de veritabanı bölüm eklemeyi "deadlock detected" ile düşürdü (beklenmeyen hata).

- Düzen servisi başvurulan ürün satırlarını kimlik sırasıyla paylaşımlı kilitler (`baglariDenetle`, `cekirdek/moduller/duzen/servis.ts`).
- Vitrin sırası (`vitrinSirasiniDegistir`, `cekirdek/moduller/urun/vitrin-sirasi.ts`) ürün kilidini alır ve satırları okunduğu (sırasız) düzende tek tek günceller.
- İkisi aynı iki satırı ters sırayla tutunca birbirini bekler.

Ölçümün kurgusu kart 0125'in testindekiyle aynıdır: ilk güncellenecek ürün bir test işleminde tutulur, vitrin sırası onu bekler, bölüm öteki ürünü kilitleyip ilkini bekler, test işlemi bırakılır.

Bölüm: Vitrin.

## Olmazsa olmazlar

- Ölçüm gerçek veritabanıyla bir yarış testine dönüşür (sıra kurularak, rastgele kimliklere bağlı olmadan).
- Düzeltme kilit sırasını tek yerde tanımlar. Kart 0125'in kuralıyla uyumlu olmalı: kategori için düzen, kategori, satırlar; ürün için düzen, (kategori,) ürün kilidi, satırlar. Ters sırada kilit alan yol açılmamalı (kategori silme kategori kilidinden sonra ürün kilidini alır).
- Aynı kalıbın başvurulan öteki tablolarda (marka, etiket, menü) çok satırlı bir yazmayla kurulup kurulamadığı ölçülür. Kart 0125'te bunların yazmalarının tek satır güncellediği görüldü.
- Düzeltme bilerek bozulunca test kırmızı.

## Sınırlar

- Başlangıç düzeninin kurulumu (kart 0114) değişmez.

## Bitti sayılır

- Yarış testi yeşil, düzeltme kaldırılınca kırmızı.
- Kilit sırası kural dosyasına ve karar kaydına yazıldı.

## Durum

yapılacak
