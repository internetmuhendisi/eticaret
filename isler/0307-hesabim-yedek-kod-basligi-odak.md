# 0307 · Hesabım'da yeni yedek kodların başlığı odak almadı

## Amaç

Kartlar 0226, 0251, 0282 ve 0281'in notlarını taşıyan gönderimin hattı (45567962785, kayıt 549ebb2) yalnız bir testle kırmızıydı: 360 test geçti, 1 düştü, 5 çalışmadı. Düşen test `cekirdek/testler/uctan-uca/ekip.test.ts` "ekip: roller, iki aşamalı girişi sıfırlama, yedek kodlar, hesap kapatma". Hesabım'da doğru kodla Enter'dan sonra "Yeni yedek kodlar" başlığı sayfadaydı, ama 5 saniye boyunca odak almadı. Kart 0226'nın sonucu incelenirken bulundu, o karta karıştırılmadı.

İz ve sunucu günlüğü (`sunucu/olusan/tarayici-sunucu-gunlugu.log`, karar 0181):

- `POST /kapi/yonetici/yedek-kodlari-yenile` sunucuda 26 ms sürdü (`next.js: 1.2ms`), tarayıcıda 394 ms; istek derleme beklemedi.
- Ardından sayfanın yenilenmesi `GET /yonetim/hesabim` sunucuda 645 ms sürdü, bunun 536 ms'si `next.js` payı: ısınmış sayfa o anda yeniden derlendi, tarayıcıda "[Fast Refresh] rebuilding" yazdı.

Ekran (`cekirdek/yonetim-paneli/hesabim/ekran.tsx`) başarıda önce `router.refresh()` çağırır (`usePanelIslemi`), sonra kodları duruma yazar ve odağı `requestAnimationFrame` ile bir kez başlığa verir. Başlık o karede henüz çizilmemişse odak hiç verilmez. Bu sıranın hatta gerçekten oluştuğu ölçülmedi, tahmindir.

## Olmazsa olmazlar

- Sebep ölçülür: odak verildiğinde başlığın çizilmiş olup olmadığı (bilerek geciktirilmiş çizimle ya da yenilemeyle sıra kurularak).
- Düzeltme odağı başlık çizildikten sonra verir; sıraya bağlı tek karelik bekleme olmaz.
- Aynı kalıp başka ekranlarda aranır ve aynı sebep varsa aynı değişiklikte düzelir: `requestAnimationFrame` ile odak bugün `cekirdek/vitrin/hesap/adres-defteri.tsx` (iki yer), `cekirdek/vitrin/siparis/iade-talebi-formu.tsx` ve `bilesenler/parcalar/bicimli-metin-alani.tsx`'te var.
- Düzeltme geri alınınca sırayı kuran test kırmızı.

## Sınırlar

- Isınmış sayfaların testler sırasında yeniden derlenmesi kart 0251'in işidir.
- Yedek kodların üretimi (kart 0274, 0053) değişmez.

## Bitti sayılır

- Sebep ölçümle yazıldı.
- Sırayı kuran test düzeltmeyle yeşil, düzeltme geri alınınca kırmızı.
- Aynı kalıbın öteki yerleri incelendi, sonucu kartta.

## Sonuç

- Sebep (2026-11-25, ölçüldü): odak bir sonraki karede veriliyordu; kare çizimden önce gelince başlık henüz yoktu. jsdom'da kare hemen çalıştırılarak sıra kuruldu, eski Hesabım kodu odağı gövdede bıraktı (hattaki düşüşle aynı sonuç). Hattaki anda kare neden önce geldiği (sayfanın yenilenmesinin 536 ms derlenmesi, yük) ayrıca ölçülmedi.
- Düzeltme: `useCizimdenSonraOdak` (`bilesenler/parcalar/cizimden-sonra-odak.ts`, karar 0182): odak isteyen güncellemenin çizimi bitince, gerekirse bir koşul (`hazir`) sağlanınca verilir.
- Aynı kalıbın öteki yerleri (kullanıcı kararıyla hepsi bu kartta düzeldi):
  - Adres defteri: son adres silinince odak boş hâlin düğmesine gitmiyordu (eski kodda kırmızı); "Varsayılan yap"ta React başa çıkan kartı taşımadığı için eski kod da yeşildi, aynı kancaya alındı.
  - İade talebi formu: özet boşken gizlidir (`empty:hidden`), kare erken gelirse tarayıcı gizli öğeye odak vermezdi; jsdom CSS uygulamadığı için eski kodun kırmızısı gösterilemedi, düzeltmeyle tarayıcı testi yeşil.
  - Biçimli metin alanı: odak efektin içinden, çizimden sonra veriliyor; sorun yok, değişmedi (taramada muaf).
  - Kartta yazılı olmayan iki yer daha bulundu: çoklu kayıt seçimi (kaldırılanın kendi düğmesine odak, eski kodda kırmızı) ve sepet (satır sunucunun cevabıyla kalktığı için odak her çıkarmada kayboluyordu, yüksüz makinede tarayıcıda kırmızı; yükten bağımsız). İkisi de kancaya alındı.
- Koruma: olay işleyicisinde `requestAnimationFrame` ile odak taramayla yakalanır (`cizimden-sonra-odak.test.tsx`). Kancanın üç bozması ve Hesabım'a eski kalıbın geri konması kırmızıya düştü.
- Tarayıcı: Ekip, Hesabım, iade talebi, sepet ve ürün ekranı testleri hattın koşulunda (temiz veritabanı, iki işlemci, iki işçi) 21/21.

## Durum

yapılacak
