# 0232 · Bölüm ekleme kilitlenme testinin hangi kilitte beklediği

## Amaç

Kart 0230'un bağımsız kontrolü bir şüphe bildirdi (ölçülmedi). Test şu: `cekirdek/moduller/duzen/testler/servis.test.ts` içinde kart 0125'in testi, "iki kategoriye başvuran bölüm eklemesi ile üst kategoriyi silmek kilitlenmez".

- **Açıklamanın dediği:** Ekleme B'yi kilitleyip A'da bekler.
- **Şüphe:** Kart 0125'in kategori kilidinden sonra ekleme büyük olasılıkla silmenin tuttuğu kategori kilidinde bekliyor.
- **Neden ayırt edilemiyor:** `kilitBekleyeniGor(vt, 2)` yalnız bekleyen sorgu sayısına bakıyor, hangi kilitte beklendiğini bilmiyor.

Kart 0125'e göre test, kilit kaldırılınca kırmızıya düşüyor. Yani düzeltmeyi yakalıyor; şüphe testin açıklamasının ve kurduğu sıranın doğruluğu üzerine.

## Olmazsa olmazlar

- İki işlemin hangi kilitte beklediği `pg_locks` ile ölçülür.
- Açıklama ölçülen sıraya göre düzeltilir. Sıra testin amacını kurmuyorsa test, amaçladığı sırayı kuracak biçimde düzeltilir.

## Sınırlar

- Düzen ve kategori servislerinin kilit sırası değişmez.

## Bitti sayılır

- Bekleme yerleri ölçüldü ve karta yazıldı.
- Açıklama ve test ölçülen sırayla tutarlı. Kategori kilidi kaldırılınca test yine kırmızı.

## Durum

yapılacak
