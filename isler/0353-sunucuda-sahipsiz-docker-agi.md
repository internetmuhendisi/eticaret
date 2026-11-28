# 0353 · Sunucuda sahipsiz Docker ağı

## Amaç

Kart 0343'ün sunucu dökümünde bulundu, o karta karıştırılmadı. Sunucuda `tmpgqfqqg9czh_default` adlı bir Docker ağı var: 2026-11-05 01:16'da açılmış, bağlı kutusu yok, hiçbir sitenin ya da altyapı kutusunun tanımında geçmiyor. Adı geçici bir klasörde çalıştırılmış `docker compose`'un proje adına benziyor (o gün kart 0020–0023 sunucu kurulumu ve denemeleri yapılıyordu). Sunucu denetimi ağları yalnız tanımlı kutular üzerinden ölçtüğü için artık ağı görmüyor.

Bölüm: Yeni mağaza. Yeni siteler kurulmadan önce sunucunun tarifle aynı olması için.

## Olmazsa olmazlar

- Ağın nereden geldiği komutların geçici klasörle `docker compose` çalıştıran yerleri taranarak bulunur ve yazılır (ölçülmeden "şu komut bıraktı" denmez).
- Artığı bırakan yol varsa düzeltilir: geçici proje kendi ağını işi bitince kaldırır.
- Ağ kaldırılır (bağlı kutusu olmadığı yeniden ölçülerek, kullanıcıya söylenerek).
- Sunucu denetimi tanımlı olmayan ağları da sayar: sitelerin, veritabanının, hata izlemenin, ön kapının ve Docker'ın kendi ağları dışında bir ağ kırmızıdır; bozuk örneğiyle.

## Sınırlar

- Sitelerin ağlarına ve kutularına dokunulmaz.

## Bitti sayılır

- Kaynağı kartta yazılı (bulunamadıysa ölçülenlerle birlikte öyle yazılı).
- Ağ yok; sunucu denetimi tanımsız ağı yakalıyor, bozuk örneği testte.

## Durum

yapılacak
