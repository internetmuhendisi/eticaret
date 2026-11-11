# 0122 · Kaldırılan görünümün düzendeki bölümü

## Amaç

Kart 0111'in tarayıcı testleri çalışırken sunucu günlüğünde şu hata görüldü (2026-11-10): "Düzendeki bölüm çizilemiyor (gecersiz): telif-satiri".

- Yerel Örnek Mağaza veritabanındaki geçerli düzende telif satırı `ortali` görünümüyle saklı. Bu ölçüldü (`duzen_surumleri`).
- Telif satırının bugünkü görünümlerinde `ortali` yok. Kart 0108'in taslak düzeltmesi (karar 0084) görünümleri değiştirdi.
- Bölüm tasarlandığı gibi çizilmiyor ve hata süreç başına bir kez kaydediliyor (karar 0081). Müşteri ise alt kısımda telif satırını görmüyor.

Aynı durum her çekirdek güncellemesinde olabilir: bir görünüm ya da alan kaldırılır ya da adı değişirse, sitelerin veritabanındaki düzende o bölüm sessizce kaybolur. Çekirdek güncellemesi siteye kendiliğinden gitmez. Yine de güncellenen sitede mağaza sahibinin düzeni bozulur.

Bölüm: Vitrin. On birinci bölümde açık kartlardan bu bölüme alındı.

## Olmazsa olmazlar

- Önce ölçülür: hangi sürüm geçişlerinde hangi görünüm ya da alan kaldırıldı? Yerel ve sunucudaki sitelerin düzenleri bugün geçerli mi?
- Bir bölüm türünün görünümü ya da alanı kaldırılınca ya da adı değişince eski düzenlerin ne olacağı tek yerde tanımlanır. Seçenekler:
  - sürüm geçişinde düzeni dönüştüren bir veri değişikliği
  - tarifte eski görünümden yenisine eşleme
  - site güncellenmeden önce geçersiz bölümü bildiren bir kontrol
- Kaldırılan bir görünüm ya da alan bir kontrolle yakalanır, yalnız disipline bırakılmaz.

## Sınırlar

- Bölüm türlerinin görünümleri değiştirilmez.
- Yerel veritabanını elle düzeltmek bu kartın çözümü değildir.

## Bitti sayılır

- Kaldırılan görünümle saklı bir düzen, seçilen yolla geçerli hâle geliyor ya da güncellemeden önce yakalanıyor. Bu, testte gerçek veritabanıyla ölçülüyor.
- Yol bir karar kaydına yazıldı.

## Durum

yapılacak
