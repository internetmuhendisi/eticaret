# 0047 · Erişim testinin beklentisi uç belgesinden, müşteri senaryosu zorunlu

## Tarih

2026-11-06

## Karar

- Her uç, her kişiyle (girişsiz, müşteri, rolsüz yönetici, kayıttaki her rol) gerçek veritabanı ve gerçek oturumla denenir (`cekirdek/kapi/testler/erisim-denemesi.ts`, `rol-uc-erisimi.test.ts`). Uç listesi `app/kapi/**/route.ts` dosyalarından, rol listesi başlangıç rolleri kaydından okunur: yeni uç ve rol kendiliğinden kapsama girer. Next.js'in adres saydığı başka her dosya (kapı dışında ya da `route.tsx`, `route.js`) ve sahip panelindeki adres testi kırmızıya düşürür.
- Beklenen sonuç, uç belgesindeki `İzin:` satırından ve izin kaydından hesaplanır. Ucun kendi beyanı belgeyle ayrıca karşılaştırılır.
- Müşteri girişindeki her uç, A'nın oturumuyla B'nin kaydını isteyen bir senaryo yazmak zorundadır. İstek işlenmeli (200), yanıtta senaryonun verdiği değerler (verilmezse B'nin e-postası) olmamalıdır. Senaryosu olmayan müşteri ucu testi kırmızıya düşürür.
- Makinenin gerçekten yakaladığı, yalnız testte duran örnek uçlarla gösterilir (`ornek-adresler/`).

## Neden

- Kart beklentinin izin kaydından çıkmasını ve uca yanlış izin yazılınca testin kırmızıya düşmesini istiyor. Beklenti ucun kendi izninden hesaplansaydı yanlış izin kendisiyle tutarlı olur, test yeşil kalırdı. Belge bağımsız ikinci kaynaktır: bir izni değiştirmek iki yere bilerek dokunmayı gerektirir.
- Boş gövdeli istek: kapı izni girdi doğrulamasından önce sorar, sonuç girdi kurmadan görülür. Yan etkisiz değildir: boş girdiyi kabul eden uçta izinli kişi işe girer (çıkış gibi). Deneme geçici veritabanındadır.
- Her deneme kendi oturumuyla: çıkış gibi uçlar sonraki denemeyi etkilemesin.
- Kapı bir kaydın kime ait olduğunu bilemez. Genel bir test bunu kanıtlayamaz; zorunlu senaryo her müşteri ucunu yazan kişiyi düşündürür.

## Düşünülen diğer yollar

- **Beklentiyi ucun beyanından hesaplamak:** Seçilmedi. Yanlış izni yakalamaz.
- **Testin içinde elle uç-izin tablosu:** Seçilmedi. Kart elle listeyi yasaklıyor, belge zaten var ve testle uygulamaya bağlı.
- **Kapıya sahiplik denetimi eklemek:** Seçilmedi. Hangi tablo ve alan olduğunu kapı bilemez, her uca yeni bir beyan gerekir, kart yeni kod istemiyor. Uçlar çoğalınca yeniden bakılır.
- **Gerçek uygulamayı sunucu olarak açıp denemek:** Seçilmedi. Uçlar doğrudan çağrılır, ara katman uçları kapsamaz; yerel ortam denemesi adres yazılışlarını ayrıca ölçüyor.

## Sonuçları

- Bugün uygulamadaki 5 uç da herkese açıktır: test gerçek uçlarda yalnız "kimse reddedilmiyor"u ölçer. Yönetici ve müşteri uçları yazılınca asıl değerini verir; o zamana kadar yakaladığı örnek uçlarla gösterilir.
- Belge ve kod birlikte yanlış yazılırsa test yakalamaz (ölçüldü). Yeni uçta ikisini aynı kişi yazar. "Yanlış izin kırmızı" yalnız ikisi ayrışınca geçerlidir; ötesi gözden geçirmedir, yalnız disiplindir.
- Yalnız boş istek denenir. `ucTanimla` kapıyı her zaman önce çalıştırır, sorun olmaz. Elle sarılmış, girdiye göre kapıyı atlayan uç yakalanmaz.
- İzinli kişinin `bulunamadi` gibi bir kod alması red sayılmaz: "izinli gerçekten işini yapıyor" uçların kendi testlerine kalır.
- Rolün izinlerini test başlangıç kaydından okur; veritabanındaki rollerle aynı olduğunu `cekirdek/moduller/ekip/testler/servis.test.ts` denetler. Bir mağazada elle değiştirilen rol burada görünmez.
- Test yalnız erişimi ölçer. Kapsam süzmesi (görevlinin yalnız kendi kaydını görmesi) yönetici uçlarının kendi testlerine kalır, otomatik değildir.
- Müşteri senaryosu yanıtta aranan değerlere bakar: sipariş ya da adres ucu kendi değerini hazırlayıp vermelidir, yazma yapan uç için B'nin kaydının değişmediğini kendi ölçmelidir. Senaryonun yeterliliği yalnız disiplindir.
- Karar 0040'taki "ucun süzmesi kart 0030'a kadar yalnız disiplindir" notu böylece kısmen kapanır: uç yazılınca senaryo zorunludur, senaryonun yeterliliği değil.
- Test geçici veritabanı açar, kart 0051'deki aralıklı çakışmaya eklenir.
