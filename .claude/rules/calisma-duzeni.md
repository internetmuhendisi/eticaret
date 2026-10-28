# Çalışma düzeni

Bu kurallar her işte geçerlidir.

## Temel ilkeler

- Bir işi, bir değeri ya da bir görünümü sistemde tek yerde tanımla, her yer onu kullansın. Kopyalanan parça zamanla ayrışır.
- Renk, ölçü, metin, durum adı, fiyat kuralı gibi değerleri koda elle yazma, tanımlandığı yerden oku.
- Yeni bir parça yazmadan önce ortak kütüphanede karşılığını ara.
- Hız kazanmak için kontrol, test ya da doğrulama adımını atlama.

## İşin akışı

- Her işi şu sırayla yürüt: anlama, etki kontrolü, plan, yazım, kontrol, yayın.
- Her işi kendi çalışma kopyasında yap. Ortak bir dosyayı aynı anda iki işte değiştirme. Kopyayı proje klasörünün içinde, `.claude/worktrees/<kart numarası>` altında aç; proje dışındaki bir klasör her adımda izin ister.
- İş ana dala alınınca o işin çalışma kopyasını ve dalını kaldır. Açık kalan kopya bir sonraki işe karışır ve diskte yer kaplar. Kopyayı zorlamadan kaldır (`git worktree remove <klasör>`, sonra `git branch -d <dal>`). Git, kaydedilmemiş iş olan kopyayı kaldırmaz; öyleyse dur ve kullanıcıya söyle.
- Yalnız istenen işi yap. İş sırasında başka bir iş ya da sorun görürsen ona başlama ve aynı değişikliğe karıştırma. Onu `isler/` klasörüne kart olarak yaz ve kullanıcıya söyle. Bir kartı kullanıcı istemeden yapma.
- Bir hatayı düzeltirken aynı hatanın başka yerlerde olup olmadığını ara.
- "Şu bozuk" gibi bir sebep iddiasını bir ölçümle doğrulamadan yazma.
- Bir işin maddelerini kaydet, yayını iş bitince tek seferde yap.
- Her yayından sonra sağlık kontrolü yap. Sorun çıkarsa önceki sürüme tek komutla dön.
- Ekran görüntüsüne bakmak doğrulama değildir. Arayüz işine bitti demeden önce sorunu, kullanımı, tasarımı ve tema uyumunu tek tek kontrol et.
