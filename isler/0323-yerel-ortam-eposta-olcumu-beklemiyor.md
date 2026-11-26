# 0323 · Yerel ortam denemesinde e-posta ölçümü posta kutusunu beklemiyor

## Amaç

Hat 45767950510 (kayıt 81cbc5c, yalnız kart ve tarihçe; kod 1fc9ffc ile aynı, onun hattı 45756746426 yeşil) yalnız yerel ortam denemesinin tek ölçümüyle kırmızı bitti: "ornek-magaza: e-posta yerel posta kutusuna düştü, gönderen sitenin adresi (0 e-posta)". Aynı satırda arka plan kutusu `eposta=gonderildi` dedi; öteki bütün adımlar (birim, tarayıcı, hız, görüntü) ve aynı denemenin hoş geldin ve şifre sıfırlama e-postası ölçümleri yeşildi.

`komutlar/yerel-ortam-testi.mts` (satır 291–302) posta kutusunu gönderimden hemen sonra tek kez soruyor; hoş geldin ve sıfırlama ölçümleri ise 30 saniyeye kadar her saniye yeniden soruyor. Olası sebep, gönderilen e-postanın posta kutusunun aramasında henüz görünmemesi; bu ölçülmedi.

Bölüm: Test altyapısı. Kart 0311 sırasında hattın sonucuna bakılırken bulundu.

## Olmazsa olmazlar

- Sebep ölçülür (örneğin aramanın gönderimden kaç ms sonra sonucu verdiği), sonra yazılır.
- Ölçüm öteki e-posta ölçümleri gibi bekler; bekleme tek yardımcıda toplanır (üç kopya ayrışmasın).
- Gönderen adresi olmayan sitenin "e-posta göndermiyor" ölçümü beklemeyle zayıflamaz (yokluğu ölçen yol ayrı düşünülür).

## Sınırlar

- E-posta gönderiminin kodu değişmez.

## Bitti sayılır

- Beklemesiz hâlin düştüğü bir sıra kurularak gösterildi ya da sebep ölçümle başka bulundu.
- Yerel ortam denemesi hattın koşulunda yeşil.

## Sonuç

- **Sebep ölçüldü, bulunamadı.** Yerel Mailpit'te (v1.31.6) gönderimden hemen sonra arama 1100 denemenin 1100'ünde iletiyi buldu, kutu 500 iletiyi aşıp eskileri silerken (545 silindi) de. Hattaki çalışmanın süreleri öncekilerle aynıydı (arka plan denemesi 47 sn); tek fark aramanın 282 ms sonra yapılması (yeşil hatlarda 72 ve 130 ms). Gecikme ya da kutunun hata cevabı olasıdır, ikisi de gösterilemedi.
- **Bulunan açık.** Eski ölçüm kutunun hata cevabını (`messages` olmayan gövde) "0 e-posta" okuyordu: e-posta ölçümünde sebebi gizliyor, "gönderen adresi olmayan site göndermiyor" ölçümünü yanlışlıkla geçirebiliyordu.
- **Düzeltme.** Ortak yardımcı `komutlar/posta-kutusu.mts`: üç e-posta ölçümü beklenen e-postayı 30 sn'ye kadar bekler, bulunca bir kez daha sorar (kopya sayılır); HTTP hatası, JSON olmayan ya da listesiz gövde, bağlantı hatası, 10 sn istek süresi ve koşulun kendi hatası nedeniyle ayrıntıya yazılır; "göndermiyor" ölçümü tek arama yapar, hata cevabında kırmızıdır.
- **Testler.** `komutlar/testler/posta-kutusu.test.ts` sahte kutuyla 16 test; yedi denetim ayrı ayrı bozulunca kırmızı (beklemesiz tek arama dahil: gecikmeli kutuda dört test kırmızı). Gerçek yerel Mailpit'te bir kez elle: bulunan e-posta, olmayan alıcıda boş liste, kapalı port ve yanlış yolda neden, 300 ms sonra gelen kopyanın sayılması. Tür kontrolü ve denetim yeşil.
- **Bağımsız kontrol.** Engelleyici bulgu yok. Üç bulgu düzeltildi: kopya iletinin sayılmaması, sıfırlama ölçümünde ileti okuma hatasının denemeyi düşürmesi, istek süresinin olmaması. Çekirdek testlerindeki posta kutusu aramaları da tek arama yapıyor; hata cevabında kırmızıdırlar, yanlış geçmezler; gecikmeye karşı ölçülmedi, kart açılmadı (kural tablosunda not).
- **Açık kalan.** Yerel ortam denemesi yerelde çalıştırılmadı (ortak yerel kutuları kapatır); "hattın koşulunda yeşil" maddesi bir sonraki gönderimin hattında görülür.
- **Hat 45784138336 (010674b).** Yerel ortam denemesinde iki e-posta ölçümü geçti: Örnek Mağaza'nın e-postası yerel posta kutusuna düştü (1 e-posta), gönderen adresi olmayan deneme sitesi göndermedi (0 e-posta). Adım bütün olarak kırmızı: tek düşen ölçüm kuyruğunki (Örnek Mağaza'da hatalı örnek işin ikinci denemesi 60 sn içinde alınmadı), bu kartla ilgisiz, kart 0328. Kullanıcı kararıyla kart bu sonuçla kapandı.

## Durum

yapılacak
