# 0350 · "Yeni site kur" komutu

## Amaç

Bir müşteri geldiğinde mağazası tek komutla açılır: komut soruları sorar, cevapları özetleyip onay alır, kart 0343'ün tarifiyle siteyi kurar ve yayına açar. Tarif `planlar/komutlar.md`'nin "Yeni site kurmak" bölümüdür.

Bölüm: Yeni mağaza. Önce 0343, 0344, 0345 bitmiş olmalı; ikinci bir mağazayı sunucuya koyduğu için 0068 ve 0132.

## Olmazsa olmazlar

- Sorular (hepsi başta, işin ortasında yeni soru yok; `planlar/komutlar.md` ortak kuralları):
  - mağazanın adı (kod adı ve sipariş öneki addan önerilir), gerçek mağaza mı demo mu;
  - mağaza sahibinin adı ve e-postası;
  - ne sattığı ve kategorileri;
  - alt adres ya da kendi alan adı (kart 0344'ün kuralıyla);
  - başlanacak demo ve örnek ürünlerin gelip gelmeyeceği;
  - kurulacak eklentiler (katalogdan; `/eklenti-ekle` ile aynı tarif ve kurallar, kart 0145; tarifi olmayan eklentide durur);
  - kullanılabilecek temalar ve mağaza sahibinin temayı değiştirip değiştiremeyeceği;
  - varsayılandan farklı olacak ayarlar: şemanın varsayılanı gösterilir, bu site için öneri söylenir.
- Mağaza sahibinin adı ve e-postasının nereye yazıldığı (yalnız kimlik mi, mağaza sahibi hesabı mı, davet mi; teslim tarifiyle ilişkisi) kullanıcıya sorulur; kişisel bilgi site klasörüne ve GitHub'a girmez, girecekse ayrıca kararlaştırılır.
- "Ne sattığı ve kategorileri": demo seçilmişse demonun kategorilerine eklenir mi yerine mi geçer, kullanıcıya sorulur.
- Geri alınamaz adımlardan (alan adı kaydı, gönderme, yayın, e-posta) hemen önce ayrıca onay; gizli bilgi kayda girmez; kontrol geçmezse durur, atlatan seçenek yoktur.
- Komut tarifin tek tanımını okur, yayın, gizli bilgi, yedek, hata izleme, ön kapı ve alan adı için var olan komutları çağırır, adımlarını yeniden yazmaz. Site klasörü kendi çalışma kopyasında yazılır, kaydedilir, hat yeşil beklenir (hat ücretli, gönderme onay ister), yeşil kayıtla yayınlanır.
- Yarıda kalırsa ne yapıldığını ve kaldığı yeri söyler; aynı cevaplarla yeniden çalıştırılınca kaldığı yerden sürer, yapılmış adımı ikinci kez yapmaz. Hiç teslim edilmemiş bir siteyi kaldırmanın yolu vardır (deneme kurulumunun temizliği için): kutular, veritabanı, gizli bilgiler, ön kapı satırı, alan adı kaydı (onayla), site klasörü.
- Sunucunun kapasitesi kurulumdan önce ölçülür (bellek, disk); yeni sitenin iki kutusu sığmıyorsa durur ve söyler (sunucu başka projelerle paylaşılıyor).
- Komutun soruları, özeti ve karar kuralları birim testinde; bütün akış geçici bir demo siteyle deneme adresinde baştan sona bir kez çalıştırılır ve site kaldırılır; sunucu denetimi kaldırmadan önce ve sonra yeşil.
- Bitince `planlar/komutlar.md` "Elle yaparken" yerine "Komutla" bölümü: ilk çalıştırmanın adımları ve öğrenilenler.

## Sınırlar

- Teslim (satışa açma, mağaza sahibinin ilk girişi, teslim e-postası) yapılmaz; kurulan site satışa açık değildir (`planlar/komutlar.md`).
- Sahip paneli yazılmaz.
- Güncelleme komutu yazılmaz.
- Seramik mağazası kart 0352'de kurulur.

## Bitti sayılır

- Birim testleri yeşil, her karar kuralı bilerek bozularak kırmızı.
- Geçici demo site komutla kuruldu, deneme adresinde açıldı, sunucu denetimi, hata izleme denemesi ve ilk yedek geçti, sonra kaldırıldı.
- Yarıda kesilen kurulum kaldığı yerden sürdü (bir kez elle, kartta).
- `planlar/komutlar.md` güncel.

## Durum

yapılacak
