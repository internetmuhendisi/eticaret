# 0342 · Vitrin bölümleri testinde üst üste duran bildirimler

## Amaç

Kart 0341'in düzeltmesi eksik kaldı. Hat 46107381410 (7a2054ad) yalnız `cekirdek/testler/uctan-uca/vitrin-bolumleri.test.ts:388`'de kırmızı (392 test geçti): `bildirimiKapat(page, "yonetim.bolumler.gizlendi")`'den sonra "Göster"e 15 saniye basılamadı, basışı yine başarı bildirimi (`data-sonner-toast`) aldı. İzden ölçüldü: gizleme anında üç bildirim üst üsteydi (önce klavyeyle sıralamanın, sonra "Aşağı al"ın "Yeni sıra yayınlandı" bildirimi, en son "Bölüm gizlendi"); test yalnız sonuncuyu kapattı, kalan iki bildirimden öndeki düğmenin üstünde kaldı. Bildirimler 4 saniyede kapanır, ama fare üstlerindeyken kapanmaz (`.claude/rules/test.md`).

0319'un yayınının önünde.

## Olmazsa olmazlar

- Bildirimden sonra fareyle basmadan önce, o anda açık olan bütün bildirimler kapatılır ya da kapanması güvenceye alınır (yalnız son bildirim değil). Dosyadaki öteki ardışık basışlar (kart 0341'in dört yeri ve sıralamadan sonraki "Aşağı al") aynı gözle taranır.
- Sıra kurularak eski hâlde kırmızı (iki sıralama bildirimi açıkken), düzeltmeyle yeşil gösterilir.
- `test.md`'deki kart 0341 kuralı gerçek davranışa göre düzeltilir.

## Sınırlar

- Bildirimin davranışı (fare üstündeyken durması, üst üste dizilmesi) değişmez.

## Bitti sayılır

- Eski hâlde sıra kurularak kırmızı, düzeltmeyle yeşil; dosya yerelde yeşil.
- Gönderimin hattında tarayıcı testleri bu dosyada düşmüyor.

## Sonuç

- `bildirimiKapat` yerine `bildirimleriKapat`: açık her bildirimi (öndekinden başlayarak) kendi kapat düğmesiyle kapatır, her birinin kapanmasını bekler. Kart 0341'in dört yerine ek olarak "Aşağı al", "Gizle", "Önceki hâline dön" ve Slider'ın yeniden ekleyen Kaydet'inden önce çağrılır; açık bildirim yoksa hiçbir şey yapmaz.
- Sıra kurularak ölçüldü: pencere, satırın düğmesi bildirim yığınının altına düşecek yüksekliğe (829 px) kısaltılınca eski hâl hattaki hatanın aynısıyla kırmızı ("Göster"e 15 sn basılamadı, arkadaki bildirim basışı aldı); düzeltmeyle aynı koşulda 3/3 yeşil. Geçici ölçüm kaldırıldı, dosya 12/12.
- `test.md`'deki kural düzeltildi; öteki dosyalarda yalnız disiplindir.

## Durum

bitti
