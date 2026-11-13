# 0113 · Kaldırılan bölüm kodları eski düzende karşılığıyla okunur

## Tarih

2026-11-13

## Karar

Bir bölüm türünün görünümü, alanı, seçim seçeneği ya da renk seçeneği kaldırılınca ya da adı değişince, eski kod tarifin `eskiKodlar` alanında bugünkü karşılığıyla yazılır (kart 0122).

- Düzen veritabanından her okunduğunda eski kodlar bugünkü karşılığına çevrilir (`eskiKodlariCevir`, `duzeniCevir`; `cekirdek/vitrin/bolum-kutuphanesi/duzen.ts`). Bütün okumalar düzen servisinin tek noktasından geçer (`durum`). Düzen bir sonraki kaydedilişinde yeni kodla yazılır; eski sürümler olduğu gibi kalır.
- Görünümün karşılığı bugünkü bir görünümdür. Alanın karşılığı aynı üst alandaki (üst düzeyde ya da aynı listede) bugünkü bir alan ya da `null`dır (alan kaldırıldı, değeri atılır). Seçeneğin ve rengin karşılığı aynı alanın bugünkü bir seçeneğidir. Listenin alt alanı `liste.alt` yazılır. Bugün de geçerli kod (görünüm, alan, seçenek) eşlenemez ve çevrilmez: yanlış bir eşleme mağaza sahibinin seçimini bozmasın.
- Bugüne kadar yayınlanmış bütün tür, görünüm, alan, seçenek ve renk kodları bir kayıtta durur (`cekirdek/vitrin/bolum-kutuphanesi/yayinlanan-kodlar.json`). Kayıt yalnız büyür. Test (`testler/yayinlanan-kodlar.test.ts`) iki şeyi denetler: kayıttaki her kodun bugünkü tarifte ya da eşlemede karşılığı vardır, tarifin her kodu kayıttadır.
- Kayıt bu kartta 0.37.0'dan (bölüm kütüphanesinin ilk sürümü; ilk gerçek bölüm türleri 0.39.0'da geldi) 0.62.0'a kadar her çekirdek sürümünün kütüphanesi kayıt geçmişinden çıkarılarak kuruldu.
- Geçmişte tek kırılma 0.40.0'da oldu: duyuru şeridinin `ince` görünümü `ortali` görünümüne, telif satırının `ortali` ve `iki-yana` görünümleri `duz` görünümüne eşlendi. Alan, seçenek ya da renk hiç kaldırılmamış.

## Neden

- Çekirdek güncellemesi siteye kendiliğinden gitmez (değişmez kural 3). Bir site birkaç sürüm atlayarak güncellenebilir, geri dönebilir, eski bir yedekten açılabilir. Bu yüzden düzen herhangi bir eski sürümden gelebilir. Okurken yapılan çeviri hepsini aynı kuralla karşılar.
- Ölçüldü: yerel Örnek Mağaza'nın geçerli düzeninde telif satırı `ortali` ile saklıydı. Bölüm vitrinde çizilmiyor, hata süreç başına bir kez kaydediliyordu. Çeviriyle düzen bugünkü kütüphaneye göre geçerli.
- Kaldırılan kodun ancak eşlemesiyle kaldırılabilmesi, bunu disipline bırakmaz: eşlemesiz kaldırma testte kırmızıdır.

## Düşünülen diğer yollar

- **Her sürüm geçişinde düzeni dönüştüren veri değişikliği:**
  - Yalnız veri değişiklikleri sırayla uygulanmış sitede çalışır.
  - Eski yedekten açılan ya da geri dönen site ise yine eski kodla kalır.
  - Her kod değişikliği için ayrıca bir JSON dönüştürme sorgusu yazmak gerekir.
- **Site güncellenmeden önce geçersiz bölümü bildiren kontrol:**
  - Güncelleme komutu henüz yok (site komutları kurulmadı).
  - Bildirmek tek başına düzeni düzeltmez; mağaza sahibinin bölümü yeniden kurması gerekirdi.
- **Kaldırılan görünümü tarifte gizli olarak bırakmak:**
  - Bölüm çizilirdi, ama eski görünüşün kodu sonsuza kadar taşınırdı.
  - Panel de mağaza sahibine artık seçilemeyen bir görünüm gösterirdi.

## Sonuçları

- Bir görünümü, alanı ya da seçeneği kaldıran iş karşılığını seçmek zorundadır. Karşılık ürün kararı gerektiriyorsa (ör. iki eski görünüm farklı yeni görünümlere gidecekse) kullanıcıya sorulur.
- Bölüm türünü bütünüyle kaldırmanın eşlemesi yoktur: kayıttaki tür bugün yoksa test kırmızıdır, tür kaldırmak ayrı bir karar ister.
- Ürün kaynağının türleri (elle, kategori, yeni...) ve güven şeridinin ikon adları da düzende saklanır. Bunlar tarifte değil kayıt dosyalarında (`cekirdek/kayitlar/`) tanımlıdır, bu kaydın kapsamında değildir; kaldırılmaları yalnız disiplindir.
- Kaydın yalnız büyümesi (kod silinmemesi) testle denetlenmez, yalnız disiplindir. Silinen kod kayıtta yoksa test onu aramaz.
- Listenin adı ile alt alanının adı aynı sürümde birlikte değişirse eşleme yazılamaz: alt alanın eski yolu listenin eski adını taşır, çeviri alanları tarifteki sırayla taşır. Böyle bir değişiklik iki sürüme bölünür.
- Değişiklik kaydında bölümün eski hâli çevrilmiş kodlarla görünür: kayıt düzenin okunduğu hâlini yazar.
- Sunucudaki Örnek Mağaza (0.52.0) 0.40.0'dan sonra kuruldu, düzeni kaldırılan kodları taşıyamaz. Bu kayıt geçmişinden çıkarıldı, sunucudaki düzen ayrıca okunmadı.
