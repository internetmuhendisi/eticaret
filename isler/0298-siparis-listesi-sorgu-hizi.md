# 0298 · Sipariş listesinin süzgeçlerinin sorgu hızı

## Amaç

Kart 0267'nin bağımsız kontrolünde bulundu, ölçülmedi. Panelin sipariş listesinde:

- Kargo firması süzgecinin seçenekleri her sayfa açılışında bütün siparişlerden okunur (`siparisYonetimi.kargoFirmalari`, tekrarsız ad sorgusu). `kargo_firmasi` üzerinde indeks yoktur.
- Tarih süzgeci `olusturma_zamani` ile süzer. Durum seçili değilken ("Tümü", "Bakılması gereken") uyan tek sütunlu indeks yoktur; `siparisler_durum_zaman` yalnız durum seçiliyken işe yarar. Varsayılan sıralama da (`en-yeni`) aynı sütundadır.
- Dilin harf sırası her açılışta ayrıca sorulur (`harfSirasi`, `pg_collation`).

İlk yıl 5–30 mağaza için önemsiz görünüyor (karar 0169 kargo sorgusunun yavaşlayabileceğini yazıyor), ama ölçülmedi.

Bölüm: Yönetim paneli 2 (açık kartlardan alındı). Raporlar ve siparişlerin dışa aktarması aynı tarih süzgecini kullandığı için 0316 ve 0317'den önce yapılır.

## Olmazsa olmazlar

- Önce ölçülür: çok siparişli (örneğin 100 bin) deneme veritabanında listenin süzgeçsiz, tarihli ve kargo süzgeçli açılışının sorgu planı ve süresi.
- Ölçüm gerekiyorsa indeks (numaralı veritabanı değişikliğiyle) ya da seçeneklerin başka kaynaktan okunması; seçim ölçümle.

## Sınırlar

- Süzgeçlerin davranışı değişmez.

## Bitti sayılır

- Ölçüm karta yazıldı; gerekiyorsa düzeltme ve düzeltmeden sonraki ölçüm.

## Ölçüm (2026-11-27)

Yerelde, geçici deneme veritabanında: servisle verilen bir sipariş SQL ile 100.000'e çoğaltıldı (son iki yıla yayılmış zaman, beş durum, kargodaki ve teslim edilenlerde beş kargo firması), %2 havale bildirimi, %2,5 iade talebi (bekleyen, onaylı, reddedilmiş), %3 iade (tamamlanan, süren, başarısız). Listenin servisi (`siparisYonetimi.liste`, kargo seçenekleri, harf sırası ve dışa aktarmanın `listeninSiparisleri`) çalıştırıldı, atılan her sorgu yakalanıp `explain analyze` ile ölçüldü. Ölçüm betiği kayda girmedi. Tablodaki süreler servis çağrısının duvar saatiyle süresidir (her senaryo bir kez ısındıktan sonra tek çalışma, veritabanı aynı makinede); sorguların planı ve payı ayrıca `explain analyze` ile okundu (ölçüm yükü eski biçimin pahalı planında payları biraz büyütebilir).

| Açılış (4 sorgu) | Önce | Sonra |
|---|---|---|
| Süzgeçsiz, en yeni | 298 ms | 70 ms |
| Süzgeçsiz, son sayfa (4000.) | 681 ms | 125 ms |
| Tarih (son 30 gün) | 34 ms | 11 ms |
| Kargo firması | 289 ms | 14 ms |
| Durum sekmesi | 314 ms | 64 ms |
| Bakılması gereken | 956 ms | 102 ms |
| Tutara göre | 291 ms | 103 ms |
| Kargo firması seçenekleri | 24 ms | 16 ms |
| Harf sırası (`pg_collation`) | 0,4 ms | değişmedi |
| Dışa aktarmanın kimlikleri (son 30 gün) | 7 ms | 7 ms |

- Payların ayrımı (`explain analyze`): her açılıştaki bakılacak sayımı 235 → 31 ms (koşulun yeni biçimi), süzgeçsiz satır sorgusu 39 → 1,7 ms ve son sayfanınki 419 → 70 ms (`siparisler_zaman`), kargo süzgecinin sayımı 18 → 2 ms (`siparisler_kargo_firmasi`).
- En pahalısı her açılışta sayılan "Bakılması gereken" koşuluydu (sipariş başına beş alt sorgu, 235 ms; bildirim, talep ve iade tabloları boşken yalnız 57 ms ölçülüyordu). Koşul aynı anlamda "siparişin kimliği şu kümede" biçimine yazıldı (`yonetim.ts`, `listeKosullari`): veritabanı küçük tabloları bir kez okuyup eşler. Koşulların her biri bozularak denendi, servis testi kırmızıya düştü (altı bozma).
- Durum seçilmemişken varsayılan sıranın ve tarih süzgecinin indeksi yoktu: satırlar bütün tablodan sıralanıyordu, son sayfada sıralama diske taşıyordu. `siparisler_zaman` (oluşturma zamanı, kimlik) eklendi.
- Kargo firması süzgeci tam taramaydı: kısmi `siparisler_kargo_firmasi` eklendi (değişiklik 0067).
- Harf sırası sorusu ölçülmeyecek kadar kısa, değişmedi.
- Kalan en büyük pay durum sayıları (`group by durum`, ~20 ms) ve toplam sayımı (~10 ms): her açılışta bütün tablo sayılır. 100 bin siparişte kabul edilebilir; büyürse sayıları önbelleğe almak ayrı iştir.
- Planın indeksi seçmesi tabloya ve sürüme bağlıdır; testte ölçülmez.
- Havale bildirimi kümesi durum süzgeçsizdir, bütün geçmişle büyür (100 bin siparişte yaklaşık 2 bin kimlik); milyonlarca siparişte yeniden ölçülmeli (bağımsız kontrolün notu).

## Durum

bitti
