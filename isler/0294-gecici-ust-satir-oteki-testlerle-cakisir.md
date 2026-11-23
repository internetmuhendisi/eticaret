# 0294 · Geçici ikinci üst satır öteki tarayıcı testleriyle çakışabilir

## Amaç

Kart 0293'ün bağımsız kontrolünde bulundu, ölçülmedi. Hatta tarayıcı testleri iki işçiyle paralel çalışır ve vitrin düzeni paylaşılır. `cekirdek/testler/uctan-uca/vitrin-cercevesi.test.ts` "telefonda menü penceresi bağlantıya basılınca kapanır" testi üst kısmın başına ikinci bir "Logo ve simgeler satırı" ekler; test sürerken her vitrin sayfasında iki arama kutusu, iki Hesabım ve iki favori bağlantısı olur. Öteki işçideki testlerin bir kısmı buna karşı `.first()` kullanır (`arama.test.ts`, `favoriler.test.ts`, `musteri-hesabi.test.ts`), bir kısmı kullanmaz (`hesabim.test.ts`): o arada denk gelirse Playwright birden çok eşleşme hatası verir. `vitrin-bolumleri.test.ts`'in geçici duyuru şeritleri de ekran ölçümü ve taramalara görünür. Bugüne kadar bu yüzden düşen bir test görülmedi.

Kart 0293'ün düzen kilidi (`duzen-kilidi.ts`) yalnız düzeni değiştiren ve düzenin bölüm sayısına göre bekleyen testleri sıraya sokar; vitrinin herhangi bir sayfasını açan testleri kapsamaz.

## Olmazsa olmazlar

- Önce ölçülür: geçici ikinci üst satır varken öteki işçideki vitrin testlerinin hangilerinin düştüğü (örneğin üst satırı test boyunca açık tutarak tarayıcı takımını çalıştırmak).
- Düşen varsa yol seçilir: düzeni değiştiren testlerin paylaşılan düzene dokunmaması (kendi deneme sitesi ya da sayfası), ya da vitrin testlerinin bu ana karşı korunması. Seçim kullanıcıya sunulur.

## Sınırlar

- Kart 0293'ün kilidi değiştirilmez, yalnız gerekirse kapsamı genişletilir.

## Bitti sayılır

- Ölçüm yapıldı, sonucu kartın notlarına yazıldı.
- Düşen test varsa düzeltildi; düzeltme geri alınınca sırası kurularak kırmızı.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
