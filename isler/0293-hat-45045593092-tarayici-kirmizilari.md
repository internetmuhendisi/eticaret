# 0293 · Hat 45045593092'nin üç tarayıcı kırmızısı

## Amaç

Hat 45045593092'de (2026-11-22, kart 0291'in gönderimi) birim testleri yeşil, tarayıcı testlerinde 334 test geçti, 4 test düştü, tema aşamasının 4 testi çalışmadı. Biri kart 0292'dedir. Öteki üçü bu kartlardan önceki kodda da duran testlerdir; sebepleri ölçülmedi:

- `iade-talebi.test.ts:356`: "iptal edilmiş sipariş (takip) light 375" taramasında `document-title` (sayfanın başlığı boş). Panelde benzer belirti kart 0287'dedir; bu vitrinin takip sayfasıdır.
- `odeme.test.ts:354`: havale bildiriminden sonra "Bildiriminiz alındı" durumu 5 saniyede görünmedi (odak denetimi).
- `vitrin-bolumleri.test.ts:315`: "Taşı: Duyuru şeridi, 5. sıradaki" düğmesi 15 saniyede bulunamadı (paylaşılan düzende bölümün sıra numarası değişmiş olabilir, kart 0197'nin kalıbı).

Hat 45050882397'de (2026-11-22, kart 0260'ın gönderimi) 336 test geçti, 3 test düştü, 5 test çalışmadı. Galeri taraması (kart 0292) ve `vitrin-bolumleri.test.ts:315` yine düştü; `iade-talebi.test.ts:356` ile `odeme.test.ts:354` bu kez geçti. Bir test ilk kez düştü, sebebi ölçülmedi:

- `katalog.test.ts:139` (biçimli metin alanı): bağlantı satırına `/kategori/kupalar` yazılıp Enter'a basılınca açıklamada "eğik" yazılı bağlantı 5 saniyede görünmedi (satır 198).

## Olmazsa olmazlar

- Her biri hattın izinden (`tarayici-testleri-izi`, 14 gün saklanır) okunur; sebep bir ölçümle doğrulanır.
- Ürün hatasıysa düzeltilir, testin zamanlamasıysa test sırayı kuracak biçimde güçlendirilir.

## Sınırlar

- Kart 0292'nin galeri taraması bu karta girmez.

## Bitti sayılır

- Dört testin sebebi ölçümle yazıldı, düzeltildi; her düzeltme geri alınınca kırmızı (zamanlamaya bağlıysa sırası kurularak).
- Tam tarayıcı takımı yerelde hattın koşulunda bir kez yeşil.
- Bağımsız kontrol yapıldı.

## Sonuç

Kullanıcı kararıyla (2026-11-23) ödeme testi bu kartın dışında kaldı: sebebi kart 0251'inkiyle aynı, oraya not yazıldı. Bu kart üç testle bitti.

- `vitrin-bolumleri.test.ts` (sıralama): hatta tarayıcı testleri iki işçiyle paralel çalışır ("Running 344 tests using 2 workers"), vitrin düzeni paylaşılır. İki hattın izinde panel, öteki işçideki `vitrin-cercevesi.test.ts`'in üst kısmın başına koyduğu bölümle (duyuru şeridi, ilk hatta logo satırı) testin bölümünü 6. sırada çiziyordu; test sırayı az sonra veritabanından okudu, öteki bölüm o arada silinmişti, "5. sıradaki" adlı düğmeyi aradı. Panelin sıralaması da alanın bütün listesini gönderdiği için arada değişen düzende çakışır. Düzeltme: düzeni değiştiren ve düzene göre bekleyen testler veritabanının oturum kilidini alır (`duzen-kilidi.ts`; `vitrin-bolumleri`, `vitrin-cercevesi`, `bos-sayfalar`). Sıra kurularak (öteki işçide 50 saniye boyunca üst kısmın başına bölüm ekleyip silen geçici test): kilitsiz 3/3 kırmızı ("Yeni sıra yayınlandı" gelmedi), kilitli 3/3 yeşil.
- `katalog.test.ts` (biçimli metin alanı): izin karelerinde Escape'ten sonra imleç "eğik"in sonundaydı (ilk seçim editöre geçmemişti), ikinci Shift+Home'dan sonra yazı seçili görünüyordu ama bağlantı boş seçime uygulandı. Ölçüldü: Shift+Home'dan hemen sonra tarayıcıda "eğik" seçiliyken editörün (ProseMirror) seçimi boştu; editör seçimi tarayıcının `selectionchange` olayıyla okur, test 8 ms sonra odağı düğmeye taşıyordu, olay geç gelince editör odakta olmadığı için seçimi yok saydı. Düzeltme: test seçimin editöre geçmesini bekler. Sıra kurularak (olay 200 ms geciktirilerek): beklemesiz 3/3 kırmızı (hattaki hatayla aynı satır), beklemeli 3/3 yeşil. Bilerek boşaltılmış seçimle ilk kurulan sıra hatayı üretmedi (olay geciktirilmemişti). Ürün hatası değildir: insan 20 ms içinde odağı taşıyamaz.
- `iade-talebi.test.ts` (takipte iptal sonrası tarama): izin ağ zamanlarına göre yenileme bittikten sonra başlatılan taramada `<title>` yoktu, panelde kart 0287'nin gördüğü belirtiyle aynı. Yerelde normal ve 4 kat yavaş işlemciyle başlığı izleyen gözlemciyle üretilemedi. Düzeltme (kullanıcı kararı): tarama başlığın dolmasını bekler; bulgular kart 0287'ye yazıldı. Başlık 1,5 saniye kaldırılarak sıra kurulunca beklemesiz 2/2 `document-title` ile kırmızı, beklemeli 2/2 yeşil.
- Tam tarayıcı takımı yerelde hattın koşulunda (temiz veritabanı ayrı kutuda, `taskset -c 0,1`, 2 işçi, boş dosya klasörü) 344/344 yeşil, 33 dakika, yük ortalaması 29.
- Bağımsız kontrol: kilitlenme görmedi; kilidi bekleyen testin süresi dolarsa bekleyen sorgunun kilidi sonradan sahipsiz alabileceğini buldu (süre artık beklemeden önce uzatılır, bekleme `lock_timeout` ile en çok 5 dakika, bağlantı bırakılınca kapatılır), düzeni okuyan `bos-sayfalar`'ın kilitsiz olduğunu buldu (kilide alındı), geçici ikinci üst satırın öteki vitrin testleriyle çakışabileceğini buldu (kart 0294, ölçülmedi). Kilidin bu son hâlinin sıra kurularak yeniden denenmesi yapılmadı; tam takımda yeşil.

## Durum

yapılacak
