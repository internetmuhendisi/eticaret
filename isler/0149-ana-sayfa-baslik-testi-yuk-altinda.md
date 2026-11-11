# 0149 · Ana sayfa başlık testi yük altında bir kez düştü

## Amaç

`cekirdek/testler/uctan-uca/bos-sayfalar.test.ts` içindeki "/ adresi açılır ve başlığını gösterir" testi, kart 0135 sırasında (2026-11-11) bütün tarayıcı testleri 10 işçiyle çalışırken bir kez kırmızı oldu (8,9 saniye; yük ortalaması 25–35).

Aynı kodla:
- bütün takımın sonraki çalıştırmasında geçti (165 test, yük 14–25);
- tek başına 10 tekrarda geçti (30 test, yük 6).

Hatanın iletisi kaydedilmedi. Sebebi bu yüzden bilinmiyor. Kart 0135 vitrin çerçevesine sekme başlığı kalıbını ekledi (`generateMetadata`, mağaza adını ayardan okur); ana sayfa önceden de aynı okumayı yapıyordu. Kartlar 0088, 0092 ve 0118'deki gibi yük altında bir zamanlama sorunu olabilir, ölçülmedi.

Bölüm: Vitrin. Kart 0135'te görüldü, ona karıştırılmadı.

## Olmazsa olmazlar

- Testi yük altında tekrar tekrar çalıştırıp düştüğü anın iletisini yakala.
- Sebep ölçülmeden düzeltme yazılmaz. Test kodun bir hatasını yakalıyorsa o hata ayrıca kart olur.

## Sınırlar

- Sekme başlığının kalıbı değişmez.

## Bitti sayılır

- Sebep ölçümle yazıldı.
- Test yük altında art arda en az beş tam takımda geçiyor ya da sebep kodda bulunup düzeltildi.

## Durum

yapılacak
