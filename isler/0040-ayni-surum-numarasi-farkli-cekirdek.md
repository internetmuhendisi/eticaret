# 0040 · Aynı sürüm numarası farklı çekirdeği göstermesin

## Amaç

Çekirdeğin görüntüsü `altyapi-cekirdek:<sürüm>` adını alıyor. Örnek Mağaza'nın yayın kaydında üç yayın var, üçü de `0.1.0` sürümüyle ama üç farklı kayıttan: `380d46e` ve `ed1b203` (kart 0022), `bb6bcc6` (kart 0023). Aynı numara farklı kodu gösterince sahip paneli, sürüm notu ve güncelleme tarifi "bu site hangi kodda çalışıyor" sorusunu numaradan cevaplayamaz (karar 0011, 0024). Bir sürüm numarası yalnız bir çekirdeği göstermeli.

## Olmazsa olmazlar

- Yayınlanmış bir sürüm numarasıyla farklı bir çekirdek yayınlanamaz. Örneğin yayın komutu, sunucudaki yayın kayıtlarında aynı sürümün başka bir çekirdek kaydıyla yayınlandığını görürse durur. Yol karar kaydında seçilir.
- Geliştirme sırasındaki deneme yayınlarının nasıl numaralanacağı karara yazılır. Seçenekler: her yayında sürümü artırmak ya da sürüme kayıt eki eklemek. Ek `0.1.0+380d46e` biçiminde yazılamaz: Docker görüntü adında `+` geçemez, kimlik şeması ve sürüm notu testi de bu biçimi bugün reddeder. Ek seçilirse biçimi bunlara göre kurulur.
- Kararı ve kontrolü bozan bir örnek testte yakalanır.

## Sınırlar

- Sahip paneli bu işe girmez.
- Var olan yayın kayıtları değiştirilmez.

## Bitti sayılır

- Aynı sürümle farklı bir çekirdeği yayınlama denemesi duruyor (testte ve bir kez sunucuda).
- Kararın kaydı yazıldı.
- Sürüm notlarının ve güncelleme tarifinin bu kuralı anlatan satırı eklendi.

## Durum

yapılacak
