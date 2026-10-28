# 0012 · Sahip paneli sitelere sorar, veritabanlarına bağlanmaz

## Tarih

2026-10-28

## Karar

Sahip paneli hiçbir sitenin veritabanına doğrudan bağlanmaz. Her siteye kapının sahip girişindeki durum ucundan sorar. Durum ucu yalnız sayı ve tutar döndürür, kişisel veri döndürmez. Her sitenin durum ucunun anahtarı ayrıdır.

Öteki bilgiler kendi kaynağından gelir: site listesi ve kayıtlı sürüm kimlik dosyalarından, sitenin açık olup olmadığı zamanlanmış kontrollerden, son yayın yayın komutunun kaydından, hatalar hata izleme aracından, yedek durumu yedek işlerinin kaydından.

Sahip paneli son cevapları kendi kaydında saklar, böylece kapalı bir sitenin son bilinen durumu da görünür. Sahip paneli hiçbir sitenin parçası değildir, ayrı yayınlanır ve en yeni hâliyle çalışır.

## Neden

- Siteler birbirinin verisini görmez (değişmez kural 2). Bütün veritabanlarına bağlanan tek bir yer, bu ayrımın tek zayıf noktası olurdu.
- Müşteri verisinin sorumlusu her mağazanın kendisidir. Altyapı sahibinin özet için kişisel veriye ihtiyacı yoktur.
- Siteler farklı çekirdek sürümlerinde, farklı tablo yapılarıyla çalışabilir (0003). Durum ucu bu farkı gizler, sahip paneli tablo yapısını bilmek zorunda kalmaz.

## Düşünülen diğer yollar

- Sahip panelinin her sitenin veritabanını okuması: Seçilmedi. Veri ayrımını zayıflatır, her tablo değişikliği sahip panelini de bozabilir.
- Sitelerin bilgiyi kendiliğinden sahip paneline göndermesi: Seçilmedi. Her siteye gönderme işi ve hata durumunda yeniden deneme eklenir. Bir sitenin sustuğunu anlamak da zorlaşır.

## Sonuçları

- Durum ucunun cevap biçimi eski sürümdeki sitelerle de çalışacak biçimde korunur. Yeni alan eklenebilir, var olan alan kaldırılamaz.
- Sahip panelindeki bilgi birkaç dakika gecikmeli olabilir. İstenince hemen yenilenir.
- Para birimi farklı sitelerin tutarları toplanmaz, her site kendi para biriminde gösterilir.
- Altyapı haritasındaki "Sahip panelinin sitelerden bilgiyi nasıl toplayacağı" açık konusu bu kararla kapanır.
- Plan: `planlar/cekirdek-ve-siteler.md`.
