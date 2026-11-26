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

## Durum

yapılacak
